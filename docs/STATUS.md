# Open Relay Status

Last updated: 2026-06-26

## Current Baseline

Open Relay has a project foundation governance baseline on branch
`codex/project-foundation-baseline`. Product purpose and target users are now
captured from the owner brief. Runtime, package manager, test command, and
release/versioning convention are still `Unknown; needs owner decision`.

## Active Work

| Area | Status | Notes |
| --- | --- | --- |
| Governance baseline | Done | Initial roadmap, status, ledger, plan registry, local skill, and lifecycle docs are created. |
| Product brief | Done | Local-first handoff/review protocol and CLI-first MVP are captured. |
| Product implementation | Deferred | No product source or owner-approved first implementation slice exists yet. |
| Verification setup | Planned | Only `git diff --check` is currently known. |
| PR workflow | In progress | Remote `origin` points to `https://github.com/AcrossWorksAPI/open-relay.git`; branch push and draft PR are next. |

## Latest Smoke And Verification Evidence

| Date | Command or evidence | Result | Notes |
| --- | --- | --- | --- |
| 2026-06-26 | `git diff --check` | Passed | Docs/governance baseline only; no project test command exists yet. |

## Next Step

Define the smallest useful relay packet, then choose the first implementation
runtime and verification command.

## Owner Decisions Needed

- What is the smallest useful relay packet for the first release?
- Should the first implementation be TypeScript or Python?
- Should Open Relay start as CLI only, or CLI plus MCP server?
- Should packet storage live inside each repo, a global user directory, or both?
- How opinionated should Open Relay be about Codex and Claude specifically?
- Should private redaction rules exist from day one?
- What test/build/smoke commands should count as required verification?
