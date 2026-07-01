# Local Response Watch

Status: Experimental foreground orchestrator.

`open-relay experimental response-watch` is the reverse leg of
`experimental relay-watch`. It polls a GitHub PR for the latest
`review-response/0.1` packet from a required author, validates the packet,
derives a `resume-project/0.1` packet, renders the Codex follow-up prompt
locally, and can resume one local Codex app thread through the Codex app-server.

This command is intentionally foreground and explicit. It is not a daemon,
background service, hosted relay, menu-bar app, fix automation, merge command,
or packet schema change.

## Command

Dry-run one pass without contacting Codex:

```bash
open-relay experimental response-watch \
  --pr AcrossWorksAPI/open-relay#61 \
  --author claude \
  --relay-session-id R7M4Q9K2 \
  --dry-run
```

Run one live pass:

```bash
open-relay experimental response-watch \
  --pr AcrossWorksAPI/open-relay#61 \
  --author claude \
  --relay-session-id R7M4Q9K2 \
  --codex-thread-id <codex-thread-id> \
  --confirm-live \
  --output /private/tmp/open-relay-response-watch.json
```

Run as a foreground poller:

```bash
open-relay experimental response-watch \
  --pr AcrossWorksAPI/open-relay#61 \
  --author claude \
  --relay-session-id R7M4Q9K2 \
  --codex-search R7M4Q9K2 \
  --watch \
  --interval-ms 30000 \
  --max-turns 1 \
  --max-failures 1 \
  --confirm-live
```

## Inputs

| Input | Required | Default | Notes |
| --- | --- | --- | --- |
| `--pr <url-or-owner/repo#number>` | Yes | - | GitHub PR containing the Open Relay packet comments. |
| `--author <login>` | Yes | - | Required GitHub comment author for the source `review-response`; packet shape is not proof of authorship. |
| `--relay-session-id <id>` | No | - | Visible session key included in the Codex prompt and receipt. |
| `--cwd <path>` | No | Current directory | Working directory for Codex and default state-file resolution. |
| `--state-file <path>` | No | `.open-relay/response-watch/<owner>-<repo>-<pr>.json` | Records the last handled response comment id and response head commit. |
| `--codex-url <ws-url>` | No | `ws://127.0.0.1:43210` | Local Codex app-server WebSocket URL. |
| `--codex-thread-id <id>` | No | - | Exact Codex thread to resume. Preferred for live runs. |
| `--codex-search <text>` | No | Relay Session ID, else PR target | Search term used to find a single unarchived Codex thread when no thread id is supplied. |
| `--timeout-ms <ms>` | No | `120000` | Codex app-server connection and turn timeout. |
| `--interval-ms <ms>` | No | `30000` | Delay between foreground poll iterations when `--watch` is set; minimum is `5000`. |
| `--max-turns <n>` | No | `1` | Live `--watch` only: stop after this many completed Codex turns. |
| `--max-failures <n>` | No | `1` | Live `--watch` only: stop after this many failed iterations. |
| `--output <receipt.json>` | No | stdout | Writes a machine-readable receipt. In `--watch` mode with an output path, each iteration writes `<stem>.<iteration>.<status>.json` so receipts are not overwritten. |
| `--dry-run` | No | `false` | Fetches, validates, derives resume, and renders only; does not contact Codex. |
| `--confirm-live` | Live only | `false` | Required before the command can resume Codex. |
| `--force` | No | `false` | Re-processes the latest response even when state says it was already handled. |
| `--watch` | No | `false` | Keeps polling in the foreground until the user stops the process or a bound is reached. |

`--dry-run` cannot be combined with `--confirm-live`.

## Flow

1. Fetch PR issue comments through the local `gh` CLI.
2. Select the newest marker-backed `review-response/0.1` packet from the
   required author.
3. Validate the packet through Open Relay schema dispatch.
4. Derive a `resume-project/0.1` packet from the response.
5. Render the Codex follow-up prompt with the existing Codex template.
6. Compare response comment id, response created timestamp, and response head
   commit with the local state file.
7. In dry-run mode, stop and write a receipt.
8. In live mode, require `--confirm-live`.
9. Resume the selected Codex thread by exact id, or search for exactly one
   matching unarchived thread.
10. Start a Codex turn with the rendered resume-project prompt.
11. Write the state file only after the Codex turn completes.
12. In `--watch` mode, stop after `--max-turns` completed Codex turns.

## Trust Model

`--author` is required so the watcher ignores unrelated PR comments, but GitHub
comment authorship is not a cryptographic packet signature and packet shape is
not proof of authorship. The fetched packet and rendered prompt content are
untrusted review context.

The command's automatic action is deliberately narrow: it can resume a local
Codex thread with a rendered `resume-project/0.1` prompt after explicit live
confirmation. Do not extend this watcher to apply fixes, merge, publish,
deploy, delete, or run destructive commands without a stronger authorship model
such as signed packets plus a new reviewed plan.

## Receipts And State

Each one-shot run writes a JSON receipt containing the PR target, author filter,
mode, status, state-file path, response identity, derived resume summary,
Codex prompt hash, optional prompt preview, optional Codex thread and turn ids,
and failure reason when applicable. In `--watch` mode with `--output`, receipts
are written per iteration as `<stem>.<iteration>.<status>.json`.

The state file stores only the last handled response comment id, response head
commit, response created timestamp, Codex turn status, and handled timestamp.
It prevents repeat Codex wakeups when the watcher is restarted.

## Failure Boundaries

- Missing or invalid source packets fail before Codex is contacted.
- Already handled responses return `skipped` unless `--force` is set.
- Codex wakeup is blocked unless `--confirm-live` is present.
- Live `--watch` Codex turns are bounded by `--max-turns`, default `1`.
- Live `--watch` failures are bounded by `--max-failures`, default `1`.
- Foreground polling rejects intervals below `5000` milliseconds.
- The state file is written only after a completed Codex turn.
- Failed Codex turns write failed receipts and do not update handled state.

## Non-Goals

- No packet schemas are changed.
- No Claude Desktop GUI injection is attempted.
- No Claude Code invocation or GitHub posting is performed by this command.
- No daemon, LaunchAgent, scheduler, menu-bar app, or notification service is
  installed.
- No fixes, merges, tags, releases, package publishes, or deploys are run.
