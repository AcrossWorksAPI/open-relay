# Local Relay Watch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first local foreground watcher that moves a GitHub PR `review-request` packet to headless Claude and posts a validated `review-response` packet back without human copy/paste.

**Architecture:** Add `open-relay experimental relay-watch` as a GitHub-PR-only orchestrator that composes existing exact packet transport, Claude prompt rendering, review-response producer, and GitHub packet posting. The command supports one-shot polling for tests and `--watch` foreground polling for local automation, with a local state file to avoid re-processing the same request.

**Tech Stack:** TypeScript on Node.js, existing `gh` CLI transport, existing packet schemas/renderers/producers, headless `claude -p --output-format stream-json`, Node test runner.

---

## Scope

- Add `src/relayWatch.ts` with parser, one-shot orchestration, Claude JSON draft extraction, state handling, and receipts.
- Add `open-relay experimental relay-watch`.
- Require `--confirm-live` before invoking Claude.
- Require `--confirm-public` before outward GitHub PR posting.
- Support `--dry-run` to fetch and render the latest request without invoking Claude or posting.
- Support `--watch` plus `--interval-ms` as a foreground polling loop; default remains one pass.
- Store handled request identity in a local state file under `.open-relay/relay-watch/` unless overridden.
- Do not change packet schemas, install a daemon, merge, publish, deploy, or apply fixes.

## Files

- Create: `src/relayWatch.ts`
- Create: `tests/relayWatch.test.ts`
- Create: `docs/protocol/local-relay-watch.md`
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
| List/search/view | The watcher fetches the latest `review-request/0.1` packet from a configured GitHub PR and author. |
| Edit/update | It creates a reviewer-authored draft through Claude, validates a `review-response/0.1`, and posts or updates an Open Relay packet comment. |
| Activate/archive/delete | `--watch` keeps the process active until the user stops it. Daemon install, archive, and background service lifecycle are deferred. |
| Ownership | Local CLI user owns the watcher process, state file, credentials, model spend, and PR target. |
| Permissions/scope | Uses local `gh` auth for GitHub and local Claude auth or allowed secrets env keys for Claude. Public posting requires `--confirm-public`; Claude spend requires `--confirm-live`. |
| Audit/events | JSON receipt, local state file, PR packet comments, and git history are evidence. |
| Notifications | Deferred; the watcher logs/persists receipts but does not send notifications. |
| Billing/quota | Claude invocation can spend model quota and is blocked without `--confirm-live`. |
| Error/recovery/smoke | Dry-run, duplicate-state skip, malformed Claude output, invalid packets, and failed posts return failed/skipped receipts without leaking secrets. |

## Tasks

### Task 1: Parser And Receipt Tests

**Files:**
- Create: `tests/relayWatch.test.ts`
- Create: `src/relayWatch.ts`

- [x] Write failing parser tests for defaults, explicit flags, duplicate flags, invalid PR target, and `--dry-run`/`--confirm-live` conflicts.
- [x] Run `npm run build && node --test dist/tests/relayWatch.test.js` and verify parser tests fail because `src/relayWatch.ts` does not exist.
- [x] Implement `parseRelayWatchArgs`, default state path, and receipt types.
- [x] Re-run the targeted test and verify parser tests pass.

### Task 2: One-Shot Dry-Run And State Skip

**Files:**
- Modify: `tests/relayWatch.test.ts`
- Modify: `src/relayWatch.ts`

- [x] Add failing tests for a one-shot dry-run that fetches a request packet through injected `runGh`, renders a Claude prompt, does not spawn Claude, does not post, and returns a `dry-run` receipt.
- [x] Add failing tests for a state-file match that skips an already handled request unless `--force` is set.
- [x] Implement `runRelayWatchOnce`, state load/write helpers, and dry-run/skipped receipts.
- [x] Re-run targeted tests and verify they pass.

### Task 3: Claude Draft To PR Response

**Files:**
- Modify: `tests/relayWatch.test.ts`
- Modify: `src/relayWatch.ts`

- [x] Add failing tests for confirmed live mode that invokes injected Claude, parses a review-response draft JSON object from stream-json output, builds a valid `review-response`, posts through injected GitHub transport, and writes handled state.
- [x] Add failing tests for malformed Claude output and invalid review-response draft schema.
- [x] Implement Claude process runner, JSON draft extraction, response validation, GitHub send composition, and state write after successful post/update.
- [x] Re-run targeted tests and verify they pass.

### Task 4: CLI And Package Smoke

**Files:**
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Modify: `tests/cli.test.ts`
- Modify: `scripts/smoke-pack.js`
- Modify: `README.md`
- Create: `docs/protocol/local-relay-watch.md`

- [x] Add failing CLI help and dry-run/package-smoke assertions.
- [x] Wire `experimental relay-watch` into CLI, including one-shot receipt output and foreground `--watch` loop.
- [x] Export the new parser and runner from `src/index.ts`.
- [x] Document command contract, required confirmations, state file, and non-goals.
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

- [x] Update roadmap and active work to add the local relay watch slice as in progress on `codex/local-relay-watch`.
- [x] Record verification evidence after tests pass.
- [x] Update lifecycle matrix with foreground watcher scope, posting gate, state file, and quota gate.
- [x] Run `npm run check`, `npm run smoke:pack`, `npm run release:preflight -- 0.1.0`, and `git diff --check`.

## Verification Plan

- Targeted RED/GREEN command: `npm run build && node --test dist/tests/relayWatch.test.js`
- Full verification: `npm run check`
- Package smoke: `npm run smoke:pack`
- Release preflight: `npm run release:preflight -- 0.1.0`
- Whitespace: `git diff --check`
- Optional live smoke, only when owner wants a real post: run `open-relay experimental relay-watch --pr <pr> --author <login> --relay-session-id R7M4Q9K2 --confirm-live --confirm-public --force --output /private/tmp/open-relay-relay-watch.json`
