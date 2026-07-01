# Orchestra Session Manager Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the local orchestra from a passive status dashboard into the
user-facing Open Relay session manager. A local user should launch Orchestra,
see current and previous sessions, create a new session with an automatically
generated Relay Session ID, and get a ready Codex thread without reading logs or
manually wiring process commands.

**Architecture:** Keep the current `experimental orchestra` HTTP dashboard as
the local entrypoint. Add a small session store under `.open-relay/sessions/`,
session-management endpoints, and a Codex session-launch helper that composes
the Codex app-server protocol. The first implementation should create the
session and Codex thread only; starting PR-specific relay-watch and
response-watch loops remains a follow-up action once a PR exists.

**Tech Stack:** TypeScript on Node.js, current static local HTTP dashboard,
Codex app-server JSON-RPC, existing Node test runner, no new dependencies.

---

## Proof First

Before this plan was written, a live no-turn proof was run against a disposable
Codex app-server:

- Started disposable server:
  `codex app-server -c 'service_tier="fast"' --listen ws://127.0.0.1:43211`
- Generated protocol bindings confirmed `thread/start` and `thread/name/set`
  are supported app-server methods.
- A local WebSocket probe initialized the app-server, called `thread/start`
  with cwd `/Users/cam/Documents/Across Works/Open Relay`, then called
  `thread/name/set`.
- Proof result:
  - Relay Session ID: `RI70MT79`
  - Codex thread title: `RI70MT79-OR-CX launch proof`
  - Codex thread id: `019f1f5b-1ee8-7042-ae0b-5deb57cfb008`

Finding: Open Relay can create and name a new Codex thread through the Codex
app-server without starting an agent turn. The implementation must own or
verify app-server startup, and live WebSocket probes must run outside Codex's
network-disabled shell sandbox.

## Scope

- Add a session manager around the existing orchestra dashboard.
- Generate Relay Session IDs automatically.
- Store session manifests under `.open-relay/sessions/<relay_session_id>/`.
- List current and previous sessions in the Orchestra UI.
- Add a "New Session" action that creates a manifest, ensures the Codex
  app-server is reachable, creates a Codex thread, names it
  `<relay_session_id>-OR-CX`, and records the thread id.
- Show simple states: `ready`, `attention`, `failed`, and `stopped`.
- Keep raw logs behind a details affordance or local files, not in the primary
  user flow.
- Keep Claude, PR watchers, packet posting, fixes, merges, tags, releases,
  package publishing, and packet schema changes out of this first slice.

## Non-Goals

- No packet schema changes.
- No daemon, LaunchAgent, or menu-bar app yet.
- No automatic Claude invocation.
- No automatic GitHub PR creation, packet posting, fixing, merging, publishing,
  or deployment.
- No multi-user or hosted session store.
- No destructive delete of session history in the first slice.

## Session Manifest

Store a manifest at:

```text
.open-relay/sessions/<relay_session_id>/session.json
```

Minimum fields:

```json
{
  "relay_session_id": "RI70MT79",
  "created_at": "2026-07-02T00:00:00.000Z",
  "updated_at": "2026-07-02T00:00:00.000Z",
  "status": "ready",
  "cwd": "/Users/cam/Documents/Across Works/Open Relay",
  "codex": {
    "url": "ws://127.0.0.1:43210",
    "thread_id": "019f...",
    "thread_title": "RI70MT79-OR-CX"
  },
  "paths": {
    "relay_status_file": ".open-relay/sessions/RI70MT79/relay-status.json",
    "response_state_file": ".open-relay/sessions/RI70MT79/response-state.json",
    "receipts_dir": ".open-relay/sessions/RI70MT79/receipts",
    "logs_dir": ".open-relay/sessions/RI70MT79/logs"
  }
}
```

Write the manifest last when creating a session so incomplete setup is visible
as failed or partial state, not a ready session.

## Lifecycle And Scope

| Lens | Decision |
| --- | --- |
| Create/attach | Local user clicks "New Session" or runs the future CLI route; Orchestra generates the ID, creates local directories, starts or verifies the Codex app-server, creates a Codex thread, and writes a manifest. |
| List/search/view | Orchestra lists sessions from `.open-relay/sessions/*/session.json`, ordered by updated time, with current status and thread title. |
| Edit/update | Session status, Codex thread id/title, watcher file paths, and timestamps can update; Relay Session ID is immutable. |
| Activate/archive/delete | Start/stop status is in scope; archive and destructive delete remain deferred. |
| Ownership | The local user owns sessions, local processes, ports, and local files. |
| Permissions/scope | Uses local filesystem, local Codex app-server, local `gh`, and local Claude CLI checks. No hosted permissions. |
| Audit/events | Session manifest, receipts, status JSON, local logs, git history, and PR review are the evidence trail. |
| Notifications | Dashboard status is in scope; desktop notifications remain through existing watcher notification support. |
| Billing/quota | Creating a Codex thread has no agent turn; starting a turn, Claude, or watchers remains explicitly gated in later flows. |
| Error/recovery/smoke | Empty session list, app-server offline, thread-create failure, dirty git state, missing auth, and stale watcher evidence must render as neutral/attention states with recovery guidance. |

## Assignment And Scope Matrix

| Actor role | Item scope | Allowed actions | Blocked actions | Ownership | Transfer/reassignment | Inactive user behavior | Audit/event requirements |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Local operator | Orchestra session | Create, list, open, stop, and inspect session state | Delete history, invoke agents, post packets, merge, publish, or bypass confirmation gates | Owns local session directory, dashboard process, app-server process, and Codex thread target | N/A for local-only MVP | Stopped sessions stay listed until archive/delete is designed | Manifest, status JSON, receipts, logs, and git/PR evidence |
| Open Relay process | Session manifest and local child processes | Write manifest, update status, create Codex thread, monitor health | Read secrets, post packets, run Claude, or mutate GitHub without explicit later commands | Process is owned by local operator | N/A | Failed startup leaves failed/partial state | Structured status fields and local logs |

## Files

- Create: `src/sessionManager.ts`
- Create: `tests/sessionManager.test.ts`
- Modify: `src/codexApp.ts`
- Modify: `src/orchestraStatus.ts`
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Modify: `tests/orchestraStatus.test.ts`
- Modify: `tests/cli.test.ts`
- Modify: `scripts/smoke-pack.js`
- Modify: `README.md`
- Modify: `docs/protocol/local-orchestra-dashboard.md`
- Modify: `master_build.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

## Tasks

### Task 1: RED Session Launch Tests

**Files:**
- Create: `tests/sessionManager.test.ts`

- [ ] Add a failing test for automatic Relay Session ID generation.
- [ ] Add a failing test that session creation writes directories and a
  manifest-last session record.
- [ ] Add a failing injected Codex app-server test that calls
  `thread/start` and `thread/name/set` and records the returned thread id.
- [ ] Add a failing test for app-server-unavailable recovery state.
- [ ] Verify RED with targeted build/test before implementation.

### Task 2: Session Manager Core

**Files:**
- Create: `src/sessionManager.ts`
- Modify: `src/codexApp.ts`
- Modify: `src/index.ts`

- [ ] Implement Relay Session ID generation with collision retry against the
  local session store.
- [ ] Implement manifest path creation, receipts/logs directories, and
  manifest-last writes.
- [ ] Add a Codex helper for `thread/start` plus `thread/name/set` without
  starting a turn.
- [ ] Ensure WebSocket close handling does not report failure after successful
  launch.
- [ ] Keep all secrets out of manifests and logs.

### Task 3: Orchestra Manager UI And Endpoints

**Files:**
- Modify: `src/orchestraStatus.ts`
- Modify: `tests/orchestraStatus.test.ts`

- [ ] Add `/sessions.json` for current and previous sessions.
- [ ] Add `POST /sessions` or an equivalent local-only create action.
- [ ] Add dashboard sections for "New Session", "Current Session", and
  "Previous Sessions".
- [ ] Keep logs collapsed behind details, not visible in the primary flow.
- [ ] Show simple status labels and recovery guidance for attention/failure
  states.

### Task 4: CLI, Docs, And Package Smoke

**Files:**
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`
- Modify: `scripts/smoke-pack.js`
- Modify: `README.md`
- Modify: `docs/protocol/local-orchestra-dashboard.md`

- [ ] Document the user flow as "launch Orchestra, click New Session, type in
  Codex".
- [ ] Add optional CLI fallback if useful:
  `open-relay experimental session start`.
- [ ] Add package-smoke help coverage for any new CLI route.
- [ ] Document that PR-specific watchers start after a PR exists.

### Task 5: Governance Closeout

**Files:**
- Modify governance docs listed above.

- [ ] Move roadmap row from planned to done when implementation lands.
- [ ] Record verification and live no-turn launch smoke evidence.
- [ ] Update lifecycle matrix from planned to shipped for the session manager.
- [ ] Open PR and request review through Open Relay packet transport.

## Verification Plan

- RED targeted test first:
  `npm run build && node --test dist/tests/sessionManager.test.js`
- Targeted implementation tests:
  `npm run build && node --test dist/tests/sessionManager.test.js dist/tests/orchestraStatus.test.js dist/tests/cli.test.js`
- Full local check: `npm run check`
- Package smoke: `npm run smoke:pack`
- Release preflight: `npm run release:preflight -- 0.1.0`
- Whitespace: `git diff --check`
- Live no-turn smoke:
  1. Start a disposable Codex app-server on an available localhost port.
  2. Start Orchestra.
  3. Click or call "New Session".
  4. Confirm a session manifest exists.
  5. Confirm a new Codex thread appears with title `<relay_session_id>-OR-CX`.
  6. Confirm no Codex turn, Claude invocation, GitHub post, merge, publish, or
     packet schema change occurred.
