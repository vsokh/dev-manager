import type { StateData, ProgressEntry } from 'taskgraph';

// --- Port: File Reader ---

export interface FileReaderPort {
  readFile(path: string): Promise<string>;
  stat(path: string): Promise<{ mtimeMs: number }>;
  readdir(path: string): Promise<string[]>;
  exists(path: string): Promise<boolean>;
}

// --- Port: File Writer ---

export interface FileWriterPort {
  writeFile(path: string, content: string): Promise<void>;
  ensureDir(path: string): Promise<void>;
  unlink(path: string): Promise<void>;
}

// --- Port: File Watcher ---

export interface WatchHandle {
  close(): void;
}

export interface FileWatcherPort {
  watchFile(path: string, callback: () => void): WatchHandle | null;
  watchDirectory(path: string, callback: () => void): WatchHandle | null;
}

// --- Port: Broadcast (server → clients) ---

export interface SyncBroadcastPort {
  send(message: SyncEvent): void;
}

// --- Port: Clock ---

export interface ClockPort {
  now(): number;
}

// --- Port: Timer (for debounce) ---

export interface TimerPort {
  setTimeout(cb: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  setInterval(cb: () => void, ms: number): unknown;
  clearInterval(handle: unknown): void;
}

// --- Events ---

export type SyncEvent =
  | { type: 'state'; data: StateData; lastModified: number }
  | { type: 'progress'; data: Record<string, ProgressEntry> }
  | { type: string; data: Record<string, unknown>; lastModified?: number };

// --- State write results ---

export type WriteOutcome =
  | { ok: true; lastModified: number }
  | { conflict: true; data: StateData; lastModified: number }
  | { error: string };

// --- Client-side persistence port ---

export interface StatePersistencePort {
  writeState(data: StateData, lastModified?: number): Promise<ClientWriteResult>;
  readProgressFiles(): Promise<Record<string, ProgressEntry>>;
  deleteProgressFile(id: string | number): Promise<void>;
}

export interface ClientWriteResult {
  ok: boolean;
  conflict?: boolean;
  data?: StateData;
  lastModified?: number;
}

// --- Sync status ---

export type SyncStatus = 'idle' | 'saving' | 'synced' | 'conflict' | 'error';

// --- Configuration ---

export interface WatcherConfig {
  debounceMs?: number;
  retryIntervalMs?: number;
}

export interface StateWriterConfig {
  conflictWindowMs?: number;
}

export interface SyncEngineConfig {
  saveDebounceMs?: number;
}

// Re-export taskgraph types for convenience
export type { StateData, ProgressEntry } from 'taskgraph';
