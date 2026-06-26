# Handoff Review Request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `open-relay handoff review-request` as a Markdown-first local workflow command for creating review handoff packets.

**Architecture:** Reuse the existing generator parser, git collector, packet builder, validator, and Markdown renderer. The new route rejects explicit `--format`, then forces `format: "markdown"` through the existing generation path instead of adding a second packet-building implementation.

**Tech Stack:** TypeScript, Node.js built-in test runner, existing CLI parser, existing review-request generator, existing Markdown renderer, existing package smoke script.

---

## File Structure

- Modify `src/cli.ts`: add help text and a `handoff review-request` route that calls the generator with forced Markdown format.
- Modify `tests/cli.test.ts`: add CLI behavior tests for help, stdout, output-file, unsupported `--format`, write-failure sanitization, and parity with direct Markdown generation.
- Modify `scripts/smoke-pack.js`: prove the installed CLI can run `handoff review-request`.
- Modify `AGENTS.md`: update current scope and non-goals now that direct Markdown generation is merged and handoff planning is active.
- Modify `docs/STATUS.md`: record handoff planning and verification evidence.
- Modify `docs/planning/ROADMAP.md`: add handoff workflow as the next in-progress slice.
- Modify `docs/planning/ACTIVE_WORK.md`: record this design and plan as active sources and update next recommended work.
- Modify `docs/planning/PLAN_REGISTRY.md`: register the design and plan.
- Modify `docs/planning/VERSION_LEDGER.md`: add planning evidence and rollback note.
- Modify `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: move the review-loop surface from future candidate toward planned/in-progress local handoff workflow.
- Modify `master_build.md`: update current baseline and near-term queue.

## Task 1: CLI Handoff Contract

**Files:**
- Modify: `tests/cli.test.ts`
- Modify: `src/cli.ts`

- [ ] **Step 1: Add tests for handoff help and Markdown stdout**

Add these tests to `tests/cli.test.ts`, reusing the existing
`createChangedGitRepo` helper:

```ts
test("prints handoff review-request in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay handoff review-request/);
  assert.match(result.stdout, /Creates local review handoff Markdown; does not send it anywhere/);
});

test("handoff review-request writes markdown to stdout", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "handoff",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Create handoff packet",
      "--summary", "Creates a Markdown handoff from git state.",
      "--behavioral-intent", "Make the review handoff command obvious."
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
```

- [ ] **Step 2: Run focused tests and confirm they fail**

Run:

```bash
npm test -- --test-name-pattern="prints handoff review-request|handoff review-request writes markdown"
```

Expected: selected tests fail because the handoff route is missing.

- [ ] **Step 3: Add help text and route**

In `src/cli.ts`, add this usage line:

```ts
  open-relay handoff review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--output <relay.md>]
```

Add this local-only help note so the workflow name does not imply external
delivery:

```ts
  handoff review-request creates local review handoff Markdown; it does not send it anywhere.
```

Add this route after the existing `generate` route:

```ts
if (args[0] === "handoff" && args[1] === "review-request") {
  return handoffReviewRequestCommand(args.slice(2));
}
```

Add this helper:

```ts
async function handoffReviewRequestCommand(args: string[]): Promise<number> {
  if (hasFlag(args, "--format")) {
    process.stderr.write("--format is not supported for handoff review-request; use generate review-request --format instead.\n\n");
    process.stderr.write(usage);
    return 2;
  }

  return generateReviewRequestCommand([...args, "--format", "markdown"]);
}

function hasFlag(args: string[], flag: string): boolean {
  return args.some((arg) => arg === flag || arg.startsWith(`${flag}=`));
}
```

- [ ] **Step 4: Run focused tests and confirm they pass**

Run:

```bash
npm test -- --test-name-pattern="prints handoff review-request|handoff review-request writes markdown"
```

Expected: selected tests pass.

## Task 2: Handoff Output And Error Regressions

**Files:**
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Add output-file, unsupported-format, write-failure, and parity tests**

Add these tests to `tests/cli.test.ts`:

```ts
test("handoff review-request writes markdown to a file", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR.md");

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "handoff",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Create handoff packet",
      "--summary", "Creates a Markdown handoff from git state.",
      "--behavioral-intent", "Make the review handoff command obvious.",
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

test("handoff review-request rejects explicit format", () => {
  for (const formatFlag of [["--format", "json"], ["--format=markdown"]]) {
    const result = spawnSync(process.execPath, [
      cliPath,
      "handoff",
      "review-request",
      "--base", "origin/main",
      "--head", "HEAD",
      "--goal", "Create handoff packet",
      "--summary", "Creates a Markdown handoff from git state.",
      "--behavioral-intent", "Make the review handoff command obvious.",
      ...formatFlag
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 2);
    assert.match(result.stderr, /--format is not supported for handoff review-request/);
    assert.doesNotMatch(result.stdout, /^# Review Request Relay Packet/m);
  }
});

test("handoff review-request rejects unwritable output paths without echoing path values", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR", "relay.md");

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "handoff",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Create handoff packet",
      "--summary", "Creates a Markdown handoff from git state.",
      "--behavioral-intent", "Make the review handoff command obvious.",
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

test("handoff review-request matches direct markdown generation", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);

  try {
    const { base, head } = createChangedGitRepo(directory);
    const commonArgs = [
      "--base", base,
      "--head", head,
      "--goal", "Create handoff packet",
      "--summary", "Creates a Markdown handoff from git state.",
      "--behavioral-intent", "Make the review handoff command obvious."
    ];

    const handoff = spawnSync(process.execPath, [
      absoluteCliPath,
      "handoff",
      "review-request",
      ...commonArgs
    ], {
      cwd: directory,
      encoding: "utf8"
    });
    const generated = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      ...commonArgs,
      "--format", "markdown"
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(handoff.status, 0);
    assert.equal(generated.status, 0);
    assert.equal(stripCreatedAt(handoff.stdout), stripCreatedAt(generated.stdout));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
```

Add this helper near the existing test helpers:

```ts
function stripCreatedAt(markdown: string): string {
  return markdown.replace(/- Created at: `[^`]+`/, "- Created at: `<timestamp>`");
}
```

- [ ] **Step 2: Run focused handoff tests**

Run:

```bash
npm test -- --test-name-pattern="handoff review-request"
```

Expected: selected tests pass.

## Task 3: Package Smoke And Docs

**Files:**
- Modify: `scripts/smoke-pack.js`
- Modify: `AGENTS.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`
- Modify: `master_build.md`

- [ ] **Step 1: Update package smoke**

In `scripts/smoke-pack.js`, after the installed CLI direct Markdown generation
smoke, add:

```js
const handoffMarkdown = join(workspace, "handoff.md");
runCli(cli, [
  "handoff",
  "review-request",
  "--base", base,
  "--head", head,
  "--goal", "Smoke package handoff",
  "--summary", "Verifies installed CLI can create a Markdown handoff.",
  "--behavioral-intent", "Prove package tarball supports the handoff workflow.",
  "--output", handoffMarkdown
], {
  cwd: gitRepo,
  contains: "Wrote review-request Markdown."
});

const handoff = readFileSync(handoffMarkdown, "utf8");
assert.match(handoff, /^# Review Request Relay Packet/);
assert.match(handoff, /## Next Action/);
```

- [ ] **Step 2: Update roadmap/status docs for implementation branch**

During implementation, record:

```markdown
| Unversioned | Local handoff workflow | In progress | Medium | No | Direct Markdown generation | docs/superpowers/plans/2026-06-26-handoff-review-request.md |
```

Keep storage, agent-specific templates, app orchestration, external delivery,
package publishing, and live release deferred.

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
git push -u origin codex/handoff-review-request-implementation
gh pr create --repo AcrossWorksAPI/open-relay --base main --head codex/handoff-review-request-implementation --title "feat: add review-request handoff command" --body-file /private/tmp/open-relay-handoff-review-request-pr-body.md
```

Expected: GitHub returns a PR URL. Wait for `Governance Checks`, then request
Claude review if CI is green.
