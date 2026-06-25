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
| Project foundation governance baseline | Done | 2026-06-26 | Merge commit `3f19fa2` on `main` | PR #1: `https://github.com/AcrossWorksAPI/open-relay/pull/1` | N/A, docs-only baseline | Passed `git diff --check` on 2026-06-26 | Revert the baseline merge commit if owner rejects the workflow. |
| Open Relay brief and remote alignment | Done | 2026-06-26 | Merge commit `3f19fa2` on `main` | PR #1: `https://github.com/AcrossWorksAPI/open-relay/pull/1` | N/A, docs-only baseline | Passed `git diff --cached --check` on 2026-06-26 | Revert the docs update commit if owner changes product direction. |
| Open-source hardening and first CI | Done | 2026-06-26 | Merge commit `f05c61b` on `main` | PR #2: `https://github.com/AcrossWorksAPI/open-relay/pull/2` | N/A, docs/config baseline | `Governance Checks` passed on PR #2 and is required on `main` | Revert hardening merge commit if it blocks contribution flow unexpectedly. |
| Smallest useful relay packet | Planned | Unknown; needs owner decision | - | - | - | - | Unknown; needs owner decision |

## Rollback Notes

- Governance docs can be reverted by reverting the baseline commit.
- Product rollback strategy is `Unknown; needs owner decision` because no
  runtime, package target, or persistent data model exists yet.
