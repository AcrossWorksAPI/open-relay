# Open Relay Active Work

Last updated: 2026-06-26

## Current Direction

Establish Open Relay as a local-first handoff and review protocol before product
implementation. The reviewed `review-request` packet is now the source shape
for the next schema and CLI planning slice. The approved first runtime direction
is a TypeScript CLI on Node.js with npm; MCP server support is deferred until
the CLI is useful.

## Current Implementation Source

| Source | Status | Notes |
| --- | --- | --- |
| `AGENTS.md` | Active | Repository agent instructions and governance rules. |
| `.codex/skills/project-roadmap-system/SKILL.md` | Active | Local Codex roadmap skill. |
| `master_build.md` | Active | Executive entrypoint. |
| `README.md` | Active | Public project summary. |
| `SECURITY.md` | Active | Vulnerability reporting and security policy. |
| `CONTRIBUTING.md` | Active | Contribution workflow and review expectations. |
| `.github/workflows/ci.yml` | Active | First dependency-free CI workflow. |
| `docs/protocol/review-request-packet.md` | Active | First packet type and required protocol fields. |
| `examples/review-request/relay.md` | Active | Human-readable synthetic review packet example. |
| `examples/review-request/relay.json` | Active | Machine-readable synthetic review packet example. |
| `docs/superpowers/specs/2026-06-26-runtime-schema-cli-design.md` | Active | Runtime/schema CLI design and approved TypeScript direction. |
| `docs/superpowers/plans/2026-06-26-runtime-schema-cli.md` | Active | Implementation plan for package scaffold, schema validation, CLI command, tests, and CI. |
| `docs/product/PROJECT_BRIEF.md` | Active | Owner-supplied product brief. |
| `docs/STATUS.md` | Active | Owner-readable current status. |
| `docs/planning/ROADMAP.md` | Active | Parseable roadmap. |
| `docs/planning/PLAN_REGISTRY.md` | Active | Plan source classification. |
| `docs/planning/VERSION_LEDGER.md` | Active | Baseline, version, smoke, and rollback evidence. |

## Current Risks And Gaps

| Risk or gap | Severity | Current handling |
| --- | --- | --- |
| Formal JSON Schema not implemented | Medium | Use the reviewed `review-request` packet spec and runtime/schema CLI plan as the source shape. |
| Runtime config not implemented | High | TypeScript CLI-first direction is approved; package scaffold remains planned. |
| Verification command limited before runtime exists | Medium | Use `git diff --check` plus required GitHub Actions governance checks. |
| Runtime-specific CI missing | Medium | Add package/build/test checks when the TypeScript package scaffold is implemented. |
| Live/deploy evidence absent | Medium | Do not mark live. |
| Runtime redaction behavior undefined | Medium | Protocol doc defines redaction notes; CLI behavior remains planned. |

## Next Recommended Work

1. Merge the runtime/schema CLI planning PR after governance checks pass.
2. Implement the TypeScript package scaffold from the active plan.
3. Convert the accepted packet shape into `schemas/review-request.schema.json`.
4. Add `open-relay validate <packet.json>` behavior and runtime CI.
5. Draft the generator plan for local git-state review-request packets.
6. Draft Codex and Claude render templates from the reviewed packet example.

## Current Owner Decisions Needed

- Packet storage location: repo-local, global user directory, or both.
- Codex/Claude specificity versus agent-neutral templates.
- Redaction rules from day one.
- Package/release target and live-readiness criteria.
