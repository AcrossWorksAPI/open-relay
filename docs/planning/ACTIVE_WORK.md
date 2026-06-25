# Open Relay Active Work

Last updated: 2026-06-26

## Current Direction

Establish Open Relay as a local-first handoff and review protocol before product
implementation. The active slice defines the smallest useful relay packet as a
`review-request` handoff from completed Codex work to Claude review.

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
| `docs/product/PROJECT_BRIEF.md` | Active | Owner-supplied product brief. |
| `docs/STATUS.md` | Active | Owner-readable current status. |
| `docs/planning/ROADMAP.md` | Active | Parseable roadmap. |
| `docs/planning/PLAN_REGISTRY.md` | Active | Plan source classification. |
| `docs/planning/VERSION_LEDGER.md` | Active | Baseline, version, smoke, and rollback evidence. |

## Current Risks And Gaps

| Risk or gap | Severity | Current handling |
| --- | --- | --- |
| Smallest useful relay packet under review | Medium | `review-request` packet spec and examples are in progress before runtime selection. |
| Runtime/framework unknown | High | TypeScript vs Python remains open. |
| Verification command limited before runtime exists | Medium | Use `git diff --check` plus required GitHub Actions governance checks. |
| Runtime-specific CI missing | Medium | Add package/build/test checks after TypeScript or Python is chosen. |
| Live/deploy evidence absent | Medium | Do not mark live. |
| Full JSON Schema and redaction rules undefined | Medium | First protocol doc defines required fields and redaction notes; formal schema is later. |

## Next Recommended Work

1. Finish PR and Claude review for the `review-request` packet spec.
2. Choose TypeScript or Python for the local CLI.
3. Convert the accepted packet shape into a formal JSON Schema.
4. Create a first implementation plan for a review-request packet generator.
5. Add runtime-specific build/test/smoke checks once runtime config exists.

## Current Owner Decisions Needed

- Whether the proposed `review-request` packet fields are enough for the first release.
- TypeScript or Python runtime.
- CLI only, or CLI plus MCP server.
- Packet storage location: repo-local, global user directory, or both.
- Codex/Claude specificity versus agent-neutral templates.
- Redaction rules from day one.
- Verification commands for build, test, lint, and smoke.
- Package/release target and live-readiness criteria.
