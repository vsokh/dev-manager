// Engine definitions for the multi-engine launch feature.
// Each engine represents an AI coding assistant that can execute tasks.

export interface EngineConfig {
  id: string;
  label: string;
  color: string;
  icon: string;        // Single unicode character or short text
  command: string;     // CLI command prefix used for launching
}

export const ENGINES: EngineConfig[] = [
  {
    id: 'claude',
    label: 'Claude Code',
    color: 'var(--dm-accent)',
    icon: '\u25C8',       // diamond with dot
    command: 'claude',
  },
  {
    id: 'codex',
    label: 'Codex CLI',
    color: 'var(--dm-success)',
    icon: '\u25A3',       // filled square
    command: 'codex',
  },
  {
    id: 'cursor',
    label: 'Cursor',
    color: 'var(--dm-paused)',
    icon: '\u25C9',       // circle with dot
    command: 'cursor',
  },
];

export const DEFAULT_ENGINE_ID = 'claude';

export function getEngine(id: string | undefined): EngineConfig {
  return ENGINES.find(e => e.id === id) || ENGINES[0];
}

// --- Model definitions for Claude engine ---

export interface ModelConfig {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  tier: 'fast' | 'balanced' | 'powerful';
}

export const MODELS: ModelConfig[] = [
  {
    id: 'opus',
    label: 'Opus',
    shortLabel: 'Op',
    color: 'var(--dm-accent)',
    tier: 'powerful',
  },
  {
    id: 'sonnet',
    label: 'Sonnet',
    shortLabel: 'So',
    color: 'var(--dm-success)',
    tier: 'balanced',
  },
  {
    id: 'haiku',
    label: 'Haiku',
    shortLabel: 'Ha',
    color: 'var(--dm-amber)',
    tier: 'fast',
  },
];

export function getModel(id: string | undefined): ModelConfig {
  return MODELS.find(m => m.id === id) || MODELS[0];
}

/** Signals that suggest a task needs the most capable model */
const OPUS_PATTERNS = /\b(architect|redesign|migration|refactor large|rethink|complex|security audit|breaking change|cross-cutting|new system|from scratch|integrate .+ with|authentication|authorization|real-time|concurren|distributed|multi-tenant|database schema|data model|event sourcing|state machine|permission system|billing|payment|deploy pipeline|infrastructure|ci.?cd|end.to.end|full.stack|protocol|api design|sdk|framework|plugin system|extensib|scalab|physics (engine|system)|pathfinding|navigation mesh|navmesh|procedural gen|world gen|terrain gen|networking|netcode|multiplayer sync|ecs|entity.component|game loop|render(ing)? (pipeline|system|engine)|shader (system|graph|pipeline)|compute shader|gpu|vulkan|metal|directx|audio (engine|system|graph)|spatial audio|save.?load system|serializ|level editor|scene graph|animation (system|state machine|blend)|inverse kinematic|ragdoll|ai (system|behavio|director)|behavio(u)?r tree|utility ai|goap|a\*|quest system|dialog(ue)? system|inventory system|combat system|crafting system|skill tree|talent|ability system|spell system|buff.debuff|status effect|loot table|drop system|matchmak|lobby system|replay system|mod(ding)? (support|system|api)|localization system|accessibility system|input (system|remap)|gamepad|controller support|cross.platform|vr |ar |xr |haptic)\b/i;

/** Signals that a task is simple enough for the fast model */
const SONNET_PATTERNS = /\b(fix typo|typo|rename|bump version|update (text|copy|string|label|readme|docs|comment)|config change|add test|write test|unit test|lint|format|style|css|color|padding|margin|font|spacing|icon|image|alt text|placeholder|tooltip|aria|log(ging)?|env var|flag|toggle|reorder|swap|move .+ to|extract (component|function|method|constant)|remove unused|delete|clean.?up|sort|dedupe|wording|translation|i18n|responsive|breakpoint|hover|focus|animation|transition|z.index|border|shadow|opacity|readme|changelog|comment|docstring|deprecat|tweak|adjust (speed|scale|offset|value|param|timing|duration|cooldown|damage|health|weight|rate|range|radius|threshold|volume|pitch)|balance|tuning|playtest|swap (sprite|texture|asset|model|sound|sfx|music)|add (sfx|sound|particle|vfx|effect)|ui (polish|tweak|feedback)|hud|health.?bar|mana.?bar|score|timer|minimap|crosshair|reticle|waypoint|marker|spawn point|respawn|checkpoint|trigger (zone|volume|area)|collider (size|shape)|hitbox|layer|sorting order|tile(map)?|prefab|scene (load|transition)|loading screen|splash screen|main menu|pause menu|settings menu|keybind|level (select|name)|wave|round|difficulty|easy|medium|hard)\b/i;

interface TaskHint {
  name?: string;
  description?: string;
  skills?: string[];
}

/**
 * Auto-route model based on command + task content.
 * System commands → sonnet. Task execution → analyze task name/description.
 */
export function resolveModel(command: string, taskModel?: string, defaultModel?: string, task?: TaskHint): string | undefined {
  // Explicit per-task override wins
  if (taskModel) return taskModel;

  // System commands — always cheap
  if (/^\/codehealth/.test(command)) return 'sonnet';
  if (/^\/autofix/.test(command)) return 'sonnet';
  if (/^\/orchestrator\s+arrange/.test(command)) return 'sonnet';
  if (/^\/error-tracker/.test(command)) return 'sonnet';
  if (/^\/release/.test(command)) return 'sonnet';

  // Task execution — analyze task content
  if (/^\/orchestrator\s+task\s+\d+/.test(command) && task) {
    const text = [task.name, task.description].filter(Boolean).join(' ');

    // If task text strongly signals complexity → opus
    if (OPUS_PATTERNS.test(text)) return 'opus';

    // If task text signals simplicity → sonnet
    if (SONNET_PATTERNS.test(text)) return 'sonnet';
  }

  // Fallback: project default, or sonnet as the cost-effective baseline
  return defaultModel || 'sonnet';
}
