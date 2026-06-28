# Open Relay Active Work

Last updated: 2026-06-28

## Current Direction

Establish Open Relay as a local-first handoff and review protocol before product
implementation. The reviewed `review-request` packet, merged validation CLI,
merged JSON-only git-state generator, merged Markdown renderer, and merged
package smoke form the current CLI baseline. The CLI can now prove
installability from a local npm tarball before any live/publish claim. Direct
Markdown generation is merged so a local user can generate a review-ready
Markdown packet in one command. Local `handoff review-request` is merged to
make the review-request path clearer as a workflow command. Repo-local packet
storage is merged to make saved handoff packets durable without adding global
storage, hosted sync, or external orchestration. Protocol envelope dispatch and
`review-response` validation/rendering are merged, so the request/response
packet shapes now exist end-to-end. GitHub PR exact-packet transport is merged
as the first boundary so packets can move between agents without manual
copy/paste when both sides emit Open Relay packets. Reviewer-produced
`review-response` packet workflow is merged, so the reviewer side can create
and send response packets without manual copy/paste. Packet evidence enrichment
is merged, so generated request packets include per-file churn evidence without
embedding raw diffs. Private redaction rules are merged before npm publishing,
so repository-specific private terms can be scrubbed from generated packet
metadata. Release workflow implementation is merged, so the first public npm
publish gate, `0.1.0` package metadata, changelog/tag flow, trusted publishing
path, release preflight, and no-live-claim runbook are in place before any live
release claim. No `v0.1.0` tag, GitHub Release, npm publish, registry package,
or live claim exists yet. Native GitHub review import,
response storage, fix
automation, merge automation, implementation-handoff, resume-project, and
agent-ready prompts remain later slices. The approved first runtime direction
is a TypeScript CLI on Node.js with npm.

## Current Implementation Source

| Source | Status | Notes |
| --- | --- | --- |
| `AGENTS.md` | Active | Repository agent instructions and governance rules. |
| `.codex/skills/project-roadmap-system/SKILL.md` | Active | Local Codex roadmap skill. |
| `master_build.md` | Active | Executive entrypoint. |
| `README.md` | Active | Public project summary. |
| `SECURITY.md` | Active | Vulnerability reporting and security policy. |
| `CONTRIBUTING.md` | Active | Contribution workflow and review expectations. |
| `package.json` | Active | npm package metadata and build/test/check scripts. |
| `package-lock.json` | Active | Locked npm dependency graph. |
| `CHANGELOG.md` | Active | Manual release notes for the first public release target. |
| `scripts/smoke-pack.js` | Active | Local npm pack/install smoke for the built package tarball, installed CLI, generated review-request evidence, and explicit private redaction rules. |
| `scripts/release-preflight.js` | Active | Dependency-free release gate for version, private-field mode, changelog, package metadata, lockfile, and packlist drift. |
| `tsconfig.json` | Active | TypeScript compiler configuration. |
| `schemas/review-request.schema.json` | Active | Formal JSON Schema for the first review-request packet. |
| `schemas/review-response.schema.json` | Active | Formal JSON Schema for the first review-response packet. |
| `src/index.ts` | Active | Runtime exports. |
| `src/args.ts` | Active | Generator command argument parsing. |
| `src/git.ts` | Active | Local git context collection for base/head commits, diff range, changed files, and best-effort diff-stat evidence. |
| `src/redaction.ts` | Active | Fail-closed remote URL redaction helper. |
| `src/privateRedactionRules.ts` | Active | Strict private redaction rule parser and allowlisted review-request packet field walker. |
| `src/renderMarkdown.ts` | Active | Shared Markdown escaping, code-span, list, and label helpers. |
| `src/renderReviewRequest.ts` | Active | Pure review-request JSON-to-Markdown renderer, including changed-file evidence. |
| `src/renderReviewResponse.ts` | Active | Pure review-response JSON-to-Markdown renderer. |
| `src/renderPacket.ts` | Active | Generic packet Markdown renderer dispatcher. |
| `src/reviewRequest.ts` | Active | Schema-valid review-request packet assembly. |
| `src/reviewResponse.ts` | Active | Review-response packet type exported through the package entrypoint. |
| `src/reviewResponseArgs.ts` | Active | Argument parsing for `generate review-response` and `respond github-pr`. |
| `src/reviewResponseProducer.ts` | Active | Pure builder for validated reviewer-authored `review-response` packets from request packets plus drafts. |
| `src/schema.ts` | Active | Reusable packet validation module with packet type/version dispatch. |
| `src/schemaRegistry.ts` | Active | Packet schema registry and review-request semantic checks. |
| `src/storage.ts` | Active | Repo-local review-request bundle storage writer. |
| `src/transport/gh.ts` | Active | Sanitized local `gh` CLI runner for GitHub transport. |
| `src/transport/githubPr.ts` | Active | GitHub PR packet comment marker, send, update, and fetch helpers. |
| `src/cli.ts` | Active | Local CLI entrypoint for packet validation, review-request generation/handoff/save, generic rendering, and the `render review-request` alias. |
| `tests/schema.test.ts` | Active | Schema validation tests. |
| `tests/cli.test.ts` | Active | CLI behavior tests. |
| `tests/args.test.ts` | Active | Generator argument parser tests. |
| `tests/git.test.ts` | Active | Git context collector tests. |
| `tests/redaction.test.ts` | Active | Remote URL redaction tests. |
| `tests/privateRedactionRules.test.ts` | Active | Private redaction rule validation, case-insensitive replacement, audit no-leak, schema validity, and field allowlist coverage tests. |
| `tests/renderReviewRequest.test.ts` | Active | Markdown renderer order, snapshot, escaping, and empty-state tests. |
| `tests/renderReviewResponse.test.ts` | Active | Review-response Markdown renderer order, snapshot, confidence, escaping, and empty-state tests. |
| `tests/renderPacket.test.ts` | Active | Generic renderer dispatcher and test-only packet renderer tests. |
| `tests/reviewRequest.test.ts` | Active | Review-request packet builder tests. |
| `tests/reviewResponseArgs.test.ts` | Active | Review-response producer argument parser tests. |
| `tests/reviewResponseProducer.test.ts` | Active | Review-response draft key guard, builder, and semantic validation tests. |
| `tests/storage.test.ts` | Active | Repo-local packet storage id, write, collision, and cleanup tests. |
| `tests/githubPrTransport.test.ts` | Active | GitHub PR packet transport helper and fake-`gh` orchestration tests. |
| `.github/workflows/ci.yml` | Active | Governance, TypeScript runtime, and package smoke CI workflow. |
| `.github/workflows/release.yml` | Active | GitHub Release-triggered npm publish workflow using trusted publishing, provenance, package smoke, and release preflight. |
| `docs/release/npm-release.md` | Active | Owner runbook for trusted publishing setup, tag/release steps, post-publish smoke, and rollback. |
| `docs/superpowers/specs/2026-06-28-release-workflow-design.md` | Active | Design for first npm release workflow, trusted publishing, version/tag gate, and live-evidence rules. |
| `docs/superpowers/plans/2026-06-28-release-workflow.md` | Active | Implementation plan for changelog, release preflight, publish workflow, docs, and governance closeout. |
| `docs/protocol/review-request-packet.md` | Active | First packet type and required protocol fields. |
| `docs/protocol/review-response-packet.md` | Active | Review-response packet type and required protocol fields. |
| `docs/protocol/review-response-producer.md` | Active | Producer workflow for turning reviewer-authored drafts into validated response packets. |
| `docs/protocol/github-pr-transport.md` | Active | GitHub PR exact-packet transport commands, marker contract, `gh` auth model, authorship limits, and non-goals. |
| `examples/review-request/relay.md` | Active | Human-readable synthetic review packet example. |
| `examples/review-request/relay.json` | Active | Machine-readable synthetic review packet example. |
| `examples/review-response/relay.md` | Active | Human-readable synthetic review-response packet example. |
| `examples/review-response/relay.json` | Active | Machine-readable synthetic review-response packet example. |
| `docs/superpowers/specs/2026-06-26-runtime-schema-cli-design.md` | Active | Runtime/schema CLI design and approved TypeScript direction. |
| `docs/superpowers/specs/2026-06-26-git-state-generator-design.md` | Active | Design for JSON-first review-request packet generation from local git state. |
| `docs/superpowers/specs/2026-06-26-render-review-request-design.md` | Active | Design for deterministic review-request JSON-to-Markdown rendering. |
| `docs/superpowers/specs/2026-06-26-package-release-smoke-design.md` | Active | Design for npm package target and tarball install smoke before publishing. |
| `docs/superpowers/specs/2026-06-26-direct-markdown-generation-design.md` | Active | Design for `generate review-request --format markdown`. |
| `docs/superpowers/specs/2026-06-26-handoff-review-request-design.md` | Active | Design for the Markdown-first `handoff review-request` workflow command. |
| `docs/superpowers/specs/2026-06-26-repo-local-packet-storage-design.md` | Active | Design for explicit repo-local review-request packet bundle storage. |
| `docs/superpowers/specs/2026-06-27-relay-protocol-envelope-design.md` | Active | Design for multi-type and multi-version packet validation/rendering dispatch. |
| `docs/superpowers/specs/2026-06-27-review-response-packet-design.md` | Active | Design for `review-response` 0.1, the first packet type consuming the envelope. |
| `docs/superpowers/specs/2026-06-28-review-request-evidence-enrichment-design.md` | Active | Design for 0.1-compatible per-file diff stats in `changed_files[].evidence`. |
| `docs/superpowers/specs/2026-06-28-private-redaction-rules-design.md` | Active | Design for repo-local private redaction rules before generated review-request output. |
| `docs/superpowers/plans/2026-06-28-review-request-evidence-enrichment.md` | Active | Implementation plan for best-effort `--numstat -z --find-renames` diff stats in generated review-request packets. |
| `docs/superpowers/plans/2026-06-28-private-redaction-rules.md` | Active | Implementation plan for strict case-insensitive literal private redaction rules, generator integration, tests, docs, package smoke, and closeout. |
| `docs/superpowers/plans/2026-06-27-review-response-packet-implementation.md` | Active | Implementation plan for review-response schema, renderer, generic CLI rendering, tests, package smoke, and closeout. |
| `docs/superpowers/plans/2026-06-27-github-pr-transport.md` | Active | Implementation plan for GitHub PR exact-packet transport. |
| `docs/superpowers/plans/2026-06-27-review-response-producer-workflow.md` | Active | Implementation plan for producing and sending reviewer-authored `review-response` packets from a request packet plus review draft. |
| `docs/superpowers/plans/2026-06-27-relay-protocol-envelope.md` | Active | Implemented schema registry, dispatching validator, renderer dispatcher, tests, and closeout through PR #31. |
| `docs/superpowers/plans/2026-06-26-git-state-generator.md` | Active | Implementation plan for git context collection, redaction, packet generation, CLI wiring, tests, and closeout. |
| `docs/superpowers/plans/2026-06-26-render-review-request.md` | Active | Implementation plan for pure Markdown rendering, CLI route, tests, package export, and closeout. |
| `docs/superpowers/plans/2026-06-26-package-release-smoke.md` | Active | Implementation plan for package metadata, packlist, tarball install smoke, CI, and closeout. |
| `docs/superpowers/plans/2026-06-26-direct-markdown-generation.md` | Active | Implementation plan for direct Markdown output from the generator. |
| `docs/superpowers/plans/2026-06-26-handoff-review-request.md` | Active | Implementation plan for the local handoff review-request command. |
| `docs/superpowers/plans/2026-06-26-repo-local-packet-storage.md` | Active | Implementation plan for `save review-request` repo-local storage. |
| `docs/superpowers/plans/2026-06-26-runtime-schema-cli.md` | Historical | Implemented package scaffold, schema validation, CLI command, tests, and CI. |
| `docs/product/PROJECT_BRIEF.md` | Active | Owner-supplied product brief. |
| `docs/STATUS.md` | Active | Owner-readable current status. |
| `docs/planning/ROADMAP.md` | Active | Parseable roadmap. |
| `docs/planning/PLAN_REGISTRY.md` | Active | Plan source classification. |
| `docs/planning/VERSION_LEDGER.md` | Active | Baseline, version, smoke, and rollback evidence. |

## Current Risks And Gaps

| Risk or gap | Severity | Current handling |
| --- | --- | --- |
| Registry publish not executed | Medium | npm is the first package target, `private: true` is retained on `main`, release workflow implementation is merged, and registry publish is deferred until owner-controlled release authority and trusted publisher setup are complete. |
| Release publish authority pending owner action | Medium | Local tarball install smoke and the release workflow are merged; package metadata targets `0.1.0`; registry publish remains deferred until npm owner, trusted publisher, tag, GitHub Release, and post-publish smoke are approved. |
| Trusted publishing not configured | Medium | Release workflow implementation uses npm trusted publishing through GitHub Actions OIDC instead of long-lived npm tokens; npm owner/org setup remains required before publishing. |
| Runtime CI covers generator behavior | Low | CI runs build and tests for validation plus generator behavior on merged `main`. |
| Live/deploy evidence absent | Medium | Do not mark live. |
| Native review import and automation absent | Medium | The merged producer turns a reviewer-authored draft plus a `review-request` packet into a valid `review-response` and can send it through GitHub PR exact-packet transport. Native review import, automation, implementation-handoff, and resume-project remain planned. |
| Packet evidence is thinner than brief | Low | Diff summary capture is merged as per-file diff-stat evidence; test capture remains explicit `--verification` input rather than automatic command execution. |
| Higher-level handoff workflow external orchestration absent | Low | Local `handoff review-request` is merged as a Markdown-first workflow command; external agent invocation remains deferred. |
| Agent-specific prompt dialects deferred | Low | First renderer uses packet audience/focus fields and defers `--template claude` or `--template codex` variants. |
| Private redaction extension scope deferred | Low | PR #45 merged repo-local ignored case-insensitive literal rule files plus explicit `--redaction-rules`; global profiles, regex, raw-diff scanning, environment reads, and remote rule loading remain deferred. |

## Next Recommended Work

1. Confirm npm owner/org and trusted publishing setup for
   `@acrossworks/open-relay`.
2. Create the owner-controlled non-prerelease `v0.1.0` GitHub Release only when
   ready to publish.
3. Run post-publish registry-install smoke and record live evidence before
   marking any version `Live`.
4. Decide whether native GitHub review import and agent-specific prompt
   dialects belong before or after the first public package release.

## Current Owner Decisions Needed

- Global packet storage in addition to repo-local storage.
- GitHub PR comments are the first packet transport boundary; native GitHub
  review import remains a separate future decision.
- Codex/Claude specificity versus agent-neutral templates. Current plan starts
  agent-neutral and defers dialects.
- npm publish owner/organization, trusted publisher setup, and when to create
  the owner-controlled `v0.1.0` GitHub Release.
