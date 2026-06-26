# Package Release Smoke Design

## Purpose

Open Relay now has a useful local CLI baseline: validation, git-state packet
generation, and Markdown rendering. The next slice defines how this becomes
installable without prematurely claiming a live release.

This slice chooses npm as the first package target and adds release-readiness
smoke evidence around a packed tarball. It does not publish to npm, create a
GitHub Release, tag a version, or call the CLI live.

## Decision

Use the existing scoped package name:

```text
@acrossworks/open-relay
```

The first release channel is npm. The package remains unpublished until a later
release PR proves credentials, versioning, tagging, and maintainer approval.

Keep `version` at `0.0.0` and `private: true` for this planning slice. The
implementation slice may add package metadata and pack/install smoke scripts,
but must not remove `private: true` or publish. Removing `private: true` is a
separate release PR with explicit release evidence.

## User Outcome

A maintainer can run one local command and know whether the package artifact is
installable:

```bash
npm run smoke:pack
```

That smoke should build the package, create a local tarball with `npm pack`,
install it into a clean temporary project, and run the installed `open-relay`
CLI through the core commands:

- `open-relay --help`
- `open-relay validate <example packet>`
- `open-relay render review-request <example packet>`
- `open-relay generate review-request ...` inside a temporary git repository

The smoke proves installability of the artifact that would later be published,
not just the source checkout.

## Scope

### Included

- Define npm as the first package target.
- Add package metadata needed before public publishing:
  - description
  - license
  - repository
  - homepage
  - bugs
  - keywords
  - Node engine range
  - publish access policy placeholder
- Add an explicit packlist using `files` in `package.json`.
- Add `prepack` so package output is built before packing.
- Add `npm run smoke:pack`.
- Add a Node smoke script under `scripts/` that:
  - creates an isolated temp workspace,
  - runs `npm pack --pack-destination`,
  - installs the produced tarball into a clean temp project,
  - runs the installed CLI against copied example fixtures,
  - creates a temporary git repository for `generate review-request`,
  - verifies generated JSON and rendered Markdown,
  - checks failure paths do not leak a secret-shaped invalid JSON payload.
- Add CI coverage for `npm run smoke:pack`.
- Document release readiness criteria in roadmap/status/ledger docs.

### Deferred

- Removing `private: true`.
- Setting a real semver release such as `0.1.0`.
- Publishing to npm.
- Creating GitHub Releases or tags.
- Signing provenance or SLSA attestations.
- Package manager targets beyond npm.
- Persistent packet storage.
- `generate review-request --format markdown`.

## Package Contents

The package should include only runtime files and useful public docs:

- `dist/`
- `schemas/`
- `examples/`
- `README.md`
- `LICENSE`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CODE_OF_CONDUCT.md`

It should exclude source tests, planning docs, `.github`, `.codex`, local
scratch files, and generated temp artifacts unless a future release decision
intentionally includes them.

## Live-Readiness Criteria

Open Relay can be called release-ready, but not necessarily live, only when:

1. `npm ci` passes from a clean checkout.
2. `npm run check` passes.
3. `npm run smoke:pack` passes locally and in GitHub Actions.
4. `npm pack --dry-run` or equivalent pack output contains only expected files.
5. The installed tarball CLI can validate, render, and generate a packet.
6. Invalid JSON and write/generate failures remain sanitized.
7. The release version, changelog, tag, and npm publish authority are explicitly
   recorded.

The implementation slice can satisfy items 1-6. Item 7 remains a future release
PR.

## Security And Privacy

The pack smoke must use synthetic repositories and example packets only. It
must not inspect the user's filesystem beyond the package checkout and temp
workspaces it creates. It must not print temp paths in intentional failure
assertions unless those paths are non-sensitive and created by the smoke script.

The package tarball should not include private planning folders, Git metadata,
temporary files, or local paths.

## Lifecycle And Scope Coverage

| Area | Decision |
| --- | --- |
| Lifecycle | Adds release-readiness validation for package creation and installability; actual publish/version/tag remains deferred. |
| Scope | npm package target only. No hosted service, MCP server, or package manager beyond npm. |
| Permissions | Smoke runs locally with temp directories; no registry write credentials required. |
| Ownership | Maintainer owns future publish credentials and semver/tag decisions. |
| Audit | CI logs, PR review, `npm run smoke:pack`, and version ledger entries provide evidence. |
| Notifications | Deferred; no release notification surface exists yet. |
| Recovery | Failed smoke leaves no package publication behind; temp workspaces are cleaned up. |
| Smoke | `npm run check`, `npm run smoke:pack`, `git diff --check`, and GitHub `Governance Checks`. |

## Testing Strategy

- Unit coverage stays in existing TypeScript tests.
- Add package smoke coverage through a Node script because it needs filesystem,
  child process, npm, and git orchestration.
- CI runs `npm run smoke:pack` after `npm run check`.
- The smoke script asserts the installed CLI, not `dist/src/cli.js` from the
  checkout, so it catches missing `bin`, `files`, `prepack`, and runtime
  dependency problems.

## Open Decisions

- First published version remains `Unknown; needs owner decision`.
- npm organization/account publishing authority remains
  `Unknown; needs owner decision`.
- Release notes/changelog format remains a future release PR.
