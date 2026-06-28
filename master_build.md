# Open Relay Master Build

Last updated: 2026-06-28

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
| Current baseline | Open Relay project brief, governance baseline, review-request protocol baseline, TypeScript schema-validation CLI baseline, merged git-state generator CLI MVP, merged review-request Markdown renderer, merged package/release smoke implementation, merged direct Markdown generation, merged local handoff workflow, repo-local packet storage, merged protocol envelope dispatch, review-loop roadmap re-anchoring, merged review-response packet spec, merged review-response validation/rendering implementation, merged GitHub PR exact-packet transport, merged reviewer-produced review-response workflow, and merged packet evidence enrichment | PR #42 merge commit `26c2a10`; merged-main `npm run check`, `npm run smoke:pack`, and `git diff --check` passed |

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
- render review-request design, implementation plan, merged implementation, tests, and example snapshot
- package/release smoke design, implementation plan, merged implementation, and CI guardrail
- direct Markdown generation design, implementation plan, merged implementation, and package smoke coverage
- local handoff workflow design, implementation plan, merged implementation, and package smoke coverage
- repo-local packet storage design, implementation plan, and merged implementation
- relay protocol envelope and multi-type extensibility design, implementation plan, and merged implementation
- review-response packet design, merged spec, validation/rendering implementation, examples, and package smoke
- merged GitHub PR exact-packet transport implementation
- merged reviewer-produced review-response workflow implementation
- packet evidence enrichment design, implementation plan, and merged implementation
- local Codex roadmap skill
- Superpowers plan folder
- candidate register
- lifecycle/scope completeness discipline
- review, PR, smoke, and closeout workflow

## Non-Goals

- MCP server support
- Package publishing beyond local tarball smoke
- Hosted deployment setup
- Agent-specific prompt dialects beyond the neutral packet renderer
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
| P1 | Add Codex-ready and Claude-ready render templates | Done | No |
| P1 | Define package target and release-readiness smoke | Done | No |
| P1 | Generate review-request Markdown directly | Done | No |
| P1 | Add local review-request handoff workflow | Done | No |
| P1 | Add repo-local packet storage | Done | No |
| P1 | Re-anchor roadmap to review loop and protocol envelope | Done | No |
| P1 | Define review-response packet type | Done | No |
| P1 | Implement review-response packet type | Done | No |
| P1 | Implement first packet transport boundary | Done | No |
| P1 | Implement reviewer-produced review-response workflow | Done | No |
| P1 | Implement packet evidence enrichment | Done | No |

## Known Gaps

- Package target and release-readiness smoke are implemented as an npm tarball
  install smoke; registry publishing remains deferred.
- Direct `generate review-request --format markdown` is implemented; Markdown
  rendering remains available through
  `open-relay render review-request`.
- Local `handoff review-request` is merged as a Markdown-first convenience
  command; external agent invocation remains deferred.
- Repo-local packet storage is merged as explicit `.open-relay/review-requests`
  bundles; global storage, list/read/delete/archive, retention, and hosted sync
  remain deferred.
- The product brief's review loop, agent-ready prompts, and test evidence
  items are not fully implemented yet; protocol extensibility, the
  `review-response` validation/rendering implementation, GitHub PR
  exact-packet transport, reviewer-side response packet production, and
  per-file diff-stat evidence enrichment are merged, so the request/response
  loop can move as packets with changed-file churn evidence and without manual
  copy/paste when both sides emit Open Relay packet drafts.
- Package publishing and deployment evidence are not present yet; local package
  smoke evidence exists on `main`.
- Git remote is configured as `https://github.com/AcrossWorksAPI/open-relay.git`.
- No live version, deployment, or registry package evidence exists yet.
