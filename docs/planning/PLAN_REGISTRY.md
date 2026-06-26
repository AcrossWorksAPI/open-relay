# Open Relay Plan Registry

Last updated: 2026-06-26

This registry classifies active and historical planning sources. Treat unlisted
or old plan files as inactive until this registry and current code agree.

## Active Sources Of Truth

| Source | Role | Status |
| --- | --- | --- |
| `AGENTS.md` | Repository agent instructions | Active |
| `.codex/skills/project-roadmap-system/SKILL.md` | Local Codex roadmap workflow | Active |
| `README.md` | Public project summary | Active |
| `SECURITY.md` | Security policy and reporting process | Active |
| `CONTRIBUTING.md` | Contribution workflow and review expectations | Active |
| `package.json` | npm package metadata and runtime scripts | Active |
| `package-lock.json` | Locked npm dependency graph | Active |
| `scripts/smoke-pack.js` | Package tarball install smoke | Active |
| `tsconfig.json` | TypeScript compiler configuration | Active |
| `schemas/review-request.schema.json` | Formal review-request packet schema | Active |
| `src/index.ts` | Runtime exports | Active |
| `src/args.ts` | Generator argument parser | Active |
| `src/git.ts` | Local git context collector | Active |
| `src/redaction.ts` | Remote URL redaction helper | Active |
| `src/renderReviewRequest.ts` | Review-request Markdown renderer | Active |
| `src/reviewRequest.ts` | Review-request packet builder | Active |
| `src/schema.ts` | Packet validation module | Active |
| `src/cli.ts` | Local CLI entrypoint, validation, and generator routing | Active |
| `tests/schema.test.ts` | Schema validation tests | Active |
| `tests/cli.test.ts` | CLI behavior tests | Active |
| `tests/args.test.ts` | Generator argument parser tests | Active |
| `tests/git.test.ts` | Git context collector tests | Active |
| `tests/redaction.test.ts` | Remote URL redaction tests | Active |
| `tests/renderReviewRequest.test.ts` | Review-request Markdown renderer tests | Active |
| `tests/reviewRequest.test.ts` | Review-request packet builder tests | Active |
| `.github/workflows/ci.yml` | Governance, runtime, and package smoke CI guardrail | Active |
| `docs/protocol/review-request-packet.md` | First review-request packet protocol | Active |
| `examples/review-request/relay.md` | Human-readable synthetic review packet | Active |
| `examples/review-request/relay.json` | Machine-readable synthetic review packet | Active |
| `docs/superpowers/specs/2026-06-26-runtime-schema-cli-design.md` | Runtime/schema CLI design | Active |
| `docs/superpowers/specs/2026-06-26-git-state-generator-design.md` | Git-state review-request generator design | Active |
| `docs/superpowers/specs/2026-06-26-render-review-request-design.md` | Review-request Markdown renderer design | Active |
| `docs/superpowers/specs/2026-06-26-package-release-smoke-design.md` | Package target and release smoke design | Active |
| `docs/superpowers/plans/2026-06-26-git-state-generator.md` | Git-state review-request generator implementation plan | Active |
| `docs/superpowers/plans/2026-06-26-render-review-request.md` | Review-request Markdown renderer implementation plan | Active |
| `docs/superpowers/plans/2026-06-26-package-release-smoke.md` | Package target and release smoke implementation plan | Active |
| `docs/product/PROJECT_BRIEF.md` | Product thesis, MVP, users, and open questions | Active |
| `master_build.md` | Executive build entrypoint | Active |
| `docs/STATUS.md` | Owner-readable status | Active |
| `docs/planning/ROADMAP.md` | Parseable roadmap | Active |
| `docs/planning/ACTIVE_WORK.md` | Current work dashboard | Active |
| `docs/planning/VERSION_LEDGER.md` | Version, commit, PR, deploy, and smoke evidence | Active |
| `docs/planning/ENTITY_LIFECYCLE_CHECKLIST.md` | Lifecycle completeness checklist | Active |
| `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md` | Entity/surface completeness matrix | Active |
| `docs/planning/PLATFORM_CAPABILITY_CANDIDATES.md` | Platform candidate register | Active |

## Active Plans

| Plan | Status | Owner | Notes |
| --- | --- | --- | --- |
| - | - | - | No active implementation plans after PR #20 package smoke merge. |

## Implemented Or Historical Plans

| Plan | Status | Outcome |
| --- | --- | --- |
| `docs/superpowers/plans/2026-06-26-project-foundation-baseline.md` | Done | Created project governance baseline; no product features implemented. |
| `docs/superpowers/plans/2026-06-26-open-relay-brief-and-remote.md` | Done | Captured Open Relay brief, updated roadmap/status, configured GitHub remote, and prepared branch for PR. |
| `docs/superpowers/plans/2026-06-26-open-source-hardening.md` | Done | Added security, contribution, conduct, templates, Dependabot, CI, and required branch-protection check. |
| `docs/superpowers/plans/2026-06-26-review-request-packet-spec.md` | Done | Defined the smallest useful `review-request` packet, examples, review assumptions, and protocol shape. |
| `docs/superpowers/plans/2026-06-26-runtime-schema-cli.md` | Done | Implemented TypeScript package scaffold, formal schema validation, CLI validate command, runtime CI, review fixes, and roadmap closeout. |
| `docs/superpowers/plans/2026-06-26-git-state-generator.md` | Done | Planned and implemented local git-state review-request packet generation, redaction defaults, CLI wiring, tests, review fixes, and merge closeout through PR #14. |
| `docs/superpowers/plans/2026-06-26-render-review-request.md` | Done | Planned and implemented review-request Markdown rendering, CLI route, parser tests, package export, snapshot-bound example Markdown, review fixes, and merge closeout through PR #17. |
| `docs/superpowers/plans/2026-06-26-package-release-smoke.md` | Done | Planned and implemented npm package metadata, packlist, tarball install smoke, CI guardrail, review fixes, and merge closeout through PR #20. |

## Superseded Or Dormant Plans

| Plan | Status | Notes |
| --- | --- | --- |
| - | - | No superseded or dormant plans found in the empty repository. |

## Unrestored Or Unknown Plans

| Plan area | Status | Notes |
| --- | --- | --- |
| Prior product plans | Unknown; needs owner decision | The remote had only an initial README before this baseline; no implementation plans were found. |
