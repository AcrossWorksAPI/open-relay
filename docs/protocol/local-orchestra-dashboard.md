# Local Orchestra Dashboard

Status: Experimental local operator dashboard.

`open-relay experimental orchestra` serves a small local HTTP dashboard for the
current foreground Open Relay tools. It is intended to answer the operator
question: "Is the local relay stack reachable, and what code/version am I
running?"

The dashboard is intentionally local and passive. It reads git/package state,
checks local command availability, checks the Codex app-server health endpoint,
and reads optional watcher status files. It does not launch Claude, resume
Codex, post packets, install a daemon, apply fixes, merge, publish, or deploy.

## Command

Open the dashboard:

```bash
open-relay experimental orchestra \
  --relay-session-id R7M4Q9K2 \
  --relay-status-file /private/tmp/open-relay-status.json \
  --response-state-file /private/tmp/open-relay-response-state.json \
  --open
```

Print one JSON snapshot without starting the server:

```bash
open-relay experimental orchestra \
  --relay-session-id R7M4Q9K2 \
  --check
```

## Inputs

| Input | Required | Default | Notes |
| --- | --- | --- | --- |
| `--relay-session-id <id>` | No | - | Visible session key shown in the dashboard and JSON snapshot. |
| `--cwd <path>` | No | Current directory | Repository used for git version checks and command checks. |
| `--host <host>` | No | `127.0.0.1` | Local dashboard bind host. |
| `--port <n>` | No | `43873` | Local dashboard port. |
| `--codex-url <ws-url>` | No | `ws://127.0.0.1:43210` | Codex app-server URL; converted to `/healthz` for the health check. |
| `--relay-status-file <path>` | No | - | Optional status JSON written by `experimental relay-watch --status-file`. |
| `--response-state-file <path>` | No | - | Optional state JSON written by `experimental response-watch --state-file`. |
| `--docs-url <url>` | No | Open Relay README | Link used by the dashboard's docs button. |
| `--refresh-ms <ms>` | No | `5000` | Browser refresh interval; minimum is `1000`. |
| `--open` | No | `false` | Best-effort open in the desktop browser. |
| `--check` | No | `false` | Print a JSON snapshot and exit without starting the server. |

## Status Model

The JSON snapshot contains:

- `version`: package version, git branch, short commit, and dirty-worktree
  state.
- `services.codex`: Codex app-server `/healthz` reachability.
- `services.github`: local `gh auth status` result.
- `services.claude`: local Claude CLI availability plus whether a headless
  auth environment is present.
- `services.watcher`: evidence from configured relay and response watcher
  files.
- `overall`: `ready`, `attention`, or `failed` derived from the service
  statuses.

The dashboard does not print secret values. It only reports whether a Claude
headless auth environment is present.

## Failure Boundaries

- Missing Codex app-server health marks Codex as failed.
- Missing or failing `gh auth status` marks GitHub transport as failed.
- Missing or failing `claude --version` marks Claude headless as failed.
- Missing watcher files mark watcher evidence as attention, not failure.
- Watcher files with failed relay or Codex status mark watcher evidence as
  failed.
- The dashboard is an indicator, not a supervisor. It does not restart
  watchers or guarantee future packet delivery.

## Non-Goals

- No packet schemas are changed.
- No packet transport is changed.
- No agent invocation is performed.
- No daemon, LaunchAgent, scheduler, menu-bar app, or notification service is
  installed.
- No fixes, merges, tags, releases, package publishes, or deploys are run.
