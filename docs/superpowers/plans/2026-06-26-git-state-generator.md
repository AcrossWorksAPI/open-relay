# Git-State Review Request Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `open-relay generate review-request` to create schema-valid review-request JSON packets from local git state.

**Architecture:** Extend the existing TypeScript CLI with small modules for argument parsing, git collection, redaction, and packet assembly. The generator validates packets with the existing schema module before writing JSON, and it never embeds diff content, file contents, command output, environment values, or local paths by default.

**Tech Stack:** TypeScript on Node.js, npm, Node `child_process`, Node `fs/promises`, Node test runner, existing Ajv schema validator.

---

## Files

- Create: `src/args.ts`
- Create: `src/git.ts`
- Create: `src/redaction.ts`
- Create: `src/reviewRequest.ts`
- Create: `tests/args.test.ts`
- Create: `tests/git.test.ts`
- Create: `tests/redaction.test.ts`
- Create: `tests/reviewRequest.test.ts`
- Modify: `src/cli.ts`
- Modify: `src/index.ts`
- Modify: `tests/cli.test.ts`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `master_build.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

## Dependency Decision

Do not add dependencies. The first generator only needs Node standard-library
APIs and the existing schema validator. Keep argument parsing in `src/args.ts`
until the CLI grows enough to justify a framework.

## Lifecycle Coverage

| Lens | Plan handling |
| --- | --- |
| Create/invite/attach | Creates one packet only when `--output` is supplied; otherwise writes JSON to stdout. |
| List/search/view | Reads the current git repository and explicit `base..head` range. |
| Edit/update | Does not mutate packet content after validation; explicit `--output` may overwrite a file. |
| Activate/deactivate/archive | Not applicable to local packet generation. |
| Remove/delete/offboard | Does not delete files. |
| Transfer/reassignment/ownership | The local CLI user owns generated output. |
| Internal notes/support metadata | Adds provenance, redaction, and sensitive-data notes. |
| Permissions/roles/scope | Uses only local process git and filesystem permissions. |
| Audit/events | Git history, tests, terminal output, and CI checks are the audit trail. |
| Notifications | Deferred. |
| Billing/quota impact | Not applicable. |
| Error/empty/recovery/smoke states | Tests cover missing flags, non-git directories, invalid refs, empty diffs, unsafe remotes, stdout output, file output, and schema-valid output. |

## Acceptance Criteria

- [ ] `open-relay generate review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text>` writes schema-valid JSON to stdout.
- [ ] `--output <path>` writes schema-valid JSON to the given file.
- [ ] Generated packets validate with `validatePacket`.
- [ ] Generated packets include base/head commits, diff range, branch context, and exhaustive changed files.
- [ ] Changed-file status mapping covers added, modified, deleted, renamed, and unknown statuses.
- [ ] Unsafe remote URLs and local paths are omitted and recorded as redactions.
- [ ] `repository.local_path` is omitted unless `--include-local-path` is supplied.
- [ ] Missing required flags return exit `2`.
- [ ] Non-git directories, invalid refs, and empty diffs return exit `1`.
- [ ] No diff content, file content, command output, or environment values appear in generated packets by default.
- [ ] `npm run check` passes.
- [ ] `git diff --check` passes.
- [ ] Roadmap/status docs record the generator implementation status and remaining storage/redaction decisions.

## Command Contract

Required:

```text
open-relay generate review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text>
```

Optional:

```text
--output <path>
--audience <text>
--focus <text>
--requested-output <text>
--reviewer-access <text>
--pr-url <url>
--verification <kind|command|result|evidence>
--risk <severity|description|handling>
--excluded-scope <text>
--include-local-path
```

Argument values that begin with `--` are intentionally unsupported in the first
parser. Users should rephrase those values until a later slice adds
`--flag=value` or `--` separator support.

Defaults:

```typescript
const defaultAudience = "Claude Code";
const defaultFocus = [
  "Correctness and behavioral regressions",
  "Security and privacy risks",
  "Missing verification or test coverage"
];
const defaultRequestedOutput = "Findings first with file/line references where possible; say clearly if there are no findings.";
const defaultReviewerAccess = "Reviewer needs read access to the repository and diff range.";
const defaultExcludedScope = [
  "Diff content is not embedded in the packet.",
  "Markdown rendering and agent-specific prompt templates are deferred."
];
```

## Task 1: Argument Parser

**Files:**
- Create: `src/args.ts`
- Create: `tests/args.test.ts`

- [ ] **Step 1: Write parser tests**

Create `tests/args.test.ts`:

```typescript
import assert from "node:assert/strict";
import { test } from "node:test";

import { parseGenerateReviewRequestArgs } from "../src/args";

test("parses required generator flags and defaults", () => {
  const result = parseGenerateReviewRequestArgs([
    "--base", "origin/main",
    "--head", "HEAD",
    "--goal", "Add generator",
    "--summary", "Generate review-request packets.",
    "--behavioral-intent", "Reduce handoff copy and paste."
  ]);

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error(result.message);
  }

  assert.equal(result.options.base, "origin/main");
  assert.equal(result.options.head, "HEAD");
  assert.equal(result.options.goal, "Add generator");
  assert.equal(result.options.summary, "Generate review-request packets.");
  assert.equal(result.options.behavioralIntent, "Reduce handoff copy and paste.");
  assert.equal(result.options.audience, "Claude Code");
  assert.deepEqual(result.options.focus, [
    "Correctness and behavioral regressions",
    "Security and privacy risks",
    "Missing verification or test coverage"
  ]);
  assert.equal(result.options.output, undefined);
});

test("parses repeated focus, verification, risk, excluded scope, and flags", () => {
  const result = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "feature",
    "--goal", "Review feature",
    "--summary", "Adds feature.",
    "--behavioral-intent", "Change runtime behavior.",
    "--focus", "Schema parity",
    "--focus", "CLI behavior",
    "--verification", "command|npm run check|passed|8 tests passing",
    "--risk", "low|Package not published|Keep private true",
    "--excluded-scope", "No Markdown renderer",
    "--include-local-path",
    "--output", "relay.json",
    "--pr-url", "https://github.com/AcrossWorksAPI/open-relay/pull/12"
  ]);

  assert.equal(result.ok, true);
  if (!result.ok) {
    throw new Error(result.message);
  }

  assert.deepEqual(result.options.focus, ["Schema parity", "CLI behavior"]);
  assert.deepEqual(result.options.verification, [{
    kind: "command",
    command: "npm run check",
    result: "passed",
    evidence: "8 tests passing"
  }]);
  assert.deepEqual(result.options.risks, [{
    severity: "low",
    description: "Package not published",
    handling: "Keep private true"
  }]);
  assert.deepEqual(result.options.excludedScope, ["No Markdown renderer"]);
  assert.equal(result.options.includeLocalPath, true);
  assert.equal(result.options.output, "relay.json");
  assert.equal(result.options.pullRequestUrl, "https://github.com/AcrossWorksAPI/open-relay/pull/12");
});

test("rejects missing required generator flags", () => {
  const result = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD"
  ]);

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected parse failure");
  }

  assert.match(result.message, /Missing required flags/);
  assert.match(result.message, /--goal/);
  assert.match(result.message, /--summary/);
  assert.match(result.message, /--behavioral-intent/);
});

test("rejects malformed verification and risk entries", () => {
  const malformedVerification = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD",
    "--goal", "Goal",
    "--summary", "Summary",
    "--behavioral-intent", "Intent",
    "--verification", "command|npm run check"
  ]);
  assert.equal(malformedVerification.ok, false);

  const malformedRisk = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD",
    "--goal", "Goal",
    "--summary", "Summary",
    "--behavioral-intent", "Intent",
    "--risk", "low|Only two parts"
  ]);
  assert.equal(malformedRisk.ok, false);
});
```

- [ ] **Step 2: Run the failing parser tests**

Run:

```bash
npm run check
```

Expected:

```text
FAIL because src/args.ts does not exist yet.
```

- [ ] **Step 3: Implement the parser**

Create `src/args.ts`:

```typescript
export type VerificationInput = {
  kind: "command" | "ci" | "manual" | "external";
  command: string;
  result: "passed" | "failed" | "not_run" | "unknown";
  evidence: string;
};

export type RiskInput = {
  severity: "high" | "medium" | "low" | "info";
  description: string;
  handling: string;
};

export type GenerateReviewRequestOptions = {
  base: string;
  head: string;
  goal: string;
  summary: string;
  behavioralIntent: string;
  output?: string;
  audience: string;
  focus: string[];
  requestedOutput: string;
  reviewerAccess: string;
  pullRequestUrl?: string;
  verification: VerificationInput[];
  risks: RiskInput[];
  excludedScope: string[];
  includeLocalPath: boolean;
};

export type ParseResult =
  | { ok: true; options: GenerateReviewRequestOptions }
  | { ok: false; message: string };

const defaultFocus = [
  "Correctness and behavioral regressions",
  "Security and privacy risks",
  "Missing verification or test coverage"
];

const defaultExcludedScope = [
  "Diff content is not embedded in the packet.",
  "Markdown rendering and agent-specific prompt templates are deferred."
];

const allowedVerificationKinds = new Set(["command", "ci", "manual", "external"]);
const allowedVerificationResults = new Set(["passed", "failed", "not_run", "unknown"]);
const allowedRiskSeverities = new Set(["high", "medium", "low", "info"]);

export function parseGenerateReviewRequestArgs(args: string[]): ParseResult {
  const values = new Map<string, string[]>();
  let includeLocalPath = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === "--include-local-path") {
      includeLocalPath = true;
      continue;
    }

    if (!token.startsWith("--")) {
      return { ok: false, message: `Unexpected argument: ${token}` };
    }

    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      return { ok: false, message: `Missing value for ${token}` };
    }

    index += 1;
    const existing = values.get(token) ?? [];
    existing.push(value);
    values.set(token, existing);
  }

  const missing = ["--base", "--head", "--goal", "--summary", "--behavioral-intent"]
    .filter((flag) => first(values, flag) === undefined);

  if (missing.length > 0) {
    return { ok: false, message: `Missing required flags: ${missing.join(", ")}` };
  }

  const verification = parseVerificationList(values.get("--verification") ?? []);
  if (!verification.ok) {
    return verification;
  }

  const risks = parseRiskList(values.get("--risk") ?? []);
  if (!risks.ok) {
    return risks;
  }

  return {
    ok: true,
    options: {
      base: required(values, "--base"),
      head: required(values, "--head"),
      goal: required(values, "--goal"),
      summary: required(values, "--summary"),
      behavioralIntent: required(values, "--behavioral-intent"),
      output: first(values, "--output"),
      audience: first(values, "--audience") ?? "Claude Code",
      focus: values.get("--focus") ?? defaultFocus,
      requestedOutput: first(values, "--requested-output") ?? "Findings first with file/line references where possible; say clearly if there are no findings.",
      reviewerAccess: first(values, "--reviewer-access") ?? "Reviewer needs read access to the repository and diff range.",
      pullRequestUrl: first(values, "--pr-url"),
      verification: verification.items,
      risks: risks.items,
      excludedScope: values.get("--excluded-scope") ?? defaultExcludedScope,
      includeLocalPath
    }
  };
}

function parseVerificationList(entries: string[]): { ok: true; items: VerificationInput[] } | { ok: false; message: string } {
  const items: VerificationInput[] = [];

  for (const entry of entries) {
    const parts = entry.split("|");
    if (parts.length !== 4) {
      return { ok: false, message: "--verification must use kind|command|result|evidence" };
    }

    const [kind, command, result, evidence] = parts;
    if (!allowedVerificationKinds.has(kind) || !allowedVerificationResults.has(result)) {
      return { ok: false, message: `Invalid verification entry: ${entry}` };
    }

    items.push({
      kind: kind as VerificationInput["kind"],
      command,
      result: result as VerificationInput["result"],
      evidence
    });
  }

  return { ok: true, items };
}

function parseRiskList(entries: string[]): { ok: true; items: RiskInput[] } | { ok: false; message: string } {
  const items: RiskInput[] = [];

  for (const entry of entries) {
    const parts = entry.split("|");
    if (parts.length !== 3) {
      return { ok: false, message: "--risk must use severity|description|handling" };
    }

    const [severity, description, handling] = parts;
    if (!allowedRiskSeverities.has(severity)) {
      return { ok: false, message: `Invalid risk entry: ${entry}` };
    }

    items.push({
      severity: severity as RiskInput["severity"],
      description,
      handling
    });
  }

  return { ok: true, items };
}

function first(values: Map<string, string[]>, flag: string): string | undefined {
  return values.get(flag)?.[0];
}

function required(values: Map<string, string[]>, flag: string): string {
  const value = first(values, flag);
  if (value === undefined) {
    throw new Error(`missing required value after validation: ${flag}`);
  }
  return value;
}
```

- [ ] **Step 4: Verify parser tests pass**

Run:

```bash
npm run check
```

Expected:

```text
Parser tests pass with the existing CLI/schema tests.
```

- [ ] **Step 5: Commit parser**

Run:

```bash
git add src/args.ts tests/args.test.ts
git commit -m "feat: parse review-request generator arguments"
```

## Task 2: Git Context Collector

**Files:**
- Create: `src/git.ts`
- Create: `tests/git.test.ts`

- [ ] **Step 1: Write git collector tests**

Create `tests/git.test.ts`:

```typescript
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, renameSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { collectGitContext } from "../src/git";

test("collects repository commits and changed files", () => {
  const repo = createRepo();
  try {
    writeFileSync(join(repo, "README.md"), "# Repo\n", "utf8");
    git(repo, "add", "README.md");
    git(repo, "commit", "-m", "initial");
    const base = git(repo, "rev-parse", "HEAD").trim();

    mkdirSync(join(repo, "src"));
    writeFileSync(join(repo, "src", "index.ts"), "export const value = 1;\n", "utf8");
    writeFileSync(join(repo, "README.md"), "# Repo\n\nUpdated.\n", "utf8");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "add source");
    const head = git(repo, "rev-parse", "HEAD").trim();

    const context = collectGitContext({
      cwd: repo,
      baseRef: base,
      headRef: head,
      includeLocalPath: false
    });

    assert.equal(context.baseCommit, base);
    assert.equal(context.headCommit, head);
    assert.equal(context.diffRange, `${base}..${head}`);
    assert.equal(context.localPath, undefined);
    assert.deepEqual(context.changedFiles.map((file) => file.path).sort(), [
      "README.md",
      "src/index.ts"
    ]);
    assert.equal(context.changedFiles.find((file) => file.path === "src/index.ts")?.review_priority, "high");
    assert.equal(context.changedFiles.find((file) => file.path === "README.md")?.review_priority, "medium");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("maps deleted and renamed files", () => {
  const repo = createRepo();
  try {
    writeFileSync(join(repo, "old.txt"), "old\n", "utf8");
    writeFileSync(join(repo, "delete.txt"), "delete\n", "utf8");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "initial");
    const base = git(repo, "rev-parse", "HEAD").trim();

    renameSync(join(repo, "old.txt"), join(repo, "new.txt"));
    rmSync(join(repo, "delete.txt"));
    git(repo, "add", "-A");
    git(repo, "commit", "-m", "rename and delete");
    const head = git(repo, "rev-parse", "HEAD").trim();

    const context = collectGitContext({
      cwd: repo,
      baseRef: base,
      headRef: head,
      includeLocalPath: true
    });

    assert.equal(context.localPath, repo);
    assert.deepEqual(context.changedFiles, [
      {
        path: "delete.txt",
        status: "deleted",
        role: "Deleted file in review range.",
        review_priority: "low"
      },
      {
        path: "new.txt",
        status: "renamed",
        role: "Renamed file in review range.",
        review_priority: "low",
        evidence: "Renamed from old.txt"
      }
    ]);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("throws when the diff has no changed files", () => {
  const repo = createRepo();
  try {
    writeFileSync(join(repo, "README.md"), "# Repo\n", "utf8");
    git(repo, "add", "README.md");
    git(repo, "commit", "-m", "initial");
    const head = git(repo, "rev-parse", "HEAD").trim();

    assert.throws(() => collectGitContext({
      cwd: repo,
      baseRef: head,
      headRef: head,
      includeLocalPath: false
    }), /No changed files found/);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test("keeps non-ascii paths from nul-delimited name-status output", () => {
  const repo = createRepo();
  try {
    writeFileSync(join(repo, "README.md"), "# Repo\n", "utf8");
    git(repo, "add", "README.md");
    git(repo, "commit", "-m", "initial");
    const base = git(repo, "rev-parse", "HEAD").trim();

    writeFileSync(join(repo, "cafe-accent-\u00e9.txt"), "accent\n", "utf8");
    git(repo, "add", ".");
    git(repo, "commit", "-m", "add accented path");
    const head = git(repo, "rev-parse", "HEAD").trim();

    const context = collectGitContext({
      cwd: repo,
      baseRef: base,
      headRef: head,
      includeLocalPath: false
    });

    assert.equal(context.changedFiles[0]?.path, "cafe-accent-\u00e9.txt");
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

function createRepo(): string {
  const repo = mkdtempSync(join(tmpdir(), "open-relay-git-"));
  git(repo, "init");
  git(repo, "config", "user.email", "test@example.com");
  git(repo, "config", "user.name", "Open Relay Test");
  git(repo, "remote", "add", "origin", "https://github.com/AcrossWorksAPI/open-relay.git");
  return repo;
}

function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1"
    }
  });
}
```

- [ ] **Step 2: Run the failing git tests**

Run:

```bash
npm run check
```

Expected:

```text
FAIL because src/git.ts does not exist yet.
```

- [ ] **Step 3: Implement git collection**

Create `src/git.ts`:

```typescript
import { execFileSync } from "node:child_process";

export type ChangedFile = {
  path: string;
  status: "added" | "modified" | "deleted" | "renamed" | "unknown";
  role: string;
  review_priority: "high" | "medium" | "low";
  evidence?: string;
};

export type GitContext = {
  repositoryName: string;
  remoteUrl?: string;
  localPath?: string;
  baseBranch: string;
  workingBranch: string;
  baseCommit: string;
  headCommit: string;
  diffRange: string;
  changedFiles: ChangedFile[];
};

export type CollectGitContextOptions = {
  cwd: string;
  baseRef: string;
  headRef: string;
  includeLocalPath: boolean;
};

export function collectGitContext(options: CollectGitContextOptions): GitContext {
  const root = git(options.cwd, ["rev-parse", "--show-toplevel"]).trim();
  const baseCommit = git(root, ["rev-parse", "--verify", options.baseRef]).trim();
  const headCommit = git(root, ["rev-parse", "--verify", options.headRef]).trim();
  // V1 records and generates the exact endpoint diff. Three-dot PR semantics are deferred.
  const diffRange = `${baseCommit}..${headCommit}`;
  const changedFiles = parseNameStatus(git(root, [
    "diff",
    "-z",
    "--name-status",
    "--find-renames",
    diffRange
  ]));

  if (changedFiles.length === 0) {
    throw new Error(`No changed files found for ${diffRange}`);
  }

  const remoteUrl = optionalGit(root, ["remote", "get-url", "origin"]);
  const currentBranch = optionalGit(root, ["branch", "--show-current"]);

  return {
    repositoryName: repositoryNameFromRemote(remoteUrl) ?? root.split(/[\\/]/).pop() ?? "unknown-repository",
    remoteUrl,
    localPath: options.includeLocalPath ? root : undefined,
    baseBranch: options.baseRef,
    workingBranch: currentBranch.trim() || options.headRef,
    baseCommit,
    headCommit,
    diffRange,
    changedFiles
  };
}

function parseNameStatus(raw: string): ChangedFile[] {
  const parts = raw.split("\0").filter((part) => part.length > 0);
  const files: ChangedFile[] = [];

  for (let index = 0; index < parts.length;) {
    const statusCode = parts[index];
    const status = mapStatus(statusCode);
    index += 1;

    const previousPath = status === "renamed" ? parts[index] : undefined;
    if (status === "renamed") {
      index += 1;
    }

    const path = parts[index];
    index += 1;

    files.push({
      path,
      status,
      role: roleForStatus(status),
      review_priority: priorityForPath(path),
      ...(previousPath ? { evidence: `Renamed from ${previousPath}` } : {})
    });
  }

  return files;
}

function mapStatus(statusCode: string): ChangedFile["status"] {
  if (statusCode === "A") {
    return "added";
  }
  if (statusCode === "M") {
    return "modified";
  }
  if (statusCode === "D") {
    return "deleted";
  }
  if (statusCode.startsWith("R")) {
    return "renamed";
  }
  return "unknown";
}

function roleForStatus(status: ChangedFile["status"]): string {
  const labels: Record<ChangedFile["status"], string> = {
    added: "Added file in review range.",
    modified: "Modified file in review range.",
    deleted: "Deleted file in review range.",
    renamed: "Renamed file in review range.",
    unknown: "Changed file with unclassified git status."
  };
  return labels[status];
}

function priorityForPath(path: string): ChangedFile["review_priority"] {
  if (
    path.startsWith("src/") ||
    path.startsWith("schemas/") ||
    path.startsWith(".github/workflows/") ||
    path === "package.json" ||
    path === "package-lock.json" ||
    path === "tsconfig.json" ||
    path === "SECURITY.md"
  ) {
    return "high";
  }

  if (
    path.startsWith("tests/") ||
    path.startsWith("examples/") ||
    path.startsWith("docs/protocol/") ||
    path === "README.md" ||
    path === "AGENTS.md" ||
    path === "CLAUDE.md"
  ) {
    return "medium";
  }

  return "low";
}

function repositoryNameFromRemote(remoteUrl: string | undefined): string | undefined {
  if (!remoteUrl) {
    return undefined;
  }

  const httpsMatch = remoteUrl.match(/^https:\/\/[^/]+\/([^/]+\/[^/.]+)(?:\.git)?$/);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  const sshMatch = remoteUrl.match(/^git@[^:]+:([^/]+\/[^/.]+)(?:\.git)?$/);
  if (sshMatch) {
    return sshMatch[1];
  }

  return undefined;
}

function optionalGit(cwd: string, args: string[]): string | undefined {
  try {
    return git(cwd, args).trim();
  } catch {
    return undefined;
  }
}

function git(cwd: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1"
    }
  });
}
```

- [ ] **Step 4: Verify git tests pass**

Run:

```bash
npm run check
```

Expected:

```text
Git collector tests pass with the parser, CLI, and schema tests.
```

- [ ] **Step 5: Commit git collector**

Run:

```bash
git add src/git.ts tests/git.test.ts
git commit -m "feat: collect git context for review packets"
```

## Task 3: Redaction And Packet Builder

**Files:**
- Create: `src/redaction.ts`
- Create: `src/reviewRequest.ts`
- Create: `tests/redaction.test.ts`
- Create: `tests/reviewRequest.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write redaction tests**

Create `tests/redaction.test.ts`:

```typescript
import assert from "node:assert/strict";
import { test } from "node:test";

import { sanitizeRemoteUrl } from "../src/redaction";

test("keeps safe GitHub HTTPS and SSH remotes", () => {
  assert.deepEqual(sanitizeRemoteUrl("https://github.com/AcrossWorksAPI/open-relay.git"), {
    value: "https://github.com/AcrossWorksAPI/open-relay.git"
  });
  assert.deepEqual(sanitizeRemoteUrl("git@github.com:AcrossWorksAPI/open-relay.git"), {
    value: "git@github.com:AcrossWorksAPI/open-relay.git"
  });
});

test("strips credentialed HTTPS remotes", () => {
  const result = sanitizeRemoteUrl("https://user:secret@example.com/org/repo.git");

  assert.equal(result.value, undefined);
  assert.deepEqual(result.redaction, {
    field: "repository.remote_url",
    reason: "Remote URL contained credentials."
  });
});

test("omits unsupported remote hosts", () => {
  const result = sanitizeRemoteUrl("https://gitlab.com/org/repo.git");

  assert.equal(result.value, undefined);
  assert.deepEqual(result.redaction, {
    field: "repository.remote_url",
    reason: "Remote URL host or format is not allowlisted."
  });
});

test("omits local path remotes", () => {
  const result = sanitizeRemoteUrl("../private-repo");

  assert.equal(result.value, undefined);
  assert.equal(result.redaction?.field, "repository.remote_url");
});
```

- [ ] **Step 2: Write packet builder tests**

Create `tests/reviewRequest.test.ts`:

```typescript
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildReviewRequestPacket } from "../src/reviewRequest";
import { validatePacket } from "../src/schema";

test("builds a schema-valid review-request packet", () => {
  const packet = buildReviewRequestPacket({
    options: {
      base: "main",
      head: "HEAD",
      goal: "Add generator",
      summary: "Generate review-request packets.",
      behavioralIntent: "Reduce handoff copy and paste.",
      audience: "Claude Code",
      focus: ["Correctness"],
      requestedOutput: "Findings first.",
      reviewerAccess: "Reviewer can access the repository.",
      verification: [{
        kind: "command",
        command: "npm run check",
        result: "passed",
        evidence: "8 tests passing"
      }],
      risks: [],
      excludedScope: ["Markdown rendering deferred."],
      includeLocalPath: false
    },
    git: {
      repositoryName: "AcrossWorksAPI/open-relay",
      remoteUrl: "https://github.com/AcrossWorksAPI/open-relay.git",
      baseBranch: "main",
      workingBranch: "codex/generator",
      baseCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      headCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      diffRange: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa..bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      changedFiles: [{
        path: "src/cli.ts",
        status: "modified",
        role: "Modified file in review range.",
        review_priority: "high"
      }]
    },
    createdAt: "2026-06-26T00:00:00Z"
  });

  assert.equal(validatePacket(packet).valid, true);
  assert.equal(packet.repository.local_path, undefined);
  assert.equal(packet.change_summary.total_files_changed, 1);
  assert.equal(packet.sensitive_data.excluded, true);
  assert.equal(packet.redactions.some((entry) => entry.field === "repository.local_path"), true);
});

test("adds PR provenance when a pull request URL is supplied", () => {
  const packet = buildReviewRequestPacket({
    options: {
      base: "main",
      head: "HEAD",
      goal: "Add generator",
      summary: "Generate review-request packets.",
      behavioralIntent: "Reduce handoff copy and paste.",
      audience: "Claude Code",
      focus: ["Correctness"],
      requestedOutput: "Findings first.",
      reviewerAccess: "Reviewer can access the repository.",
      pullRequestUrl: "https://github.com/AcrossWorksAPI/open-relay/pull/13",
      verification: [],
      risks: [],
      excludedScope: ["Markdown rendering deferred."],
      includeLocalPath: false
    },
    git: {
      repositoryName: "AcrossWorksAPI/open-relay",
      baseBranch: "main",
      workingBranch: "codex/generator",
      baseCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      headCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      diffRange: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa..bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      changedFiles: [{
        path: "README.md",
        status: "modified",
        role: "Modified file in review range.",
        review_priority: "medium"
      }]
    },
    createdAt: "2026-06-26T00:00:00Z"
  });

  assert.equal(packet.repository.pull_request_url, "https://github.com/AcrossWorksAPI/open-relay/pull/13");
  assert.equal(packet.provenance.some((entry) => entry.type === "pull_request"), true);
});
```

- [ ] **Step 3: Run the failing builder tests**

Run:

```bash
npm run check
```

Expected:

```text
FAIL because src/redaction.ts and src/reviewRequest.ts do not exist yet.
```

- [ ] **Step 4: Implement redaction helpers**

Create `src/redaction.ts`:

```typescript
export type Redaction = {
  field: string;
  reason: string;
  replacement?: string;
};

export type SanitizedRemoteUrl = {
  value?: string;
  redaction?: Redaction;
};

export function sanitizeRemoteUrl(remoteUrl: string | undefined): SanitizedRemoteUrl {
  if (!remoteUrl) {
    return {};
  }

  if (hasUrlCredentials(remoteUrl)) {
    return {
      redaction: {
        field: "repository.remote_url",
        reason: "Remote URL contained credentials."
      }
    };
  }

  if (/^https:\/\/github\.com\/[^/\s]+\/[^/\s]+(?:\.git)?$/.test(remoteUrl)) {
    return { value: remoteUrl };
  }

  if (/^git@github\.com:[^/\s]+\/[^/\s]+(?:\.git)?$/.test(remoteUrl)) {
    return { value: remoteUrl };
  }

  return {
    redaction: {
      field: "repository.remote_url",
      reason: "Remote URL host or format is not allowlisted."
    }
  };
}

function hasUrlCredentials(remoteUrl: string): boolean {
  try {
    const parsed = new URL(remoteUrl);
    return parsed.username.length > 0 || parsed.password.length > 0;
  } catch {
    return false;
  }
}
```

- [ ] **Step 5: Implement packet builder**

Create `src/reviewRequest.ts`:

```typescript
import type { GenerateReviewRequestOptions } from "./args";
import type { GitContext } from "./git";
import { sanitizeRemoteUrl, type Redaction } from "./redaction";

export type BuildReviewRequestPacketInput = {
  options: GenerateReviewRequestOptions;
  git: GitContext;
  createdAt?: string;
};

export type ReviewRequestPacket = {
  packet_version: "0.1";
  packet_type: "review-request";
  created_at: string;
  goal: string;
  requested_review: {
    audience: string;
    focus: string[];
    requested_output: string;
  };
  repository: {
    name: string;
    remote_url?: string;
    local_path?: string;
    base_branch: string;
    working_branch: string;
    base_commit: string;
    head_commit: string;
    diff_range: string;
    pull_request_url?: string;
    reviewer_access: string;
  };
  change_summary: {
    summary: string;
    behavioral_intent: string;
    excluded_scope: string[];
    total_files_changed: number;
  };
  changed_files: GitContext["changedFiles"];
  verification: GenerateReviewRequestOptions["verification"];
  risks: GenerateReviewRequestOptions["risks"];
  provenance: Array<{
    type: "commit" | "pull_request";
    reference: string;
    supports: string;
  }>;
  redactions: Redaction[];
  sensitive_data: {
    excluded: true;
    notes: string;
  };
  next_action: string;
};

export function buildReviewRequestPacket(input: BuildReviewRequestPacketInput): ReviewRequestPacket {
  const remote = sanitizeRemoteUrl(input.git.remoteUrl);
  const redactions: Redaction[] = [];

  if (remote.redaction) {
    redactions.push(remote.redaction);
  }

  if (!input.options.includeLocalPath) {
    redactions.push({
      field: "repository.local_path",
      reason: "Local filesystem paths are excluded by default."
    });
  }

  const repository: ReviewRequestPacket["repository"] = {
    name: input.git.repositoryName,
    ...(remote.value ? { remote_url: remote.value } : {}),
    ...(input.git.localPath ? { local_path: input.git.localPath } : {}),
    base_branch: input.git.baseBranch,
    working_branch: input.git.workingBranch,
    base_commit: input.git.baseCommit,
    head_commit: input.git.headCommit,
    diff_range: input.git.diffRange,
    ...(input.options.pullRequestUrl ? { pull_request_url: input.options.pullRequestUrl } : {}),
    reviewer_access: input.options.reviewerAccess
  };

  return {
    packet_version: "0.1",
    packet_type: "review-request",
    created_at: input.createdAt ?? new Date().toISOString(),
    goal: input.options.goal,
    requested_review: {
      audience: input.options.audience,
      focus: input.options.focus,
      requested_output: input.options.requestedOutput
    },
    repository,
    change_summary: {
      summary: input.options.summary,
      behavioral_intent: input.options.behavioralIntent,
      excluded_scope: input.options.excludedScope,
      total_files_changed: input.git.changedFiles.length
    },
    changed_files: input.git.changedFiles,
    verification: input.options.verification,
    risks: input.options.risks.length > 0 ? input.options.risks : [{
      severity: "info",
      description: "Generated packet should be reviewed before sharing.",
      handling: "Validate the packet and inspect redactions before sending to another reviewer."
    }],
    provenance: [
      {
        type: "commit",
        reference: input.git.baseCommit,
        supports: "Base commit for the generated review range."
      },
      {
        type: "commit",
        reference: input.git.headCommit,
        supports: "Head commit for the generated review range."
      },
      ...(input.options.pullRequestUrl ? [{
        type: "pull_request",
        reference: input.options.pullRequestUrl,
        supports: "Pull request under review."
      }] : [])
    ],
    redactions,
    sensitive_data: {
      excluded: true,
      notes: "Diff content, command output, environment variables, and local paths are excluded unless explicitly opted in."
    },
    next_action: "Review the packet, inspect the referenced diff range, and return findings first."
  };
}
```

Modify `src/index.ts`:

```typescript
export { parseGenerateReviewRequestArgs, type GenerateReviewRequestOptions } from "./args";
export { collectGitContext, type GitContext, type ChangedFile } from "./git";
export { buildReviewRequestPacket, type ReviewRequestPacket } from "./reviewRequest";
export { validatePacket, validatePacketFile, type ValidationResult } from "./schema";

export const version = "0.0.0";
```

- [ ] **Step 6: Verify builder tests pass**

Run:

```bash
npm run check
```

Expected:

```text
Redaction and packet builder tests pass with existing tests.
```

- [ ] **Step 7: Commit packet builder**

Run:

```bash
git add src/redaction.ts src/reviewRequest.ts src/index.ts tests/redaction.test.ts tests/reviewRequest.test.ts
git commit -m "feat: build review-request packets from git context"
```

## Task 4: CLI Generate Command

**Files:**
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Extend CLI tests**

Add these tests to `tests/cli.test.ts`:

```typescript
test("prints generate review-request in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay generate review-request/);
});

test("rejects generate review-request with missing flags", () => {
  const result = spawnSync(process.execPath, [cliPath, "generate", "review-request"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing required flags/);
  assert.doesNotMatch(result.stderr, /\{.*packet_version/s);
});

test("generates a schema-valid review-request packet to a file", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const outputPath = join(directory, "relay.json");

  try {
    runGit(directory, "init");
    runGit(directory, "config", "user.email", "test@example.com");
    runGit(directory, "config", "user.name", "Open Relay Test");
    runGit(directory, "remote", "add", "origin", "https://github.com/AcrossWorksAPI/open-relay.git");
    writeFileSync(join(directory, "README.md"), "# Repo\n", "utf8");
    runGit(directory, "add", "README.md");
    runGit(directory, "commit", "-m", "initial");
    const base = runGit(directory, "rev-parse", "HEAD").trim();
    writeFileSync(join(directory, "README.md"), "# Repo\n\nChanged.\n", "utf8");
    runGit(directory, "add", "README.md");
    runGit(directory, "commit", "-m", "change readme");
    const head = runGit(directory, "rev-parse", "HEAD").trim();

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Generate packet",
      "--summary", "Creates a packet from git state.",
      "--behavioral-intent", "Reduce manual handoff assembly.",
      "--output", outputPath
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Wrote review-request packet/);
    assert.equal(result.stderr, "");

    const validateResult = spawnSync(process.execPath, [
      absoluteCliPath,
      "validate",
      outputPath
    ], {
      encoding: "utf8"
    });

    assert.equal(validateResult.status, 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

function runGit(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1"
    }
  });
}
```

Update the existing child-process import in `tests/cli.test.ts` to include
`execFileSync`:

```typescript
import { execFileSync, spawnSync } from "node:child_process";
```

Update the existing filesystem import in `tests/cli.test.ts` to include
`rmSync`:

```typescript
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
```

- [ ] **Step 2: Run failing CLI tests**

Run:

```bash
npm run check
```

Expected:

```text
FAIL because src/cli.ts does not route generate review-request yet.
```

- [ ] **Step 3: Implement CLI route**

Modify `src/cli.ts`:

```typescript
#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

import { parseGenerateReviewRequestArgs } from "./args";
import { collectGitContext } from "./git";
import { buildReviewRequestPacket } from "./reviewRequest";
import { validatePacket, validatePacketFile } from "./schema";

const usage = `Open Relay

Usage:
  open-relay validate <packet.json>
  open-relay generate review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--output <packet.json>]
  open-relay --help
`;

export async function run(argv: string[]): Promise<number> {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    process.stdout.write(usage);
    return 0;
  }

  if (args[0] === "validate") {
    return validateCommand(args[1]);
  }

  if (args[0] === "generate" && args[1] === "review-request") {
    return generateReviewRequestCommand(args.slice(2));
  }

  process.stderr.write(`Unknown command: ${args.join(" ")}\n\n${usage}`);
  return 2;
}

async function generateReviewRequestCommand(args: string[]): Promise<number> {
  const parsed = parseGenerateReviewRequestArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  try {
    const git = collectGitContext({
      cwd: process.cwd(),
      baseRef: parsed.options.base,
      headRef: parsed.options.head,
      includeLocalPath: parsed.options.includeLocalPath
    });
    const packet = buildReviewRequestPacket({ options: parsed.options, git });
    const result = validatePacket(packet);

    if (!result.valid) {
      process.stderr.write("Generated review-request packet failed validation.\n");
      for (const error of result.errors) {
        process.stderr.write(`- ${error}\n`);
      }
      return 1;
    }

    const json = `${JSON.stringify(packet, null, 2)}\n`;

    if (parsed.options.output) {
      await writeFile(parsed.options.output, json, "utf8");
      process.stdout.write(`Wrote review-request packet to ${parsed.options.output}\n`);
    } else {
      process.stdout.write(json);
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Could not generate review-request packet: ${message}\n`);
    return 1;
  }
}

async function validateCommand(path: string | undefined): Promise<number> {
  if (!path) {
    process.stderr.write(`Missing packet path.\n\n${usage}`);
    return 2;
  }

  try {
    const result = await validatePacketFile(path);

    if (result.valid) {
      process.stdout.write(`${path} is a valid review-request packet.\n`);
      return 0;
    }

    process.stderr.write(`Invalid review-request packet: ${path}\n`);
    for (const error of result.errors) {
      process.stderr.write(`- ${error}\n`);
    }
    return 1;
  } catch (error: unknown) {
    const message = error instanceof SyntaxError
      ? `Invalid JSON in ${path}`
      : `Could not validate ${path}: ${error instanceof Error ? error.message : String(error)}`;

    process.stderr.write(`${message}\n`);
    return 1;
  }
}

if (require.main === module) {
  run(process.argv)
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`open-relay failed: ${message}\n`);
      process.exitCode = 1;
    });
}
```

- [ ] **Step 4: Verify CLI generate command passes**

Run:

```bash
npm run check
```

Expected:

```text
CLI generate tests pass with parser, git, redaction, builder, schema, and validation tests.
```

- [ ] **Step 5: Commit CLI generator**

Run:

```bash
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: add review-request generator command"
```

## Task 5: Docs And Roadmap Closeout

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `master_build.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

- [ ] **Step 1: Update CLI usage docs**

Add generator usage to `README.md`:

````markdown
## Generate Review Packets

Generate a `review-request` JSON packet from local git state:

```bash
npm run build
node dist/src/cli.js generate review-request \
  --base origin/main \
  --head HEAD \
  --goal "Review this implementation slice" \
  --summary "Summarizes the branch for review." \
  --behavioral-intent "Help a second reviewer inspect the exact diff range." \
  --output relay.json
node dist/src/cli.js validate relay.json
```

The generator writes JSON only. Markdown rendering and agent-specific prompt
templates remain planned follow-up slices.
````

- [ ] **Step 2: Update repository instructions**

In `AGENTS.md`, keep the existing verification commands and add this note under
Project Scope:

```markdown
- Generator behavior: local git-state `review-request` JSON generation; no
  Markdown renderer yet.
```

- [ ] **Step 3: Update planning docs**

Make these status changes:

- `master_build.md`: mark `Implement local CLI review-request packet generator`
  as `In progress` during the branch, then `Done` after merge.
- `docs/STATUS.md`: record generator branch checks and next step.
- `docs/planning/ROADMAP.md`: set `Review-request packet CLI MVP` to
  `In progress` during the branch, then `Done` after merge; set the plan path to
  `docs/superpowers/plans/2026-06-26-git-state-generator.md`.
- `docs/planning/ACTIVE_WORK.md`: add generator source files and shift current
  risks to Markdown rendering, packet storage, release, and private redaction
  rules.
- `docs/planning/PLAN_REGISTRY.md`: add this plan as active during the branch,
  then implemented after merge.
- `docs/planning/VERSION_LEDGER.md`: add branch, PR, CI, local smoke, review,
  and merge evidence.
- `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: mark local repository
  context collector and relay packet create cells as in progress during the PR,
  then shipped after merge.

- [ ] **Step 4: Run final verification**

Run:

```bash
npm ci
npm run check
git diff --check
node dist/src/cli.js generate review-request \
  --base origin/main \
  --head HEAD \
  --goal "Smoke generated review packet" \
  --summary "Generate a packet from local git state." \
  --behavioral-intent "Exercise the local git-state generator." \
  --output /private/tmp/open-relay-review-request.json
node dist/src/cli.js validate /private/tmp/open-relay-review-request.json
```

Expected:

```text
All commands pass, and the generated packet validates.
```

- [ ] **Step 5: Commit documentation closeout**

Run:

```bash
git add README.md AGENTS.md master_build.md docs/STATUS.md docs/planning/ROADMAP.md docs/planning/ACTIVE_WORK.md docs/planning/PLAN_REGISTRY.md docs/planning/VERSION_LEDGER.md docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md
git commit -m "docs: close git-state generator slice"
```

## PR And Review Flow

- [ ] Open a pull request for the generator implementation.
- [ ] Wait for `Open Relay CI / Governance Checks`.
- [ ] Ask Claude to review after CI passes, focusing on:
  - generated packet schema validity
  - git range correctness
  - redaction/privacy behavior
  - CLI error behavior
  - roadmap/status accuracy
- [ ] Merge only after CI passes and review findings are resolved.
- [ ] Pull and prune local `main` after merge.

## Self-Review Notes

- The plan keeps packet generation JSON-first and defers Markdown rendering.
- No new dependency is required.
- Storage is explicit by `--output` or stdout; permanent storage remains an
  owner decision.
- Diff content, file contents, command output, environment values, and local
  paths are excluded by default.
- The generated packet remains pinned to `packet_version: "0.1"` and must
  validate through the existing schema.
