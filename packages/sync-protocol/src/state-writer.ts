import { validateStateStructure, validateProgress, incrementVersion } from 'taskgraph';
import type { StateData, ProgressEntry } from 'taskgraph';
import type { FileReaderPort, FileWriterPort, WriteOutcome, StateWriterConfig } from './types.js';
import { CONFLICT_WINDOW_MS } from './constants.js';

export class StateWriter {
  private conflictWindowMs: number;

  constructor(
    private fileReader: FileReaderPort,
    private fileWriter: FileWriterPort,
    config?: StateWriterConfig,
  ) {
    this.conflictWindowMs = config?.conflictWindowMs ?? CONFLICT_WINDOW_MS;
  }

  /**
   * Read and validate state from disk.
   */
  async readState(statePath: string): Promise<{ data: StateData; lastModified: number } | null> {
    try {
      const content = await this.fileReader.readFile(statePath);
      const data = JSON.parse(content);
      if (!validateStateStructure(data)) return null;
      const fileStat = await this.fileReader.stat(statePath);
      return { data, lastModified: fileStat.mtimeMs };
    } catch (err: any) {
      if (err.code === 'ENOENT') return null;
      throw err;
    }
  }

  /**
   * Write state with optimistic concurrency control.
   */
  async writeState(
    statePath: string,
    stateDir: string,
    incoming: StateData & { _lastModified?: number },
  ): Promise<WriteOutcome> {
    if (!validateStateStructure(incoming)) {
      return { error: 'Invalid state structure: must include tasks array' };
    }

    await this.fileWriter.ensureDir(stateDir);

    // Optimistic locking
    const clientLastModified = (incoming as any)._lastModified;
    if (clientLastModified) {
      try {
        const fileStat = await this.fileReader.stat(statePath);
        if (fileStat.mtimeMs > clientLastModified + this.conflictWindowMs) {
          const content = await this.fileReader.readFile(statePath);
          const currentData = JSON.parse(content);
          if (!validateStateStructure(currentData)) {
            return { error: 'Corrupt state file on disk' };
          }
          return { conflict: true, data: currentData, lastModified: fileStat.mtimeMs };
        }
      } catch (err: any) {
        if (err.code !== 'ENOENT') throw err;
      }
    }

    // Strip internal field and increment version
    const { _lastModified, ...stateData } = incoming as any;
    const versioned = incrementVersion(stateData);
    await this.fileWriter.writeFile(statePath, JSON.stringify(versioned, null, 2));
    const newStat = await this.fileReader.stat(statePath);
    return { ok: true, lastModified: newStat.mtimeMs };
  }

  /**
   * Read all progress files from a directory, validated.
   */
  async readProgress(progressDir: string): Promise<Record<string, ProgressEntry>> {
    const entries: Record<string, ProgressEntry> = {};
    try {
      const files = await this.fileReader.readdir(progressDir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        try {
          const fullPath = progressDir.endsWith('/') || progressDir.endsWith('\\')
            ? progressDir + file
            : progressDir + '/' + file;
          const content = await this.fileReader.readFile(fullPath);
          const parsed = JSON.parse(content);
          const validated = validateProgress(parsed);
          if (validated) {
            entries[file.replace('.json', '')] = validated;
          } else {
            console.warn(`[state] Invalid progress file skipped: ${file}`);
          }
        } catch (err: any) {
          console.error('Failed to parse progress file:', file, err.message);
        }
      }
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err;
    }
    return entries;
  }

  /**
   * Delete a single progress file.
   */
  async deleteProgress(progressDir: string, taskId: string | number): Promise<boolean> {
    const filePath = progressDir.endsWith('/') || progressDir.endsWith('\\')
      ? progressDir + `${taskId}.json`
      : progressDir + '/' + `${taskId}.json`;
    try {
      await this.fileWriter.unlink(filePath);
      return true;
    } catch (err: any) {
      if (err.code === 'ENOENT') return false;
      throw err;
    }
  }
}
