// sync-protocol — bidirectional state sync with optimistic locking
// Debounce, version guards, conflict resolution — through injected ports. No real I/O.

// Types & Ports
export type {
  FileReaderPort, FileWriterPort, FileWatcherPort, WatchHandle,
  SyncBroadcastPort, ClockPort, TimerPort,
  StatePersistencePort, ClientWriteResult,
  SyncEvent, WriteOutcome, SyncStatus,
  WatcherConfig, StateWriterConfig, SyncEngineConfig,
  StateData, ProgressEntry,
} from './types.js';

// Constants
export { DEBOUNCE_MS, RETRY_INTERVAL_MS, CONFLICT_WINDOW_MS, SAVE_DEBOUNCE_MS } from './constants.js';

// Watcher orchestrator (server-side)
export { WatcherOrchestrator } from './watcher-logic.js';

// State writer (server-side)
export { StateWriter } from './state-writer.js';

// Sync engine (client-side, framework-agnostic)
export { SyncEngine } from './sync-engine.js';
export type { SyncMessage, SyncStateMessage, SyncProgressMessage } from './sync-engine.js';
