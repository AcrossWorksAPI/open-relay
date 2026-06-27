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

Use `git diff --numstat <base_commit>..<head_commit>` to collect per-file added
and deleted line counts for the same two-dot diff range already recorded in
`repository.diff_range`.

Populate the existing optional `changed_files[].evidence` string with a compact
diff-stat note:

```text
Diff stats: +42 -7.
```

For renamed files, preserve the existing rename evidence and append the stats:

```text
Renamed from src/old.ts. Diff stats: +12 -3.
```

For binary files, where `git diff --numstat` emits `-\t-`, render:

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
git diff --numstat <base_commit>..<head_commit>
```

This must use the same endpoint two-dot range as the existing name-status
collector:

```bash
git diff -z --name-status --find-renames <base_commit>..<head_commit>
```

Three-dot merge-base PR semantics remain deferred until Open Relay has an
explicit diff-mode or PR-provider integration.

## Numstat Parsing

`git diff --numstat` emits tab-separated rows:

```text
<added>\t<deleted>\t<path>
```

Examples:

```text
42	7	src/cli.ts
-	-	assets/logo.png
3	1	src/{old.ts => new.ts}
```

Parser rules:

- Split rows on newline.
- Split each row into at most three tab-separated fields.
- Treat `-`/`-` added and deleted counts as a binary file.
- Parse decimal counts as non-negative integers.
- Use the path field as the lookup key after normalizing git rename brace
  notation to the new path when possible.
- If parsing fails for a row, skip that row rather than failing the whole
  generator.

Rename path normalization should support common git brace notation:

| Raw numstat path | Lookup path |
| --- | --- |
| `src/{old.ts => new.ts}` | `src/new.ts` |
| `{old => new}/file.ts` | `new/file.ts` |
| `old name.txt => new name.txt` | `new name.txt` |

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

Error messages must remain sanitized. If numstat collection fails, the
generator should continue using name-status evidence only or fail with the
existing safe git-diff message if the implementation cannot distinguish the
failure safely. The preferred implementation is to keep name-status collection
strict and make numstat enrichment best-effort.

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

- text-file numstat rows populate `changed_files[].evidence`;
- binary rows render as `Diff stats: binary file.`;
- renamed files preserve rename evidence and append stats;
- unmatched numstat rows do not break packet generation;
- no synthetic verification entry appears when no `--verification` is supplied;
- generated packets remain schema-valid `review-request/0.1`;
- Markdown snapshots update in lockstep with JSON examples;
- `npm run check`, `npm run smoke:pack`, and `git diff --check` pass.

## Review Focus

Ask reviewers to check:

- Is using `changed_files[].evidence` the right 0.1-compatible place for churn
  evidence?
- Is best-effort numstat enrichment acceptable, or should numstat failure fail
  the generator?
- Are binary and rename cases represented honestly?
- Does this avoid premature `review-request/0.2` version churn?
- Does the design keep the line bright against raw diff embedding and automatic
  test execution?
