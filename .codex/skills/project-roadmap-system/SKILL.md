---
name: project-roadmap-system
description: Project-local Across Works roadmap governance for Open Relay. Use before planning, implementation, review, status updates, roadmap edits, version ledger changes, lifecycle/scope matrix work, or closeout in this repository.
---

# Project Roadmap System

Use this skill before planning, implementing, reviewing, or closing out work in
this repository.

## Required Reading

Read these files, in order, before making a plan or code/doc change:

1. `AGENTS.md`
2. `master_build.md`
3. `docs/STATUS.md`
4. `docs/planning/ROADMAP.md`
5. `docs/planning/ACTIVE_WORK.md`
6. `docs/planning/PLAN_REGISTRY.md`
7. `docs/planning/VERSION_LEDGER.md`

If any fact is missing from those files or the repository, write
`Unknown; needs owner decision` instead of guessing.

## Roadmap Rules

- Keep roadmap tables parseable Markdown.
- Use parser-safe roadmap statuses: `Live`, `Done`, `In progress`, `Planned`,
  `Deferred`, `Candidate`.
- Use parser-safe roadmap priorities: `High`, `Medium`, `Low`, `-`.
- Use parser-safe client gate values: `Required`, `No`, `Candidate`, `-`.
- Source-plan cells must point to committed repo-relative Markdown docs or `-`.
- Hosted Roadmap Hub displays committed snapshots only. Local uncommitted files
  are not visible to Hosted at runtime.
- Update `docs/planning/ACTIVE_WORK.md`,
  `docs/planning/PLAN_REGISTRY.md`, `docs/planning/VERSION_LEDGER.md`, and
  `docs/STATUS.md` when scope, status, evidence, or ownership changes.

## Lifecycle And Scope Completeness

For core entities and manager/library/assignment surfaces, read:

- `docs/planning/ENTITY_LIFECYCLE_CHECKLIST.md`
- `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

Every plan must explicitly cover or defer lifecycle, scope, permissions,
ownership, audit, notification, recovery, and smoke states. Manager, library,
or assignment-heavy surfaces also require an Assignment And Scope Matrix.

## Lean Implementation Ladder

For every implementation, prefer the smallest durable solution in this order:

1. Reuse existing project code, components, services, stores, helpers, tests,
   and design tokens.
2. Follow established local patterns before introducing a new pattern.
3. Prefer standard-library, platform-native, or already-installed dependency
   capabilities before adding a dependency.
4. Add dependencies, frameworks, or abstractions only when the plan names the
   reason, risk, owner, and verification path.

This is not a code-golf rule. Do not reduce security, permissions, tenant
isolation, accessibility, lifecycle completeness, audit coverage, error
handling, tests, or clear domain modelling just to save lines or tokens.

## Verification And Handoff

Before closeout:

- Run `git diff --check`.
- Run project-specific tests only when a real, discovered command exists or
  code/config changes require it.
- Record smoke or verification evidence in `docs/STATUS.md` and
  `docs/planning/VERSION_LEDGER.md`.
- Report files changed, verification run, owner decisions needed, remaining
  risks, and PR/push status.
- Do not mark a slice `Live` without deploy and smoke evidence.
