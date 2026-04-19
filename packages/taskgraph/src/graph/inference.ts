// Heuristic inference of produces/consumes from task description prose.
// Used by the migration CLI; kept pure so it can be unit-tested.

const ARTIFACT_RE = /\b((?:docs|Docs|DOCS|documentation|Assets\/_Project\/Data)\/[\w\-./]+\.(?:md|mdx|json|yaml|yml|txt|asset|prefab))\b/g;
const PRODUCE_VERBS = /(?:\b(?:produce|produces|produced|draft|drafts|drafted|create|creates|created|author|authors|authored|write|writes|written|output|outputs|deliver|delivers|delivered|emit|emits|generate|generates|generated|publish|publishes|published|save|saves|report|reports|summarize|summarizes)\b)/i;
const CONSUME_VERBS = /(?:\b(?:read|reads|consume|consumes|consumed|follow|follows|per|according\s+to|based\s+on|using|use|uses|review|reviews|apply|applies|implement|implements|implementing)\b)/i;

export interface InferredArtifacts {
  produces: string[];
  consumes: string[];
}

function normalize(p: string): string {
  return p.trim().replace(/\\/g, '/').replace(/^\.\//, '');
}

/**
 * Infer likely produces/consumes paths from a task description.
 * Conservative: requires both an artifact path AND a verb in the same sentence.
 */
export function inferArtifacts(description: string): InferredArtifacts {
  const out: InferredArtifacts = { produces: [], consumes: [] };
  if (typeof description !== 'string' || description.length === 0) return out;

  const segments = description.split(/(?:[.!?]\s+|\n)/);
  for (const seg of segments) {
    const pathMatches = seg.match(ARTIFACT_RE);
    if (!pathMatches) continue;
    const hasProduce = PRODUCE_VERBS.test(seg);
    const hasConsume = CONSUME_VERBS.test(seg);
    if (!hasProduce && !hasConsume) continue;

    for (const raw of pathMatches) {
      const p = normalize(raw);
      if (hasProduce && !out.produces.includes(p)) out.produces.push(p);
      if (hasConsume && !hasProduce && !out.consumes.includes(p)) out.consumes.push(p);
    }
  }

  out.consumes = out.consumes.filter(p => !out.produces.includes(p));
  return out;
}
