# Open Relay Status

Last updated: 2026-06-26

## Current Baseline

Open Relay has a project foundation governance baseline merged to `main`.
Product purpose and target users are captured from the owner brief. Runtime,
package manager, and release/versioning convention are still `Unknown; needs
owner decision`.

## Active Work

| Area | Status | Notes |
| --- | --- | --- |
| Governance baseline | Done | Initial roadmap, status, ledger, plan registry, local skill, and lifecycle docs are created. |
| Product brief | Done | Local-first handoff/review protocol and CLI-first MVP are captured. |
| Open-source hardening | In progress | Security, contribution, conduct, issue/PR templates, Dependabot, and first CI workflow are being added. |
| Product implementation | Deferred | No product source or owner-approved first implementation slice exists yet. |
| Verification setup | In progress | `git diff --check` is local; GitHub Actions CI is being added. |
| PR workflow | Done | PR #1 was merged into `main`; `main` is protected. |

## Latest Smoke And Verification Evidence

| Date | Command or evidence | Result | Notes |
| --- | --- | --- | --- |
| 2026-06-26 | `git diff --check` | Passed | Docs/governance baseline only; no project test command exists yet. |
| 2026-06-26 | PR #1 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/1` |

## Next Step

Finish the open-source hardening PR, require the CI check on `main`, then define
the smallest useful relay packet and choose the first implementation runtime.

## Owner Decisions Needed

- What is the smallest useful relay packet for the first release?
- Should the first implementation be TypeScript or Python?
- Should Open Relay start as CLI only, or CLI plus MCP server?
- Should packet storage live inside each repo, a global user directory, or both?
- How opinionated should Open Relay be about Codex and Claude specifically?
- Should private redaction rules exist from day one?
- What test/build/smoke commands should count as required verification?
