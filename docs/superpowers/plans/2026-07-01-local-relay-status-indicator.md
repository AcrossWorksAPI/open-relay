# Local Relay Status Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a small local operator indication layer to the experimental foreground relay watcher so the desktop user can see whether a run completed, posted, skipped, failed, or dry-ran without reading the full receipt stream.

**Architecture:** Keep `experimental relay-watch` as the orchestration engine. Add optional `--status-file` JSON output and optional macOS desktop notifications using platform-native `osascript`. Do not add a daemon, menu-bar app, packet schema changes, or new dependencies.

**Tech Stack:** TypeScript on Node.js, existing relay-watch receipt model, Node test runner, macOS `osascript` for optional notifications.

---

## Scope

- Add `--status-file <path>` to write the latest local operator status JSON.
- Add `--notify` to request a macOS desktop notification for completed relay-watch iterations.
- Keep status JSON separate from packet transport, relay state, and receipts.
- Fail the command if an explicitly requested status file cannot be written.
- Treat notification delivery as best-effort local operator feedback; warn on notification failure without changing packet outcome.
- Do not change packet schemas, install a daemon, wake Codex, apply fixes, merge, publish, deploy, or create a menu-bar app.

## Files

- Create: `src/relayWatchStatus.ts`
- Create: `tests/relayWatchStatus.test.ts`
- Modify: `src/relayWatch.ts`
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Modify: `tests/relayWatch.test.ts`
- Modify: `tests/cli.test.ts`
- Modify: `scripts/smoke-pack.js`
- Modify: `README.md`
- Modify: `docs/protocol/local-relay-watch.md`
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
| Create/attach | User opts into status output with `--status-file` and notifications with `--notify`. |
| List/search/view | Status JSON is a local latest-state projection; notifications are transient desktop indicators. |
| Edit/update | Each completed run or watch iteration overwrites the status file with the latest status. |
| Activate/archive/delete | No persistent service is installed. The status file is managed by the local user. |
| Ownership | Local CLI user owns the status path and desktop notification permission. |
| Permissions/scope | Uses filesystem writes for status and macOS `osascript` for notifications; no new network or secrets access. |
| Audit/events | Receipts, PR packet comments, and state remain authoritative; status JSON is operator visibility. |
| Notifications | Optional best-effort macOS desktop notifications only. |
| Billing/quota | No new model spend. Existing relay-watch gates still control Claude invocation. |
| Error/recovery/smoke | Status write failure fails closed; notification failure warns and continues. |

## Tasks

### Task 1: Status Module Tests

- [x] Add failing tests for receipt-to-status projection, status JSON writing, notification copy, and `osascript` invocation.
- [x] Run the targeted build and verify it fails because `src/relayWatchStatus.ts` does not exist.
- [x] Implement the status projection, writer, notification builder, and macOS notifier.
- [x] Re-run targeted tests.

### Task 2: CLI Wiring

- [x] Add parser coverage for `--status-file` and `--notify`.
- [x] Write status JSON after one-shot and per-iteration watch receipts.
- [x] Send optional notification after each completed run or iteration.
- [x] Keep notification failure non-critical and status write failure explicit.

### Task 3: Docs And Governance

- [x] Document the status file and notification flags in README and protocol docs.
- [x] Update package smoke help coverage.
- [x] Update roadmap, active work, plan registry, version ledger, status, and lifecycle scope matrix.
- [x] Run full verification before opening the PR.
- [x] After PR creation, replace temporary `v0.1.0-pre.next` tracking with the PR-numbered pre-release label.

## Verification Plan

- Targeted RED/GREEN command: `npm run build && node --test dist/tests/relayWatch.test.js dist/tests/cli.test.js dist/tests/relayWatchStatus.test.js`
- Full verification: `npm run check`
- Package smoke: `npm run smoke:pack`
- Release preflight: `npm run release:preflight -- 0.1.0`
- Whitespace: `git diff --check`
- Local indicator smoke: dry-run `experimental relay-watch` with `--status-file` against a fake `gh` fixture through tests; optional live notification requires owner-approved local run.
