import type { ProducedArtifact } from '../types.js';

export interface ArtifactFileInfo {
  exists: boolean;
  bytes: number;
  sha?: string;
}

export interface ProducedValidationResult {
  /** Whether every declared artifact exists and is non-empty. */
  ok: boolean;
  /** Stamped entries for all artifacts that DO exist (regardless of ok). */
  producedArtifacts: ProducedArtifact[];
  /** Paths that failed the existence / non-empty check. */
  missing: string[];
  /** Paths that exist but are empty (0 bytes). */
  empty: string[];
}

/**
 * Pure validator for a task's `produces` list.
 * Caller is responsible for hashing + stat-ing; we just sequence the checks.
 *
 * `probe(path)` should return:
 *   - exists: false         → counted as missing
 *   - exists: true, bytes=0 → counted as empty
 *   - exists: true, bytes>0, sha → stamped into producedArtifacts
 */
export function validateProducedArtifacts(
  produces: string[] | undefined,
  probe: (path: string) => ArtifactFileInfo,
): ProducedValidationResult {
  const producedArtifacts: ProducedArtifact[] = [];
  const missing: string[] = [];
  const empty: string[] = [];

  if (!Array.isArray(produces) || produces.length === 0) {
    return { ok: true, producedArtifacts, missing, empty };
  }

  const seen = new Set<string>();
  for (const raw of produces) {
    if (typeof raw !== 'string') continue;
    const path = raw.trim().replace(/\\/g, '/');
    if (!path || seen.has(path)) continue;
    seen.add(path);

    const info = probe(path);
    if (!info.exists) {
      missing.push(path);
      continue;
    }
    if (info.bytes <= 0) {
      empty.push(path);
      continue;
    }
    producedArtifacts.push({
      path,
      sha: info.sha ?? '',
      bytes: info.bytes,
    });
  }

  return {
    ok: missing.length === 0 && empty.length === 0,
    producedArtifacts,
    missing,
    empty,
  };
}
