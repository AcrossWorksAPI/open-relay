# Open Relay Status

Last updated: 2026-06-26

## Current Baseline

Open Relay has a project foundation governance baseline merged to `main`.
Product purpose and target users are captured from the owner brief. The first
protocol slice now defines a narrow `review-request` packet for Codex-to-Claude
review handoffs. The first runtime direction is approved as a TypeScript CLI on
Node.js with npm. Release/versioning convention is still
`Unknown; needs owner decision`.

## Active Work

| Area | Status | Notes |
| --- | --- | --- |
| Governance baseline | Done | Initial roadmap, status, ledger, plan registry, local skill, and lifecycle docs are created. |
| Product brief | Done | Local-first handoff/review protocol and CLI-first MVP are captured. |
| Open-source hardening | Done | Security, contribution, conduct, issue/PR templates, Dependabot, and first CI workflow are in place. |
| Review-request packet spec | Done | Protocol doc plus synthetic Markdown/JSON examples define the smallest useful review packet. |
| Runtime/schema CLI planning | In progress | TypeScript CLI-first direction is approved; implementation plan is in review. |
| Product implementation | Deferred | No product source or runtime config exists yet. |
| Verification setup | Done | `git diff --check` is local; GitHub Actions `Governance Checks` is required on `main`. |
| PR workflow | Done | PR #1 was merged into `main`; `main` is protected. |

## Latest Smoke And Verification Evidence

| Date | Command or evidence | Result | Notes |
| --- | --- | --- | --- |
| 2026-06-26 | `git diff --check` | Passed | Docs/governance baseline only; no project test command exists yet. |
| 2026-06-26 | PR #1 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/1` |
| 2026-06-26 | PR #2 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/2`; `Governance Checks` passed and is required on `main`. |
| 2026-06-26 | PR #5 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/5`; merge commit `3a23ba1`; Claude re-review reported no remaining findings. |
| 2026-06-26 | Issue #8 owner decision | Approved | TypeScript CLI first, CLI-only MVP, JSON Schema next, MCP deferred. |
| 2026-06-26 | Runtime/schema planning branch checks | Passed | `git diff --check`, trailing-whitespace scan, required-file check, roadmap parser check, placeholder scan, secret-like scan, JSON parse, and example parity check. |

## Next Step

Review and merge the runtime/schema CLI planning PR, then implement the
TypeScript package scaffold, formal JSON Schema, validation command, tests, and
runtime CI.

## Owner Decisions Needed

- Should packet storage live inside each repo, a global user directory, or both?
- How opinionated should Open Relay be about Codex and Claude specifically?
- Should private redaction rules exist from day one?
- What package and release target should be used when the CLI is ready to
  publish?
- Which additional test/build/smoke commands should count as required
  verification after the runtime slice ships?
