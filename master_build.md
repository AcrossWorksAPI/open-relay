# Open Relay Master Build

Last updated: 2026-06-29

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
| Current live version | None yet | No `v0.1.0` tag, GitHub Release, npm publish, registry smoke, or live version claim exists |
| Current baseline | Open Relay project brief, governance baseline, review-request protocol baseline, TypeScript schema-validation CLI baseline, merged git-state generator CLI MVP, merged review-request Markdown renderer, merged package/release smoke implementation, merged direct Markdown generation, merged local handoff workflow, repo-local packet storage, merged protocol envelope dispatch, review-loop roadmap re-anchoring, merged review-response packet spec, merged review-response validation/rendering implementation, merged GitHub PR exact-packet transport, merged reviewer-produced review-response workflow, merged packet evidence enrichment, merged private redaction rules implementation, merged release workflow implementation, PR-indexed pre-release roadmap tracking, merged agent-ready prompt rendering, merged resume-project packet planning, merged resume-project packet implementation, packet-native review-loop proof planning in progress, and implementation-handoff packet planning in progress | PR #54 merged `resume-project/0.1` schema, producer, renderer, CLI, docs, examples, prompt rendering, and package smoke without invoking agents, applying fixes, posting to GitHub, merging, publishing, or changing packet versions; merged-main verification passed `npm run check` with 201 tests, `npm run smoke:pack`, `npm run release:preflight -- 0.1.0`, and `git diff --check`; packet-native review-loop proof planning tracks the owner-approved PR-comment transport trial needed before treating the no-copy/paste review-loop claim as proven; implementation-handoff planning is docs-only and does not change packet schemas or runtime behavior; no `v0.1.0` tag exists and `package.json` remains `private: true` |

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
- merged private redaction rules implementation
- merged release workflow design and implementation
- PR-indexed pre-release roadmap version tracking
- agent-ready prompt rendering design, implementation plan, and implementation
- resume-project packet design, implementation plan, and implementation
- packet-native review-loop proof checklist and approval gates
- implementation-handoff packet design and implementation plan
- local Codex roadmap skill
- Superpowers plan folder
- candidate register
- lifecycle/scope completeness discipline
- review, PR, smoke, and closeout workflow

## Non-Goals

- MCP server support
- Package publishing beyond local tarball smoke
- Hosted deployment setup
- External agent invocation and custom prompt template systems
- External service provisioning
- Importing assumptions from Hosted Portal, Studio, npm, Python, Cloudflare,
  Render, or any other project

## Build Rules

- Inspect repository facts before choosing a stack or workflow.
- Keep unknowns explicit with `Unknown; needs owner decision`.
- Apply the Lean Implementation Ladder from `AGENTS.md`.
- Keep roadmap tables parseable and committed before syncing snapshots.
- Before the first public npm publish, use `v0.1.0-pre.<PR_NUMBER>` roadmap
  version labels for PR-backed slices and `v0.1.0-pre.next` only for planned
  slices without a PR.
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
| P1 | Implement private redaction rules | Done | No |
| P1 | Define release workflow and first npm publish gate | Done | No |
| P1 | Implement release workflow and first npm publish gate | Done | No |
| P1 | Plan agent-ready prompt rendering | Done | No |
| P1 | Add PR-indexed roadmap version tracking | Done | No |
| P1 | Implement agent-ready prompt rendering | Done | No |
| P1 | Plan resume-project packet type | Done | No |
| P1 | Implement resume-project packet type | Done | No |
| P1 | Prove packet-native review loop | In progress | Yes |
| P1 | Plan implementation-handoff packet type | In progress | No |

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
- The product brief's review loop and test evidence items are not fully
  implemented yet; agent-ready prompt rendering is implemented as optional
  `render --template claude|codex` wrappers, and protocol extensibility, the
  `review-response` validation/rendering implementation, GitHub PR
  exact-packet transport, reviewer-side response packet production,
  resume-project continuation packets, and per-file diff-stat evidence
  enrichment are merged. The command capability exists for the
  request/response/resume loop to move as packets with changed-file churn
  evidence, but the live no-copy/paste Codex/Claude round trip is unproven
  until the packet-native review-loop proof plan passes its clean PR
  packet-marker preflight, owner-approved rerun cleanup gate, canonical
  equality checks, `respond github-pr` dry-run stable-content equivalence after
  normalizing command-owned `created_at`, and schema-valid `resume-project`
  derivation. Implementation-handoff
  planning is now in progress; implementation-handoff runtime behavior,
  external agent invocation, and automatic test capture remain deferred.
- Package publishing and deployment evidence are not present yet; local package
  smoke and the GitHub Release-triggered npm publish workflow exist on `main`,
  with committed `private: true` retained. Registry publishing remains gated on
  npm owner/trusted publisher setup, an owner-created `v0.1.0` GitHub Release,
  and post-publish registry smoke.
- Private redaction rules are merged as repo-local ignored case-insensitive
  literal rules before generated packet output; global profiles, regex rules,
  environment reads, raw-diff scanning, and remote rule loading remain deferred.
- Relay session identifiers are flagged as a future workflow candidate: a
  random Open Relay-generated session id should visibly link participating
  Codex and Claude thread titles, while a manifest or packet field remains
  deferred until the project/session orchestration layer is designed.
- Git remote is configured as `https://github.com/AcrossWorksAPI/open-relay.git`.
- No live version, deployment, or registry package evidence exists yet.
