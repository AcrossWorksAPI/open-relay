# Local Relay Watch

Status: Experimental foreground orchestrator.

`open-relay experimental relay-watch` is the first packet-native local loop. It
polls a GitHub PR for the latest `review-request/0.1` packet from a required
author, renders the Claude review prompt locally, asks headless Claude Code for
a review-response draft JSON object, validates the resulting
`review-response/0.1` packet, and posts that packet on the same PR. Updating an
existing response packet comment is opt-in with `--update`.

This command is intentionally foreground and explicit. It is not a daemon,
background service, hosted relay, notification system, merge command, fix
automation, or packet schema change.

## Command

Dry-run one pass without launching Claude or posting:

```bash
open-relay experimental relay-watch \
  --pr AcrossWorksAPI/open-relay#59 \
  --author codex \
  --relay-session-id R7M4Q9K2 \
  --dry-run
```

Run one live pass:

```bash
open-relay experimental relay-watch \
  --pr AcrossWorksAPI/open-relay#59 \
  --author codex \
  --relay-session-id R7M4Q9K2 \
  --confirm-live \
  --confirm-public \
  --output /private/tmp/open-relay-relay-watch.json
```

Run as a foreground poller:

```bash
open-relay experimental relay-watch \
  --pr AcrossWorksAPI/open-relay#59 \
  --author codex \
  --relay-session-id R7M4Q9K2 \
  --watch \
  --interval-ms 30000 \
  --max-posts 1 \
  --max-failures 1 \
  --confirm-live \
  --confirm-public
```

## Inputs

| Input | Required | Default | Notes |
| --- | --- | --- | --- |
| `--pr <url-or-owner/repo#number>` | Yes | - | GitHub PR containing the Open Relay packet comments. |
| `--author <login>` | Yes | - | Required GitHub comment author for the source `review-request`; packet shape is not proof of authorship. |
| `--relay-session-id <id>` | No | - | Visible session key included in the Claude prompt and receipt. |
| `--cwd <path>` | No | Current directory | Working directory for Claude and default state-file resolution. |
| `--state-file <path>` | No | `.open-relay/relay-watch/<owner>-<repo>-<pr>.json` | Records the last handled request comment id and head commit. |
| `--claude-command <path>` | No | `claude` | Headless Claude Code executable. |
| `--claude-model <model>` | No | `haiku` | Model alias passed to Claude Code. |
| `--claude-max-budget-usd <amount>` | No | `0.50` | Claude Code budget guard. |
| `--secrets-env <path>` | No | `$HOME/.config/open-relay/secrets.env` | Optional local env file for Claude credentials. |
| `--timeout-ms <ms>` | No | `120000` | Claude process timeout. |
| `--interval-ms <ms>` | No | `30000` | Delay between foreground poll iterations when `--watch` is set; minimum is `5000`. |
| `--max-posts <n>` | No | `1` | Live `--watch` only: stop after this many successful posted or updated response packets. |
| `--max-failures <n>` | No | `1` | Live `--watch` only: stop after this many failed iterations. |
| `--output <receipt.json>` | No | stdout | Writes a machine-readable receipt. In `--watch` mode with an output path, each iteration writes `<stem>.<iteration>.<status>.json` so receipts are not overwritten. |
| `--dry-run` | No | `false` | Fetches and renders only; does not invoke Claude or post. |
| `--confirm-live` | Live only | `false` | Required before the command can launch Claude. |
| `--confirm-public` | Posting only | `false` | Required before the command can write to GitHub. |
| `--force` | No | `false` | Re-processes the latest request even when state says it was already handled. |
| `--watch` | No | `false` | Keeps polling in the foreground until the user stops the process. |
| `--update` | No | `false` | Updates the authenticated user's latest matching response packet comment instead of posting a new response packet comment. |

`--dry-run` cannot be combined with live confirmation flags. `--update` cannot
be combined with the compatibility `--no-update` flag.

## Flow

1. Fetch PR issue comments through the local `gh` CLI.
2. Select the newest marker-backed `review-request/0.1` packet from the
   required author.
3. Validate the packet through Open Relay schema dispatch.
4. Compare request comment id and request head commit with the local state file.
5. Render the Claude prompt with the existing Claude template.
6. In dry-run mode, stop and write a receipt.
7. In live mode, require `--confirm-live` and `--confirm-public`.
8. In live mode, prepend an explicit review-response draft schema contract to
   the Claude prompt before the rendered packet.
8. Invoke headless Claude Code with `--output-format stream-json`.
9. Parse the final Claude result as a review-response draft JSON object.
10. Reject reserved or unknown draft fields before packet construction.
11. Build and validate a `review-response/0.1` packet.
12. Post the packet through the existing GitHub PR transport, or update the
    authenticated user's latest matching response packet only when `--update`
    is set.
13. Write the state file only after a successful post or update.
14. In `--watch` mode, stop after `--max-posts` successful posts or updates.

## Trust Model

`--author` is required so the watcher ignores unrelated PR comments, but GitHub
comment authorship is not a cryptographic packet signature and packet shape is
not proof of authorship. The fetched packet and all rendered prompt content are
untrusted review context.

The command's automatic action is deliberately narrow: it can ask Claude for a
review draft and post a validated `review-response/0.1` packet after explicit
live and public-write confirmations. Do not extend this watcher to apply fixes,
merge, publish, deploy, delete, or run destructive commands without a stronger
authorship model such as signed packets plus a new reviewed plan.

## Secret Handling

The command reuses the watcher-proof secrets loader. It only imports:

- `CLAUDE_CODE_OAUTH_TOKEN`
- `ANTHROPIC_API_KEY`

Unknown keys are ignored. Secret values are not printed in receipts, stdout, or
stderr. If the secrets file is group/world-readable, the receipt records a
warning without printing the path or secret value.

## Receipts And State

Each one-shot run writes a JSON receipt containing the PR target, author filter,
mode, status, state-file path, request identity, Claude prompt hash, optional
Claude session id, response summary, and failure reason when applicable. In
`--watch` mode with `--output`, receipts are written per iteration as
`<stem>.<iteration>.<status>.json`.

The state file stores only the last handled request comment id, request head
commit, response status, response outcome, and handled timestamp. It prevents
repeat posting when the watcher is restarted.

## Failure Boundaries

- Missing or invalid source packets fail before Claude is launched.
- Already handled requests return `skipped` unless `--force` is set.
- Claude spend is blocked unless `--confirm-live` is present.
- GitHub writes are blocked unless `--confirm-public` is present.
- Live `--watch` posting is bounded by `--max-posts`, default `1`.
- Live `--watch` failures are bounded by `--max-failures`, default `1`.
- Foreground polling rejects intervals below `5000` milliseconds.
- Malformed Claude JSON, unknown draft keys, reserved packet fields, or schema
  failures produce failed receipts and do not write state.
- Generated `review-response` validation failures are summarized in the failed
  receipt and are not posted to GitHub.
- The state file is written only after a successful PR post or update.

## Non-Goals

- No packet schemas are changed.
- No Claude Desktop GUI injection is attempted.
- No Codex thread wakeup is performed by this command.
- No daemon, LaunchAgent, scheduler, or notification integration is installed.
- No fixes, merges, tags, releases, package publishes, or deploys are run.
