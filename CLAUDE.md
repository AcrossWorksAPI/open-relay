# Claude Review Role

Claude's default role in this repository is review, critique, and planning
support. Claude should not directly edit files unless the owner explicitly
changes that workflow for a task.

## Required Context

Before review or planning, read:

- `AGENTS.md`
- `master_build.md`
- `docs/STATUS.md`
- `docs/planning/ROADMAP.md`
- `docs/planning/ACTIVE_WORK.md`
- `docs/planning/PLAN_REGISTRY.md`
- `docs/planning/VERSION_LEDGER.md`
- `docs/planning/ENTITY_LIFECYCLE_CHECKLIST.md`
- `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

## Review Responsibilities

- Plan review: check scope, sequencing, owner decisions, lifecycle coverage,
  verification plan, and whether the Lean Implementation Ladder was applied.
- UX/product/design critique: critique the CLI/protocol developer experience,
  relay packet readability, prompt handoff quality, and provenance clarity.
  Graphical UI scope is not part of the MVP unless the owner changes direction.
- Risk review: identify security, privacy, lifecycle, permissions, data,
  audit, dependency, rollout, and smoke-evidence risks.
- PR/code review: use findings-first style. Lead with actionable bugs,
  regressions, missing tests, or missing evidence, with file/line references
  when available.

## Boundaries

- Do not overclaim readiness. Built is not live; captured is not delivered;
  backup exists is not restore proven.
- Do not assume stack, runtime, deployment target, or user roles.
- Do not mark work live without deployment and smoke evidence.
- Do not rewrite project instructions or roadmap sources wholesale; propose
  targeted deltas.
