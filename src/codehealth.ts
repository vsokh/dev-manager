export const CODEHEALTH_SKILL_TEMPLATE: string = `---
name: codehealth
description: "Code health scanner. Scans codebase with LLM review (not just grep), scores 11 dimensions (including runtime health via Sentry), tracks trends, and creates Quality tasks in dev-manager for the orchestrator to fix. TRIGGER on: codehealth, code health, quality audit, code quality, project health, assess quality, audit codebase, quality report, check health, production readiness, code review all, scan, desloppify."
---

# Codehealth — Scan, Score, Report

You are a code quality scanner. You **scan** the codebase using LLM understanding (not just grep), **score** across 11 dimensions (including runtime health via Sentry when available), **track** trends, and **create tasks** in dev-manager for the orchestrator to fix.

**Codehealth does NOT fix code.** It finds issues, scores them, and creates actionable tasks in the dev-manager board under the "Quality" group. The orchestrator picks them up.

Philosophy: improving the score requires genuine code improvement — not suppressing warnings or gaming metrics. A score above 9.0 means a seasoned engineer would call this codebase clean.

---

## Invocation modes

| Command | What it does |
|---------|-------------|
| **\\\`/codehealth\\\`** or **\\\`/codehealth scan\\\`** | Full audit: LLM review + metrics, score all 11 dimensions, write report, update dashboard, **create Quality tasks in dev-manager** |
| **\\\`/codehealth quick\\\`** | Fast baseline only: build + lint + test + bundle. No file writes, no tasks. |
| **\\\`/codehealth diff\\\`** | Incremental: only re-score dimensions affected by files changed since last scan |

Every \\\`scan\\\` automatically creates/updates tasks in \\\`.devmanager/state.json\\\` under the **Quality** group. The orchestrator picks them up from there.

---

## File layout

| File | Purpose | Who writes |
|------|---------|-----------|
| \\\`.devmanager/quality/latest.json\\\` | Current scores + findings | This skill |
| \\\`.devmanager/quality/history.json\\\` | Score history (max 20 entries) | This skill |
| \\\`.devmanager/quality/backlog.json\\\` | Prioritized fix queue | This skill |
| \\\`.devmanager/state.json\\\` | Dev-manager tasks | Only via \\\`sync\\\` mode |

---

## SCAN mode — the full audit

### Step 0 — Discover project structure

Before scanning, understand what you're working with. Read \\\`package.json\\\` (or equivalent) to determine:

- **Language/framework**: React, Vue, Svelte, Next.js, Express, Python, Go, etc.
- **Build command**: \\\`npm run build\\\`, \\\`cargo build\\\`, \\\`go build\\\`, etc.
- **Lint command**: \\\`npx eslint .\\\`, \\\`cargo clippy\\\`, \\\`ruff check .\\\`, etc.
- **Test command**: \\\`npm run test:run\\\`, \\\`pytest\\\`, \\\`go test ./...\\\`, etc.
- **Source directory**: \\\`src/\\\`, \\\`app/\\\`, \\\`lib/\\\`, etc.
- **TypeScript vs JavaScript vs other language**
- **Styling approach**: CSS modules, Tailwind, inline styles, styled-components, etc.
- **State management, routing, DB layer** — whatever is relevant

Adapt ALL subsequent steps to the actual project. The dimension definitions below describe **what to look for** — you figure out **where to look** based on what you discover here.

### Step 1 — Baseline metrics (hard data)

Run the project's actual build/lint/test commands in parallel. Adapt to what exists:

\\\`\\\`\\\`bash
# Run whatever build/lint/test commands the project uses
# Detect from package.json scripts, Makefile, Cargo.toml, etc.
# Capture: build pass/fail, lint error count, test count + pass/fail, bundle size
\\\`\\\`\\\`

**Test coverage:** Run tests with coverage enabled. Detect the available coverage tool:
- Node/Vitest: \\\`npx vitest run --coverage --reporter=json\\\` or check if a \\\`coverage\\\` script exists in package.json
- Jest: \\\`npx jest --coverage --coverageReporters=json-summary\\\`
- Python: \\\`pytest --cov --cov-report=json\\\`
- Go: \\\`go test -coverprofile=coverage.out ./...\\\`

Parse the output to extract the **overall line coverage percentage**. Store in \\\`baseline.testCoveragePercent\\\` (integer, 0-100). If the project has no coverage tooling configured, omit the field (don't report 0).

**Dependency vulnerabilities:** Run the package manager's audit command:
- npm: \\\`npm audit --json\\\` — parse \\\`metadata.vulnerabilities\\\` for counts by severity
- yarn: \\\`yarn audit --json\\\` — parse summary line
- pnpm: \\\`pnpm audit --json\\\`
- Python: \\\`pip-audit --format=json\\\` (if available)
- Go: \\\`govulncheck ./...\\\` (if available)

Store in \\\`baseline.depVulnerabilities\\\`: \\\`{ critical, high, moderate, low, total }\\\`. If audit command is unavailable or fails, omit the field.

Also collect supporting counts for the LLM review (adapt patterns to the project's language):
- Type looseness indicators (\\\`any\\\` types in TS, \\\`# type: ignore\\\` in Python, etc.)
- Inline style count (if frontend)
- Error handling patterns (\\\`catch\\\`, \\\`except\\\`, \\\`recover\\\`, etc.)
- Largest source files by line count

**Sentry MCP detection:** Check if a Sentry MCP server is available by attempting to call the Sentry MCP tool (e.g., \\\`sentry_list_projects\\\` or \\\`sentry_search_issues\\\`). If available:
- Query unresolved issues count for the project
- Get error frequency / weekly event count
- Get crash-free session rate (if available)
- Get top 5 most frequent unresolved errors with stack traces
- Store results in \\\`baseline.sentry\\\`: \\\`{ unresolvedCount, crashFreeRate, weeklyErrorCount }\\\`

If no Sentry MCP is available, skip gracefully — the Runtime Health dimension will be scored as \\\`"confidence": "not-applicable"\\\` with a score of 10.

### Step 2 — LLM review (the real assessment)

This is what makes it better than grep. For each dimension, **read the actual code** and judge quality with understanding. Launch up to 3 Explore agents in parallel:

**Agent 1 — Code quality + domain logic review** (type safety + error handling + domain logic):

Discover and read:
- **Data/service layer** — Find the files that talk to databases, APIs, or external services. Are inputs/outputs typed? Are return types explicit? Do mutations provide user feedback or fail silently?
- **All error handling blocks** — Is the error surfaced to the user? Or is it logged and swallowed? Non-technical end users must never see raw errors.
- **Type definitions / domain models** — Are they comprehensive? Any escape hatches (\\\`any\\\`, \\\`object\\\`, untyped casts)?
- **Domain rules / business logic** — Find constants, calculation utilities, rule definitions, and service hooks that derive state. Are computations correct? Do rules match the spec? Are edge cases handled (zero values, boundary conditions, category overflow)? Do rule versions map correctly?

**DO NOT just count.** Read and judge: "This calculation is correct because it matches the constants file." or "This tier logic silently skips a category when hours are zero."
A wrong calculation is worse than a crash — it silently misinforms users.

**Agent 2 — Security + testing review**:

Discover and read:
- **Auth/security layer** — Find authentication, authorization, session handling, DB access control (RLS, middleware guards, etc.). Are there cross-user access paths? Token refresh? Session recovery?
- **Test files** — Are tests checking behavior or implementation? What modules have zero tests? Are error paths covered?
- **Dependencies** — Any known-vulnerable patterns? Outdated critical packages?
- **Secrets/config** — Any hardcoded secrets, API keys, or credentials in source?

**Agent 3 — Architecture + UX review** (architecture + CSS + accessibility):

Discover and read:
- **3 largest source files** — Is the size justified (clear linear flow) or is it a god component/class mixing concerns? Would extraction improve testability?
- **Component organization** — Single responsibility, concern separation, prop drilling depth, extraction opportunities.
- **Styling system** — Find CSS variables/tokens, theme files, component styles. Are design tokens used consistently? Hardcoded values that should be tokens?
- **Inline styles** (if frontend) — Are they justified (dynamic values) or lazy? Could they use the styling system?
- **Interactive elements** — Semantic HTML? Keyboard navigation? ARIA labels? Focus management in modals/dialogs? Real end users need these to work.

If the project is backend-only, Agent 3 focuses on: API documentation quality, consistent error response format, input validation coverage, module organization.

### Step 3 — Score each dimension

Score 1-10 based on the LLM review + hard metrics. Each score must include:

\\\`\\\`\\\`json
{
  "score": 7,
  "weight": "high",
  "confidence": "reviewed",
  "evidence": "Read 8 service files. 5/8 have typed returns. 3 still use untyped patterns. Two join queries are fully untyped.",
  "issues": 3,
  "findings": [
    {
      "id": "ts-001",
      "severity": "high",
      "file": "src/services/userService.ts",
      "line": 45,
      "finding": "Untyped database query result. If schema changes, breaks at runtime.",
      "fix": "Create typed interface for this query result",
      "effort": "small"
    }
  ]
}
\\\`\\\`\\\`

**Confidence levels:**
- \\\`"measured"\\\` — from build/lint/test output (objective)
- \\\`"reviewed"\\\` — LLM read the code and judged (informed opinion)
- \\\`"estimated"\\\` — inferred from grep counts without reading context (low confidence)

### Step 4 — Build backlog

Collect all findings from all dimensions. Sort by:
1. Severity (high > medium > low)
2. Weight of dimension (high > medium > low)
3. Effort (small fixes first within same severity — quick wins)

Write to \\\`.devmanager/quality/backlog.json\\\`:

\\\`\\\`\\\`json
{
  "generatedAt": "2026-03-17",
  "commitRef": "f1d3999",
  "items": [
    {
      "id": "ts-001",
      "dimension": "typeSafety",
      "severity": "high",
      "effort": "small",
      "file": "src/services/userService.ts",
      "line": 45,
      "finding": "Untyped query result — breaks at runtime if schema changes",
      "fix": "Create typed interface for query result",
      "status": "open"
    }
  ]
}
\\\`\\\`\\\`

### Step 5 — Trend analysis

Read previous \\\`latest.json\\\`. Compare each dimension. Flag:
- Any dimension that **dropped by 1+** → regression warning
- Any dimension that **improved by 2+** → highlight win
- Dimensions that have been **flat for 3+ audits** → stale

### Step 6 — Write outputs

1. **\\\`latest.json\\\`** — scores + top 10 findings + baseline
2. **\\\`history.json\\\`** — append entry (keep last 20)
3. **\\\`backlog.json\\\`** — full prioritized finding list
4. **\\\`reports/YYYY-MM-DD.md\\\`** — human-readable report

### Scoring formula

**Overall score** = weighted average:
- HIGH (type safety, error handling, security, testing, domain logic): 11% each = 55%
- MEDIUM (architecture, CSS, accessibility, runtime health): 9% each = 36%
- LOW (performance, devops): 4.5% each = 9%

**Note:** Runtime Health is MEDIUM weight because it depends on external data (Sentry). When Sentry is unavailable, the dimension is scored 10 with \\\`"confidence": "not-applicable"\\\` and effectively contributes a neutral 9% to the overall score — no penalty for projects without Sentry.

**Grade:** A (9+), A- (8-8.9), B+ (7-7.9), B (6-6.9), B- (5-5.9), C+ (4-4.9), C (3-3.9), D (<3)

---

## DIFF mode — incremental re-scan

1. Read \\\`latest.json\\\` → get \\\`commitRef\\\` from last scan
2. \\\`git diff {commitRef}..HEAD --name-only\\\` → list changed files
3. Map changed files to affected dimensions based on file type and location
4. Re-scan ONLY affected dimensions (LLM review on changed files)
5. Carry forward unchanged dimension scores from \\\`latest.json\\\`
6. Write updated report

---

## Creating tasks in dev-manager (automatic on scan)

Every \\\`scan\\\` reads \\\`backlog.json\\\` and creates/updates tasks in \\\`.devmanager/state.json\\\` under the **Quality** group.

### Mapping rules

| Finding field | Task field |
|--------------|-----------|
| \\\`dimension\\\` | \\\`group\\\` = \\\`"Quality"\\\` (all quality tasks use one group) |
| \\\`dimension\\\` label | prefix in task name (e.g., "Type Safety: 5 untyped returns") |
| \\\`fix\\\` | \\\`description\\\` |
| \\\`severity\\\` high/medium | task created with \\\`"status": "pending"\\\` |
| \\\`severity\\\` low | skipped (keep in backlog only) |
| \\\`effort\\\` small | added to notes: "Quick fix" |
| \\\`effort\\\` large | added to notes: "Requires planning" |

### Process

1. Read \\\`backlog.json\\\` — filter to high + medium severity, \\\`"status": "open"\\\`
2. Read \\\`.devmanager/state.json\\\` — get current tasks + next available ID
3. **Group findings by dimension** — create ONE task per dimension if multiple related findings exist, or separate tasks if they're in different areas
4. Set \\\`group\\\` = \\\`"Quality"\\\`. Add Quality epic if not present.
5. **De-duplicate:** check if a task with similar name already exists. Skip if found. If an existing task is already \\\`done\\\`, and the finding reappeared, create a new task (regression).
6. Write updated \\\`state.json\\\`
7. Report: "Created N Quality tasks in dev-manager. Launch orchestrator to fix them."

### CRITICAL rules for writing state.json

- **Get real timestamp:** Before writing, run \\\`node -e "console.log(Date.now())"\\\` and use that value for any \\\`time\\\` field. NEVER construct timestamps manually or use round numbers.
- **No special characters in text fields:** Use \\\` - \\\` (space-hyphen-space) instead of em dashes. Use plain ASCII quotes, not curly quotes. State.json is read by the browser File System Access API and encoding issues corrupt the display.
- **Preserve ALL existing data:** When writing state.json, you MUST keep every existing task, queue item, activity entry, and epic exactly as-is. Only ADD new tasks and a single new activity entry. Never remove or modify existing entries.
- **Activity entry format:** Add exactly ONE activity entry for the scan with the real timestamp from step above:
  \\\`\\\`\\\`json
  { "id": "act_{timestamp}_scan", "time": {timestamp}, "label": "Code health scan: {score}/10 ({grade}) - {summary}" }
  \\\`\\\`\\\`

---

## QUICK mode

Build + lint + test + bundle + coverage + dep audit only. No LLM review, no file writes. One-paragraph output:

\\\`\\\`\\\`
Health check — 2026-03-17, commit f1d3999:
Build: passing | Lint: 26 errors | Tests: 56/56 | Coverage: 74% | Bundle: 84KB gzip | Deps: 0 vulns
vs 2026-03-16: lint -2, tests +4, coverage +2%, bundle +1KB
\\\`\\\`\\\`

---

## Dimensions reference

### 1. Type Safety (HIGH)
What to review: type escape hatches (\\\`any\\\`, \\\`object\\\`, \\\`as\\\` casts, type ignores), untyped external data (API responses, DB rows), catch/error narrowing, return type annotations.
Discover: type definition files, service/data layer, API client code.

### 2. Component Architecture (MEDIUM)
What to review: file size, single responsibility, concern separation (data + UI + modals mixed?), prop drilling / deep nesting, extraction opportunities.
Discover: largest source files, page/view components, entry points.
**Important:** Size alone doesn't determine score. A 500-LOC file with clear linear flow scores higher than a 200-LOC file mixing 3 concerns.

### 3. Error Handling (HIGH)
What to review: mutation/write feedback (user notification on success+failure), catch/except block quality (user feedback vs log-and-swallow), error boundary/middleware coverage, loading/error states.
Discover: files with write operations (insert, update, delete, POST, PUT), error handling middleware.

### 4. Testing (HIGH)
What to review: test file existence per module, behavior vs implementation testing, error path coverage, test utilities, mock quality. **Domain logic coverage is critical** — business rule calculations, state transitions, and data derivations must have dedicated tests. A missing domain logic test is a high-severity finding.
Discover: test directories, check which modules have zero coverage. Specifically verify that business rule files have corresponding test files.

### 5. CSS / Design System (MEDIUM)
What to review: design token usage, inline style justification (dynamic = ok, lazy = bad), dead selectors, undefined variables, hardcoded colors/sizes.
Discover: theme/variable files, component style files, largest UI files.
For non-frontend projects: skip or assess API response format consistency instead.

### 6. Domain Logic Correctness (HIGH)
What to review: business rule accuracy (calculations, state transitions, categorization logic), edge cases in domain computations (zero values, boundary conditions, overflow, mid-period changes), rule versioning, data invariants (totals match sums, status transitions are valid), derived state consistency (computed values agree with source data).
Discover: constants/rules files, calculation utilities, service hooks that derive state, type definitions encoding business rules.
**Critical:** A wrong calculation is worse than a crash — it silently misinforms. Verify rules against spec documents or constants files. Check that edge cases are handled, not just the happy path.

### 7. Accessibility (MEDIUM)
What to review: semantic HTML (\\\`<button>\\\` vs \\\`<div onClick>\\\`), keyboard navigation, ARIA labels, focus management in modals/dialogs.
Discover: interactive components, modals, form elements.
For non-frontend projects: assess API documentation quality, error message clarity.

### 8. Security (HIGH)
What to review: access control (RLS, middleware guards, auth checks), auth token handling, injection vectors (XSS, SQL, command), secret leaks, dependency vulnerabilities, input validation. For apps with sensitive data: cross-user data access paths, bearer token scope, file upload sanitization, data exposure in client bundles, storage bucket policies.
Discover: auth files, DB schema/migrations, middleware, environment config, RLS policies, storage bucket rules.

### 9. Performance (LOW)
What to review: bundle size, code splitting, memoization of expensive paths, dev-only code in prod, lazy loading, N+1 queries.
Measured: build output for bundle/binary size. LLM review for optimization opportunities.

### 10. DevOps / Build Health (LOW)
What to review: build warnings, lint error count, test reliability, CI/CD presence, deployment automation, environment parity.
Mostly measured from baseline metrics.

### 11. Runtime Health (MEDIUM) — requires Sentry MCP
What to review: unresolved Sentry error count, error frequency trends (weekly event volume going up or down?), crash-free session rate, regression detection (new errors introduced by recent deploys), top recurring errors and whether they have corresponding error handling in code.
Discover: query the Sentry MCP for the project's issues, events, and session data.

**Scoring guide:**
- **9-10:** <5 unresolved issues, crash-free rate >99.5%, error volume trending down
- **7-8:** 5-15 unresolved issues, crash-free rate >99%, stable error volume
- **5-6:** 15-30 unresolved issues, crash-free rate >98%, some regressions from recent deploys
- **3-4:** 30-50 unresolved issues, crash-free rate >95%, recurring unhandled errors
- **1-2:** 50+ unresolved issues, crash-free rate <95%, error volume trending up, many unhandled exceptions

**Cross-reference with Error Handling (dim 3):** If Sentry shows frequent unhandled errors in specific files, check whether those files have proper error handling. Feed file paths from Sentry stack traces into the Error Handling review. This creates actionable findings like "src/api/users.ts:45 — Sentry shows 200 occurrences/week of unhandled TypeError; add try-catch with user feedback."

**When Sentry MCP is unavailable:** Score 10 with \\\`"confidence": "not-applicable"\\\`. Do not penalize projects that don't use Sentry.

---

## Key rules

1. **Read code, don't just grep.** The LLM review IS the assessment. Grep counts are supporting evidence.
2. **Every finding needs a file path + line number + concrete fix suggestion.** No vague "improve error handling."
3. **Score based on understanding.** A 400-LOC component that's a clean linear pipeline scores higher than a 150-LOC component mixing concerns.
4. **Trends over absolutes.** A 6 that was a 4 is great. A 6 that was an 8 is alarming.
5. **Small fixes first.** In backlog, pick quick wins within the same severity tier.
6. **Don't commit.** Scan and report only, let the user decide next steps.
7. **Be honest.** If you can't assess something properly, say \\\`"confidence": "estimated"\\\` and explain why.
8. **Adapt to the project.** Don't score CSS if it's a CLI tool. Don't score domain logic if there are no business rules. Adjust dimensions to what's relevant — but always score all 11 for dashboard consistency (mark irrelevant ones as 10 with \\\`"confidence": "not-applicable"\\\`).
9. **Runtime Health requires Sentry MCP.** If the Sentry MCP server is not configured, score Runtime Health as 10 with \\\`"confidence": "not-applicable"\\\`. Never fail a scan because Sentry is unavailable.
`;
