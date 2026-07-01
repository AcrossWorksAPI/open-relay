# Local Orchestra Status GUI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small local dashboard that shows the current Open Relay code
version and whether the local relay systems are reachable, running, and backed
by recent watcher evidence.

**Architecture:** Add `open-relay experimental orchestra` as a local HTTP
server plus `--check` JSON snapshot command. The command composes existing
foreground watcher artifacts instead of becoming a daemon: it checks package
version, git branch/commit/dirty state, Codex app-server health, `gh auth
status`, Claude CLI availability, and optional relay/response watcher files.

**Tech Stack:** TypeScript on Node.js, Node built-in HTTP server, existing CLI
test stack, no new dependencies.

---

## Scope

- Add `src/orchestraStatus.ts` for argument parsing, status snapshot building,
  local HTTP serving, static HTML rendering, and best-effort browser open.
- Add `open-relay experimental orchestra`.
- Add `/status.json` for local machine-readable status.
- Add `--check` for one-shot status snapshots.
- Show package version, git branch, short commit, and dirty-worktree state.
- Show Codex app-server health, GitHub CLI auth, Claude CLI availability, and
  watcher evidence from existing status/state files.
- Keep the dashboard passive: no agent invocation, packet posting, daemon
  install, fixes, merge, publish, or packet schema changes.

## Files

- Create: `src/orchestraStatus.ts`
- Create: `tests/orchestraStatus.test.ts`
- Create: `docs/protocol/local-orchestra-dashboard.md`
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Modify: `tests/cli.test.ts`
- Modify: `scripts/smoke-pack.js`
- Modify: `README.md`
- Modify: `master_build.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

## Lifecycle And Scope

| Lens | Decision |
| --- | --- |
| Create/attach | User starts a foreground local dashboard explicitly. No daemon is installed. |
| List/search/view | Dashboard views local git/package state and configured watcher evidence. |
| Edit/update | Refreshes status snapshots only; it does not mutate packet state. |
| Activate/archive/delete | Foreground server runs until stopped by the user or process manager. |
| Ownership | Local CLI user owns the dashboard process, chosen port, and status file paths. |
| Permissions/scope | Uses local process permissions, local `gh`, local Claude CLI, and local Codex health endpoint. |
| Audit/events | Local command output, `/status.json`, browser view, git history, and PR review are evidence. |
| Notifications | Uses existing relay-watch notification/status files; the dashboard itself does not send notifications. |
| Billing/quota | No agent calls and no token spend. |
| Error/recovery/smoke | Missing services are visible as failed or attention states; dashboard does not restart them. |

## Tasks

### Task 1: Status Model And Tests

**Files:**
- Create: `tests/orchestraStatus.test.ts`
- Create: `src/orchestraStatus.ts`

- [x] Add failing parser/status/HTML tests for default options, invalid port,
  injected status checks, and no secret-name leakage in the static HTML.
- [x] Implement parser, version checks, service checks, watcher evidence
  parsing, overall status derivation, and dashboard HTML rendering.
- [x] Run `npm run build && node --test dist/tests/orchestraStatus.test.js`.

### Task 2: CLI And Package Smoke

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Modify: `tests/cli.test.ts`
- Modify: `scripts/smoke-pack.js`

- [x] Add CLI help coverage for `experimental orchestra`.
- [x] Wire `--check` to print JSON and dashboard mode to serve the local HTTP
  UI.
- [x] Export the dashboard helpers from the package entrypoint.
- [x] Add installed-package smoke coverage for help and one-shot `--check`.

### Task 3: Docs And Governance

**Files:**
- Modify: `README.md`
- Create: `docs/protocol/local-orchestra-dashboard.md`
- Modify governance docs listed above.

- [x] Document command inputs, status model, failure boundaries, and non-goals.
- [x] Record source files, tests, risks, and evidence in roadmap governance.
- [x] Run full local verification.
- [ ] Push the branch and open a PR.
- [ ] Run the dashboard locally and open it for operator review.

## Verification Plan

- Targeted: `npm run build && node --test dist/tests/orchestraStatus.test.js dist/tests/cli.test.js`
- Full: `npm run check`
- Package smoke: `npm run smoke:pack`
- Release preflight: `npm run release:preflight -- 0.1.0`
- Whitespace: `git diff --check`
- Local GUI smoke: start `open-relay experimental orchestra --relay-session-id
  R7M4Q9K2 --open`, fetch `/status.json`, and confirm the browser opens.
