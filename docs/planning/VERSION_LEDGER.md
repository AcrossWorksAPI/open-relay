# Open Relay Version Ledger

Last updated: 2026-06-26

## Current Version

- Current live version: Unknown; needs owner decision
- Current baseline: Open Relay project brief and governance baseline
- Release/versioning convention: Unknown; needs owner decision

## Live Evidence Rule

Do not mark any version or slice `Live` without commit, PR, deploy, and smoke
evidence appropriate to the project. Built is not live; deployed is not smoked;
captured is not alert delivered.

## Version History

| Version or baseline | Status | Date | Commit evidence | PR evidence | Deploy/live evidence | Smoke evidence | Rollback notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Remote repository initial README | Done | 2026-06-26 | `38a9601` on `origin/main` | N/A | N/A, docs-only initial repo | N/A | Revert or amend README from GitHub main if needed. |
| Project foundation governance baseline | Done | 2026-06-26 | Branch `codex/project-foundation-baseline` | Draft PR pending | N/A, docs-only baseline | Passed `git diff --check` on 2026-06-26 | Revert the baseline commit if owner rejects the workflow. |
| Open Relay brief and remote alignment | Done | 2026-06-26 | Branch `codex/project-foundation-baseline` | Draft PR pending | N/A, docs-only baseline | Passed `git diff --cached --check` on 2026-06-26 | Revert the docs update commit if owner changes product direction. |
| Smallest useful relay packet | Planned | Unknown; needs owner decision | - | - | - | - | Unknown; needs owner decision |

## Rollback Notes

- Governance docs can be reverted by reverting the baseline commit.
- Product rollback strategy is `Unknown; needs owner decision` because no
  runtime, package target, or persistent data model exists yet.
