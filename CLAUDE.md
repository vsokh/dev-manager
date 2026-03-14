# CLAUDE.md

## What is this

Dev Manager is a browser tool that pairs with Claude Code. A manager uses it to create tasks, write instructions, and queue work. Claude Code's orchestrator skill acts as a tech lead — reads the queue, plans the approach, delegates to sub-agents, reviews results, and writes back.

## Two hats

The user wears two hats:
- **Manager hat** (Dev Manager in browser): creates tasks, writes notes, prioritizes, queues work. Product-level thinking.
- **Developer hat** (Claude Code in terminal): reviews orchestrator's plans, approves delegation, helps navigate tricky implementation. Technical-level thinking.

The orchestrator is the bridge. It reads manager intent and translates it into technical execution.

## Commands

```bash
npm run dev          # start dev server (http://localhost:5173)
npm run build        # vite build
npm run preview      # preview production build
```

## Architecture

Vite + React 19 + JSX. No TypeScript. All inline styles with CSS custom properties.

```
src/
├── main.jsx                  # Entry point
├── App.jsx                   # Root component, all state management
├── styles.css                # CSS variables, reset, utility classes
├── fs.js                     # File System Access API (read/write state, ensure dirs)
├── skills.js                 # Skill keyword matching + auto-suggest
├── orchestrator.js           # ORCHESTRATOR_SKILL_TEMPLATE string
├── hooks/
│   └── useProject.js         # Connect/disconnect, auto-save, poll for changes
└── components/
    ├── ProjectPicker.jsx     # Landing screen: "Open project" + last project shortcut
    ├── Header.jsx            # Project name, sync dot, theme toggle, disconnect
    ├── SectionHeader.jsx     # Reusable panel header bar
    ├── CardForm.jsx          # New task form with skill auto-suggest
    ├── TaskBoard.jsx         # Task cards + "Add task" + collapsible shipped features
    ├── TaskDetail.jsx        # Detail panel: status, name, notes, queue/delete buttons
    ├── CommandQueue.jsx      # Queue list with per-task launch buttons + path config
    └── ActivityFeed.jsx      # Recent activity log (newest first)
```

### Key files outside src/

| File | Purpose |
|------|---------|
| `orchestrator-skill.md` | Readable reference of the orchestrator skill |
| `claude-launcher.cmd` | Protocol handler: parses URL, launches Windows Terminal + Claude Code |
| `install-protocol.cmd` | One-time: registers `claudecode://` protocol in Windows Registry |

## How it works

```
Manager (Dev Manager)              Tech Lead (Orchestrator)              Developers (Sub-agents)
       |                                    |                                    |
  Create tasks                              |                                    |
  Write notes ──► .devmanager/state.json ──►|                                    |
  Queue work                                |                                    |
       |                      ▶ Launch (claudecode:// protocol)                  |
       |                                    |                                    |
       |                           1. Read queue + notes                         |
       |                           2. Explore codebase (Agent)                   |
       |                           3. Present plan ──► user approves             |
       |                           4. Delegate ─────────────────────────► implement
       |                           5. Review result ◄───────────────────── done
       |                           6. Write back ──► state.json                  |
       |                                    |                                    |
  See results ◄── auto-sync (3s poll)       |                                    |
```

## State file: `.devmanager/state.json`

Single source of truth for the bidirectional sync.

```json
{
  "project": "my-project",
  "tasks": [{ "id": 1, "name": "...", "fullName": "...", "status": "pending|done|blocked" }],
  "features": [{ "id": "...", "name": "...", "description": "..." }],
  "queue": [
    { "task": 1, "taskName": "...", "notes": "..." }
  ],
  "taskNotes": { "1": "manager instructions..." },
  "activity": [{ "id": "act_123", "time": 1234567890, "label": "Google login completed" }]
}
```

### Specs directory: `.devmanager/specs/`

When the orchestrator executes a task, it can create a spec file at `.devmanager/specs/{NN}-{slug}.md`. Everything Dev Manager creates stays inside `.devmanager/`.

## Orchestrator skill (tech lead)

Template in `src/orchestrator.js`. Auto-installed to `.claude/skills/orchestrator/SKILL.md` on project connect.

The orchestrator:
1. **Reads** the queue and manager notes from `.devmanager/state.json`
2. **Explores** the codebase with Explore sub-agents to understand context
3. **Plans** the technical approach and presents it to the user
4. **Waits** for user approval — NEVER auto-delegates
5. **Delegates** to implementation sub-agents via the Agent tool
6. **Reviews** the sub-agent's output (build passed? requirements met?)
7. **Writes back** results to `.devmanager/state.json` so Dev Manager auto-syncs

## One-click launch (`claudecode://` protocol)

Each queued task has a ▶ button that opens a named terminal tab via custom URL protocol.

### Setup (one-time)
Run `install-protocol.cmd` — registers `claudecode://` in Windows Registry (`HKCU`). No admin needed.

### URL format
`claudecode:<path>?<command>?<tab-title>`

### How it works
1. User sets project path once in the queue panel (stored in localStorage per project)
2. ▶ button opens `claudecode:<path>?/orchestrator task N?<short title>`
3. `claude-launcher.cmd` receives the URL, opens a new tab in Windows Terminal with `--suppressApplicationTitle`

## File System Access

Uses the File System Access API (Chrome/Edge). The directory handle is persisted in IndexedDB (`devmanager_fs` database) so the project reconnects automatically on next visit.

Key functions in `src/fs.js`:
- `ensureDevManagerDir(handle)` — creates `.devmanager/` in project
- `ensureOrchestratorSkill(handle)` — writes latest orchestrator skill template
- `writeState(handle, data)` — writes `.devmanager/state.json`
- `readState(handle)` — reads `.devmanager/state.json` + lastModified timestamp

## Design

Warm neutral palette with dark mode support (`[data-theme="dark"]`):
- Background: `#f5f0eb` / dark: `#1a1816`
- Surface: `#fefcf9` / dark: `#242220`
- Accent (tasks): `#6a8dbe`
- Amber: `#c4845a`
- Success (shipped): `#5a9e72`

Layout: 2x2 grid — `[TaskBoard | Detail]` over `[Queue | Activity]`
Font: Onest (Google Fonts)

## What NOT to do

- Don't add a server — client-side only via File System Access API
- Don't embed project-specific data — all state comes from `.devmanager/state.json`
- Don't show implementation details to the manager (commit hashes, skill names, spec file paths, task IDs)
- Don't let the orchestrator auto-execute without user approval
