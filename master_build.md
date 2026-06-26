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
| Runtime/framework | TypeScript on Node.js for the first CLI implementation | Owner approval recorded in issue #8 and runtime/schema design |
| Package manager | npm | Runtime/schema design |
| Deployment target | Local CLI, no hosted MVP | Owner brief |
| Current live version | Unknown; needs owner decision | No release history found |
| Current baseline | Open Relay project brief, governance baseline, review-request protocol baseline, TypeScript schema-validation CLI baseline, and merged git-state generator CLI MVP | PR #14 merge commit `fd0960c`; package/release target remains undecided |

## Scope

Current scope is the first local protocol and validation CLI baseline:

- parseable roadmap
- active work dashboard
- plan registry
- version ledger
- owner-readable status
- first review-request packet spec and examples
- product brief
- TypeScript CLI-first runtime decision
- runtime/schema validation CLI implementation
- git-state generator design, implementation plan, and merged JSON-only CLI implementation
- local Codex roadmap skill
- Superpowers plan folder
- candidate register
- lifecycle/scope completeness discipline
- review, PR, smoke, and closeout workflow

## Non-Goals

- MCP server support
- Package publishing
- Hosted deployment setup
- Markdown rendering and agent-specific prompt templates
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
| P0 | Define the smallest useful relay packet | Done | No |
| P0 | Choose first implementation runtime | Done | No |
| P0 | Write initial relay packet schema and packet-type docs | Done | No |
| P0 | Implement runtime/schema validation CLI | Done | No |
| P1 | Implement local CLI review-request packet generator | Done | No |
| P1 | Add Codex-ready and Claude-ready render templates | Candidate | Yes |

## Known Gaps

- The git-state packet generator is merged but not packaged or released yet.
- Package publishing, deployment, and release smoke evidence are not present
  yet.
- Git remote is configured as `https://github.com/AcrossWorksAPI/open-relay.git`.
- No live version, deployment, or package release smoke evidence exists yet.
