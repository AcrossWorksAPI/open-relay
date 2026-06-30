# Local Watcher Proof Implementation Plan

Date: 2026-06-30
Status: Ready for review in PR #59
Owner: Codex

## Goal

Add the smallest version-controlled Open Relay proof command that can trigger
both verified local agent surfaces without copy/paste:

- Codex through the local Codex app-server WebSocket.
- Claude through a headless `claude -p` process.

This closes the prior trial's missing automation primitive at proof-command
level. It does not implement a daemon, file watcher, hosted service, packet
schema change, GitHub posting flow, merge automation, or production
orchestration policy.

## Scope

- Add `open-relay experimental watcher-proof`.
- Trigger a bounded Codex proof turn through `thread/list` or direct
  `--codex-thread-id`, `thread/resume`, and `turn/start`.
- Trigger a bounded Claude proof turn through headless `claude -p` with
  `--output-format stream-json`.
- Load optional Claude automation credentials from a local secrets env file
  outside the repository.
- Write a machine-readable JSON receipt with Codex and Claude status,
  identifiers, expected proof text, final proof text, and errors.
- Add dry-run behavior for CI/package smoke that never invokes agents.
- Add tests and package smoke coverage for parser, secrets parsing, dry-run
  receipts, and installed CLI dry-run behavior.

## Non-Goals

- No packet schema changes.
- No packet transport changes.
- No GitHub posting or deletion.
- No external agent review, fix, merge, publish, or deployment action.
- No Claude Desktop GUI injection.
- No long-running daemon or filesystem watcher.
- No storage of secret values in receipts or repository files.

## Lifecycle And Scope

| Lens | Decision |
| --- | --- |
| Create/attach | User starts the proof explicitly with a CLI command. No daemon is installed. |
| List/search/view | Codex can be targeted by direct thread id or searched by Relay Session ID. Claude sessions are observed from stream-json output. |
| Edit/update | Only the local command implementation and receipt output are created; packet data is not edited. |
| Activate/archive/delete | Deferred; no background watcher lifecycle exists in this slice. |
| Ownership | Local CLI user owns the local run, credentials, and receipt path. |
| Permissions/scope | Codex access requires a running local app-server. Claude access requires local Claude Code auth or allowed secret env keys. |
| Audit/events | JSON receipt plus git history and test output are evidence. |
| Notifications | Deferred; no notification delivery claim. |
| Billing/quota | Claude proof can spend model quota; the command includes a budget guard. Codex turn can spend Codex quota. |
| Error/recovery/smoke | Dry-run is covered by automated tests and package smoke; live failures produce a failed receipt without leaking secrets. |

## Implementation Tasks

1. Add watcher proof module with Codex JSON-RPC client, Claude stream-json
   launcher, secrets env parser, dry-run receipt builder, and safe errors.
2. Add CLI route, help text, and receipt writing.
3. Add unit tests for parser/secrets/dry-run behavior.
4. Add installed-package dry-run smoke coverage.
5. Add protocol docs and governance closeout.
6. Run local verification and one live proof if the local app-server and
   Claude credential are available.

## Verification Plan

- `npm run build`
- `npm run check`
- `npm run smoke:pack`
- `git diff --check`
- Dry-run CLI smoke:
  `node dist/src/cli.js experimental watcher-proof --relay-session-id R7M4Q9K2 --codex-thread-id <id> --dry-run`
- Live local proof, when the Codex app-server is running and Claude credentials
  are configured:
  `node dist/src/cli.js experimental watcher-proof --relay-session-id R7M4Q9K2 --codex-thread-id <id> --output /private/tmp/open-relay-watcher-proof.json`

## Verification Evidence

- `npm run check` passed with 210 tests.
- `npm run smoke:pack` passed.
- `git diff --check` passed.
- Live local proof passed and wrote
  `/private/tmp/open-relay-watcher-proof-r7m4q9k2.json` with `status:
  passed`; Codex turn `019f170b-8c20-7800-91bd-93bd335780c4` returned
  `OPEN_RELAY_CODEX_WATCHER_PROOF_OK`, and Claude session
  `3d1911ab-d184-4ddf-804b-bab19b161e0e` returned
  `OPEN_RELAY_CLAUDE_WATCHER_PROOF_OK`.
