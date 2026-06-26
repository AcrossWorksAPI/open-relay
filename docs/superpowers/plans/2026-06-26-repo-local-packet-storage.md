# Repo-Local Packet Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `open-relay save review-request` to save validated review-request JSON and Markdown bundles in repo-local storage.

**Architecture:** Reuse the existing generator parser, git collector, packet builder, validator, and renderer. Add a small storage module that writes `relay.json`, `relay.md`, and `manifest.json` under `.open-relay/review-requests/<storage_id>/` without echoing absolute paths.

**Tech Stack:** TypeScript, Node.js built-in test runner, Node `fs/path` APIs, existing CLI parser, existing review-request generator and renderer, existing package smoke script.

---

## File Structure

- Modify `.gitignore`: add `.open-relay/`.
- Modify `src/cli.ts`: add `save review-request` help text and command routing.
- Create `src/storage.ts`: storage id generation, bundle directory creation, and bundle writes.
- Modify `tests/cli.test.ts`: add save command behavior tests.
- Create `tests/storage.test.ts`: unit tests for storage id and collision handling.
- Modify `scripts/smoke-pack.js`: prove installed CLI can save a review-request bundle.
- Modify `AGENTS.md`: include repo-local storage in current scope after implementation.
- Modify `docs/STATUS.md`, `docs/planning/ROADMAP.md`, `docs/planning/ACTIVE_WORK.md`, `docs/planning/PLAN_REGISTRY.md`, `docs/planning/VERSION_LEDGER.md`, `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`, and `master_build.md`: record planning/implementation state and evidence.

## Task 1: Storage Module

**Files:**
- Create: `src/storage.ts`
- Create: `tests/storage.test.ts`

- [ ] **Step 1: Write failing storage id test**

Add `tests/storage.test.ts`:

```ts
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  buildStorageId,
  saveReviewRequestBundle
} from "../src/storage";
import type { ReviewRequestPacket } from "../src/reviewRequest";

test("builds a stable review-request storage id", () => {
  assert.equal(
    buildStorageId("2026-06-26T10:51:15.123Z", "c95f409bfbd65c5f4b605f4afc853cfd2d4aa3f4"),
    "20260626T105115Z-c95f409"
  );
});
```

- [ ] **Step 2: Run storage test and confirm it fails**

Run:

```bash
npm test -- --test-name-pattern="builds a stable review-request storage id"
```

Expected: TypeScript build fails because `src/storage.ts` does not exist.

- [ ] **Step 3: Implement storage id helper**

Create `src/storage.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { renderReviewRequestMarkdown } from "./renderReviewRequest";
import type { ReviewRequestPacket } from "./reviewRequest";

export type SavedReviewRequestBundle = {
  storageId: string;
};

export function buildStorageId(createdAt: string, headCommit: string): string {
  const compact = createdAt
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `${compact}-${headCommit.slice(0, 7)}`;
}
```

- [ ] **Step 4: Run storage id test and confirm it passes**

Run:

```bash
npm test -- --test-name-pattern="builds a stable review-request storage id"
```

Expected: selected test passes.

- [ ] **Step 5: Add bundle write and collision tests**

Append to `tests/storage.test.ts`:

```ts
function packetFixture(): ReviewRequestPacket {
  return {
    packet_version: "0.1",
    packet_type: "review-request",
    created_at: "2026-06-26T10:51:15.123Z",
    repository: {
      name: "AcrossWorksAPI/open-relay",
      remote_url: "https://github.com/AcrossWorksAPI/open-relay.git",
      base_ref: "origin/main",
      head_ref: "HEAD",
      base_commit: "1111111111111111111111111111111111111111",
      head_commit: "c95f409bfbd65c5f4b605f4afc853cfd2d4aa3f4",
      diff_range: "1111111111111111111111111111111111111111..c95f409bfbd65c5f4b605f4afc853cfd2d4aa3f4"
    },
    requested_review: {
      audience: "reviewer",
      goal: "Review storage",
      summary: "Adds repo-local packet storage.",
      behavioral_intent: "Make packets durable.",
      focus: [],
      requested_output: "Findings first."
    },
    changed_files: [
      {
        path: "README.md",
        status: "modified",
        review_priority: "medium"
      }
    ],
    totals: {
      files_changed: 1,
      additions: 1,
      deletions: 0
    },
    verification: [],
    risks: [],
    excluded_scope: [],
    provenance: [],
    redactions: [],
    sensitive_data: {
      excluded: true,
      notes: "No secrets included."
    },
    next_action: "Review the stored packet."
  };
}

test("saves review-request json markdown and manifest", async () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-storage-"));

  try {
    const result = await saveReviewRequestBundle({
      storageRoot: directory,
      packet: packetFixture()
    });
    const bundleDir = join(directory, result.storageId);

    const json = JSON.parse(readFileSync(join(bundleDir, "relay.json"), "utf8"));
    const markdown = readFileSync(join(bundleDir, "relay.md"), "utf8");
    const manifest = JSON.parse(readFileSync(join(bundleDir, "manifest.json"), "utf8"));

    assert.equal(json.packet_type, "review-request");
    assert.match(markdown, /^# Review Request Relay Packet/);
    assert.equal(manifest.storage_version, "0.1");
    assert.equal(manifest.storage_id, result.storageId);
    assert.deepEqual(manifest.files, {
      json: "relay.json",
      markdown: "relay.md"
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("uses a counter instead of overwriting an existing bundle", async () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-storage-"));

  try {
    const first = await saveReviewRequestBundle({
      storageRoot: directory,
      packet: packetFixture()
    });
    const second = await saveReviewRequestBundle({
      storageRoot: directory,
      packet: packetFixture()
    });

    assert.equal(first.storageId, "20260626T105115Z-c95f409");
    assert.equal(second.storageId, "20260626T105115Z-c95f409-2");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
```

- [ ] **Step 6: Run storage tests and confirm new tests fail**

Run:

```bash
npm test -- --test-name-pattern="saves review-request|uses a counter"
```

Expected: selected tests fail because `saveReviewRequestBundle` is missing.

- [ ] **Step 7: Implement bundle writer**

Update `src/storage.ts`:

```ts
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { renderReviewRequestMarkdown } from "./renderReviewRequest";
import type { ReviewRequestPacket } from "./reviewRequest";

export type SavedReviewRequestBundle = {
  storageId: string;
};

type SaveReviewRequestBundleInput = {
  storageRoot: string;
  packet: ReviewRequestPacket;
};

type ReviewRequestManifest = {
  storage_version: "0.1";
  packet_type: "review-request";
  packet_version: "0.1";
  storage_id: string;
  created_at: string;
  files: {
    json: "relay.json";
    markdown: "relay.md";
  };
};

export function buildStorageId(createdAt: string, headCommit: string): string {
  const compact = createdAt
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `${compact}-${headCommit.slice(0, 7)}`;
}

export async function saveReviewRequestBundle(
  input: SaveReviewRequestBundleInput
): Promise<SavedReviewRequestBundle> {
  const baseId = buildStorageId(input.packet.created_at, input.packet.repository.head_commit);
  const { storageId, bundleDir } = await createBundleDirectory(input.storageRoot, baseId);
  const manifest: ReviewRequestManifest = {
    storage_version: "0.1",
    packet_type: "review-request",
    packet_version: input.packet.packet_version,
    storage_id: storageId,
    created_at: input.packet.created_at,
    files: {
      json: "relay.json",
      markdown: "relay.md"
    }
  };

  await writeFile(join(bundleDir, "relay.json"), `${JSON.stringify(input.packet, null, 2)}\n`, "utf8");
  await writeFile(join(bundleDir, "relay.md"), renderReviewRequestMarkdown(input.packet), "utf8");
  await writeFile(join(bundleDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return { storageId };
}

async function createBundleDirectory(
  storageRoot: string,
  baseId: string
): Promise<{ storageId: string; bundleDir: string }> {
  await mkdir(storageRoot, { recursive: true });

  for (let suffix = 1; suffix <= 99; suffix += 1) {
    const storageId = suffix === 1 ? baseId : `${baseId}-${suffix}`;
    const bundleDir = join(storageRoot, storageId);

    try {
      await mkdir(bundleDir);
      return { storageId, bundleDir };
    } catch (error: unknown) {
      if (isAlreadyExistsError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Could not allocate storage id.");
}

function isAlreadyExistsError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "EEXIST";
}
```

- [ ] **Step 8: Run storage tests and confirm they pass**

Run:

```bash
npm test -- --test-name-pattern="storage id|saves review-request|uses a counter"
```

Expected: selected tests pass.

## Task 2: CLI Save Command

**Files:**
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Add failing CLI help and save tests**

Add to `tests/cli.test.ts` near the existing help tests:

```ts
test("prints save review-request in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay save review-request/);
});
```

Add near the handoff tests:

```ts
test("saves review-request bundle to repo-local storage", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "save",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Save handoff packet",
      "--summary", "Saves JSON and Markdown to repo-local storage.",
      "--behavioral-intent", "Make packets durable without external services."
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Saved review-request packet: /);
    assert.doesNotMatch(result.stdout, /open-relay-cli-git/);
    assert.equal(result.stderr, "");

    const storageId = result.stdout.trim().replace("Saved review-request packet: ", "");
    const bundleDir = join(directory, ".open-relay", "review-requests", storageId);
    assert.match(readFileSync(join(bundleDir, "relay.md"), "utf8"), /^# Review Request Relay Packet/);
    assert.equal(JSON.parse(readFileSync(join(bundleDir, "relay.json"), "utf8")).packet_type, "review-request");
    assert.equal(JSON.parse(readFileSync(join(bundleDir, "manifest.json"), "utf8")).storage_id, storageId);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run CLI tests and confirm they fail**

Run:

```bash
npm test -- --test-name-pattern="prints save review-request|saves review-request bundle"
```

Expected: selected tests fail because the CLI route is missing.

- [ ] **Step 3: Add `.open-relay/` to `.gitignore`**

Append near other local/cache ignores:

```gitignore
# Open Relay local packet storage
.open-relay/
```

- [ ] **Step 4: Add CLI route, shared generation helper, and parser**

Modify `src/cli.ts` imports:

```ts
import { join } from "node:path";

import { parseGenerateReviewRequestArgs, type GenerateReviewRequestOptions } from "./args";
import { saveReviewRequestBundle } from "./storage";
```

Add usage:

```text
  open-relay save review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--storage-dir <path>]
```

Add route after `handoff`:

```ts
if (args[0] === "save" && args[1] === "review-request") {
  return saveReviewRequestCommand(args.slice(2));
}
```

Extract the existing generation path so `generate` and `save` share git
collection, packet assembly, and validation:

```ts
type BuiltReviewRequestPacket =
  | { ok: true; packet: ReviewRequestPacket }
  | { ok: false; errors: string[] };

function buildValidatedReviewRequestPacket(
  options: GenerateReviewRequestOptions
): BuiltReviewRequestPacket {
  const git = collectGitContext({
    cwd: process.cwd(),
    baseRef: options.base,
    headRef: options.head,
    includeLocalPath: options.includeLocalPath
  });
  const packet = buildReviewRequestPacket({ options, git });
  const result = validatePacket(packet);

  if (!result.valid) {
    return { ok: false, errors: result.errors };
  }

  return { ok: true, packet };
}
```

Update `generateReviewRequestCommand` to call the shared helper after argument
parsing:

```ts
const built = buildValidatedReviewRequestPacket(parsed.options);

if (!built.ok) {
  process.stderr.write("Generated review-request packet failed validation.\n");
  for (const error of built.errors) {
    process.stderr.write(`- ${error}\n`);
  }
  return 1;
}

const packet = built.packet;
```

Add helper:

```ts
async function saveReviewRequestCommand(args: string[]): Promise<number> {
  if (hasFlag(args, "--format")) {
    process.stderr.write("--format is not supported for save review-request; saved bundles include JSON and Markdown.\n\n");
    process.stderr.write(usage);
    return 2;
  }

  if (hasFlag(args, "--output")) {
    process.stderr.write("--output is not supported for save review-request; use --storage-dir to choose a storage root.\n\n");
    process.stderr.write(usage);
    return 2;
  }

  const storageParse = parseStorageDir(args);
  if (!storageParse.ok) {
    process.stderr.write(`${storageParse.message}\n\n${usage}`);
    return 2;
  }

  const { storageDir, generatorArgs } = storageParse;
  const parsed = parseGenerateReviewRequestArgs(generatorArgs);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  try {
    const built = buildValidatedReviewRequestPacket(parsed.options);

    if (!built.ok) {
      process.stderr.write("Generated review-request packet failed validation.\n");
      for (const error of built.errors) {
        process.stderr.write(`- ${error}\n`);
      }
      return 1;
    }

    const saved = await saveReviewRequestBundle({
      storageRoot: storageDir ?? join(process.cwd(), ".open-relay", "review-requests"),
      packet: built.packet
    });

    process.stdout.write(`Saved review-request packet: ${saved.storageId}\n`);
    return 0;
  } catch {
    process.stderr.write("Could not save review-request packet.\n");
    return 1;
  }
}

type SaveReviewRequestArgs =
  | { ok: true; storageDir?: string; generatorArgs: string[] }
  | { ok: false; message: string };

function parseStorageDir(args: string[]): SaveReviewRequestArgs {
  const generatorArgs: string[] = [];
  let storageDir: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--storage-dir") {
      if (storageDir) {
        return { ok: false, message: "Duplicate flag: --storage-dir" };
      }
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        return { ok: false, message: "Missing value for --storage-dir" };
      }
      storageDir = value;
      index += 1;
      continue;
    }

    generatorArgs.push(arg);
  }

  return {
    ok: true,
    ...(storageDir ? { storageDir } : {}),
    generatorArgs
  };
}
```

- [ ] **Step 5: Run CLI save tests and confirm they pass**

Run:

```bash
npm test -- --test-name-pattern="prints save review-request|saves review-request bundle"
```

Expected: selected tests pass.

- [ ] **Step 6: Add parser/error regression tests**

Add to `tests/cli.test.ts`:

```ts
test("save review-request rejects format and output flags", () => {
  for (const args of [
    ["--format", "markdown"],
    ["--format=json"],
    ["--output", "relay.json"]
  ]) {
    const result = spawnSync(process.execPath, [
      cliPath,
      "save",
      "review-request",
      "--base", "origin/main",
      "--head", "HEAD",
      "--goal", "Save packet",
      "--summary", "Saves a packet.",
      "--behavioral-intent", "Make packets durable.",
      ...args
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /Saved review-request packet/);
  }
});

test("save review-request rejects unwritable storage without echoing path values", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const storageDir = join(directory, "SECRET_STORAGE_SHOULD_NOT_APPEAR", "review-requests");

  try {
    const { base, head } = createChangedGitRepo(directory);
    writeFileSync(join(directory, "SECRET_STORAGE_SHOULD_NOT_APPEAR"), "not a directory", "utf8");

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "save",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Save packet",
      "--summary", "Saves a packet.",
      "--behavioral-intent", "Make packets durable.",
      "--storage-dir", storageDir
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Could not save review-request packet/);
    assert.doesNotMatch(result.stderr, /SECRET_STORAGE_SHOULD_NOT_APPEAR/);
    assert.doesNotMatch(result.stdout, /SECRET_STORAGE_SHOULD_NOT_APPEAR/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
```

- [ ] **Step 7: Run save regression tests**

Run:

```bash
npm test -- --test-name-pattern="save review-request"
```

Expected: selected tests pass.

## Task 3: Package Smoke And Closeout

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

- [ ] **Step 1: Add installed CLI save smoke**

In `scripts/smoke-pack.js`, after the handoff smoke, add:

```js
runCli(cli, [
  "save",
  "review-request",
  "--base", base,
  "--head", head,
  "--goal", "Smoke package save",
  "--summary", "Verifies installed CLI can save a packet bundle.",
  "--behavioral-intent", "Prove package tarball supports repo-local storage."
], {
  cwd: gitRepo,
  contains: "Saved review-request packet:"
});

const savedRoot = join(gitRepo, ".open-relay", "review-requests");
const [savedId] = require("node:fs").readdirSync(savedRoot);
const savedDir = join(savedRoot, savedId);
assert.match(readFileSync(join(savedDir, "relay.md"), "utf8"), /^# Review Request Relay Packet/);
assert.equal(JSON.parse(readFileSync(join(savedDir, "relay.json"), "utf8")).packet_type, "review-request");
assert.equal(JSON.parse(readFileSync(join(savedDir, "manifest.json"), "utf8")).storage_id, savedId);
```

- [ ] **Step 2: Update roadmap/status docs for implementation branch**

Record:

```markdown
| Unversioned | Repo-local packet storage | In progress | Medium | No | Local handoff workflow | docs/superpowers/plans/2026-06-26-repo-local-packet-storage.md |
```

Keep global storage, list/read/delete/archive, retention, encryption,
agent-specific templates, external invocation, hosted sync, package publishing,
and live release deferred.

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
git push -u origin codex/repo-local-packet-storage-implementation
gh pr create --repo AcrossWorksAPI/open-relay --base main --head codex/repo-local-packet-storage-implementation --title "feat: save review-request bundles locally" --body-file /private/tmp/open-relay-repo-local-storage-pr-body.md
```

Expected: GitHub returns a PR URL. Wait for `Governance Checks`, then request
Claude implementation review if CI is green.
