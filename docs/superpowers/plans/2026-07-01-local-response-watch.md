# Local Response Watch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Codex-side foreground watcher that fetches a GitHub PR `review-response/0.1` packet, derives a `resume-project/0.1` continuation packet, and optionally wakes a Codex desktop thread without human packet-body copy/paste.

**Architecture:** Add `open-relay experimental response-watch` as the reverse leg of `experimental relay-watch`. It composes existing GitHub PR packet fetch, schema validation, `buildResumeProjectPacket`, Codex prompt rendering, and the local Codex app-server WebSocket path. The command is foreground and explicit: dry-run never contacts Codex, live mode requires `--confirm-live`, and watch mode is bounded by `--max-turns` and `--max-failures`.

**Tech Stack:** TypeScript on Node.js, existing GitHub PR transport, existing `review-response` and `resume-project` packet modules, Codex app-server WebSocket JSON-RPC, Node test runner.

---

## Scope

- Add `src/codexApp.ts` with reusable Codex app-server helpers extracted from `watcherProof`.
- Update `src/watcherProof.ts` to reuse the shared Codex helper without behavior changes.
- Add `src/responseWatch.ts` with parser, one-shot orchestration, state handling, receipts, prompt creation, and bounded watch options.
- Add `open-relay experimental response-watch`.
- Fetch the newest marker-backed `review-response/0.1` packet from a required GitHub comment author.
- Validate the fetched packet before deriving a resume packet.
- Build a `resume-project/0.1` packet from the response packet and render it through the existing Codex prompt template.
- Support `--dry-run` to fetch, validate, derive, and preview without contacting Codex.
- Require `--confirm-live` before starting a Codex turn.
- Store handled response identity in a local state file under `.open-relay/response-watch/` unless overridden.
- Support `--watch` plus bounded `--max-turns`, `--max-failures`, and minimum `--interval-ms` as a foreground polling loop.
- Write a JSON receipt, with per-iteration receipt files in watch mode when `--output` is set.
- Do not change packet schemas, install a daemon, invoke Claude, post to GitHub, apply fixes, merge, publish, or deploy.

## Files

- Create: `src/codexApp.ts`
- Create: `src/responseWatch.ts`
- Create: `tests/responseWatch.test.ts`
- Create: `docs/protocol/local-response-watch.md`
- Modify: `src/watcherProof.ts`
- Modify: `tests/watcherProof.test.ts`
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
| Create/attach | User starts a foreground CLI watcher explicitly. No daemon is installed. |
| List/search/view | The watcher fetches the latest `review-response/0.1` packet from a configured GitHub PR and author. |
| Edit/update | It derives a local `resume-project/0.1` packet and starts a Codex turn only when `--confirm-live` is present. |
| Activate/archive/delete | `--watch` stays foreground until stopped, `--max-turns` is reached, or `--max-failures` is reached. Daemon lifecycle is deferred. |
| Ownership | Local CLI user owns the watcher process, state file, PR target, Codex target thread, and local receipt path. |
| Permissions/scope | Uses local `gh` auth for fetch and local Codex app-server permissions for thread wake. `--author` is a weak GitHub comment filter, not strong packet authorship. |
| Audit/events | JSON receipts, local state, Codex turn id, fetched PR packet comments, command output, git history, and PR review are evidence. |
| Notifications | Deferred to the supervisor/status layer; this slice wakes Codex but does not send desktop notifications. |
| Billing/quota | No Claude spend. Codex local app usage is gated by `--confirm-live`. |
| Error/recovery/smoke | Missing packets, invalid packets, handled state, Codex search ambiguity, Codex turn failures, and unconfirmed live mode return structured receipts. |

## Tasks

### Task 1: Shared Codex App Helper

**Files:**
- Create: `src/codexApp.ts`
- Modify: `src/watcherProof.ts`
- Modify: `tests/watcherProof.test.ts`

- [x] Add failing tests by running existing watcher proof tests after moving no code; expected failure is import/module missing once `watcherProof` imports `codexApp`.
- [x] Create `src/codexApp.ts` with `CodexAppClient`, `startCodexTurn`, `findCodexThreadId`, and WebSocket types moved from `watcherProof`.
- [x] Update `watcherProof` to call `startCodexTurn` with its proof prompt.
- [x] Re-run `npm run build && node --test dist/tests/watcherProof.test.js`.

### Task 2: Response Watch Parser And Dry Run

**Files:**
- Create: `tests/responseWatch.test.ts`
- Create: `src/responseWatch.ts`

- [x] Write failing parser tests for defaults, explicit flags, invalid PR target, duplicate flags, invalid interval, invalid max values, and `--dry-run` plus `--confirm-live`.
- [x] Write failing dry-run test that fetches a fake `review-response/0.1`, validates it, builds a resume packet, renders Codex prompt preview, and does not contact Codex.
- [x] Run `npm run build && node --test dist/tests/responseWatch.test.js`; expected failure: `Cannot find module '../src/responseWatch'`.
- [x] Implement parser, receipt types, default state path, dry-run flow, state skip, and prompt builder.
- [x] Re-run the targeted response-watch test.

### Task 3: Live Codex Wake And State

**Files:**
- Modify: `tests/responseWatch.test.ts`
- Modify: `src/responseWatch.ts`

- [x] Add failing tests for unconfirmed live mode not contacting Codex.
- [x] Add failing tests for confirmed live mode calling injected Codex turn starter, writing handled state after successful Codex completion, and returning a receipt with `turn_id`.
- [x] Add failing tests for Codex failure returning a failed receipt without writing state.
- [x] Implement live confirmation gate, Codex turn call, state write, and failure receipts.
- [x] Re-run targeted response-watch tests.

### Task 4: CLI And Package Smoke

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Modify: `tests/cli.test.ts`
- Modify: `scripts/smoke-pack.js`
- Modify: `README.md`
- Create: `docs/protocol/local-response-watch.md`

- [x] Add failing CLI help and fake-`gh` dry-run tests.
- [x] Wire `experimental response-watch` into the CLI with one-shot and bounded watch behavior.
- [x] Export parser, runner, and prompt helper from `src/index.ts`.
- [x] Document command contract, confirmations, state, trust model, and non-goals.
- [x] Re-run targeted CLI tests and package smoke.

### Task 5: Governance Closeout

**Files:**
- Modify: `master_build.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

- [x] Add the local response-watch slice to the roadmap as `v0.1.0-pre.next` until a PR exists.
- [x] Record source files, tests, protocol docs, risks, and evidence.
- [x] Run `npm run check`, `npm run smoke:pack`, `npm run release:preflight -- 0.1.0`, and `git diff --check`.
- [ ] Open a draft PR stacked on `codex/local-relay-status-indicator`.
- [ ] Replace temporary roadmap tracking with the PR-numbered pre-release label.

## Verification Plan

- Targeted RED/GREEN: `npm run build && node --test dist/tests/watcherProof.test.js dist/tests/responseWatch.test.js`
- CLI target: `npm run build && node --test dist/tests/cli.test.js dist/tests/responseWatch.test.js`
- Full verification: `npm run check`
- Package smoke: `npm run smoke:pack`
- Release preflight: `npm run release:preflight -- 0.1.0`
- Whitespace: `git diff --check`
- Optional live smoke, only with owner approval: run `open-relay experimental response-watch --pr <pr> --author <login> --relay-session-id R7M4Q9K2 --codex-thread-id <thread-id> --confirm-live --watch --max-turns 1 --max-failures 1 --output /private/tmp/open-relay-response-watch.json`.
