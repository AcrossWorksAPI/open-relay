# Local Watcher Proof

Status: Experimental proof command.

The local watcher proof verifies that Open Relay can trigger both local agent
surfaces without packet-body copy/paste:

- Codex through the local Codex app-server WebSocket.
- Claude through a headless `claude -p` process.

This is not a production daemon, scheduler, hosted service, packet schema
change, GitHub posting command, merge command, or agent-to-agent policy layer.
It records a machine-readable local receipt for the trigger proof only.

## Command

```bash
open-relay experimental watcher-proof \
  --relay-session-id R7M4Q9K2 \
  --codex-thread-id <codex-thread-id> \
  --codex-url ws://127.0.0.1:43210 \
  --claude-model haiku \
  --output /private/tmp/open-relay-watcher-proof.json \
  --confirm-live
```

Use `--dry-run` to validate command routing and produce a receipt without
connecting to Codex or launching Claude:

```bash
open-relay experimental watcher-proof \
  --relay-session-id R7M4Q9K2 \
  --codex-thread-id <codex-thread-id> \
  --dry-run
```

## Inputs

| Input | Required | Default | Notes |
| --- | --- | --- | --- |
| `--relay-session-id <id>` | Yes | - | Visible session key included in both proof prompts. |
| `--codex-url <ws-url>` | No | `ws://127.0.0.1:43210` | Codex app-server WebSocket URL. |
| `--codex-thread-id <id>` | No | - | Direct target thread id. Prefer this when search would match multiple threads. |
| `--codex-search <text>` | No | Relay Session ID | Used with Codex `thread/list` when no direct thread id is provided. Search must match exactly one thread. |
| `--claude-command <path>` | No | `claude` | Headless Claude Code executable. |
| `--claude-model <model>` | No | `haiku` | Model alias passed to Claude Code. |
| `--claude-max-budget-usd <amount>` | No | `0.50` | Claude Code budget guard for the proof turn. |
| `--secrets-env <path>` | No | `$HOME/.config/open-relay/secrets.env` | Optional local env file for Claude automation credentials. |
| `--timeout-ms <ms>` | No | `120000` | Shared Codex/Claude timeout. |
| `--output <receipt.json>` | No | stdout | Writes the machine-readable receipt. |
| `--dry-run` | No | `false` | Produces a no-agent receipt. |
| `--confirm-live` | Live only | `false` | Required before the command connects to Codex or launches Claude. |

## Secret Handling

The secrets env loader only imports these keys:

- `CLAUDE_CODE_OAUTH_TOKEN`
- `ANTHROPIC_API_KEY`

Unknown keys are ignored. Secret values are not printed in receipts, stderr, or
stdout. If the secrets file is group/world-readable, the live receipt records a
warning without printing the path or secret value. Keep the file outside the
repository, for example:

```bash
$HOME/.config/open-relay/secrets.env
```

## Receipt

The command writes a JSON receipt with:

- `relay_session_id`
- `created_at`
- `mode`
- Overall `status`
- Top-level or Claude-specific warnings, when local setup should be tightened.
- Codex app-server URL, thread id/search, turn id, expected text, final text,
  and status.
- Claude command, model, session id, expected text, final text, and status.

The live proof passes only when both agents return their exact expected proof
tokens.

## Non-Goals

- No packet schemas are changed.
- No packets are sent to GitHub.
- No agent review, fix, merge, publish, or deployment is performed.
- No Claude Desktop GUI injection is attempted.
- No daemon process or file watcher is installed.
