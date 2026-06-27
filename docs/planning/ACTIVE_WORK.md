# Open Relay Active Work

Last updated: 2026-06-27

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
packet shapes now exist end-to-end. The next slice is boundary/transport so
packets can move between agents without manual copy/paste. That is followed by
richer packet evidence, implementation-handoff, resume-project, and
agent-ready prompts. The approved first runtime direction is a TypeScript CLI
on Node.js with npm.

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
| `scripts/smoke-pack.js` | Active | Local npm pack/install smoke for the built package tarball and installed CLI. |
| `tsconfig.json` | Active | TypeScript compiler configuration. |
| `schemas/review-request.schema.json` | Active | Formal JSON Schema for the first review-request packet. |
| `schemas/review-response.schema.json` | Active | Formal JSON Schema for the first review-response packet. |
| `src/index.ts` | Active | Runtime exports. |
| `src/args.ts` | Active | Generator command argument parsing. |
| `src/git.ts` | Active | Local git context collection for base/head commits, diff range, and changed files. |
| `src/redaction.ts` | Active | Fail-closed remote URL redaction helper. |
| `src/renderMarkdown.ts` | Active | Shared Markdown escaping, code-span, list, and label helpers. |
| `src/renderReviewRequest.ts` | Active | Pure review-request JSON-to-Markdown renderer. |
| `src/renderReviewResponse.ts` | Active | Pure review-response JSON-to-Markdown renderer. |
| `src/renderPacket.ts` | Active | Generic packet Markdown renderer dispatcher. |
| `src/reviewRequest.ts` | Active | Schema-valid review-request packet assembly. |
| `src/reviewResponse.ts` | Active | Review-response packet type exported through the package entrypoint. |
| `src/schema.ts` | Active | Reusable packet validation module with packet type/version dispatch. |
| `src/schemaRegistry.ts` | Active | Packet schema registry and review-request semantic checks. |
| `src/storage.ts` | Active | Repo-local review-request bundle storage writer. |
| `src/cli.ts` | Active | Local CLI entrypoint for packet validation, review-request generation/handoff/save, generic rendering, and the `render review-request` alias. |
| `tests/schema.test.ts` | Active | Schema validation tests. |
| `tests/cli.test.ts` | Active | CLI behavior tests. |
| `tests/args.test.ts` | Active | Generator argument parser tests. |
| `tests/git.test.ts` | Active | Git context collector tests. |
| `tests/redaction.test.ts` | Active | Remote URL redaction tests. |
| `tests/renderReviewRequest.test.ts` | Active | Markdown renderer order, snapshot, escaping, and empty-state tests. |
| `tests/renderReviewResponse.test.ts` | Active | Review-response Markdown renderer order, snapshot, confidence, escaping, and empty-state tests. |
| `tests/renderPacket.test.ts` | Active | Generic renderer dispatcher and test-only packet renderer tests. |
| `tests/reviewRequest.test.ts` | Active | Review-request packet builder tests. |
| `tests/storage.test.ts` | Active | Repo-local packet storage id, write, collision, and cleanup tests. |
| `.github/workflows/ci.yml` | Active | Governance, TypeScript runtime, and package smoke CI workflow. |
| `docs/protocol/review-request-packet.md` | Active | First packet type and required protocol fields. |
| `docs/protocol/review-response-packet.md` | Active | Review-response packet type and required protocol fields. |
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
| `docs/superpowers/plans/2026-06-27-review-response-packet-implementation.md` | Active | Implementation plan for review-response schema, renderer, generic CLI rendering, tests, package smoke, and closeout. |
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
| Package publishing target not implemented | Medium | npm is the first package target, `private: true` is retained, and registry publish is deferred until release authority and version are decided. |
| Release publish authority undecided | Medium | Local tarball install smoke is merged; registry publish remains deferred until npm owner, first version, changelog, tag, and `private: true` removal are approved. |
| Runtime CI covers generator behavior | Low | CI runs build and tests for validation plus generator behavior on merged `main`. |
| Live/deploy evidence absent | Medium | Do not mark live. |
| Review loop transport not implemented | High | Review-request handoff and review-response validation/rendering are merged; transport, PR comments, automation, implementation-handoff, and resume-project remain planned. |
| Packet evidence is thinner than brief | Medium | Diff summary and test capture are restored as planned packet evidence enrichment. |
| Higher-level handoff workflow external orchestration absent | Low | Local `handoff review-request` is merged as a Markdown-first workflow command; external agent invocation remains deferred. |
| Agent-specific prompt dialects deferred | Low | First renderer uses packet audience/focus fields and defers `--template claude` or `--template codex` variants. |
| Private redaction rule files undefined | Medium | Generator uses fixed fail-closed redaction defaults and defers private rule files. |

## Next Recommended Work

1. Decide and implement the first packet transport boundary.
2. Decide whether private redaction rule files are needed before package
   publishing.
3. Define npm publish owner, first semver version, changelog, and tag workflow.

## Current Owner Decisions Needed

- Global packet storage in addition to repo-local storage.
- First packet transport boundary.
- Codex/Claude specificity versus agent-neutral templates. Current plan starts
  agent-neutral and defers dialects.
- Redaction rules from day one.
- npm publish owner/organization and first released semver version.
