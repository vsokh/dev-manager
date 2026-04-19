// Pure builder for the artifact context preamble injected into a task's prompt.
// No I/O — callers provide a readArtifact function.

export const TEXT_ARTIFACT_EXTENSIONS = new Set([
  '.md', '.mdx', '.txt', '.json', '.yaml', '.yml',
  '.ts', '.tsx', '.js', '.jsx', '.cs', '.py', '.rs', '.go', '.java', '.rb', '.php',
  '.css', '.scss', '.html', '.xml', '.toml', '.ini', '.env', '.sh', '.bash', '.ps1',
]);

export const MAX_INLINE_BYTES = 100 * 1024; // 100 KB
export const TRUNCATED_PREVIEW_LINES = 200;

export type ArtifactReadResult =
  | { kind: 'ok'; content: string; bytes: number }
  | { kind: 'missing' }
  | { kind: 'binary'; bytes: number }
  | { kind: 'error'; message: string };

export interface BuildArtifactPreambleOpts {
  consumes: string[];
  readArtifact: (path: string) => ArtifactReadResult;
  maxInlineBytes?: number;
  previewLines?: number;
  textExtensions?: Set<string>;
}

function extension(p: string): string {
  const lastSlash = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'));
  const base = lastSlash >= 0 ? p.slice(lastSlash + 1) : p;
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot).toLowerCase() : '';
}

function firstNLines(s: string, n: number): string {
  const lines = s.split(/\r?\n/);
  if (lines.length <= n) return s;
  return lines.slice(0, n).join('\n');
}

/**
 * Build the "## Context from upstream tasks" preamble. Returns an empty string
 * if `consumes` is empty. Never throws — missing/binary/oversize artifacts are
 * surfaced inline so the agent can reason about them.
 */
export function buildArtifactPreamble(opts: BuildArtifactPreambleOpts): string {
  const { consumes, readArtifact } = opts;
  if (!consumes || consumes.length === 0) return '';

  const maxBytes = opts.maxInlineBytes ?? MAX_INLINE_BYTES;
  const previewLines = opts.previewLines ?? TRUNCATED_PREVIEW_LINES;
  const textExts = opts.textExtensions ?? TEXT_ARTIFACT_EXTENSIONS;

  const sections: string[] = [];
  for (const raw of consumes) {
    const path = raw.trim();
    if (!path) continue;

    const ext = extension(path);
    const isText = textExts.has(ext);
    const result = readArtifact(path);

    let body: string;
    if (result.kind === 'missing') {
      body = `MISSING — the producing task may have failed to write it. Treat this task as blocked (artifact_stale) and surface the issue instead of proceeding.`;
    } else if (result.kind === 'error') {
      body = `ERROR reading artifact: ${result.message}`;
    } else if (!isText || result.kind === 'binary') {
      const bytes = result.kind === 'binary' ? result.bytes : (result.kind === 'ok' ? result.bytes : 0);
      body = `BINARY artifact (${bytes} bytes) — not inlined. Use the Read tool if you need its contents.`;
    } else if (result.bytes > maxBytes) {
      const preview = firstNLines(result.content, previewLines);
      body = `Artifact is ${result.bytes} bytes — truncated to the first ${previewLines} lines. Read the full file with the Read tool before acting.\n\n\`\`\`\n${preview}\n\`\`\``;
    } else {
      body = `\`\`\`\n${result.content}\n\`\`\``;
    }

    sections.push(`### ${path}\n${body}`);
  }

  return `## Context from upstream tasks

You consume the following artifacts. They are loaded below verbatim. Do NOT start work until you have read them. If anything in them conflicts with your task description, the artifact wins — flag the conflict and follow the artifact.

${sections.join('\n\n')}

---

`;
}
