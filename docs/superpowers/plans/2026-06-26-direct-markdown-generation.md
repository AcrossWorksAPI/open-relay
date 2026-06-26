# Direct Markdown Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `open-relay generate review-request --format markdown` so the generator can emit Claude-ready Markdown directly from local git state.

**Architecture:** Extend the existing generator parser with a small `json|markdown` format enum. Keep packet construction and schema validation unchanged, then route the validated packet through either JSON serialization or the existing `renderReviewRequestMarkdown` function.

**Tech Stack:** TypeScript, Node.js built-in test runner, existing git collector, existing packet builder, existing Markdown renderer, existing package smoke script.

---

## File Structure

- Modify `src/args.ts`: add `GenerateReviewRequestFormat`, `format` on `GenerateReviewRequestOptions`, `--format` parsing, and validation for `json|markdown`.
- Modify `src/cli.ts`: update usage, generate Markdown output when `parsed.options.format === "markdown"`, and keep sanitized output/write messages.
- Modify `tests/args.test.ts`: add parser assertions for default JSON, explicit Markdown, invalid format, and duplicate format.
- Modify `tests/cli.test.ts`: add CLI tests for explicit JSON, Markdown stdout, Markdown file output, invalid format, and Markdown write-failure leak behavior.
- Modify `scripts/smoke-pack.js`: prove the installed CLI can generate Markdown directly from a temp git repo.
- Modify `docs/STATUS.md`: record planning and later implementation evidence.
- Modify `docs/planning/ROADMAP.md`: add direct Markdown generation as the next in-progress slice.
- Modify `docs/planning/ACTIVE_WORK.md`: record this plan as active and update next recommended work.
- Modify `docs/planning/PLAN_REGISTRY.md`: register the design and plan as active sources.
- Modify `docs/planning/VERSION_LEDGER.md`: add planning evidence and later implementation evidence.
- Modify `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: move the generated relay packet/render surface forward after implementation.
- Modify `master_build.md`: update near-term queue and current baseline.

## Task 1: Parser Contract

**Files:**
- Modify: `tests/args.test.ts`
- Modify: `src/args.ts`

- [ ] **Step 1: Add parser tests for output format**

Add these tests to `tests/args.test.ts`:

```ts
test("parses generator format options", () => {
  const defaultResult = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD",
    "--goal", "Goal",
    "--summary", "Summary",
    "--behavioral-intent", "Intent"
  ]);

  if (!defaultResult.ok) {
    assert.fail(defaultResult.message);
  }
  assert.equal(defaultResult.options.format, "json");

  const markdownResult = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD",
    "--goal", "Goal",
    "--summary", "Summary",
    "--behavioral-intent", "Intent",
    "--format", "markdown"
  ]);

  if (!markdownResult.ok) {
    assert.fail(markdownResult.message);
  }
  assert.equal(markdownResult.options.format, "markdown");
});

test("rejects invalid generator format", () => {
  const result = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD",
    "--goal", "Goal",
    "--summary", "Summary",
    "--behavioral-intent", "Intent",
    "--format", "html"
  ]);

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected parse failure");
  }

  assert.match(result.message, /Invalid format: html/);
});
```

Update the existing duplicate singleton test in `tests/args.test.ts` to include
`--format` by adding a second assertion:

```ts
const duplicateFormat = parseGenerateReviewRequestArgs([
  "--base", "main",
  "--head", "HEAD",
  "--goal", "Goal",
  "--summary", "Summary",
  "--behavioral-intent", "Intent",
  "--format", "json",
  "--format", "markdown"
]);

assert.equal(duplicateFormat.ok, false);
if (duplicateFormat.ok) {
  throw new Error("expected parse failure");
}
assert.match(duplicateFormat.message, /Duplicate flag/);
assert.match(duplicateFormat.message, /--format/);
```

- [ ] **Step 2: Run parser tests and confirm they fail**

Run:

```bash
npm test -- --test-name-pattern="parses generator format options|rejects invalid generator format|rejects duplicate singleton flags"
```

Expected: build or tests fail because `format` is not implemented.

- [ ] **Step 3: Implement parser format support**

In `src/args.ts`, add:

```ts
export type GenerateReviewRequestFormat = "json" | "markdown";
```

Add to `GenerateReviewRequestOptions`:

```ts
format: GenerateReviewRequestFormat;
```

Add `"--format"` to `allowedValueFlags`.

Add this helper:

```ts
function parseFormat(value: string | undefined): GenerateReviewRequestFormat | undefined {
  if (value === undefined) {
    return "json";
  }

  if (value === "json" || value === "markdown") {
    return value;
  }

  return undefined;
}
```

Before returning success from `parseGenerateReviewRequestArgs`, add:

```ts
const format = parseFormat(first(values, "--format"));
if (!format) {
  return { ok: false, message: `Invalid format: ${first(values, "--format")}` };
}
```

Then set:

```ts
format,
```

inside the returned `options` object.

- [ ] **Step 4: Run parser tests and confirm they pass**

Run:

```bash
npm test -- --test-name-pattern="parses generator format options|rejects invalid generator format|rejects duplicate singleton flags"
```

Expected: selected tests pass.

## Task 2: CLI Direct Markdown Output

**Files:**
- Modify: `tests/cli.test.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Add CLI tests for direct Markdown output**

Add tests to `tests/cli.test.ts` using the existing temp git repo pattern from
`generates a schema-valid review-request packet to a file`:

```ts
test("generates review-request markdown to stdout", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Generate Markdown packet",
      "--summary", "Creates rendered Markdown from git state.",
      "--behavioral-intent", "Reduce the two-step review handoff.",
      "--format", "markdown"
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /^# Review Request Relay Packet/);
    assert.match(result.stdout, /## Next Action/);
    assert.doesNotMatch(result.stdout, /^\{/);
    assert.equal(result.stderr, "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generates review-request markdown to a file", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR.md");

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Generate Markdown packet",
      "--summary", "Creates rendered Markdown from git state.",
      "--behavioral-intent", "Reduce the two-step review handoff.",
      "--format", "markdown",
      "--output", outputPath
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Wrote review-request Markdown/);
    assert.doesNotMatch(result.stdout, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.equal(result.stderr, "");
    assert.match(readFileSync(outputPath, "utf8"), /^# Review Request Relay Packet/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects generate review-request with invalid format", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "generate",
    "review-request",
    "--base", "origin/main",
    "--head", "HEAD",
    "--goal", "Generate packet",
    "--summary", "Creates a packet from git state.",
    "--behavioral-intent", "Reduce manual handoff assembly.",
    "--format", "html"
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Invalid format: html/);
  assert.doesNotMatch(result.stdout, /^# Review Request Relay Packet/m);
});
```

Add this helper near the existing `runGit` helper:

```ts
function createChangedGitRepo(directory: string): { base: string; head: string } {
  runGit(directory, "init", "--initial-branch", "main");
  runGit(directory, "config", "user.email", "test@example.com");
  runGit(directory, "config", "user.name", "Open Relay Test");
  writeFileSync(join(directory, "README.md"), "# Repo\n", "utf8");
  runGit(directory, "add", "README.md");
  runGit(directory, "commit", "-m", "initial");
  const base = runGit(directory, "rev-parse", "HEAD").trim();
  writeFileSync(join(directory, "README.md"), "# Repo\n\nChanged.\n", "utf8");
  runGit(directory, "add", "README.md");
  runGit(directory, "commit", "-m", "change readme");
  const head = runGit(directory, "rev-parse", "HEAD").trim();
  return { base, head };
}
```

- [ ] **Step 2: Run CLI tests and confirm Markdown tests fail**

Run:

```bash
npm test -- --test-name-pattern="generates review-request markdown|rejects generate review-request with invalid format"
```

Expected: selected Markdown tests fail before implementation.

- [ ] **Step 3: Update CLI usage and output formatting**

In `src/cli.ts`, update the generate usage line to:

```ts
  open-relay generate review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--format json|markdown] [--output <path>]
```

Inside `generateReviewRequestCommand`, replace the JSON-only output block with:

```ts
const output = parsed.options.format === "markdown"
  ? renderReviewRequestMarkdown(packet)
  : `${JSON.stringify(packet, null, 2)}\n`;
const successMessage = parsed.options.format === "markdown"
  ? "Wrote review-request Markdown.\n"
  : "Wrote review-request packet.\n";
const writeErrorMessage = parsed.options.format === "markdown"
  ? "Could not write review-request Markdown.\n"
  : "Could not write review-request packet.\n";

if (parsed.options.output) {
  try {
    await writeFile(parsed.options.output, output, "utf8");
  } catch {
    process.stderr.write(writeErrorMessage);
    return 1;
  }
  process.stdout.write(successMessage);
} else {
  process.stdout.write(output);
}
```

- [ ] **Step 4: Run CLI tests and confirm they pass**

Run:

```bash
npm test -- --test-name-pattern="generates review-request markdown|rejects generate review-request with invalid format"
```

Expected: selected tests pass.

## Task 3: Write-Failure Regression And Explicit JSON Smoke

**Files:**
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Add explicit JSON and Markdown write-failure tests**

Add these tests to `tests/cli.test.ts`:

```ts
test("generates explicit json format to stdout", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Generate JSON packet",
      "--summary", "Creates JSON from git state.",
      "--behavioral-intent", "Keep current generator behavior explicit.",
      "--format", "json"
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    const packet = JSON.parse(result.stdout);
    assert.equal(packet.packet_type, "review-request");
    assert.equal(result.stderr, "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects unwritable markdown output paths without echoing path values", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR", "relay.md");

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Generate Markdown packet",
      "--summary", "Creates rendered Markdown from git state.",
      "--behavioral-intent", "Reduce the two-step review handoff.",
      "--format", "markdown",
      "--output", outputPath
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Could not write review-request Markdown/);
    assert.doesNotMatch(result.stderr, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.doesNotMatch(result.stdout, /^# Review Request Relay Packet/m);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run the new regression tests**

Run:

```bash
npm test -- --test-name-pattern="generates explicit json format|rejects unwritable markdown output paths"
```

Expected: selected tests pass.

## Task 4: Package Smoke And Documentation

**Files:**
- Modify: `scripts/smoke-pack.js`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`
- Modify: `master_build.md`

- [ ] **Step 1: Update package smoke**

In `scripts/smoke-pack.js`, after the installed CLI generates
`generatedPacket`, add an installed CLI Markdown generation smoke:

```js
const generatedMarkdown = join(workspace, "generated.md");
runCli(cli, [
  "generate",
  "review-request",
  "--base", base,
  "--head", head,
  "--goal", "Smoke package install",
  "--summary", "Verifies installed CLI can generate Markdown directly.",
  "--behavioral-intent", "Prove package tarball supports direct Markdown generation.",
  "--format", "markdown",
  "--output", generatedMarkdown
], {
  cwd: gitRepo,
  contains: "Wrote review-request Markdown."
});

const markdown = readFileSync(generatedMarkdown, "utf8");
assert.match(markdown, /^# Review Request Relay Packet/);
assert.match(markdown, /## Next Action/);
```

Also add `readFileSync` to the `node:fs` destructuring import.

- [ ] **Step 2: Update roadmap/status docs for implementation branch**

Record direct Markdown generation as `In progress` during the implementation
branch:

```markdown
| Unversioned | Direct Markdown generation | In progress | Medium | No | Package and release target | docs/superpowers/plans/2026-06-26-direct-markdown-generation.md |
```

Keep agent-specific prompt dialects, storage, package publishing, and live
release deferred.

- [ ] **Step 3: Run full verification**

Run:

```bash
npm run check
npm run smoke:pack
git diff --check
```

Expected: all commands pass.

- [ ] **Step 4: Push and open implementation PR**

```bash
git push -u origin codex/direct-markdown-generation-implementation
gh pr create --repo AcrossWorksAPI/open-relay --base main --head codex/direct-markdown-generation-implementation --title "feat: generate review-request markdown directly" --body-file /private/tmp/open-relay-direct-markdown-pr-body.md
```

Expected: GitHub returns a PR URL. Wait for `Governance Checks`, then request
Claude review if CI is green.
