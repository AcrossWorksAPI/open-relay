# Open Relay Version Ledger

Last updated: 2026-06-26

## Current Version

- Current live version: Unknown; needs owner decision
- Current baseline: Open Relay project brief, governance baseline, first protocol baseline, TypeScript schema-validation CLI baseline, merged JSON-only git-state generator CLI MVP, merged review-request Markdown renderer, merged package/release smoke implementation, merged direct Markdown generation, merged local handoff workflow, and repo-local packet storage planning in progress
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
| Render-template planning | Done | 2026-06-26 | Merge commit `5b03b8d` on `main` | PR #16: `https://github.com/AcrossWorksAPI/open-relay/pull/16` | N/A, docs/planning slice only | `npm run check` with 31 tests, `git diff --check`, placeholder/stale-field scan, and `item.notes` regression scan passed locally; `Governance Checks` passed; Claude re-review reported no remaining findings | Revert merge commit `5b03b8d` if the renderer command shape is rejected. |
| Render-template implementation | Done | 2026-06-26 | Merge commit `c62ea27` on `main` | PR #17: `https://github.com/AcrossWorksAPI/open-relay/pull/17` | N/A, local CLI baseline only | `npm run check` passed with 48 tests, `git diff --check` passed, stdout render smoke passed, output-file render smoke passed, invalid-JSON render leak smoke did not print `SECRET_TOKEN_SHOULD_NOT_APPEAR`, `Governance Checks` passed, and Claude re-review reported no remaining findings; branch added pure renderer, CLI route, parser edge-case tests, package export, sanitized render errors, code-span backtick normalization, acronym provenance labels, and example Markdown snapshot regeneration | Revert merge commit `c62ea27` if renderer output or CLI route is rejected. |
| Package/release smoke planning | Done | 2026-06-26 | Merge commit `709e841` on `main` | PR #19: `https://github.com/AcrossWorksAPI/open-relay/pull/19` | N/A, docs/planning slice only | `npm run check` with 48 tests and `git diff --check` passed locally; Claude review findings addressed by narrowing the planned packlist to `dist/src/` plus `dist/schemas/` and adding automated tarball-content assertions against compiled tests, source tests, planning docs, GitHub config, and Codex config; design source `docs/superpowers/specs/2026-06-26-package-release-smoke-design.md`; implementation source `docs/superpowers/plans/2026-06-26-package-release-smoke.md` | Revert merge commit `709e841` if npm package target or tarball smoke criteria are rejected. |
| Package/release smoke implementation | Done | 2026-06-26 | Merge commit `21c67cb` on `main` | PR #20: `https://github.com/AcrossWorksAPI/open-relay/pull/20` | N/A, local package smoke only; no registry publish | `npm run check` passed with 48 tests; `npm run smoke:pack` built, packed, installed the tarball into a clean temp project, verified installed `open-relay` help/validate/render/generate behavior, asserted the package packlist excludes tests/planning/GitHub/Codex config, and confirmed invalid JSON errors do not leak `SECRET_TOKEN_SHOULD_NOT_APPEAR`; `Governance Checks` passed on PR #20; Claude review reported no remaining findings | Revert merge commit `21c67cb` if package install smoke or packlist behavior is rejected. |
| Direct Markdown generation planning | Done | 2026-06-26 | Merge commit `36f95dc` on `main` | PR #22: `https://github.com/AcrossWorksAPI/open-relay/pull/22` | N/A, docs/planning slice only | Design source `docs/superpowers/specs/2026-06-26-direct-markdown-generation-design.md`; implementation source `docs/superpowers/plans/2026-06-26-direct-markdown-generation.md`; `npm run check`, `npm run smoke:pack`, and `git diff --check` passed locally before PR; `Governance Checks` passed and Claude plan review reported no substantive findings | Revert merge commit `36f95dc` if direct generator Markdown output is rejected. |
| Direct Markdown generation implementation | Done | 2026-06-26 | Merge commit `80501da` on `main` | PR #23: `https://github.com/AcrossWorksAPI/open-relay/pull/23` | N/A, local CLI only; no registry publish | `npm run check` passed with 55 tests; `npm run smoke:pack` built, packed, installed the tarball into a clean temp project, and verified installed CLI direct Markdown generation; `git diff --check` passed; `Governance Checks` passed on PR #23; Claude review reported no findings | Revert merge commit `80501da` if direct Markdown generation behavior is rejected. |
| Local handoff workflow planning | Done | 2026-06-26 | Merge commit `c36dd76` on `main` | PR #25: `https://github.com/AcrossWorksAPI/open-relay/pull/25` | N/A, docs/planning slice only | Design source `docs/superpowers/specs/2026-06-26-handoff-review-request-design.md`; implementation source `docs/superpowers/plans/2026-06-26-handoff-review-request.md`; `npm run check`, `npm run smoke:pack`, and `git diff --check` passed locally before PR; `Governance Checks` passed; Claude review fixes added local-only help wording, `--format=...` rejection coverage, and narrower lifecycle wording | Revert merge commit `c36dd76` if the handoff command shape is rejected. |
| Local handoff workflow implementation | Done | 2026-06-26 | Merge commit `c95f409` on `main` | PR #26: `https://github.com/AcrossWorksAPI/open-relay/pull/26` | N/A, local CLI only; no external agent invocation | `npm run check` passed with 61 tests; `npm run smoke:pack` built, packed, installed the tarball into a clean temp project, and verified installed CLI `handoff review-request`; `git diff --check` passed locally and on merged `main`; `Governance Checks` passed; Claude review reported no findings | Revert merge commit `c95f409` if the handoff route or workflow naming is rejected. |
| Repo-local packet storage planning | In progress | 2026-06-26 | Planning branch `codex/repo-local-packet-storage-planning` | PR pending | N/A, docs/planning slice only | Design source `docs/superpowers/specs/2026-06-26-repo-local-packet-storage-design.md`; implementation source `docs/superpowers/plans/2026-06-26-repo-local-packet-storage.md`; `npm run check`, `npm run smoke:pack`, and `git diff --check` passed locally | Revert the planning branch if repo-local storage or `save review-request` is rejected. |

## Rollback Notes

- Governance docs can be reverted by reverting the baseline commit.
- Protocol docs can be reverted independently because no runtime or persistent
  data model depends on them yet.
- Runtime schema validation can be reverted independently while packet
  generation and release behavior remain unbuilt.
- Git-state generator implementation can be reverted independently from future
  template or release slices because it has no persistent data model.
- Render-template planning can be reverted independently because it does not
  change runtime behavior until an implementation PR merges.
- Render-template implementation can be reverted independently from future
  release or storage slices because it changes only local CLI rendering,
  examples, and tests.
- Package/release smoke planning and implementation can be reverted
  independently because they do not publish packages, tag versions, or change
  packet semantics.
- Direct Markdown generation planning and implementation can be reverted
  independently because they do not change packet schema, package publishing,
  or storage behavior.
- Local handoff workflow implementation can be reverted independently because it
  composes the existing generator and renderer path without schema, storage, or
  publish changes.
- Repo-local packet storage planning can be reverted independently because it
  does not change runtime behavior until an implementation PR merges.
- Product rollback strategy is `Unknown; needs owner decision` because no
  package target, release channel, or persistent data model exists yet.
