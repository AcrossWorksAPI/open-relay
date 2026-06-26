# Open Relay Status

Last updated: 2026-06-26

## Current Baseline

Open Relay has a project foundation governance baseline merged to `main`.
Product purpose and target users are captured from the owner brief. The first
protocol slice now defines a narrow `review-request` packet for Codex-to-Claude
review handoffs. The first runtime direction is approved as a TypeScript CLI on
Node.js with npm, and the first validation CLI slice is merged to `main`.
Release/versioning convention is still `Unknown; needs owner decision`.

## Active Work

| Area | Status | Notes |
| --- | --- | --- |
| Governance baseline | Done | Initial roadmap, status, ledger, plan registry, local skill, and lifecycle docs are created. |
| Product brief | Done | Local-first handoff/review protocol and CLI-first MVP are captured. |
| Open-source hardening | Done | Security, contribution, conduct, issue/PR templates, Dependabot, and first CI workflow are in place. |
| Review-request packet spec | Done | Protocol doc plus synthetic Markdown/JSON examples define the smallest useful review packet. |
| Runtime/schema CLI planning | Done | PR #9 merged the TypeScript CLI-first design and implementation plan. |
| Runtime/schema validation CLI | Done | PR #11 merged TypeScript package config, JSON Schema, reusable validator, `open-relay validate`, tests, and runtime CI. |
| Git-state generator planning | In progress | Design and implementation plan define JSON-first packet generation, explicit output/stdout storage, and fail-closed redaction defaults. |
| Product implementation | In progress | The validation slice is merged; packet generation from live git state is planned but not implemented. |
| Verification setup | Done | `git diff --check`, `npm ci`, `npm run build`, `npm test`, and `npm run check` are local; GitHub Actions `Governance Checks` includes runtime checks. |
| PR workflow | Done | PR #1 was merged into `main`; `main` is protected. |

## Latest Smoke And Verification Evidence

| Date | Command or evidence | Result | Notes |
| --- | --- | --- | --- |
| 2026-06-26 | `git diff --check` | Passed | Initial docs/governance baseline before runtime source existed. |
| 2026-06-26 | PR #1 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/1` |
| 2026-06-26 | PR #2 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/2`; `Governance Checks` passed and is required on `main`. |
| 2026-06-26 | PR #5 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/5`; merge commit `3a23ba1`; Claude re-review reported no remaining findings. |
| 2026-06-26 | Issue #8 owner decision | Approved | TypeScript CLI first, CLI-only MVP, JSON Schema next, MCP deferred. |
| 2026-06-26 | Runtime/schema planning branch checks | Passed | `git diff --check`, trailing-whitespace scan, required-file check, roadmap parser check, placeholder scan, secret-like scan, JSON parse, and example parity check. |
| 2026-06-26 | Claude plan review for PR #9 | Low findings addressed | Review verified schema/example parity and task sequencing; follow-up commit tightens timestamp validation and fixes source-plan attribution. |
| 2026-06-26 | PR #9 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/9`; merge commit `5c87d46`; issue #8 auto-closed. |
| 2026-06-26 | Runtime/schema validation branch checks | Passed | PR #11: `https://github.com/AcrossWorksAPI/open-relay/pull/11`; `npm ci`, `npm run check` with 8 tests, `git diff --check`, and `node dist/src/cli.js validate examples/review-request/relay.json` passed locally. |
| 2026-06-26 | Claude review for PR #11 | Findings addressed | Commit `9c9083b` fixed invalid-JSON parser-message leakage, package entrypoints, Node 22 typings, and lifecycle matrix status wording. |
| 2026-06-26 | PR #11 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/11`; merge commit `6f6f25e`; `Governance Checks` passed and Claude re-review reported no remaining findings. |
| 2026-06-26 | Git-state generator planning branch checks | Passed | `npm run check`, `git diff --check`, placeholder scan, and secret-pattern scan passed locally. |

## Next Step

Review the git-state generator planning PR, then implement
`open-relay generate review-request` after the plan is accepted.

## Owner Decisions Needed

- Should permanent packet storage live inside each repo, a global user
  directory, or both? The generator plan avoids this by using stdout or an
  explicit `--output` path.
- How opinionated should Open Relay be about Codex and Claude specifically?
- Should private redaction rule files exist from day one? The generator plan
  starts with fixed fail-closed redaction defaults.
- What package and release target should be used when the CLI is ready to
  publish?
- What release smoke evidence should be required before the CLI is called live?
