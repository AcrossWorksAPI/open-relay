# Open Relay Plan Registry

Last updated: 2026-06-30

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
| `CHANGELOG.md` | First release changelog | Active |
| `package.json` | npm package metadata and runtime scripts | Active |
| `package-lock.json` | Locked npm dependency graph | Active |
| `scripts/smoke-pack.js` | Package tarball install smoke | Active |
| `scripts/release-preflight.js` | Release preflight gate | Active |
| `tsconfig.json` | TypeScript compiler configuration | Active |
| `schemas/review-request.schema.json` | Formal review-request packet schema | Active |
| `schemas/review-response.schema.json` | Formal review-response packet schema | Active |
| `src/index.ts` | Runtime exports | Active |
| `src/args.ts` | Generator argument parser | Active |
| `src/git.ts` | Local git context collector | Active |
| `src/redaction.ts` | Remote URL redaction helper | Active |
| `src/renderMarkdown.ts` | Shared Markdown escaping and formatting helpers | Active |
| `src/renderReviewRequest.ts` | Review-request Markdown renderer | Active |
| `src/renderReviewResponse.ts` | Review-response Markdown renderer | Active |
| `src/renderResumeProject.ts` | Resume-project Markdown renderer | Active |
| `src/renderPacket.ts` | Generic packet Markdown renderer dispatcher | Active |
| `src/renderPrompt.ts` | Neutral/Claude/Codex prompt renderer | Active |
| `src/reviewRequest.ts` | Review-request packet builder | Active |
| `src/reviewResponse.ts` | Review-response packet type | Active |
| `src/reviewResponseArgs.ts` | Review-response producer argument parser | Active |
| `src/reviewResponseProducer.ts` | Review-response producer builder and draft key guards | Active |
| `src/resumeProject.ts` | Resume-project packet type | Active |
| `src/resumeProjectArgs.ts` | Resume-project producer argument parser | Active |
| `src/resumeProjectProducer.ts` | Resume-project packet producer | Active |
| `src/schema.ts` | Packet validation module with type/version dispatch | Active |
| `src/schemaRegistry.ts` | Packet schema registry and semantic checks | Active |
| `src/storage.ts` | Repo-local review-request storage writer | Active |
| `src/transport/gh.ts` | Sanitized local `gh` CLI runner for GitHub transport | Active |
| `src/transport/githubPr.ts` | GitHub PR exact-packet transport helpers | Active |
| `src/watcherProof.ts` | Experimental local watcher proof module with live confirmation, local agent trigger, receipt, permission-warning, and timeout handling | Active |
| `src/relayWatch.ts` | Experimental foreground relay watcher for GitHub PR request packets, headless Claude response drafts, validated response posting, receipts, and state | Active |
| `src/cli.ts` | Local CLI entrypoint, validation, generation, rendering, handoff, save, transport, watcher-proof, and relay-watch routing | Active |
| `tests/schema.test.ts` | Schema validation tests | Active |
| `tests/cli.test.ts` | CLI behavior tests | Active |
| `tests/args.test.ts` | Generator argument parser tests | Active |
| `tests/git.test.ts` | Git context collector tests | Active |
| `tests/redaction.test.ts` | Remote URL redaction tests | Active |
| `tests/renderReviewRequest.test.ts` | Review-request Markdown renderer tests | Active |
| `tests/renderReviewResponse.test.ts` | Review-response Markdown renderer tests | Active |
| `tests/renderResumeProject.test.ts` | Resume-project Markdown renderer tests | Active |
| `tests/renderPacket.test.ts` | Generic packet renderer dispatcher tests | Active |
| `tests/renderPrompt.test.ts` | Prompt renderer tests | Active |
| `tests/reviewRequest.test.ts` | Review-request packet builder tests | Active |
| `tests/reviewResponseArgs.test.ts` | Review-response producer argument parser tests | Active |
| `tests/reviewResponseProducer.test.ts` | Review-response producer builder and draft key guard tests | Active |
| `tests/resumeProjectArgs.test.ts` | Resume-project producer argument parser tests | Active |
| `tests/resumeProjectProducer.test.ts` | Resume-project producer tests | Active |
| `tests/storage.test.ts` | Repo-local storage tests | Active |
| `tests/githubPrTransport.test.ts` | GitHub PR packet transport helper and fake-`gh` orchestration tests | Active |
| `tests/watcherProof.test.ts` | Watcher proof parser, secret parsing, dry-run receipt, injected live trigger, and timeout cleanup tests | Active |
| `tests/relayWatch.test.ts` | Relay watch parser, dry-run, state skip, injected Claude review, response posting, malformed-output, and confirmation-gate tests | Active |
| `.github/workflows/ci.yml` | Governance, runtime, and package smoke CI guardrail | Active |
| `.github/workflows/release.yml` | GitHub Release-triggered npm publish workflow | Active |
| `docs/release/npm-release.md` | npm release runbook | Active |
| `docs/superpowers/specs/2026-06-28-release-workflow-design.md` | Release workflow and first npm publish gate design | Active |
| `docs/superpowers/plans/2026-06-28-release-workflow.md` | Release workflow and first npm publish gate implementation plan | Active |
| `docs/superpowers/specs/2026-06-28-agent-ready-prompt-rendering-design.md` | Agent-ready prompt rendering design | Active |
| `docs/superpowers/specs/2026-06-29-resume-project-packet-design.md` | Resume-project packet design | Active |
| `docs/superpowers/plans/2026-06-30-local-watcher-proof.md` | Local watcher proof implementation plan | Active |
| `docs/superpowers/plans/2026-06-30-local-relay-watch.md` | Local relay watch implementation plan | Active |
| `docs/superpowers/plans/2026-06-28-agent-ready-prompt-rendering.md` | Agent-ready prompt rendering implementation plan | Active |
| `docs/superpowers/plans/2026-06-29-resume-project-packet.md` | Resume-project packet implementation plan | Active |
| `docs/protocol/review-request-packet.md` | First review-request packet protocol | Active |
| `docs/protocol/review-response-packet.md` | Review-response packet protocol | Active |
| `docs/protocol/review-response-producer.md` | Review-response producer workflow protocol | Active |
| `docs/protocol/resume-project-packet.md` | Resume-project packet protocol | Active |
| `docs/protocol/github-pr-transport.md` | GitHub PR exact-packet transport protocol | Active |
| `docs/protocol/agent-ready-prompt-rendering.md` | Agent-ready prompt rendering protocol | Active |
| `docs/protocol/local-watcher-proof.md` | Experimental local watcher proof protocol | Active |
| `docs/protocol/local-relay-watch.md` | Experimental foreground relay-watch protocol | Active |
| `examples/review-request/relay.md` | Human-readable synthetic review packet | Active |
| `examples/review-request/relay.json` | Machine-readable synthetic review packet | Active |
| `examples/review-response/relay.md` | Human-readable synthetic review-response packet | Active |
| `examples/review-response/relay.json` | Machine-readable synthetic review-response packet | Active |
| `examples/resume-project/relay.md` | Human-readable synthetic resume-project packet | Active |
| `examples/resume-project/relay.json` | Machine-readable synthetic resume-project packet | Active |
| `examples/watcher-proof/r7m4q9k2-live-receipt.sanitized.json` | Sanitized R7M4Q9K2 live watcher proof receipt evidence | Active |
| `docs/superpowers/specs/2026-06-26-runtime-schema-cli-design.md` | Runtime/schema CLI design | Active |
| `docs/superpowers/specs/2026-06-26-git-state-generator-design.md` | Git-state review-request generator design | Active |
| `docs/superpowers/specs/2026-06-26-render-review-request-design.md` | Review-request Markdown renderer design | Active |
| `docs/superpowers/specs/2026-06-26-package-release-smoke-design.md` | Package target and release smoke design | Active |
| `docs/superpowers/specs/2026-06-26-direct-markdown-generation-design.md` | Direct Markdown generation design | Active |
| `docs/superpowers/specs/2026-06-26-handoff-review-request-design.md` | Local handoff workflow design | Active |
| `docs/superpowers/specs/2026-06-26-repo-local-packet-storage-design.md` | Repo-local packet storage design | Active |
| `docs/superpowers/specs/2026-06-27-relay-protocol-envelope-design.md` | Relay protocol envelope and multi-type extensibility design | Active |
| `docs/superpowers/specs/2026-06-27-review-response-packet-design.md` | Review-response packet design | Active |
| `docs/superpowers/specs/2026-06-28-review-request-evidence-enrichment-design.md` | Review-request evidence enrichment design | Active |
| `docs/superpowers/specs/2026-06-28-private-redaction-rules-design.md` | Private redaction rules design | Active |
| `docs/superpowers/plans/2026-06-28-review-request-evidence-enrichment.md` | Review-request evidence enrichment implementation plan | Active |
| `docs/superpowers/plans/2026-06-28-private-redaction-rules.md` | Private redaction rules implementation plan | Active |
| `docs/superpowers/plans/2026-06-27-review-response-packet-implementation.md` | Review-response packet implementation plan | Active |
| `docs/superpowers/plans/2026-06-27-github-pr-transport.md` | GitHub PR exact-packet transport implementation plan | Active |
| `docs/superpowers/plans/2026-06-27-review-response-producer-workflow.md` | Reviewer-produced review-response workflow implementation plan | Active |
| `docs/superpowers/plans/2026-06-27-relay-protocol-envelope.md` | Relay protocol envelope implementation plan | Active |
| `docs/superpowers/plans/2026-06-26-git-state-generator.md` | Git-state review-request generator implementation plan | Active |
| `docs/superpowers/plans/2026-06-26-render-review-request.md` | Review-request Markdown renderer implementation plan | Active |
| `docs/superpowers/plans/2026-06-26-package-release-smoke.md` | Package target and release smoke implementation plan | Active |
| `docs/superpowers/plans/2026-06-26-direct-markdown-generation.md` | Direct Markdown generation implementation plan | Active |
| `docs/superpowers/plans/2026-06-26-handoff-review-request.md` | Local handoff workflow implementation plan | Active |
| `docs/superpowers/plans/2026-06-26-repo-local-packet-storage.md` | Repo-local packet storage implementation plan | Active |
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
| `docs/superpowers/plans/2026-06-30-local-watcher-proof.md` | Ready for review | Codex | Tracks PR #59's experimental bounded local trigger proof for Codex app-server and headless Claude Code, including dry-run/package-smoke/live proof coverage, Claude review fixes, committed sanitized live receipt evidence, and no packet schema, GitHub posting, merge, publish, deployment, or daemon behavior. |
| `docs/superpowers/plans/2026-06-30-local-relay-watch.md` | Ready for review | Codex | Tracks PR #60 / branch `codex/local-relay-watch`, the experimental foreground GitHub PR request-to-Claude-to-response watcher with dry-run, explicit live/public confirmations, local state, receipt evidence, fake-`gh` and injected live-path tests, and no packet schema change, daemon install, Codex wakeup, fixes, merge, publish, or deployment. |

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
| `docs/superpowers/plans/2026-06-26-direct-markdown-generation.md` | Done | Planned and implemented `generate review-request --format markdown`, parser/CLI tests, package smoke update, review, and merge closeout through PR #23. |
| `docs/superpowers/plans/2026-06-26-handoff-review-request.md` | Done | Planned and implemented `handoff review-request`, local-only help text, parser/CLI tests, package smoke update, review, and merge closeout through PR #26. |
| `docs/superpowers/plans/2026-06-26-repo-local-packet-storage.md` | Done | Planned and implemented `save review-request`, repo-local bundle storage, CLI/storage tests, cleanup coverage, package smoke update, review, and merge closeout through PR #29. |
| `docs/superpowers/plans/2026-06-27-relay-protocol-envelope.md` | Done | Planned and implemented packet type/version schema registry dispatch, renderer dispatch, package export, supported-combination errors, test-only second-type proof, review, and merge closeout through PR #31. |
| `docs/superpowers/specs/2026-06-27-review-response-packet-design.md` | Done | Defined `review-response` 0.1 as the first protocol-envelope consumer and merged through PR #33. |
| `docs/superpowers/plans/2026-06-27-review-response-packet-implementation.md` | Done | Planned and implemented `review-response` schema validation, semantic checks, Markdown rendering, examples, generic render, neutral validate messages, package exports, package smoke coverage, Claude review fix, and merge closeout through PR #34. |
| `docs/superpowers/plans/2026-06-27-github-pr-transport.md` | Done | Planned and implemented GitHub PR exact-packet transport through local `gh`, dry-run, authenticated-user update, author-filtered fetch, protocol docs, package smoke, Claude review fixes, and merge closeout through PR #36. |
| `docs/superpowers/plans/2026-06-27-review-response-producer-workflow.md` | Done | Planned and implemented reviewer-authored response draft production, `generate review-response`, `respond github-pr`, draft key guards, protocol docs, package smoke coverage, Claude dogfood review, and merge closeout through PR #39. |
| `docs/superpowers/plans/2026-06-28-review-request-evidence-enrichment.md` | Done | Planned and implemented 0.1-compatible `changed_files[].evidence` diff stats from best-effort `--numstat -z --find-renames`, including binary, rename, non-ASCII, literal-tab path, package smoke, and merge closeout through PR #42. |
| `docs/superpowers/plans/2026-06-28-private-redaction-rules.md` | Done | Planned and implemented repo-local ignored case-insensitive literal private redaction rules, explicit `--redaction-rules`, fail-closed invalid config, allowlisted packet-field redaction, audit no-leak guards, package smoke, Claude review fix, and merge closeout through PR #45. |
| `docs/superpowers/plans/2026-06-28-release-workflow.md` | Done | Planned and implemented the `0.1.0` changelog, dual-mode release preflight, GitHub Release-triggered trusted-publishing workflow, npm release runbook, package metadata, verification, and merge closeout through PR #48 without creating a tag, GitHub Release, npm publish, registry package, or live claim. |
| `docs/superpowers/plans/2026-06-28-agent-ready-prompt-rendering.md` | Done | Planned and implemented `render --template neutral\|claude\|codex`, pure prompt rendering, parser/CLI tests, package exports, README and protocol docs, installed-package smoke coverage, and governance closeout without agent invocation, packet schema changes, GitHub posting, merge, publish, or live release claims. |
| `docs/superpowers/plans/2026-06-29-resume-project-packet.md` | Done | Planned and implemented `resume-project/0.1`, `generate resume-project`, generic render and Codex prompt support, examples, docs, package smoke, review, and merge closeout through PR #54 without agent invocation, fix application, GitHub posting, merge automation, publish, or packet-version bump. |

## Superseded Or Dormant Plans

| Plan | Status | Notes |
| --- | --- | --- |
| - | - | No superseded or dormant plans found in the empty repository. |

## Unrestored Or Unknown Plans

| Plan area | Status | Notes |
| --- | --- | --- |
| Prior product plans | Unknown; needs owner decision | The remote had only an initial README before this baseline; no implementation plans were found. |
