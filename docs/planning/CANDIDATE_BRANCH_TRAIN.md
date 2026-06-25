# Candidate Branch Train

Last updated: 2026-06-26

Use this workflow when turning candidates into implementation branches.

## Rules

- Use one candidate per branch and PR.
- Branch from the latest accepted baseline unless a dependency requires an
  ordered stack.
- Name branches `codex/<candidate-or-slice-slug>`.
- Review dependency branches from earliest dependency to latest.
- Merge only after review, verification, and closeout docs are complete.
- Do not mark anything `Live` before deploy and smoke evidence exists.
- Closeout PR updates roadmap, active work, plan registry, version ledger,
  status, and lifecycle/scope matrix.

## Dependency-Aware Ordering

| Order | Branch type | Depends on | Merge gate |
| --- | --- | --- | --- |
| 1 | Foundation/governance | - | `git diff --check`, local commit |
| 2 | Runtime/verification discovery | Foundation/governance | Owner confirms project purpose or stack evidence appears |
| 3 | First product slice | Runtime/verification discovery | Tests/smoke command exists and passes |
| 4 | Platform capability candidate | Relevant product/runtime surface | Candidate review packet and lifecycle matrix complete |

## Closeout Checklist

- Roadmap status updated.
- Active work current direction updated.
- Plan registry classifies the plan.
- Version ledger records commit, PR, deploy, and smoke evidence where
  applicable.
- Lifecycle matrix updated.
- Draft PR description includes verification and owner decisions needed.
