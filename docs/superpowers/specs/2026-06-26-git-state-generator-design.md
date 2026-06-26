# Git-State Review Request Generator Design

Last updated: 2026-06-26

## Purpose

The next Open Relay slice should generate a schema-valid `review-request` JSON
packet from local git state. The generator should remove the repetitive work of
collecting repository, branch, commit, diff-range, and changed-file facts while
still requiring the human or calling agent to provide the review goal and
intent.

This slice is the first generator step for the target workflow:

> Codex has completed work in a repo. Generate a Claude-ready review packet from
> local git state.

## Design Summary

The generator adds a new CLI command:

```bash
open-relay generate review-request \
  --base origin/main \
  --head HEAD \
  --goal "Add runtime schema validation CLI" \
  --summary "Adds schema validation, CLI command, tests, and CI." \
  --behavioral-intent "Make review-request packets machine-validatable before packet generation grows." \
  --output relay.json
```

The command collects git facts from the current repository, builds a
`review-request` packet, validates it with the existing schema validator, and
writes JSON to `--output`. When `--output` is omitted, the command writes JSON
to stdout. This avoids choosing a permanent storage location before the owner
has approved one.

## Scope

This slice should build:

- `open-relay generate review-request`
- local git metadata collection
- exhaustive changed-file collection for `base..head`
- deterministic review-priority heuristics
- safe remote URL handling
- opt-in local path inclusion
- schema validation before output
- tests using temporary git repositories
- README and roadmap updates

This slice should defer:

- Markdown rendering
- Claude/Codex prompt templates
- long-term packet storage
- package publishing
- MCP server support
- diff content embedding
- private redaction rule syntax
- automatic test-command discovery beyond explicit `--verification` flags

## Command Contract

Required flags:

- `--base <ref>`: lower-bound git ref for the review range.
- `--head <ref>`: upper-bound git ref for the review range.
- `--goal <text>`: packet `goal`.
- `--summary <text>`: packet `change_summary.summary`.
- `--behavioral-intent <text>`: packet `change_summary.behavioral_intent`.

Optional flags:

- `--output <path>`: write JSON to this file; omit to write JSON to stdout.
- `--audience <text>`: defaults to `Claude Code`.
- `--focus <text>`: may be repeated; defaults to correctness, privacy, and
  verification focus areas.
- `--requested-output <text>`: defaults to findings-first review output.
- `--reviewer-access <text>`: defaults to repository read access required.
- `--pr-url <url>`: fills `repository.pull_request_url` and provenance.
- `--verification <kind|command|result|evidence>`: may be repeated.
- `--risk <severity|description|handling>`: may be repeated.
- `--excluded-scope <text>`: may be repeated; defaults to generated packet only.
- `--include-local-path`: opt in to `repository.local_path`.

Pipe-separated flags use `|` because commands and human notes commonly contain
spaces. If a field itself needs a pipe, the caller should use a later config-file
or stdin-driven slice; this first generator keeps parsing simple.

## Packet Field Mapping

The generator fills these packet fields:

| Field | Source |
| --- | --- |
| `packet_version` | constant `0.1` |
| `packet_type` | constant `review-request` |
| `created_at` | current UTC timestamp |
| `goal` | `--goal` |
| `requested_review.audience` | `--audience` or default |
| `requested_review.focus` | repeated `--focus` or defaults |
| `requested_review.requested_output` | `--requested-output` or default |
| `repository.name` | safe remote owner/name when available, otherwise repo directory name |
| `repository.remote_url` | sanitized remote URL when safe |
| `repository.local_path` | only when `--include-local-path` is set |
| `repository.base_branch` | `--base` |
| `repository.working_branch` | current branch or `--head` for detached HEAD |
| `repository.base_commit` | `git rev-parse --verify <base>` |
| `repository.head_commit` | `git rev-parse --verify <head>` |
| `repository.diff_range` | `<base_commit>..<head_commit>` |
| `repository.pull_request_url` | `--pr-url` when supplied |
| `repository.reviewer_access` | `--reviewer-access` or default |
| `change_summary.summary` | `--summary` |
| `change_summary.behavioral_intent` | `--behavioral-intent` |
| `change_summary.excluded_scope` | repeated `--excluded-scope` or default |
| `change_summary.total_files_changed` | changed-file count |
| `changed_files` | `git diff -z --name-status --find-renames <base>..<head>` |
| `verification` | repeated `--verification`; empty array when none supplied |
| `risks` | repeated `--risk`; default risk noting generator output needs human review |
| `provenance` | base/head commits, PR URL when supplied |
| `redactions` | generated redaction records |
| `sensitive_data` | generated exclusion note |
| `next_action` | default reviewer instruction |

## Changed File Handling

The generator should use:

```bash
git diff -z --name-status --find-renames <base_commit>..<head_commit>
```

The v1 generator deliberately uses the two-dot endpoint diff recorded in
`repository.diff_range`. This makes the packet reproducible from the exact
base/head commits supplied by the caller. Three-dot merge-base PR semantics are
deferred until the CLI has an explicit `--diff-mode` or PR-provider integration.

Status mapping:

| Git status | Packet status | Path |
| --- | --- | --- |
| `A` | `added` | file path |
| `M` | `modified` | file path |
| `D` | `deleted` | file path |
| `R*` | `renamed` | new path |
| other | `unknown` | last path field |

Review-priority heuristic:

- `high`: `src/**`, `schemas/**`, `.github/workflows/**`, `package.json`,
  `package-lock.json`, `tsconfig.json`, security-sensitive docs.
- `medium`: `tests/**`, `examples/**`, `docs/protocol/**`, `README.md`,
  `AGENTS.md`, `CLAUDE.md`.
- `low`: planning/status docs and generated governance metadata.

The heuristic is intentionally deterministic. A later slice can add override
flags if reviewers need manual priority control.

## Redaction And Sensitive Data

The generator must not include diff content, file contents, environment
variables, command output, or local paths by default.

Default redactions:

- omit `repository.local_path`
- strip credentials from remote URLs
- omit unsafe local/path-style remote URLs
- note that diff content and command output are excluded

Safe remote URLs:

- `https://github.com/org/repo.git`
- `git@github.com:org/repo.git`

Unsafe remote URLs:

- URLs with username/password credentials
- local filesystem paths
- unsupported schemes

If the remote URL is unsafe, omit it and add a redaction entry for
`repository.remote_url`.

The packet should set:

```json
"sensitive_data": {
  "excluded": true,
  "notes": "Diff content, command output, environment variables, and local paths are excluded unless explicitly opted in."
}
```

## Architecture

Add focused modules:

- `src/args.ts`: parse CLI flags without a framework.
- `src/git.ts`: collect git repository facts and changed files.
- `src/redaction.ts`: sanitize remote URLs and build redaction records.
- `src/reviewRequest.ts`: build and validate the packet.
- `src/cli.ts`: route `generate review-request` and write output.

No new dependency is needed. Node's `child_process`, `fs/promises`, and `path`
APIs are enough for the first local generator.

## Error Handling

The generator should fail closed:

- missing required flags: exit `2` with usage
- not in a git repo: exit `1`
- invalid base/head ref: exit `1`
- empty diff: exit `1` with a message that no changed files were found
- schema validation failure: exit `1` and print schema errors without packet
  contents
- output write failure: exit `1`

Errors must not print diff content, environment values, or packet JSON.

## Lifecycle Coverage

| Lens | Handling |
| --- | --- |
| Create/invite/attach | Creates a local packet file only when `--output` is provided; otherwise writes to stdout. |
| List/search/view | Reads only the explicit git range in the current repository. |
| Edit/update | Does not mutate existing packets; overwrites `--output` only by explicit path. |
| Activate/deactivate/archive | Not applicable to local generated files. |
| Remove/delete/offboard | Does not delete files. |
| Transfer/reassignment/ownership | Local user owns generated output. |
| Notes/support metadata | Adds provenance and redaction notes. |
| Permissions/roles/scope | Uses local process git/file permissions only. |
| Audit/events | Git commits, terminal output, tests, and PR checks are the audit trail. |
| Notifications | Deferred. |
| Billing/quota | Not applicable. |
| Error/empty/recovery/smoke | Tests cover missing flags, non-git directories, invalid refs, empty diffs, unsafe remotes, and valid generated packets. |

## Verification Strategy

Automated tests should cover:

- flag parsing success and missing required flags
- temporary git repo context collection
- added, modified, deleted, and renamed file status mapping
- remote URL sanitization
- local path omission by default
- schema-valid packet generation
- CLI stdout output
- CLI `--output` file writing
- generated packet validation through `validatePacket`

Manual smoke after implementation:

```bash
npm run check
node dist/src/cli.js generate review-request \
  --base origin/main \
  --head HEAD \
  --goal "Smoke generated review packet" \
  --summary "Generate a packet from local git state." \
  --behavioral-intent "Exercise the local git-state generator." \
  --output /private/tmp/open-relay-review-request.json
node dist/src/cli.js validate /private/tmp/open-relay-review-request.json
```

## Owner Decisions Deferred

- permanent packet storage location: repo-local, global user directory, or both
- package publishing target
- private redaction rule syntax
- Markdown renderer and agent-specific templates

The implementation should make these deferrals explicit in docs and risks, not
hide them in defaults.
