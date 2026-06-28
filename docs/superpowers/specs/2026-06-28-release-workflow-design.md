# Release Workflow Design

## Purpose

Open Relay now has a useful local CLI loop, package smoke, GitHub packet
transport, diff-stat evidence, and private redaction rules. The next release
slice defines how the project moves from a locally packable package to a first
public npm release without making an unsupported live claim.

This design is for the release workflow and first npm publish gate. It does not
publish a package, create a tag, or create a GitHub Release. It defines the
owner decisions and implementation work required before that can happen.

## Current Repository Facts

- Package name: `@acrossworks/open-relay`.
- Current package version: `0.0.0`.
- Current package safety flag: `private: true`.
- First package target: npm.
- Package smoke already builds, packs, installs a tarball, and exercises the
  installed CLI.
- GitHub Actions already runs `npm run check` and `npm run smoke:pack`.
- Current live version: `Unknown; needs owner decision`.
- No npm publish, GitHub Release, release tag, or deploy/live evidence exists.

## Decision

Use `@acrossworks/open-relay` as the first public npm package name and use
`0.1.0` as the recommended first public version.

Use GitHub Actions trusted publishing as the preferred publish path, not a
long-lived npm automation token. The release workflow should publish only from
a deliberate GitHub Release event for a `vX.Y.Z` tag after the npm package has a
trusted publisher configured for this repository/workflow.

The implementation PR may prepare the release workflow, changelog, preflight
script, and package metadata. It must still not mark the project `Live` until a
real publish event succeeds and the published package is smoke-tested from the
npm registry.

## References

- npm trusted publishing: `https://docs.npmjs.com/trusted-publishers/`
- npm provenance statements: `https://docs.npmjs.com/generating-provenance-statements`
- npm publish command: `https://docs.npmjs.com/cli/v11/commands/npm-publish`
- GitHub OpenID Connect hardening:
  `https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect`

## Release Boundary

### Planning PR

The planning PR:

- records the release workflow design;
- records the implementation plan;
- promotes release workflow and first npm publish gate from candidate to
  active planned work;
- records that npm owner, trusted publisher setup, and final release timing are
  still owner-controlled decisions.

It does not change `package.json`, remove `private: true`, add a release
workflow, tag a version, or publish anything.

### Implementation PR

The implementation PR should:

- add `CHANGELOG.md` with a `0.1.0` entry;
- update package metadata for the first public release candidate;
- keep `private: true` committed on `main` so local/manual `npm publish`
  remains blocked by default;
- add a release preflight script;
- add `npm run release:preflight`;
- add `.github/workflows/release.yml`;
- run the full checks and package smoke in the release workflow before publish;
- transiently remove `private` in the release workflow checkout immediately
  before release preflight and publish;
- run `npm publish --access public --provenance` only from the release
  workflow;
- keep live evidence unset until a real npm publish and registry-install smoke
  succeeds.

### Actual Publish Event

The actual publish event happens after the implementation PR merges and after
the owner has configured npm trusted publishing for the package. The publish
should be triggered by creating/publishing a GitHub Release for a tag matching
the package version, such as `v0.1.0`.

After publish, closeout must:

- install the package from the public npm registry in a clean temp project;
- run the installed `open-relay --help`;
- validate and render the committed examples;
- generate, validate, and render a real review-request packet;
- record the npm version, tag, GitHub Release, package URL, and smoke evidence
  in `docs/STATUS.md` and `docs/planning/VERSION_LEDGER.md`;
- only then mark a release as `Live`.

## Owner Decisions

| Decision | Recommendation | Status |
| --- | --- | --- |
| npm package name | Keep `@acrossworks/open-relay` | Recommended |
| first semver | Use `0.1.0` | Recommended |
| npm owner/org | Use an Across Works-controlled npm org/account | Unknown; needs owner decision |
| trusted publisher | Configure npm trusted publisher for this repo and release workflow | Required before publish |
| release trigger | GitHub Release published from tag `v0.1.0` | Recommended |
| token fallback | Do not use a CI token; if trusted publishing is unavailable, require a separate owner-approved manual one-time granular short-lived token plan | Recommended |
| native GitHub review import before publish | Defer until after first public package unless owner prefers otherwise | Recommended |
| agent-specific prompt dialects before publish | Defer until after first public package unless owner prefers otherwise | Recommended |

## Workflow Shape

The release workflow should live at `.github/workflows/release.yml`.

It should be triggered by:

```yaml
on:
  release:
    types: [published]
```

It should request only:

```yaml
permissions:
  contents: read
  id-token: write
```

The job should:

1. Check out the release tag.
2. Set up Node.js 24 with the npm registry URL and
   `package-manager-cache: false`.
3. Print and guard the npm CLI version required by trusted publishing
   (`11.5.1` or newer).
4. Run `npm ci`.
5. Run `npm run check`.
6. Run `npm run smoke:pack`.
7. Run `npm pkg delete private` in the release checkout.
8. Run `OPEN_RELAY_PUBLISH_CONTEXT=1 npm run release:preflight -- <tag-version>`.
9. Publish with `npm publish --access public --provenance`.

The workflow must not publish on pull request, push to `main`, or arbitrary
manual dispatch. A release is a deliberate outward action, so the outward event
should be a deliberate GitHub Release.

Pre-releases are intentionally unsupported for the first release workflow. The
job should skip GitHub pre-releases, and the strict `vX.Y.Z` tag parser remains
a second fail-closed guard against `v0.1.0-rc.1` style tags.

## Release Preflight

Add a dependency-free Node script at `scripts/release-preflight.js`.

The script should fail closed if:

- no expected version argument is passed;
- the expected version is not strict semver `X.Y.Z`;
- `package.json.version` does not match the expected version;
- the package name is not `@acrossworks/open-relay`;
- outside publish context, `private` is not `true`;
- inside publish context, `private` is still `true`;
- `publishConfig.access` is not `public`;
- the release workflow stops requesting `id-token: write`;
- the release workflow references `NPM_TOKEN`;
- the release workflow stops using Node.js 24 or newer;
- the release workflow enables package-manager caching;
- the release workflow stops checking for npm CLI `11.5.1` or newer;
- the release workflow stops publishing with provenance;
- `CHANGELOG.md` does not contain a heading for the expected version;
- `package-lock.json` does not carry the same package version;
- `npm pack --dry-run --json` omits required runtime files;
- `npm pack --dry-run --json` includes source tests, compiled tests,
  `.github`, `.codex`, planning docs, or local config files.

The script should not call the npm registry, create tags, create releases, or
publish. It is a local release gate only. Its default mode verifies that the
committed branch remains unpublishable; `OPEN_RELAY_PUBLISH_CONTEXT=1` verifies
the transient release-workflow checkout after `npm pkg delete private`.
CI should run the default-mode preflight on pull requests and pushes to `main`
so release-workflow weakening is caught before the eventual publish event, not
only during the release job.

## Changelog Contract

Add `CHANGELOG.md` before the first release. Use a simple manual format:

```md
# Changelog

## 0.1.0 - 2026-06-28

- Initial public CLI release candidate.
```

The implementation PR may use the current date when the PR is created. Future
release work can introduce generated changelogs if manual maintenance becomes
too costly.

## Package Metadata Contract

The implementation PR should update `package.json` from private local package
metadata to release-candidate package metadata while keeping `main`
unpublishable:

- `version`: `0.1.0`;
- keep `private: true`;
- keep `publishConfig.access: "public"`;
- keep `name: "@acrossworks/open-relay"`;
- keep `bin.open-relay`;
- keep `files` allowlist;
- keep `engines.node: ">=22"`;
- add useful keywords;
- set author to an Across Works value if the owner confirms it.

If the npm org/account cannot publish `@acrossworks/open-relay`, stop and
revise the package name before merging the release workflow.

## Security Model

- Prefer trusted publishing over stored write tokens.
- Keep `id-token: write` scoped only to the release workflow job.
- Do not add `NPM_TOKEN` secrets in this slice.
- Keep `private: true` committed on `main`; only the release workflow's
  checked-out working tree may delete it immediately before preflight and
  publish.
- If trusted publishing is unavailable, do not store a token in CI. The only
  allowed fallback is a separate owner-approved plan for a one-time manual
  publish using a granular, short-lived npm token that is never committed or
  stored as a GitHub secret.
- Do not publish on push or pull request events.
- Fail closed if version, tag, changelog, or package metadata disagree.
- Keep package contents allowlisted.
- Do not include planning docs, local Codex config, GitHub workflow files, or
  test sources in the package tarball.
- Keep private redaction rules local and ignored; do not package
  `.open-relay/`.

## Lifecycle And Rollback

Release workflow implementation is a runtime/package surface. It must cover:

- create: publish a version only from a release event;
- view: public npm package page after publish;
- update: future versions through the same release path;
- archive/deprecate: use npm deprecate if a bad version ships;
- remove: unpublish only inside npm's allowed emergency window and with owner
  approval;
- permissions: npm trusted publisher plus GitHub protected release workflow;
- audit: GitHub Release, workflow run, npm provenance, and version ledger;
- recovery: publish a patch version and deprecate the bad version.

Rollback for the implementation PR before publish is normal git revert. After a
real publish, do not rewrite history; publish a corrective version and document
the rollback/deprecation evidence.

## Non-Goals

- Publishing in the planning PR.
- Publishing from pull requests or pushes.
- Long-lived npm automation token setup.
- Multi-registry publishing.
- Homebrew, Docker, pnpm, yarn, or binary distribution.
- Native GitHub review import.
- Agent-specific prompt dialects.
- Hosted deployment.
- Automatic changelog generation.
- Automated semantic-release.

## Review Focus

Ask reviewers to check:

1. Is `0.1.0` the right first public version for the current CLI surface?
2. Is GitHub Release plus npm trusted publishing the right first outward
   release boundary?
3. Does the preflight catch version/tag/changelog/package drift before publish?
4. Does the workflow avoid token storage and accidental publish triggers while
   keeping `main` locally unpublishable?
5. Are live evidence and rollback rules strong enough for an open-source first
   release?
