// Shared guidance block about the produces / consumes task contract.
// Injected verbatim into skill SKILL.md templates so every skill that reads
// or creates tasks stays consistent.
//
// When to update: if the runtime contract around artifacts changes
// (new failure modes, new file-type rules, etc.), edit this string only —
// every skill picks it up on rebuild.

export const ARTIFACT_CONTRACT_BLOCK: string = `## Artifact contract (produces / consumes)

Tasks MAY declare two fields:

- \`produces: string[]\` — files this task must author (e.g. \`["docs/audit.md"]\`). Paths are repo-relative, forward-slash. At task-done time, Maestro checks that each path exists and is non-empty. If a file is missing and \`.maestro/config.json\` has \`enforceArtifacts: true\`, the task is refused and stays in the queue with an \`artifact_missing\` message.
- \`consumes: string[]\` — files this task reads before starting. The producer(s) become implicit dependencies (no need to set \`dependsOn\` manually). Before a task launches, the server inlines each consumed file's contents into the agent's prompt as an upstream-context preamble — you don't need to re-read them.

**Rules when you create or propose a task:**

- A task that audits, researches, drafts, designs, or plans MUST declare a \`produces\` artifact (usually under \`docs/\`).
- A task that implements a plan or fixes a report MUST declare the plan/report as \`consumes\`.
- Never mutate an already-produced artifact — author a new one under a different path and have the follow-up task consume the previous version.
- If a doc is introduced by \`produces\`, it becomes the single source of truth; the task description must say "if this doc disagrees with the description, the doc wins".
- Prefer stable paths under \`docs/\`. Never produce inside \`.maestro/\`.
- Binary artifacts (\`.prefab\`, \`.asset\`, images) are valid in \`consumes\` (path check only — contents are not inlined into the prompt).

**When the runtime loads you with a task that has \`consumes\`:** the upstream artifacts are already pasted into your prompt under \`## Context from upstream tasks\`. Read them first. If they conflict with the task description, the artifact wins — flag the conflict and follow the artifact.
`;
