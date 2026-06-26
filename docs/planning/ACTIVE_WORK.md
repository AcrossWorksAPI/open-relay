# Open Relay Active Work

Last updated: 2026-06-26

## Current Direction

Establish Open Relay as a local-first handoff and review protocol before product
implementation. The reviewed `review-request` packet, merged validation CLI,
merged JSON-only git-state generator, and merged Markdown renderer form the
current CLI baseline. Package/release smoke planning is active so the CLI can
prove installability before any live/publish claim. The approved first runtime
direction is a TypeScript CLI on Node.js with npm; MCP server support is
deferred until the CLI is useful.

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
| `tsconfig.json` | Active | TypeScript compiler configuration. |
| `schemas/review-request.schema.json` | Active | Formal JSON Schema for the first review-request packet. |
| `src/index.ts` | Active | Runtime exports. |
| `src/args.ts` | Active | Generator command argument parsing. |
| `src/git.ts` | Active | Local git context collection for base/head commits, diff range, and changed files. |
| `src/redaction.ts` | Active | Fail-closed remote URL redaction helper. |
| `src/renderReviewRequest.ts` | Active | Pure review-request JSON-to-Markdown renderer. |
| `src/reviewRequest.ts` | Active | Schema-valid review-request packet assembly. |
| `src/schema.ts` | Active | Reusable packet validation module. |
| `src/cli.ts` | Active | Local CLI entrypoint, `validate`, and draft `generate review-request` command. |
| `tests/schema.test.ts` | Active | Schema validation tests. |
| `tests/cli.test.ts` | Active | CLI behavior tests. |
| `tests/args.test.ts` | Active | Generator argument parser tests. |
| `tests/git.test.ts` | Active | Git context collector tests. |
| `tests/redaction.test.ts` | Active | Remote URL redaction tests. |
| `tests/renderReviewRequest.test.ts` | Active | Markdown renderer order, snapshot, escaping, and empty-state tests. |
| `tests/reviewRequest.test.ts` | Active | Review-request packet builder tests. |
| `.github/workflows/ci.yml` | Active | Governance and TypeScript runtime CI workflow. |
| `docs/protocol/review-request-packet.md` | Active | First packet type and required protocol fields. |
| `examples/review-request/relay.md` | Active | Human-readable synthetic review packet example. |
| `examples/review-request/relay.json` | Active | Machine-readable synthetic review packet example. |
| `docs/superpowers/specs/2026-06-26-runtime-schema-cli-design.md` | Active | Runtime/schema CLI design and approved TypeScript direction. |
| `docs/superpowers/specs/2026-06-26-git-state-generator-design.md` | Active | Design for JSON-first review-request packet generation from local git state. |
| `docs/superpowers/specs/2026-06-26-render-review-request-design.md` | Active | Design for deterministic review-request JSON-to-Markdown rendering. |
| `docs/superpowers/specs/2026-06-26-package-release-smoke-design.md` | Active | Design for npm package target and tarball install smoke before publishing. |
| `docs/superpowers/plans/2026-06-26-git-state-generator.md` | Active | Implementation plan for git context collection, redaction, packet generation, CLI wiring, tests, and closeout. |
| `docs/superpowers/plans/2026-06-26-render-review-request.md` | Active | Implementation plan for pure Markdown rendering, CLI route, tests, package export, and closeout. |
| `docs/superpowers/plans/2026-06-26-package-release-smoke.md` | Active | Implementation plan for package metadata, packlist, tarball install smoke, CI, and closeout. |
| `docs/superpowers/plans/2026-06-26-runtime-schema-cli.md` | Historical | Implemented package scaffold, schema validation, CLI command, tests, and CI. |
| `docs/product/PROJECT_BRIEF.md` | Active | Owner-supplied product brief. |
| `docs/STATUS.md` | Active | Owner-readable current status. |
| `docs/planning/ROADMAP.md` | Active | Parseable roadmap. |
| `docs/planning/PLAN_REGISTRY.md` | Active | Plan source classification. |
| `docs/planning/VERSION_LEDGER.md` | Active | Baseline, version, smoke, and rollback evidence. |

## Current Risks And Gaps

| Risk or gap | Severity | Current handling |
| --- | --- | --- |
| Package publishing target not implemented | Medium | Plan npm as first package target, keep `private: true`, and defer registry publish until release authority and version are decided. |
| Release smoke evidence absent | Medium | Add tarball install smoke before any live claim. |
| Runtime CI covers generator behavior | Low | CI runs build and tests for validation plus generator behavior on merged `main`. |
| Live/deploy evidence absent | Medium | Do not mark live. |
| Direct Markdown generation deferred | Low | `open-relay render review-request` is merged; `generate review-request --format markdown` remains a candidate follow-up. |
| Agent-specific prompt dialects deferred | Low | First renderer uses packet audience/focus fields and defers `--template claude` or `--template codex` variants. |
| Private redaction rule files undefined | Medium | Generator uses fixed fail-closed redaction defaults and defers private rule files. |

## Next Recommended Work

1. Open the package/release smoke planning PR for Claude/GitHub review.
2. Implement npm pack/install smoke after planning review is green.
3. Consider `generate review-request --format markdown` now that the renderer
   is merged.
4. Revisit permanent packet storage location after stdout and explicit
   `--output` behavior is proven.
5. Decide whether private redaction rule files are needed before package
   publishing.

## Current Owner Decisions Needed

- Packet storage location: repo-local, global user directory, or both.
- Codex/Claude specificity versus agent-neutral templates. Current plan starts
  agent-neutral and defers dialects.
- Redaction rules from day one.
- npm publish owner/organization and first released semver version.
