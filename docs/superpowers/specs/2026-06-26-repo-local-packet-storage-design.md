# Repo-Local Packet Storage Design

## Purpose

Open Relay can generate and render review-request packets, but users still have
to choose ad hoc output paths when they want to keep a packet. The next slice
adds an explicit local storage workflow so a repository can keep review handoff
packets in a predictable, ignored directory.

This is a storage foundation, not orchestration. It does not send packets to
Claude, Codex, GitHub, a hosted service, or a daemon.

## Recommended Approach

Use an explicit command:

```bash
open-relay save review-request \
  --base origin/main \
  --head HEAD \
  --goal "Review packet storage" \
  --summary "Adds repo-local packet bundle storage." \
  --behavioral-intent "Make handoff packets durable without external services."
```

The command creates a repo-local bundle:

```text
.open-relay/
  review-requests/
    20260626T105115Z-c95f409/
      relay.json
      relay.md
      manifest.json
```

The command prints only a storage id, not the absolute path:

```text
Saved review-request packet: 20260626T105115Z-c95f409
```

## Alternatives Considered

### Add `--save` to `handoff review-request`

This is convenient, but it overloads `handoff` with storage behavior. It also
raises awkward questions about whether stdout should still receive Markdown
while files are written. Defer this until the explicit storage command is
proven.

### Use global user storage first

Global storage would help cross-repository history, but it immediately raises
platform path, retention, migration, and privacy questions. Repo-local storage
is easier to inspect, easier to delete, and fits the current local CLI scope.

### Write only Markdown or only JSON

Writing both `relay.json` and `relay.md` makes the saved packet useful to both
machines and humans. The JSON remains the source packet; Markdown is a rendered
view generated from the same validated object.

## Scope

### Included

- Add `.open-relay/` to `.gitignore`.
- Add `open-relay save review-request <generator flags> [--storage-dir <path>]`.
- Reuse the existing generator parser, git collector, packet builder, validator,
  and Markdown renderer.
- Save three files:
  - `relay.json`: schema-valid review-request packet.
  - `relay.md`: Markdown rendered from the same packet.
  - `manifest.json`: small storage manifest for future list/read workflows.
- Use `.open-relay/review-requests` as the default repo-local storage root.
- Support `--storage-dir <path>` for explicit alternate roots and tests.
- Never overwrite an existing bundle directory.
- Print sanitized success and failure messages without echoing absolute paths.
- Add CLI tests and installed-package smoke coverage.
- Update roadmap/status/ledger/lifecycle docs.

### Deferred

- Global user storage.
- Packet list/read/delete/archive commands.
- Retention policies.
- Storage migration.
- Encrypting stored packets.
- Private redaction rule files.
- Agent-specific prompt wrappers.
- External agent invocation, GitHub PR comments, merge automation, app/daemon
  orchestration, hosted sync, or package publishing.

## Command Contract

```bash
open-relay save review-request \
  --base <ref> \
  --head <ref> \
  --goal <text> \
  --summary <text> \
  --behavioral-intent <text> \
  [--storage-dir <path>]
```

The command accepts the same review-request content flags as
`generate review-request`, except `--format` and `--output`.

Behavior:

- Missing required flags exit `2`.
- Unknown flags exit `2`.
- Duplicate singleton flags exit `2`.
- `--format` and `--format=...` exit `2` with
  `--format is not supported for save review-request; saved bundles include JSON and Markdown.`
- `--output` exits `2` with
  `--output is not supported for save review-request; use --storage-dir to choose a storage root.`
- On success, stdout prints `Saved review-request packet: <storage_id>`.
- The success message intentionally prints only the storage id, even when
  `--storage-dir` is user supplied, so default and explicit storage roots share
  one sanitized output contract.
- On write failure, stderr prints `Could not save review-request packet.` and
  does not echo the storage path.
- Existing `generate`, `render`, and `handoff` behavior remains unchanged.

## Storage Layout

Default storage root:

```text
.open-relay/review-requests
```

Bundle id:

```text
<created_at compact UTC>-<head short sha>
```

Example:

```text
20260626T105115Z-c95f409
```

If the target bundle directory already exists, the implementation appends a
counter suffix such as `-2`, `-3`, up to a small bounded limit. It must not
overwrite an existing bundle.

`manifest.json` shape:

```json
{
  "storage_version": "0.1",
  "packet_type": "review-request",
  "packet_version": "0.1",
  "storage_id": "20260626T105115Z-c95f409",
  "created_at": "2026-06-26T10:51:15.000Z",
  "files": {
    "json": "relay.json",
    "markdown": "relay.md"
  }
}
```

The manifest intentionally duplicates only storage metadata. The packet content
stays in `relay.json`. Implementations must write `manifest.json` last; future
read/list commands should treat a bundle without `manifest.json` as incomplete.

## Architecture

Add a focused storage module:

```text
src/storage.ts
```

Responsibilities:

- build a storage id from packet `created_at` and repository head commit;
- resolve default and explicit storage roots;
- create a non-colliding bundle directory;
- write `relay.json`, `relay.md`, and `manifest.json`;
- return `{ storageId }` without exposing absolute paths to CLI output.

Add CLI routing in `src/cli.ts`:

```text
open-relay save review-request
```

The route should call a shared packet-generation helper so `save`, `generate`,
and `handoff` do not duplicate git collection, packet assembly, or validation.

## Security And Privacy

Stored packets may contain user-authored goal, summary, behavioral intent,
changed file names, and safe repository metadata. The command must be opt-in and
must not store anything unless the user runs `save review-request`.

The default `.open-relay/` directory is gitignored to reduce accidental commits.
This is not a security boundary; it is a safety guardrail. Users remain
responsible for reviewing packet contents before sharing them.

The CLI must preserve the existing sanitized posture:

- no absolute storage path echo on success or write failure;
- no raw packet echo on validation failures;
- no sensitive git ref echo on invalid refs;
- no external delivery implied or performed.

## Lifecycle And Scope Coverage

| Area | Decision |
| --- | --- |
| Lifecycle | Adds local create/view-by-files storage for review-request bundles. List/read/delete/archive remain deferred. |
| Scope | Repo-local CLI only. No global storage, hosted service, daemon, MCP server, or external review invocation. |
| Permissions | Local user controls repository, refs, text fields, and optional storage root. |
| Ownership | Saved bundles belong to the local repository/user. |
| Audit | Filesystem bundle plus git/PR/test evidence. No telemetry. |
| Notifications | Deferred; saving does not notify reviewers. |
| Billing/quota | N/A; local CLI only. |
| Recovery | Failed saves leave sanitized errors. Implementation should avoid partial success by writing files only after packet validation, write `manifest.json` last as the completion marker, and best-effort remove a newly created bundle directory if a mid-write failure occurs. |
| Smoke | `npm run check`, `npm run smoke:pack`, `git diff --check`, CLI save smoke, installed package save smoke. |

## Testing Strategy

- CLI help includes `open-relay save review-request`.
- `save review-request` creates a bundle with `relay.json`, `relay.md`, and
  `manifest.json`.
- Saved `relay.json` validates with the existing validator.
- Saved `relay.md` starts with `# Review Request Relay Packet` and includes
  `## Next Action`.
- `manifest.json` records storage metadata and relative file names.
- `--format`, `--format=markdown`, and `--output` are rejected with
  save-specific parser errors.
- Write failures do not echo storage paths.
- Existing `generate`, `render`, and `handoff` tests continue to pass.
- Package smoke proves the installed CLI can save a review-request bundle.

## Open Decisions

- Global user storage remains `Unknown; needs owner decision`.
- Storage list/read/delete/archive command shapes remain deferred.
- Retention policy remains deferred.
- Private redaction rule files remain deferred.
- npm publishing remains deferred until owner, version, changelog, tag, and
  `private: true` removal are approved.
