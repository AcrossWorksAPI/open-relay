# Release Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a publish-ready npm release workflow for Open Relay 0.1.0 without publishing until the owner configures npm trusted publishing and creates a GitHub Release.

**Architecture:** Keep the existing package smoke as the artifact-quality gate, add a local release preflight for version/changelog/package drift, and publish only from a GitHub Release event through npm trusted publishing with provenance. The implementation prepares the release path but does not create tags, create releases, or publish from the PR.

**Tech Stack:** npm, Node.js 22, GitHub Actions, npm trusted publishing, npm provenance.

---

## File Structure

- Create `CHANGELOG.md`: manual first-release changelog with `0.1.0`.
- Create `scripts/release-preflight.js`: dependency-free local gate for version, changelog, package metadata, lockfile, and packlist drift.
- Modify `package.json`: set `version` to `0.1.0`, keep `private: true`, add `release:preflight`, and add useful keywords.
- Modify `package-lock.json`: sync the root package version to `0.1.0`.
- Create `.github/workflows/release.yml`: publish from GitHub Release `published` events only, with `id-token: write` and `npm publish --provenance`.
- Modify `README.md`: document install and release status without claiming the package is live before publish.
- Modify `docs/STATUS.md`: record release workflow implementation state and keep live version unset until registry smoke passes.
- Modify `docs/planning/ROADMAP.md`: mark release workflow and first npm publish gate as in progress during implementation.
- Modify `docs/planning/ACTIVE_WORK.md`: add release workflow files and update risks/next work.
- Modify `docs/planning/PLAN_REGISTRY.md`: add this plan, release workflow, changelog, and preflight script as active sources.
- Modify `docs/planning/VERSION_LEDGER.md`: add release workflow implementation evidence and rollback notes.
- Modify `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: update runtime/package release surface lifecycle state.
- Modify `master_build.md`: update current baseline and near-term queue.

## Task 1: Release Preflight Script

**Files:**
- Create: `scripts/release-preflight.js`
- Modify: `package.json`

- [ ] **Step 1: Create the release preflight script**

Add `scripts/release-preflight.js`:

```js
#!/usr/bin/env node

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

const expectedVersion = process.argv[2];

try {
  run(expectedVersion);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Release preflight failed: ${message}`);
  process.exit(1);
}

function run(version) {
  assert.match(version ?? "", /^[0-9]+\.[0-9]+\.[0-9]+$/, "expected version must be X.Y.Z");

  const packageJson = readJson("package.json");
  assert.equal(packageJson.name, "@acrossworks/open-relay", "package name changed unexpectedly");
  assert.equal(packageJson.version, version, "package version must match release tag");
  const publishContext = process.env.OPEN_RELAY_PUBLISH_CONTEXT === "1";
  if (publishContext) {
    assert.notEqual(packageJson.private, true, "package must not be private inside release publish context");
  } else {
    assert.equal(packageJson.private, true, "committed package metadata must remain private outside release publish context");
  }
  assert.equal(packageJson.publishConfig?.access, "public", "publishConfig.access must be public");
  assert.equal(packageJson.bin?.["open-relay"], "./dist/src/cli.js", "CLI bin entry must stay stable");
  assert.ok(Array.isArray(packageJson.files), "package files allowlist is required");

  const packageLock = readJson("package-lock.json");
  assert.equal(packageLock.version, version, "package-lock root version must match release tag");
  assert.equal(packageLock.packages?.[""]?.version, version, "package-lock package version must match release tag");

  const changelog = readFileSync("CHANGELOG.md", "utf8");
  const changelogHeading = new RegExp(`^## ${escapeRegExp(version)} - [0-9]{4}-[0-9]{2}-[0-9]{2}$`, "m");
  assert.match(changelog, changelogHeading, "CHANGELOG.md must contain the release heading");

  execFileSync("npm", ["run", "build"], { stdio: "inherit" });
  const packOutput = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"]
  });
  const [manifest] = JSON.parse(packOutput);
  assert.ok(manifest, "npm pack --dry-run did not return a manifest");

  const files = new Set(manifest.files.map((entry) => entry.path));
  for (const required of [
    "dist/src/cli.js",
    "dist/src/index.js",
    "dist/schemas/review-request.schema.json",
    "dist/schemas/review-response.schema.json",
    "schemas/review-request.schema.json",
    "schemas/review-response.schema.json",
    "examples/review-request/relay.json",
    "examples/review-response/relay.json",
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "package.json"
  ]) {
    assert.ok(files.has(required), `package is missing ${required}`);
  }

  for (const file of files) {
    assert.equal(file.startsWith("dist/tests/"), false, `package includes compiled test file ${file}`);
    assert.equal(file.startsWith("tests/"), false, `package includes source test file ${file}`);
    assert.equal(file.startsWith("docs/planning/"), false, `package includes planning doc ${file}`);
    assert.equal(file.startsWith("docs/superpowers/"), false, `package includes superpowers doc ${file}`);
    assert.equal(file.startsWith(".github/"), false, `package includes GitHub config ${file}`);
    assert.equal(file.startsWith(".codex/"), false, `package includes Codex config ${file}`);
    assert.equal(file.startsWith(".open-relay/"), false, `package includes local Open Relay state ${file}`);
  }

  console.log(`Release preflight passed for ${packageJson.name}@${version}.`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 2: Run preflight before metadata changes and confirm it fails closed**

Run:

```bash
node scripts/release-preflight.js 0.1.0
```

Expected: fails with `Release preflight failed:` because `package.json` is still `0.0.0`.

- [ ] **Step 3: Add the npm script**

Modify `package.json` scripts to include:

```json
"release:preflight": "node scripts/release-preflight.js"
```

Keep the existing `test`, `build`, `check`, `prepack`, and `smoke:pack` scripts unchanged.

- [ ] **Step 4: Commit the preflight script red state**

```bash
git add package.json scripts/release-preflight.js
git commit -m "chore: add release preflight gate"
```

## Task 2: Package Metadata And Changelog

**Files:**
- Create: `CHANGELOG.md`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Add the first changelog entry**

Create `CHANGELOG.md`:

```md
# Changelog

## 0.1.0 - 2026-06-28

- Initial public CLI release candidate for Open Relay.
- Includes validated `review-request` and `review-response` packet schemas.
- Includes local git-state review-request generation, Markdown rendering,
  repo-local save, GitHub PR packet transport, reviewer-produced response
  packets, diff-stat evidence, and private redaction rules.
```

- [ ] **Step 2: Update package metadata**

Modify `package.json`:

```json
{
  "name": "@acrossworks/open-relay",
  "version": "0.1.0",
  "private": true,
  "description": "Local-first AI handoff and review protocol CLI",
  "keywords": [
    "ai",
    "handoff",
    "code-review",
    "cli",
    "protocol"
  ],
  "author": "Across Works",
  "publishConfig": {
    "access": "public"
  }
}
```

Keep the `private: true` field in this same edit so `main` remains locally unpublishable. Preserve every existing runtime entrypoint, dependency, files allowlist, license, repository, bugs, homepage, `bin`, `main`, `types`, and `engines` field.

- [ ] **Step 3: Sync package lock root version**

Run:

```bash
npm install --package-lock-only --ignore-scripts
```

Expected: `package-lock.json` updates the root package version to `0.1.0` without changing dependency versions unexpectedly.

- [ ] **Step 4: Run release preflight and package smoke**

Run:

```bash
npm run release:preflight -- 0.1.0
npm run smoke:pack
```

Expected: both pass. The preflight prints `Release preflight passed for @acrossworks/open-relay@0.1.0.`.

- [ ] **Step 5: Commit metadata and changelog**

```bash
git add CHANGELOG.md package.json package-lock.json
git commit -m "chore: prepare package metadata for 0.1.0"
```

## Task 3: GitHub Release Publish Workflow

**Files:**
- Create: `.github/workflows/release.yml`

- [ ] **Step 1: Add the release workflow**

Create `.github/workflows/release.yml`:

```yaml
name: Open Relay Release

on:
  release:
    types:
      - published

permissions:
  contents: read
  id-token: write

jobs:
  publish-npm:
    name: Publish npm package
    if: startsWith(github.ref_name, 'v') && !github.event.release.prerelease
    runs-on: ubuntu-latest
    steps:
      - name: Check out repository
        uses: actions/checkout@v7
        with:
          fetch-depth: 0

      - name: Extract release version
        id: release-version
        shell: bash
        run: |
          set -euo pipefail
          tag="${GITHUB_REF_NAME}"
          if [[ ! "$tag" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "Release tag must look like vX.Y.Z; got $tag" >&2
            exit 1
          fi
          echo "version=${tag#v}" >> "$GITHUB_OUTPUT"

      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version: "24"
          registry-url: "https://registry.npmjs.org"
          package-manager-cache: false

      - name: Verify trusted publishing runtime
        shell: bash
        run: |
          set -euo pipefail
          node --version
          npm --version
          node - <<'NODE'
          const { execFileSync } = require("node:child_process");
          const version = execFileSync("npm", ["--version"], { encoding: "utf8" }).trim();
          const [major, minor, patch] = version.split(".").map(Number);
          if (
            major < 11 ||
            (major === 11 && minor < 5) ||
            (major === 11 && minor === 5 && patch < 1)
          ) {
            throw new Error(`npm ${version} is too old for trusted publishing; expected 11.5.1 or newer`);
          }
          NODE

      - name: Install runtime dependencies
        run: npm ci

      - name: Run runtime checks
        run: npm run check

      - name: Run package smoke
        run: npm run smoke:pack

      - name: Prepare publish metadata
        run: npm pkg delete private

      - name: Run release preflight
        env:
          OPEN_RELAY_PUBLISH_CONTEXT: "1"
        run: npm run release:preflight -- "${{ steps.release-version.outputs.version }}"

      - name: Publish to npm
        run: npm publish --access public --provenance
```

- [ ] **Step 2: Confirm the release boundary is explicit**

Verify the workflow:

- triggers only on GitHub Release `published` events;
- skips GitHub pre-releases with `!github.event.release.prerelease`;
- accepts only strict `vX.Y.Z` tags;
- keeps `private: true` committed on `main`;
- deletes `private` only in the release job checkout before preflight and
  publish;
- uses Node.js 24 and guards npm CLI `11.5.1` or newer for trusted
  publishing;
- disables package-manager caching for the release job;
- uses `OPEN_RELAY_PUBLISH_CONTEXT=1` only after deleting `private`;
- does not reference `NPM_TOKEN` or any npm token secret.

- [ ] **Step 3: Check workflow syntax locally**

Run:

```bash
git diff --check
```

Expected: no whitespace errors. The repository does not currently have a local GitHub Actions linter, so CI will be the workflow syntax gate.

- [ ] **Step 4: Commit release workflow**

```bash
git add .github/workflows/release.yml
git commit -m "ci: add npm release workflow"
```

## Task 4: Public Docs And Release Instructions

**Files:**
- Modify: `README.md`
- Create: `docs/release/npm-release.md`

- [ ] **Step 1: Add README install wording**

Add this section to `README.md` near usage instructions:

````md
## Install

Open Relay is prepared for npm publishing as `@acrossworks/open-relay`.
Until the first npm release is published and smoke-tested from the registry,
use the repository checkout:

```bash
npm ci
npm run build
node dist/src/cli.js --help
```

After the first public release:

```bash
npm install -g @acrossworks/open-relay
open-relay --help
```
````

- [ ] **Step 2: Add release runbook**

Create `docs/release/npm-release.md`:

````md
# npm Release Runbook

## First Release Target

- Package: `@acrossworks/open-relay`
- First version: `0.1.0`
- Tag: `v0.1.0`
- Publish path: GitHub Release published event using npm trusted publishing
  and provenance.

## Required Owner Setup

1. Confirm the npm org/account can publish `@acrossworks/open-relay`.
2. Configure npm trusted publishing for this GitHub repository and
   `.github/workflows/release.yml`.
3. Confirm branch protection still requires `Governance Checks`.
4. Confirm the release PR changed `package.json`, `package-lock.json`,
   `CHANGELOG.md`, and release docs intentionally.
5. Confirm `package.json` on `main` still has `private: true`; the release
   workflow deletes that field only in the checked-out release job.

## Pre-Publish Checklist

Run locally before creating the release:

```bash
npm ci
npm run check
npm run smoke:pack
npm run release:preflight -- 0.1.0
git diff --check
```

Expected: all commands pass.

## Publish Steps

1. Merge the release implementation PR.
2. Confirm local `main` matches `origin/main`.
3. Create tag `v0.1.0` from `main`.
4. Create and publish a non-prerelease GitHub Release for `v0.1.0`.
5. Wait for `Open Relay Release / Publish npm package`.
6. If the workflow fails, do not retry blindly. Read the log, fix in a PR, and
   publish a corrected release only after checks pass.

Pre-release tags such as `v0.1.0-rc.1` are intentionally unsupported by the
first release workflow.

## Post-Publish Smoke

Use a clean temp project:

```bash
tmpdir="$(mktemp -d)"
cd "$tmpdir"
npm init -y
npm install @acrossworks/open-relay@0.1.0
npx open-relay --help
npx open-relay validate /path/to/open-relay/examples/review-request/relay.json
npx open-relay render /path/to/open-relay/examples/review-response/relay.json
```

Record the npm package URL, GitHub Release URL, workflow run URL, and smoke
output in `docs/STATUS.md` and `docs/planning/VERSION_LEDGER.md`.

## Rollback Or Bad Release

Do not rewrite git history after a public publish. For a bad release:

1. Decide whether npm deprecation is needed.
2. Publish a patch release with the fix.
3. Record the bad version, corrective version, and smoke evidence in the
   version ledger.

## Emergency Fallback

Trusted publishing is the supported release path. If trusted publishing is
unavailable, do not add an npm token to GitHub Actions. A fallback requires a
separate owner-approved plan for a one-time manual publish using a granular,
short-lived npm token that is never committed, logged, or stored as a GitHub
secret.
````

- [ ] **Step 3: Commit public docs**

```bash
git add README.md docs/release/npm-release.md
git commit -m "docs: add npm release runbook"
```

## Task 5: Governance Closeout For Implementation PR

**Files:**
- Modify: `master_build.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

- [ ] **Step 1: Update roadmap and status**

Record:

- release workflow implementation is in progress until PR merge;
- npm package publishing is still not live;
- first public version target is `0.1.0`;
- npm owner/org and trusted publisher setup are required before a publish event;
- native GitHub review import and agent-specific prompt dialects remain deferred
  unless the owner changes the release gate.

- [ ] **Step 2: Update plan registry**

Move this plan to active during implementation and list these new active files:

- `CHANGELOG.md`
- `scripts/release-preflight.js`
- `.github/workflows/release.yml`
- `docs/release/npm-release.md`

- [ ] **Step 3: Update version ledger**

Add an implementation row with:

- branch name;
- PR URL after opening;
- no live evidence;
- local `npm run check`, `npm run smoke:pack`, `npm run release:preflight -- 0.1.0`, and `git diff --check` evidence;
- rollback note that the implementation can be reverted before publish, but a
  published package must be corrected by deprecation or a patch release.

- [ ] **Step 4: Update lifecycle matrix**

For runtime/deployment surfaces, record release workflow as `In progress` until
merge. Keep `Live` unset until post-publish registry smoke exists.

- [ ] **Step 5: Commit governance updates**

```bash
git add master_build.md docs/STATUS.md docs/planning/ROADMAP.md docs/planning/ACTIVE_WORK.md docs/planning/PLAN_REGISTRY.md docs/planning/VERSION_LEDGER.md docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md
git commit -m "docs: record release workflow implementation state"
```

## Task 6: Final Verification And PR

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run full verification**

Run:

```bash
npm run check
npm run smoke:pack
npm run release:preflight -- 0.1.0
git diff --check
```

Expected:

- `npm run check` passes with the current test count;
- package smoke passes;
- release preflight passes for `0.1.0`;
- committed `package.json` still has `private: true`;
- whitespace check passes.

- [ ] **Step 2: Confirm no accidental publish happened**

Run:

```bash
git tag --list 'v0.1.0'
```

Expected: no tag exists unless the owner explicitly created one outside this PR.

Do not run `npm publish` locally.

- [ ] **Step 3: Open PR**

Open a PR titled:

```text
chore: prepare npm release workflow
```

PR body must include:

- no publish happened;
- owner must configure npm trusted publishing before creating a GitHub Release;
- package target `@acrossworks/open-relay`;
- version target `0.1.0`;
- verification commands and results;
- review focus on release trigger safety, preflight coverage, and package
  metadata, including the committed `private: true` invariant.

## Implementation Notes

- If npm ownership for `@acrossworks/open-relay` is not available, stop before
  merging the release workflow and revise the package name.
- If `npm publish --provenance` requirements change, update the workflow from
  official npm docs before implementation.
- Do not add an npm token secret. If trusted publishing is unavailable, the
  only allowed fallback is a separate owner-approved plan for a one-time manual
  publish using a granular, short-lived token that is never stored in CI.
- Keep `private: true` committed on `main`; only the release workflow checkout
  may delete it immediately before preflight and publish.
- Pre-releases are intentionally unsupported until a later release policy
  explicitly adds them.
- Do not mark `Current live version` as `0.1.0` until the package is published
  and post-publish smoke passes from the public registry.

## Self-Review Checklist

- Spec coverage: package name, version, trusted publishing, provenance,
  changelog, tag/release flow, preflight, no live claim, owner decisions, and
  rollback are all covered.
- Placeholder scan: no task contains unresolved placeholder text.
- Type consistency: `release:preflight`, `scripts/release-preflight.js`,
  `0.1.0`, `v0.1.0`, and `@acrossworks/open-relay` are used consistently.
