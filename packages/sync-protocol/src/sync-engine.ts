import {
  mergeProgressIntoState,
  protectDoneTaskRegression,
  isStaleVersion,
} from 'taskgraph';
import type { StateData, ProgressEntry } from 'taskgraph';
import type {
  StatePersistencePort, TimerPort, SyncStatus, SyncEngineConfig,
} from './types.js';
import { SAVE_DEBOUNCE_MS } from './constants.js';

export interface SyncStateMessage {
  type: 'state';
  data: StateData;
  lastModified: number;
}

export interface SyncProgressMessage {
  type: 'progress';
  data: Record<string, ProgressEntry>;
}

export type SyncMessage = SyncStateMessage | SyncProgressMessage;

export class SyncEngine {
  private state: StateData | null = null;
  private lastWriteTime = 0;
  private saveTimerHandle: unknown = null;
  private saveDebounceMs: number;
  private stateListeners: Array<(state: StateData | null) => void> = [];
  private statusListeners: Array<(status: SyncStatus) => void> = [];

  constructor(
    private persistence: StatePersistencePort,
    private timer: TimerPort,
    config?: SyncEngineConfig,
  ) {
    this.saveDebounceMs = config?.saveDebounceMs ?? SAVE_DEBOUNCE_MS;
  }

  getState(): StateData | null {
    return this.state;
  }

  getLastWriteTime(): number {
    return this.lastWriteTime;
  }

  /** Set state directly (for initial load or external override). */
  setState(data: StateData | null, lastWriteTime?: number): void {
    this.state = data;
    if (lastWriteTime !== undefined) this.lastWriteTime = lastWriteTime;
    this.notifyState();
  }

  /** Schedule a debounced save. Updates state immediately, persists after delay. */
  save(newData: StateData): StateData {
    const updated = { ...newData, savedAt: new Date().toISOString() };
    this.state = updated;
    this.notifyState();

    if (this.saveTimerHandle) this.timer.clearTimeout(this.saveTimerHandle);
    this.saveTimerHandle = this.timer.setTimeout(async () => {
      this.saveTimerHandle = null;
      await this.persistState(updated);
    }, this.saveDebounceMs);

    return updated;
  }

  /** Handle an incoming WebSocket message. Returns true if handled. */
  handleMessage(msg: SyncMessage): boolean {
    if (msg.type === 'state') {
      return this.handleStateMessage(msg);
    }
    if (msg.type === 'progress') {
      return this.handleProgressMessage(msg);
    }
    return false;
  }

  /** Flush any pending debounced save immediately. */
  async flush(): Promise<void> {
    if (this.saveTimerHandle) {
      this.timer.clearTimeout(this.saveTimerHandle);
      this.saveTimerHandle = null;
      if (this.state) {
        await this.persistence.writeState(this.state);
      }
    }
  }

  onStateChange(cb: (state: StateData | null) => void): () => void {
    this.stateListeners.push(cb);
    return () => { this.stateListeners = this.stateListeners.filter(l => l !== cb); };
  }

  onStatusChange(cb: (status: SyncStatus) => void): () => void {
    this.statusListeners.push(cb);
    return () => { this.statusListeners = this.statusListeners.filter(l => l !== cb); };
  }

  // --- Private ---

  private notifyState(): void {
    for (const cb of this.stateListeners) cb(this.state);
  }

  private notifyStatus(status: SyncStatus): void {
    for (const cb of this.statusListeners) cb(status);
  }

  private async persistState(data: StateData): Promise<void> {
    const result = await this.persistence.writeState(data, this.lastWriteTime);
    if (result.conflict && result.data) {
      const currentV = this.state?._v || 0;
      const conflictV = result.data._v || 0;
      if (isStaleVersion(conflictV, currentV)) {
        console.warn(`[sync] Conflict state is stale: _v=${conflictV} < current _v=${currentV}, retrying`);
        const retryResult = await this.persistence.writeState(data);
        if (retryResult.ok && retryResult.lastModified) {
          this.lastWriteTime = retryResult.lastModified;
        }
        this.notifyStatus('idle');
      } else {
        this.state = result.data;
        this.lastWriteTime = result.lastModified!;
        this.notifyState();
        this.notifyStatus('synced');
      }
    } else if (result.ok) {
      if (result.lastModified) this.lastWriteTime = result.lastModified;
      this.notifyStatus('idle');
    } else {
      this.notifyStatus('error');
    }
  }

  private handleStateMessage(msg: SyncStateMessage): boolean {
    if (msg.lastModified > this.lastWriteTime + 1000) {
      const incomingV = msg.data._v || 0;
      const currentV = this.state?._v || 0;
      if (isStaleVersion(incomingV, currentV)) {
        console.warn(`[sync] Rejected stale state: incoming _v=${incomingV} < current _v=${currentV}`);
        return true;
      }
      if (this.state) {
        msg.data = protectDoneTaskRegression(this.state, msg.data);
      }
      this.state = msg.data;
      this.lastWriteTime = msg.lastModified;
      this.notifyState();
      this.notifyStatus('synced');
    }
    return true;
  }

  private handleProgressMessage(msg: SyncProgressMessage): boolean {
    if (!this.state) return true;

    const mergeResult = mergeProgressIntoState(this.state, msg.data);

    // Clean up stale progress files
    for (const id of mergeResult.staleProgressIds) {
      this.persistence.deleteProgressFile(id).catch(err =>
        console.error('[sync] Failed to delete progress file:', err)
      );
    }

    if (mergeResult.hasChanges) {
      if (mergeResult.needsWrite) {
        mergeResult.data.savedAt = new Date().toISOString();
        this.persistence.writeState(mergeResult.data).then(result => {
          if (result.ok && result.lastModified) {
            this.lastWriteTime = result.lastModified;
            for (const id of mergeResult.completedTaskIds) {
              this.persistence.deleteProgressFile(id).catch(err =>
                console.error('[sync] Failed to delete progress file:', err)
              );
            }
            if (mergeResult.arrangeCompleted) {
              this.persistence.deleteProgressFile('arrange').catch(err =>
                console.error('[sync] Failed to delete progress file:', err)
              );
            }
          } else if (!result.ok) {
            console.error('[sync] Failed to write merged progress state');
            this.notifyStatus('error');
          }
        }).catch(err => {
          console.error('[sync] writeState error:', err);
          this.notifyStatus('error');
        });
      }
      this.state = mergeResult.data;
      this.notifyState();
    }
    return true;
  }
}
