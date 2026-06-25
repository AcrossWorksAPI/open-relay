# Project Foundation Baseline Implementation Plan

> For agentic workers: REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`
> to implement future multi-step plans. This baseline plan is implemented as a
> governance-only setup pass.

**Goal:** Create the Across Works Codex workflow and Roadmap Hub baseline for
Open Relay without implementing product features.

**Architecture:** Add repo-local governance documents, a local Codex roadmap
skill, parseable planning tables, candidate registers, and lifecycle/scope
discipline. Preserve unknowns instead of importing assumptions from other
projects.

**Tech Stack:** Markdown and git only. Product runtime is unknown.

---

## Constraints

- Do not implement product features.
- Do not assume Hosted Portal, Studio, npm, Python, Cloudflare, Render, or any
  other stack.
- Keep unknown facts explicit as `Unknown; needs owner decision`.
- Keep roadmap tables parseable Markdown.
- Preserve unrelated user changes.

## Files Likely To Change

- `AGENTS.md`
- `CLAUDE.md`
- `.codex/skills/project-roadmap-system/SKILL.md`
- `master_build.md`
- `docs/STATUS.md`
- `docs/planning/ROADMAP.md`
- `docs/planning/ACTIVE_WORK.md`
- `docs/planning/PLAN_REGISTRY.md`
- `docs/planning/VERSION_LEDGER.md`
- `docs/planning/PLATFORM_CAPABILITY_CANDIDATES.md`
- `docs/planning/ENTITY_LIFECYCLE_CHECKLIST.md`
- `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`
- `docs/planning/CANDIDATE_DRAFT_STACK.md`
- `docs/planning/CANDIDATE_BRANCH_TRAIN.md`
- `docs/superpowers/plans/README.md`

## Acceptance Criteria

- [x] Repository facts are inspected before writing docs.
- [x] Branch `codex/project-foundation-baseline` exists.
- [x] Required governance files exist.
- [x] ROADMAP includes parser-safe version and candidate tables.
- [x] PLAN_REGISTRY classifies active and historical sources.
- [x] VERSION_LEDGER includes live-evidence discipline.
- [x] Lifecycle checklist and matrix exist without overclaiming product scope.
- [x] Candidate register and branch train exist.
- [x] Local Codex skill instructs future agents to read core roadmap files.
- [x] `git diff --check` passes.
- [x] Baseline is committed.
- [x] Push/draft PR is completed or blocked by missing remote.

## Lifecycle And Scope Completeness Pass

Current product entities are unknown. The initial matrix covers:

- roadmap governance docs
- local Codex roadmap skill
- product/application entities as unknown
- manager/library/assignment surfaces as unknown
- runtime/deployment surfaces as unknown

Future product work must update
`docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`.

## Assignment And Scope Matrix

Assignment-heavy product surfaces are unknown. The baseline matrix records
repository owner, future maintainer/operator, and future product user rows with
owner decisions needed.

## Security And Privacy Risks

- Risk: future work may expose raw rows, secrets, object keys, or presigned
  URLs without a projection boundary.
- Risk: future destructive operations may run before scoped rows are validated.
- Risk: monitoring, backup, and live claims may be asserted without evidence.

Mitigation: encode these as repository instructions, lifecycle gates, and
candidate readiness criteria.

## Test Plan

- Run `git diff --check`.
- Do not invent package, lint, build, or test commands because no stack exists.

## Smoke Plan

- Confirm files exist.
- Confirm roadmap source-plan links point to committed repo-relative Markdown
  docs or `-`.
- Confirm status and version ledger record verification evidence.

## Closeout Docs And Matrix Updates

- Update `docs/STATUS.md` with verification evidence.
- Update `docs/planning/VERSION_LEDGER.md` with verification evidence.
- Commit the baseline.
- Report push/PR status and any owner decisions needed.
