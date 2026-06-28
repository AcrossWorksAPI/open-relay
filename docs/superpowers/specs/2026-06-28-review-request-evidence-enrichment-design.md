# Review Request Evidence Enrichment Design

Last updated: 2026-06-28

## Purpose

The next Open Relay slice should make generated `review-request/0.1` packets
more useful to reviewers by adding lightweight git-derived churn evidence to
each changed file. Today the generator lists file paths, statuses, roles, and
review priorities, but it does not show whether a file changed by two lines or
five hundred. That weakens first-pass review triage.

This slice enriches existing `review-request/0.1` fields. It does not introduce
`review-request/0.2`, embed raw diffs, execute tests, read file contents, or
change packet semantics.

## Decision

Use `git diff --numstat -z --find-renames <base_commit>..<head_commit>` to
collect per-file added and deleted line counts for the same two-dot diff range
already recorded in `repository.diff_range`.

Populate the existing optional `changed_files[].evidence` string with a compact
diff-stat note:

```text
Diff stats: +42 -7.
```

For renamed files, preserve the existing rename evidence and append the stats:

```text
Renamed from src/old.ts. Diff stats: +12 -3.
```

For binary files, where `git diff --numstat -z --find-renames` emits `-\t-`,
render:

```text
Diff stats: binary file.
```

If a file has no matching numstat row, omit the stats rather than inventing a
number.

## Non-Decision: Verification Defaults

Do not add a synthetic `verification` entry when no `--verification` flags are
supplied.

An empty `verification: []` is already a clear machine signal, and the Markdown
renderer already prints a neutral empty state. A fabricated entry such as
`kind: "manual"` plus `command: "(none)"` would be less honest than an empty
array because no check was actually run or inspected.

If a future workflow needs a stronger JSON-level warning, the right home is an
explicit `info` risk supplied by the caller or a future planned warning policy.
This slice keeps the generator behavior unchanged for verification.

## Alternatives Considered

| Approach | Decision | Reason |
| --- | --- | --- |
| Add structured `changed_files[].diff_stats` | Deferred | Cleaner for machine consumers, but requires a packet-version bump because `review-request/0.1` is strict. No current consumer needs structured stats yet. |
| Add stats to existing `changed_files[].evidence` | Chosen | Uses the existing 0.1 evidence slot, improves review triage, and avoids version churn. |
| Embed raw diff hunks | Rejected | Increases token size and leak risk; the packet remains a pointer-and-framing artifact. |
| Auto-run test commands | Rejected | Arbitrary command execution can have side effects and command output can leak secrets. Tests run should be recorded through explicit `--verification` entries. |
| Add synthetic `not_run` verification | Rejected | Empty `verification: []` and renderer empty state already convey no verification evidence. A synthetic entry would require a fake command. |

## Data Source

Use:

```bash
git diff --numstat -z --find-renames <base_commit>..<head_commit>
```

This must use the same endpoint two-dot range, rename detection, and
NUL-delimited path handling as the existing name-status collector:

```bash
git diff -z --name-status --find-renames <base_commit>..<head_commit>
```

Three-dot merge-base PR semantics remain deferred until Open Relay has an
explicit diff-mode or PR-provider integration.

## Numstat Parsing

`git diff --numstat -z --find-renames` emits tab-separated stats with
NUL-delimited paths:

```text
<added>\t<deleted>\t<path>\0
```

Examples:

```text
42	7	src/cli.ts\0
-	-	assets/logo.png\0
3	1	\0src/old.ts\0src/new.ts\0
```

Parser rules:

- Split entries on NUL, preserving raw path bytes decoded as UTF-8.
- Split each stats header into tab-separated added, deleted, and optional path
  fields.
- Treat `-`/`-` added and deleted counts as a binary file.
- Parse decimal counts as non-negative integers.
- Use the path field as the lookup key for ordinary rows.
- For rename/copy rows where the header path field is empty, read the following
  old-path and new-path NUL fields and use the new path as the lookup key.
- If parsing fails for a row, skip that row rather than failing packet
  generation.

The existing `--name-status -z --find-renames` output remains the source of
truth for file identity and status. Numstat only enriches evidence when it can
match a changed file path.

## Packet Mapping

No schema changes are needed.

| Packet field | Current behavior | New behavior |
| --- | --- | --- |
| `changed_files[].evidence` for non-renamed text files | Usually omitted | `Diff stats: +N -M.` |
| `changed_files[].evidence` for renamed text files | `Renamed from <old>` | `Renamed from <old>. Diff stats: +N -M.` |
| `changed_files[].evidence` for binary files | Usually omitted | `Diff stats: binary file.` |
| `verification` | Explicit `--verification` entries or `[]` | Unchanged |
| `packet_version` | `0.1` | Unchanged |

## Security And Privacy

This slice must not include:

- raw diff hunks;
- file contents;
- command output;
- environment variables;
- local filesystem paths unless already explicitly requested through existing
  `--include-local-path`;
- secret-shaped values from git output.

Line counts and binary markers are acceptable because they reveal size/churn,
not content.

Error messages must remain sanitized. Name-status collection remains strict
because it is the authoritative changed-file list. Numstat collection is always
best-effort: if the whole `--numstat -z --find-renames` command fails, packet
generation continues with no diff-stat evidence instead of failing the
generator.

## Renderer And Examples

The Markdown renderer already includes the `Evidence` column for changed files.
This slice will populate that column more often.

Expected example churn:

- `examples/review-request/relay.json` gains `changed_files[].evidence` for
  generated files.
- `examples/review-request/relay.md` snapshot changes to show diff stats in the
  changed-files table.
- Snapshot tests must be updated in the same PR.

This churn is expected and should be called out in the implementation PR.

## Lifecycle Coverage

| Lens | Handling |
| --- | --- |
| Create/invite/attach | Generated review-request packets include richer changed-file evidence. |
| List/search/view | No new list or read command. Existing validate/render paths continue to work. |
| Edit/update | No packet editing. Generated packet content changes only at creation time. |
| Activate/deactivate/archive | Not applicable. |
| Remove/delete/offboard | No deletion behavior. |
| Transfer/reassignment/ownership | Local user owns generated packet output. |
| Notes/support metadata | Adds churn evidence to existing changed-file evidence strings. |
| Permissions/roles/scope | Uses local git read permissions only. |
| Audit/events | Git history, generated packet output, tests, PR review, and CI are evidence. |
| Notifications | Deferred. |
| Billing/quota | Not applicable. |
| Error/empty/recovery/smoke | Tests cover text stats, binary stats, rename stats, missing numstat rows, package smoke, and snapshot regeneration. |

## Verification Strategy

Implementation should prove:

- text-file `--numstat -z --find-renames` rows populate
  `changed_files[].evidence`;
- binary rows render as `Diff stats: binary file.`;
- renamed files preserve rename evidence and append stats;
- unmatched numstat rows do not break packet generation;
- whole numstat command failure does not break packet generation;
- non-ASCII paths still receive stats because name-status and numstat both use
  raw NUL-delimited paths;
- no synthetic verification entry appears when no `--verification` is supplied;
- generated packets remain schema-valid `review-request/0.1`;
- Markdown snapshots update in lockstep with JSON examples;
- `npm run check`, `npm run smoke:pack`, and `git diff --check` pass.

## Review Focus

Ask reviewers to check:

- Is using `changed_files[].evidence` the right 0.1-compatible place for churn
  evidence?
- Does best-effort `--numstat -z --find-renames` enrichment preserve enough
  evidence while keeping packet generation reliable?
- Are binary and rename cases represented honestly?
- Does this avoid premature `review-request/0.2` version churn?
- Does the design keep the line bright against raw diff embedding and automatic
  test execution?
