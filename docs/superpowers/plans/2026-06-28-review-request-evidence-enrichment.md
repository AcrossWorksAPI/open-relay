# Review Request Evidence Enrichment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich generated `review-request/0.1` packets with lightweight per-file diff-stat evidence so reviewers can triage changed files by churn without embedding raw diffs, running commands on the user's behalf, or changing the packet schema.

**Architecture:** Keep `git diff -z --name-status --find-renames <base>..<head>` as the strict source of truth for file identity and status. Add a best-effort `git diff --numstat -z --find-renames <base>..<head>` collector that parses NUL-delimited text, binary, and rename rows into a path-keyed stats map. Join that map onto the existing `changed_files[].evidence` string during git context collection, preserving rename evidence and omitting stats when collection or row parsing fails.

**Tech Stack:** TypeScript, Node.js 22, existing git collector and review-request builder, existing JSON Schema validation through Ajv, existing Markdown renderer, Node's built-in test runner, and the existing `npm run check`, `npm run smoke:pack`, and `git diff --check` verification commands.

---

## Context

The current generator already produces valid `review-request/0.1` packets from
local git state:

- `src/git.ts` resolves `base_commit`, `head_commit`, `diff_range`, remote
  metadata, and `changedFiles`.
- `parseNameStatus` reads `git diff -z --name-status --find-renames` output and
  creates `ChangedFile` entries.
- Renames already populate `changed_files[].evidence` with
  `Renamed from <old-path>`.
- `src/reviewRequest.ts` copies `git.changedFiles` into the packet and computes
  `total_files_changed`.
- The Markdown renderer already has an `Evidence` column for changed files.

The missing reviewer signal is churn. A reviewer cannot currently tell a small
docs tweak from a large implementation file without leaving the packet.

This slice uses the existing optional `changed_files[].evidence` field. It does
not add `review-request/0.2`, add structured `diff_stats`, embed raw diff
hunks, read file contents, run tests, or synthesize `verification` entries.

## Command And Packet Contract

Generated packets should keep the same CLI surface:

```text
open-relay generate review-request ...
open-relay handoff review-request ...
open-relay save review-request ...
```

No new flags are required.

When numstat data is available, `changed_files[].evidence` should contain one
of:

```text
Diff stats: +42 -7.
Renamed from src/old.ts. Diff stats: +12 -3.
Diff stats: binary file.
Renamed from src/old.bin. Diff stats: binary file.
```

When no stat row matches a file, leave the evidence unchanged. For ordinary
non-renamed files, that means omitting `evidence`.

If no `--verification` flags are supplied, generated packets must still contain
`verification: []`. Do not add a synthetic "not run" entry or risk.

## Data Source Rules

Use the same exact two-dot endpoint range already recorded in
`repository.diff_range`:

```text
<base_commit>..<head_commit>
```

The strict command remains:

```bash
git diff -z --name-status --find-renames <base_commit>..<head_commit>
```

The enrichment command is:

```bash
git diff --numstat -z --find-renames <base_commit>..<head_commit>
```

Name-status failures still fail packet generation with the existing sanitized
`Could not read git diff.` behavior. Numstat failures are best-effort: if the
whole `--numstat -z --find-renames` command fails, continue with the
name-status file list and no diff-stat evidence.

## Implementation Tasks

### Task 1: Add Git Collector Tests First

- [ ] Extend `tests/git.test.ts` with a text-file stat test:
  - create a repo with a base commit;
  - add or modify a text file;
  - call `collectGitContext`;
  - assert the file has `evidence` matching `Diff stats: +<N> -<M>.`.
- [ ] Update the existing deleted/renamed test so the renamed file now expects
  rename evidence plus stats, for example:

```ts
evidence: "Renamed from old.txt. Diff stats: +0 -0."
```

Use the actual stat values produced by git for the test fixture. If a pure
rename reports `+0 -0`, assert that exact value.

- [ ] Add a binary-file test:
  - commit `.gitattributes` with `*.bin binary` in the base commit so git
    treats the fixture deterministically as binary;
  - change or add a `.bin` file in the review range;
  - assert `evidence: "Diff stats: binary file."`.
- [ ] Strengthen the non-ASCII path test so it asserts both the raw path and
  its stat evidence. This proves `--numstat -z --find-renames` matches the
  existing `--name-status -z --find-renames` key instead of losing C-quoted
  paths.
- [ ] Add a best-effort numstat failure test by adding an injectable git runner
  to `collectGitContext`:

```ts
const context = collectGitContext({
  cwd: repo,
  baseRef: base,
  headRef: head,
  includeLocalPath: false,
  gitRunner: (cwd, args) => {
    if (args[0] === "diff" && args.includes("--numstat")) {
      throw new Error("synthetic numstat failure");
    }
    return git(cwd, ...args);
  }
});
```

Assert packet generation still returns the changed file list and omits
diff-stat evidence for ordinary files.

- [ ] Add a name-status failure regression test only if the new injection seam
  makes it easy. It should prove name-status still fails closed instead of
  being swallowed by the best-effort numstat path.

Expected initial result: tests fail because `collectGitContext` does not call
`--numstat -z --find-renames`, has no injected runner, and does not append
diff-stat evidence.

### Task 2: Add A Small Git Runner Seam

- [ ] In `src/git.ts`, add an internal runner type and optional test seam:

```ts
type GitRunner = (cwd: string, args: string[]) => string;

export type CollectGitContextOptions = {
  cwd: string;
  baseRef: string;
  headRef: string;
  includeLocalPath: boolean;
  gitRunner?: GitRunner;
};
```

- [ ] In `collectGitContext`, use:

```ts
const runGit = options.gitRunner ?? git;
```

for root/ref/diff/remote/branch commands.

- [ ] Keep production behavior unchanged. The default runner remains the
  existing sanitized `git()` wrapper.
- [ ] Update `optionalGit` to accept a runner:

```ts
function optionalGit(runGit: GitRunner, cwd: string, args: string[]): string | undefined
```

and keep it swallowing only optional-command failures.

### Task 3: Parse `--numstat -z --find-renames`

- [ ] Add narrow internal types in `src/git.ts`:

```ts
type DiffStat =
  | { kind: "text"; added: number; deleted: number }
  | { kind: "binary" };
```

- [ ] Add `parseNumstat(raw: string): Map<string, DiffStat>`.
- [ ] Parse by splitting on NUL while preserving meaningful empty fields:

```ts
const parts = raw.endsWith("\0") ? raw.slice(0, -1).split("\0") : raw.split("\0");
```

- [ ] For ordinary rows, parse headers like:

```text
42\t7\tsrc/cli.ts
-\t-\tassets/logo.png
```

and key the map by the path field.

- [ ] For rename/copy rows, parse headers whose path field is empty:

```text
3\t1\t\0src/old.ts\0src/new.ts\0
```

Read the following old-path and new-path parts, ignore the old path for the
lookup key, and key the map by the new path so it joins to name-status output.

- [ ] Treat `-`/`-` as `{ kind: "binary" }`.
- [ ] Treat non-negative decimal counts as text stats.
- [ ] Skip malformed rows instead of failing generation.
- [ ] Do not implement brace-notation parsing. The design intentionally uses
  `--numstat -z --find-renames` to avoid quoted paths and brace-normalized
  renames.

### Task 4: Join Stats Onto Changed Files

- [ ] In `collectGitContext`, collect stats after `diffRange` is known:

```ts
const diffStats = parseNumstat(optionalGit(runGit, root, [
  "diff",
  "--numstat",
  "-z",
  "--find-renames",
  diffRange
]) ?? "");
```

- [ ] Pass `diffStats` into `parseNameStatus`.
- [ ] Change `parseNameStatus(raw, diffStats)` so it still owns status, role,
  priority, and rename evidence, then appends stats when `diffStats.get(path)`
  exists.
- [ ] Add a formatting helper:

```ts
function formatDiffStat(stat: DiffStat): string {
  return stat.kind === "binary"
    ? "Diff stats: binary file."
    : `Diff stats: +${stat.added} -${stat.deleted}.`;
}
```

- [ ] Add an evidence combiner that preserves punctuation:

```ts
function combineEvidence(parts: string[]): string | undefined {
  return parts.length > 0 ? parts.join(" ") : undefined;
}
```

For a rename with text stats, the final evidence should be:

```text
Renamed from old.txt. Diff stats: +0 -0.
```

- [ ] Keep unmatched stats rows harmless. They should not add files, change
  counts, or fail validation.

### Task 5: Verify Packet And Renderer Behavior Through Existing Commands

- [ ] Add or update a CLI test in `tests/cli.test.ts` that generates a real
  `review-request` JSON packet and asserts:
  - it validates successfully;
  - at least one changed file contains `Diff stats: +`;
  - `verification` remains `[]` when no `--verification` flags are supplied.
- [ ] Add a Markdown-format CLI test or extend an existing one so direct
  Markdown generation shows the diff-stat evidence in the changed-files table.
- [ ] Confirm `handoff review-request` and `save review-request` need no
  command-specific code because they reuse the validated generator path.

### Task 6: Update Examples And Snapshot-Bound Markdown

- [ ] Update `examples/review-request/relay.json` so representative
  `changed_files[]` entries include diff-stat evidence:
  - text file: `Diff stats: +N -M.`;
  - renamed file, if present: `Renamed from <old>. Diff stats: +N -M.`;
  - binary file only if the example already has one or if adding one improves
    the fixture without bloating it.
- [ ] Regenerate `examples/review-request/relay.md` from the JSON fixture using
  the built CLI renderer:

```bash
npm run build
node dist/src/cli.js render examples/review-request/relay.json --output examples/review-request/relay.md
```

- [ ] Run the renderer snapshot tests and update only intentional snapshot
  churn. The committed Markdown must remain byte-for-byte bound to the JSON
  fixture.

### Task 7: Update Package Smoke

- [ ] Extend `scripts/smoke-pack.js` so the installed CLI path proves the new
  behavior:
  - run installed `open-relay generate review-request` in the temp git repo;
  - parse the generated JSON;
  - assert `changed_files` includes at least one evidence string matching
    `Diff stats: +<number> -<number>.`;
  - assert `verification` is still an empty array when no verification flags
    were supplied.
- [ ] Keep the smoke free of raw diff assertions and free of command execution
  beyond the existing package/generator smoke setup.

### Task 8: Update Protocol And Public Docs

- [ ] Update `docs/protocol/review-request-packet.md` to note that the
  generator may populate `changed_files[].evidence` with git-derived diff
  stats, while the schema remains `review-request/0.1`.
- [ ] Update `README.md` only where user-facing generator behavior is already
  described. Keep the wording modest: packets include file-level churn evidence
  when git can provide it.
- [ ] Do not claim registry publishing, live deployment, automation, raw diff
  support, or auto-run test capture.

### Task 9: Close Out Governance For The Implementation PR

- [ ] Update `docs/STATUS.md` after implementation with the exact test count
  and smoke evidence.
- [ ] Update `docs/planning/ROADMAP.md` by moving Packet evidence enrichment to
  `Done` only after implementation merges.
- [ ] Update `docs/planning/ACTIVE_WORK.md`, `PLAN_REGISTRY.md`,
  `VERSION_LEDGER.md`, `ENTITY_LIFECYCLE_SCOPE_MATRIX.md`, and
  `master_build.md` with implementation evidence.
- [ ] Record that no packet version bump occurred and no raw diffs or automatic
  test execution were added.

## Verification Commands

Run before requesting review:

```bash
npm run check
npm run smoke:pack
git diff --check
```

Manual smoke after `npm run build`:

```bash
node dist/src/cli.js generate review-request \
  --goal "Smoke review-request evidence enrichment." \
  --summary "Verify generated packets include diff stats." \
  --behavioral-intent "Improve reviewer triage." \
  --base main \
  --head HEAD \
  --output /private/tmp/open-relay-evidence-review-request.json

node dist/src/cli.js validate /private/tmp/open-relay-evidence-review-request.json
node dist/src/cli.js render /private/tmp/open-relay-evidence-review-request.json \
  --output /private/tmp/open-relay-evidence-review-request.md
```

Inspect the generated JSON and Markdown for:

- `changed_files[].evidence` contains diff stats where git produced numstat
  rows;
- `verification` remains `[]` without explicit verification flags;
- no raw diff hunks or file contents are present.

## Review Focus

Ask reviewers to check:

- Does the implementation use `--numstat -z --find-renames`, not non-NUL
  numstat output?
- Is numstat genuinely best-effort while name-status remains strict?
- Are text, binary, rename, missing-row, command-failure, and non-ASCII path
  cases covered by tests?
- Does the implementation preserve `review-request/0.1` compatibility without
  adding structured `diff_stats`?
- Does the slice avoid raw diff embedding, auto-running tests, and synthetic
  verification entries?
