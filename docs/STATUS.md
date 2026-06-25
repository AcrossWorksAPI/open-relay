# Open Relay Status

Last updated: 2026-06-26

## Current Baseline

Open Relay has a project foundation governance baseline merged to `main`.
Product purpose and target users are captured from the owner brief. The first
protocol slice now defines a narrow `review-request` packet for Codex-to-Claude
review handoffs. Runtime, package manager, and release/versioning convention are
still `Unknown; needs owner decision`.

## Active Work

| Area | Status | Notes |
| --- | --- | --- |
| Governance baseline | Done | Initial roadmap, status, ledger, plan registry, local skill, and lifecycle docs are created. |
| Product brief | Done | Local-first handoff/review protocol and CLI-first MVP are captured. |
| Open-source hardening | Done | Security, contribution, conduct, issue/PR templates, Dependabot, and first CI workflow are in place. |
| Review-request packet spec | In progress | Protocol doc plus synthetic Markdown/JSON examples define the smallest useful review packet. |
| Product implementation | Deferred | No product source or owner-approved first implementation slice exists yet. |
| Verification setup | Done | `git diff --check` is local; GitHub Actions `Governance Checks` is required on `main`. |
| PR workflow | Done | PR #1 was merged into `main`; `main` is protected. |

## Latest Smoke And Verification Evidence

| Date | Command or evidence | Result | Notes |
| --- | --- | --- | --- |
| 2026-06-26 | `git diff --check` | Passed | Docs/governance baseline only; no project test command exists yet. |
| 2026-06-26 | PR #1 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/1` |
| 2026-06-26 | PR #2 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/2`; `Governance Checks` passed and is required on `main`. |
| 2026-06-26 | Review-request packet branch | In progress | `codex/review-request-packet-spec`; local governance checks and PR CI required before review. |

## Next Step

Open a PR for the `review-request` packet spec, wait for `Governance Checks`,
ask Claude to review the packet shape, then choose the first implementation
runtime.

## Owner Decisions Needed

- Is the proposed `review-request` packet enough for the first release slice?
- Should the first implementation be TypeScript or Python?
- Should Open Relay start as CLI only, or CLI plus MCP server?
- Should packet storage live inside each repo, a global user directory, or both?
- How opinionated should Open Relay be about Codex and Claude specifically?
- Should private redaction rules exist from day one?
- What test/build/smoke commands should count as required verification?
