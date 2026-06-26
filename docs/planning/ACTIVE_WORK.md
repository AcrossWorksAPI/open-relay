# Open Relay Active Work

Last updated: 2026-06-26

## Current Direction

Establish Open Relay as a local-first handoff and review protocol before product
implementation. The reviewed `review-request` packet and merged validation CLI
are now the source shape for the generator slice. The approved first runtime
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
| `src/schema.ts` | Active | Reusable packet validation module. |
| `src/cli.ts` | Active | Local CLI entrypoint and `validate` command. |
| `tests/schema.test.ts` | Active | Schema validation tests. |
| `tests/cli.test.ts` | Active | CLI behavior tests. |
| `.github/workflows/ci.yml` | Active | Governance and TypeScript runtime CI workflow. |
| `docs/protocol/review-request-packet.md` | Active | First packet type and required protocol fields. |
| `examples/review-request/relay.md` | Active | Human-readable synthetic review packet example. |
| `examples/review-request/relay.json` | Active | Machine-readable synthetic review packet example. |
| `docs/superpowers/specs/2026-06-26-runtime-schema-cli-design.md` | Active | Runtime/schema CLI design and approved TypeScript direction. |
| `docs/superpowers/plans/2026-06-26-runtime-schema-cli.md` | Historical | Implemented package scaffold, schema validation, CLI command, tests, and CI. |
| `docs/product/PROJECT_BRIEF.md` | Active | Owner-supplied product brief. |
| `docs/STATUS.md` | Active | Owner-readable current status. |
| `docs/planning/ROADMAP.md` | Active | Parseable roadmap. |
| `docs/planning/PLAN_REGISTRY.md` | Active | Plan source classification. |
| `docs/planning/VERSION_LEDGER.md` | Active | Baseline, version, smoke, and rollback evidence. |

## Current Risks And Gaps

| Risk or gap | Severity | Current handling |
| --- | --- | --- |
| Packet generator not implemented | High | Next product slice should generate review-request packets from local git state. |
| Package publishing target unknown | Medium | Keep `private: true` until owner selects npm/package release policy. |
| Release smoke evidence absent | Medium | Do not mark live until package/release smoke criteria are defined and proven. |
| Runtime CI limited to validation slice | Low | CI runs build and tests for the current CLI; broaden checks as generator behavior is added. |
| Live/deploy evidence absent | Medium | Do not mark live. |
| Runtime redaction behavior undefined | Medium | Protocol doc defines redaction notes; generator behavior remains planned. |

## Next Recommended Work

1. Draft the generator plan for local git-state review-request packets.
2. Decide packet storage location: repo-local, global user directory, or both.
3. Define first-pass redaction behavior for generated packets.
4. Implement generator command after the plan is reviewed.
5. Draft Codex and Claude render templates from the reviewed packet example.

## Current Owner Decisions Needed

- Packet storage location: repo-local, global user directory, or both.
- Codex/Claude specificity versus agent-neutral templates.
- Redaction rules from day one.
- Package/release target and live-readiness criteria.
