# Open Relay Version Ledger

Last updated: 2026-06-26

## Current Version

- Current live version: Unknown; needs owner decision
- Current baseline: Open Relay project brief, governance baseline, first protocol baseline, TypeScript schema-validation CLI baseline, and merged JSON-only git-state generator CLI MVP
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
| Smallest useful relay packet | Done | 2026-06-26 | Merge commit `3a23ba1` on `main` | PR #5: `https://github.com/AcrossWorksAPI/open-relay/pull/5` | N/A, docs/protocol slice | `Governance Checks` passed on PR #5; Claude re-review reported no remaining findings | Revert merge commit `3a23ba1` if the reviewed packet shape is rejected. |
| Runtime and schema CLI planning | Done | 2026-06-26 | Merge commit `5c87d46` on `main` | PR #9: `https://github.com/AcrossWorksAPI/open-relay/pull/9` | N/A, docs/planning slice | Local governance checks passed; `Governance Checks` passed on PR #9; Claude plan review received via owner handoff with low findings addressed | Revert merge commit `5c87d46` if the TypeScript CLI-first direction changes. |
| Runtime/schema validation CLI implementation | Done | 2026-06-26 | Merge commit `6f6f25e` on `main` | PR #11: `https://github.com/AcrossWorksAPI/open-relay/pull/11` | N/A, local CLI baseline only | `npm ci`, `npm run check` with 8 tests, `git diff --check`, `node dist/src/cli.js validate examples/review-request/relay.json`, package entrypoint smoke, and invalid-JSON leak smoke passed locally on 2026-06-26; `Governance Checks` passed on PR #11; Claude re-review reported no remaining findings | Revert merge commit `6f6f25e` if the validator or CLI direction is rejected. |
| Git-state generator planning | Done | 2026-06-26 | Merge commit `cd1462c` on `main` | PR #13: `https://github.com/AcrossWorksAPI/open-relay/pull/13` | N/A, docs/planning slice only | `npm run check`, `git diff --check`, placeholder scan, and secret-pattern scan passed locally on 2026-06-26; `Governance Checks` passed on PR #13; Claude plan review findings addressed for redaction semantics, typed snippets, explicit diff semantics, and NUL-delimited name-status handling | Revert merge commit `cd1462c` if the generator command shape or redaction defaults are rejected. |
| Git-state generator implementation | Done | 2026-06-26 | Merge commit `fd0960c` on `main` | PR #14: `https://github.com/AcrossWorksAPI/open-relay/pull/14` | N/A, local CLI MVP only | `npm ci`, `npm run check` with 31 tests, `git diff --check`, generated packet smoke to `/private/tmp/open-relay-review-request.json`, generated packet validation, unknown/duplicate flag rejection, invalid-ref and output-path leak regressions, sanitized success output, NUL-delimited name-status parsing, precise remote-redaction reasons, and local-path/secret-pattern smoke scan passed; `Governance Checks` passed on PR #14; final merged-main smoke and packet leak scan passed | Revert merge commit `fd0960c` if generated packet behavior or redaction defaults are rejected. |

## Rollback Notes

- Governance docs can be reverted by reverting the baseline commit.
- Protocol docs can be reverted independently because no runtime or persistent
  data model depends on them yet.
- Runtime schema validation can be reverted independently while packet
  generation and release behavior remain unbuilt.
- Git-state generator implementation can be reverted independently from future
  template or release slices because it has no persistent data model.
- Product rollback strategy is `Unknown; needs owner decision` because no
  package target, release channel, or persistent data model exists yet.
