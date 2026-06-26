# Package Release Smoke Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add npm package-release readiness smoke that proves the built Open Relay tarball installs and the installed CLI can validate, render, and generate review-request packets.

**Architecture:** Keep publish behavior deferred. Harden `package.json` metadata and packlist, add a dependency-free Node smoke script under `scripts/`, wire it into npm scripts and GitHub Actions, and record release-readiness evidence in roadmap docs.

**Tech Stack:** npm, Node.js built-in `node:test` style assertions inside a standalone smoke script, TypeScript build output, GitHub Actions.

---

## File Structure

- Modify `package.json`: add `engines`, `files`, `prepack`, and `smoke:pack` while keeping `private: true`.
- Create `scripts/smoke-pack.js`: build/package/install smoke using Node built-ins and local npm/git commands.
- Modify `.github/workflows/ci.yml`: run `npm run smoke:pack` after `npm run check`.
- Modify `docs/STATUS.md`: mark package/release smoke planning active and record evidence.
- Modify `docs/planning/ROADMAP.md`: move package/release target from candidate to in-progress with this plan.
- Modify `docs/planning/ACTIVE_WORK.md`: record package smoke as active work and update risks/next steps.
- Modify `docs/planning/PLAN_REGISTRY.md`: add this plan and smoke script as active sources.
- Modify `docs/planning/VERSION_LEDGER.md`: add package/release smoke planning row.
- Modify `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: update runtime/deployment surface status for package smoke.
- Modify `master_build.md`: update current baseline and near-term queue.

## Task 1: Package Metadata And Packlist

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Update package metadata**

Change `package.json` to include:

```json
{
  "private": true,
  "engines": {
    "node": ">=22"
  },
  "files": [
    "dist/",
    "schemas/",
    "examples/",
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md"
  ],
  "scripts": {
    "test": "npm run build && node --test \"dist/tests/**/*.test.js\"",
    "build": "tsc -p tsconfig.json",
    "check": "npm test",
    "prepack": "npm run build",
    "smoke:pack": "node scripts/smoke-pack.js"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

Keep the existing `name`, `version`, `main`, `types`, `bin`, dependencies,
repository, license, bugs, and homepage values. Do not remove `private: true`.

- [ ] **Step 2: Run package metadata smoke**

Run:

```bash
npm run build
npm pack --dry-run
```

Expected: build passes and `npm pack --dry-run` lists `dist/`, `schemas/`,
`examples/`, and public docs, without `.git`, `.github`, `.codex`, `tests/`,
or `docs/planning/`.

- [ ] **Step 3: Commit metadata changes**

```bash
git add package.json package-lock.json
git commit -m "chore: define npm package packlist"
```

## Task 2: Pack Smoke Script

**Files:**
- Create: `scripts/smoke-pack.js`

- [ ] **Step 1: Add the smoke script**

Create `scripts/smoke-pack.js`:

```js
#!/usr/bin/env node

const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const { cpSync, existsSync, mkdtempSync, rmSync, writeFileSync } = require("node:fs");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

const root = process.cwd();
const workspace = mkdtempSync(join(tmpdir(), "open-relay-pack-smoke-"));

try {
  const packDir = join(workspace, "pack");
  const installDir = join(workspace, "install");
  const fixtureDir = join(workspace, "fixtures");
  const gitRepo = join(workspace, "repo");

  mkdirp(packDir);
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });
  execFileSync("npm", ["pack", "--pack-destination", packDir], { cwd: root, stdio: "inherit" });

  const tarball = require("node:fs")
    .readdirSync(packDir)
    .find((name) => name.endsWith(".tgz"));
  assert.ok(tarball, "npm pack did not create a tarball");

  mkdirp(installDir);
  mkdirp(fixtureDir);
  cpSync(join(root, "examples"), join(fixtureDir, "examples"), { recursive: true });

  execFileSync("npm", ["init", "-y"], { cwd: installDir, stdio: "ignore" });
  execFileSync("npm", ["install", join(packDir, tarball)], { cwd: installDir, stdio: "inherit" });

  const cli = join(installDir, "node_modules", ".bin", process.platform === "win32" ? "open-relay.cmd" : "open-relay");
  assert.ok(existsSync(cli), "installed CLI binary is missing");

  runCli(cli, ["--help"], { contains: "open-relay render review-request" });
  runCli(cli, ["validate", join(fixtureDir, "examples", "review-request", "relay.json")], {
    contains: "valid review-request packet"
  });
  runCli(cli, ["render", "review-request", join(fixtureDir, "examples", "review-request", "relay.json")], {
    contains: "# Review Request Relay Packet"
  });

  createGitFixture(gitRepo);
  const base = runGit(gitRepo, "rev-parse", "HEAD").trim();
  writeFileSync(join(gitRepo, "README.md"), "# Smoke\n\nChanged.\n", "utf8");
  runGit(gitRepo, "add", "README.md");
  runGit(gitRepo, "commit", "-m", "change readme");
  const head = runGit(gitRepo, "rev-parse", "HEAD").trim();
  const generatedPacket = join(workspace, "generated.json");

  runCli(cli, [
    "generate",
    "review-request",
    "--base", base,
    "--head", head,
    "--goal", "Smoke package install",
    "--summary", "Verifies installed CLI can generate a packet.",
    "--behavioral-intent", "Prove package tarball works after install.",
    "--output", generatedPacket
  ], {
    cwd: gitRepo,
    contains: "Wrote review-request packet."
  });

  runCli(cli, ["validate", generatedPacket], { contains: "valid review-request packet" });
  runCli(cli, ["render", "review-request", generatedPacket], { contains: "## Next Action" });

  const badJson = join(workspace, "bad.json");
  writeFileSync(badJson, "{\"token\": SECRET_TOKEN_SHOULD_NOT_APPEAR}", "utf8");
  const badResult = spawnSync(cli, ["render", "review-request", badJson], { encoding: "utf8" });
  assert.equal(badResult.status, 1);
  assert.match(badResult.stderr, /Invalid JSON/);
  assert.doesNotMatch(badResult.stderr, /SECRET_TOKEN_SHOULD_NOT_APPEAR/);

  console.log("Package smoke passed.");
} finally {
  rmSync(workspace, { recursive: true, force: true });
}

function mkdirp(path) {
  require("node:fs").mkdirSync(path, { recursive: true });
}

function runCli(cli, args, options) {
  const result = spawnSync(cli, args, {
    cwd: options.cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, new RegExp(escapeRegExp(options.contains)));
  return result.stdout;
}

function createGitFixture(directory) {
  mkdirp(directory);
  runGit(directory, "init", "--initial-branch", "main");
  runGit(directory, "config", "user.email", "smoke@example.com");
  runGit(directory, "config", "user.name", "Open Relay Smoke");
  writeFileSync(join(directory, "README.md"), "# Smoke\n", "utf8");
  runGit(directory, "add", "README.md");
  runGit(directory, "commit", "-m", "initial");
}

function runGit(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1"
    }
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 2: Run the smoke script**

Run:

```bash
npm run smoke:pack
```

Expected: command exits 0 and prints `Package smoke passed.`

- [ ] **Step 3: Commit smoke script**

```bash
git add scripts/smoke-pack.js package.json package-lock.json
git commit -m "test: add package install smoke"
```

## Task 3: CI Guardrail

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add CI step**

Add after `Run runtime checks`:

```yaml
      - name: Run package smoke
        run: npm run smoke:pack
```

- [ ] **Step 2: Run local verification**

Run:

```bash
npm run check
npm run smoke:pack
git diff --check
```

Expected: all commands pass.

- [ ] **Step 3: Commit CI guardrail**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run package install smoke"
```

## Task 4: Roadmap Closeout

**Files:**
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`
- Modify: `master_build.md`

- [ ] **Step 1: Update current-state docs on implementation branch**

Record:

- package target: npm package `@acrossworks/open-relay`;
- publish status: deferred, `private: true` retained;
- release/live status: not live until version/tag/publish authority are decided;
- package smoke evidence: `npm run smoke:pack`;
- CI evidence after GitHub checks pass.

- [ ] **Step 2: Update roadmap**

During the implementation branch:

```markdown
| Unversioned | Package and release target | In progress | Medium | No | Codex and Claude render templates | docs/superpowers/plans/2026-06-26-package-release-smoke.md |
```

After merge closeout, mark it `Done` only for package target and smoke criteria,
not for publishing or live release.

- [ ] **Step 3: Run final verification**

Run:

```bash
npm run check
npm run smoke:pack
git diff --check
```

Expected: all commands pass.

- [ ] **Step 4: Push and open PR**

```bash
git push -u origin codex/package-release-implementation
gh pr create --repo AcrossWorksAPI/open-relay --base main --head codex/package-release-implementation --title "chore: add package release smoke" --body-file /private/tmp/open-relay-package-smoke-pr-body.md
```

Expected: GitHub returns a PR URL. Wait for `Governance Checks`, then request
Claude review if CI is green.
