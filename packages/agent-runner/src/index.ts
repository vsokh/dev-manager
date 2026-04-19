// agent-runner — AI agent process lifecycle management
// Spawn, stream, buffer, kill — through injected ports. No real I/O.

// Types & Ports
export type {
  SpawnPort, SpawnOptions, ProcessHandle,
  BroadcastPort, ProgressWriterPort,
  EngineAdapter, EngineAdapterOptions, AgentEvent,
  LaunchResult, ProcessInfo, OutputLine, TaskOutput,
} from './types.js';

// Constants
export { MAX_OUTPUT_LINES, FALLBACK_PROGRESS_WINDOW_MS, SUPPORTED_ENGINES, SUPPORTED_MODELS } from './constants.js';

// Prompt builder (pure)
export { buildClaudePrompt, DEFAULT_ENGINES } from './prompt-builder.js';

// Artifact preamble (pure)
export {
  buildArtifactPreamble,
  TEXT_ARTIFACT_EXTENSIONS,
  MAX_INLINE_BYTES,
  TRUNCATED_PREVIEW_LINES,
} from './artifact-preamble.js';
export type { ArtifactReadResult, BuildArtifactPreambleOpts } from './artifact-preamble.js';

// Process manager
export { ProcessManager } from './process-manager.js';
