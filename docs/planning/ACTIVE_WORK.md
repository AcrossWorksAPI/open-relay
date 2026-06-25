# Open Relay Active Work

Last updated: 2026-06-26

## Current Direction

Establish Open Relay as a local-first handoff and review protocol before product
implementation. The current first planning focus is: define the smallest useful
relay packet.

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
| `docs/product/PROJECT_BRIEF.md` | Active | Owner-supplied product brief. |
| `docs/STATUS.md` | Active | Owner-readable current status. |
| `docs/planning/ROADMAP.md` | Active | Parseable roadmap. |
| `docs/planning/PLAN_REGISTRY.md` | Active | Plan source classification. |
| `docs/planning/VERSION_LEDGER.md` | Active | Baseline, version, smoke, and rollback evidence. |

## Current Risks And Gaps

| Risk or gap | Severity | Current handling |
| --- | --- | --- |
| Smallest useful relay packet undefined | High | Requires owner decision before implementation. |
| Runtime/framework unknown | High | TypeScript vs Python remains open. |
| Verification command limited before runtime exists | Medium | Use `git diff --check` plus required GitHub Actions governance checks. |
| Runtime-specific CI missing | Medium | Add package/build/test checks after TypeScript or Python is chosen. |
| Live/deploy evidence absent | Medium | Do not mark live. |
| Packet schema and redaction rules undefined | Medium | Lifecycle matrix marks packet surfaces planned or candidate. |

## Next Recommended Work

1. Define the smallest useful relay packet for review-request handoffs.
2. Choose TypeScript or Python for the local CLI.
3. Draft `docs/protocol/relay-schema.md` and packet-type docs.
4. Create a first implementation plan for a review-request packet generator.
5. Add runtime-specific build/test/smoke checks once runtime config exists.

## Current Owner Decisions Needed

- Minimal required relay packet fields.
- TypeScript or Python runtime.
- CLI only, or CLI plus MCP server.
- Packet storage location: repo-local, global user directory, or both.
- Codex/Claude specificity versus agent-neutral templates.
- Redaction rules from day one.
- Verification commands for build, test, lint, and smoke.
- Package/release target and live-readiness criteria.
