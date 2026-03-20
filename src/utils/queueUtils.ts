const FILLER_WORDS = new Set(['the','a','an','for','to','of','in','as','and','with','me','my','its','is','be']);

export function escapePS(s: string): string {
  return s
    .replace(/`/g, '``')           // backtick (PS escape char) — double it first
    .replace(/\$/g, '`$')          // variable expansion
    .replace(/;/g, '`;')           // statement separator
    .replace(/\|/g, '`|')          // pipeline
    .replace(/&/g, '`&')           // call operator
    .replace(/\(/g, '`(')          // subexpression open
    .replace(/\)/g, '`)')          // subexpression close
    .replace(/'/g, "''")           // single quote (for single-quoted strings)
    .replace(/[\r\n]+/g, ' ');     // newlines
}

export function escapeCmd(s: string): string {
  return s
    .replace(/\^/g, '^^')         // caret (CMD escape char) — double it first
    .replace(/&/g, '^&')          // command separator
    .replace(/\|/g, '^|')         // pipeline
    .replace(/>/g, '^>')          // output redirect
    .replace(/</g, '^<')          // input redirect
    .replace(/"/g, '""')          // double quote
    .replace(/%/g, '%%')          // percent (env var expansion)
    .replace(/[\r\n]+/g, ' ');    // newlines
}

export function shortTitle(name: string): string {
  const words = name.split(/\s+/).filter(w => !FILLER_WORDS.has(w.toLowerCase()));
  return words.slice(0, 2).join(' ') || name.split(/\s+/).slice(0, 2).join(' ');
}

/**
 * Build a Windows Terminal command that arranges panes in a grid layout.
 * - 1 pane: full screen
 * - 2 panes: side by side
 * - 3 panes: 3 columns
 * - 4 panes: 2×2 grid
 * - 5 panes: 3 top + 2 bottom
 * - 6 panes: 3×2 grid
 */
export function buildGridLayout(paneArgs: string[]): string {
  const n = paneArgs.length;
  if (n === 0) return '';

  const parts: string[] = [];

  if (n <= 3) {
    // Single row of n columns
    parts.push(`new-tab ${paneArgs[0]}`);
    for (let k = 1; k < n; k++) {
      const size = n > 2 ? ` --size ${((n - k) / (n - k + 1)).toFixed(2)}` : '';
      parts.push(`split-pane -V${size} ${paneArgs[k]}`);
    }
  } else {
    // Two rows: top gets ceil(n/2), bottom gets the rest
    const topCount = Math.ceil(n / 2);
    const bottomCount = n - topCount;

    // First pane (top-left, full screen)
    parts.push(`new-tab ${paneArgs[0]}`);

    // Split into top/bottom rows
    parts.push(`split-pane -H --size 0.5 ${paneArgs[topCount]}`);

    // Build bottom row (focus is on bottom-left after the H split)
    for (let k = 1; k < bottomCount; k++) {
      const size = bottomCount > 2 ? ` --size ${((bottomCount - k) / (bottomCount - k + 1)).toFixed(2)}` : '';
      parts.push(`split-pane -V${size} ${paneArgs[topCount + k]}`);
    }

    // Move focus back to top row
    parts.push('move-focus -d up');

    // Build top row (focus is on top-left)
    for (let k = 1; k < topCount; k++) {
      const size = topCount > 2 ? ` --size ${((topCount - k) / (topCount - k + 1)).toFixed(2)}` : '';
      parts.push(`split-pane -V${size} ${paneArgs[k]}`);
    }
  }

  return parts.join(' ; ');
}
