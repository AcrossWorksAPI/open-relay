# Open Relay Master Build

Last updated: 2026-06-26

This is the executive entrypoint for Open Relay. It links the current roadmap,
status, plan registry, and version ledger used by Across Works Codex workflow.

## Primary Links

- Roadmap: `docs/planning/ROADMAP.md`
- Active work: `docs/planning/ACTIVE_WORK.md`
- Plan registry: `docs/planning/PLAN_REGISTRY.md`
- Version ledger: `docs/planning/VERSION_LEDGER.md`
- Owner status: `docs/STATUS.md`
- Lifecycle scope matrix:
  `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

## Current Runtime And Baseline

| Item | Current value | Evidence |
| --- | --- | --- |
| Project name | Open Relay | Owner brief and GitHub repository `AcrossWorksAPI/open-relay` |
| Product purpose | Open-source local-first AI handoff and review protocol | `README.md` and `docs/product/PROJECT_BRIEF.md` |
| Runtime/framework | Unknown; needs owner decision | TypeScript vs Python remains open |
| Deployment target | Local CLI, no hosted MVP | Owner brief |
| Current live version | Unknown; needs owner decision | No release history found |
| Current baseline | Open Relay project brief and governance baseline | Current branch docs baseline |

## Scope

Current scope is planning and governance setup only:

- parseable roadmap
- active work dashboard
- plan registry
- version ledger
- owner-readable status
- product brief
- local Codex roadmap skill
- Superpowers plan folder
- candidate register
- lifecycle/scope completeness discipline
- review, PR, smoke, and closeout workflow

## Non-Goals

- Product feature implementation
- Runtime or framework selection
- Hosted deployment setup
- External service provisioning
- Importing assumptions from Hosted Portal, Studio, npm, Python, Cloudflare,
  Render, or any other project

## Build Rules

- Inspect repository facts before choosing a stack or workflow.
- Keep unknowns explicit with `Unknown; needs owner decision`.
- Apply the Lean Implementation Ladder from `AGENTS.md`.
- Keep roadmap tables parseable and committed before syncing snapshots.
- Do not mark a slice live without deploy and smoke evidence.
- Closeout must update roadmap, status, plan registry, version ledger, and
  lifecycle matrix when scope or status changes.

## Near-Term Queue

| Priority | Work | Status | Owner decision needed |
| --- | --- | --- | --- |
| P0 | Define the smallest useful relay packet | Planned | Yes |
| P0 | Choose first implementation runtime, TypeScript or Python | Planned | Yes |
| P0 | Write initial relay packet schema and packet-type docs | Planned | Yes |
| P1 | Implement local CLI review-request packet generator | Candidate | Yes |
| P1 | Add Codex-ready and Claude-ready render templates | Candidate | Yes |

## Known Gaps

- Smallest useful relay packet is not defined yet.
- No runtime, framework, package, test, build, deployment, or smoke command is
  present.
- Git remote is configured as `https://github.com/AcrossWorksAPI/open-relay.git`.
- No live version, PR, deploy, or smoke evidence exists yet.
