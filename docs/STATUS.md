# Open Relay Status

Last updated: 2026-06-26

## Current Baseline

Open Relay has a project foundation governance baseline merged to `main`.
Product purpose and target users are captured from the owner brief. The first
protocol slice now defines a narrow `review-request` packet for Codex-to-Claude
review handoffs. The first runtime direction is approved as a TypeScript CLI on
Node.js with npm, the validation CLI is merged, and the first JSON-only
git-state review-request generator is merged to `main`. Release/versioning
convention is still `Unknown; needs owner decision`. The next slice is now
planned: a neutral `review-request` JSON-to-Markdown renderer that can serve
Codex, Claude, or another reviewer without introducing agent-specific prompt
dialects yet.

## Active Work

| Area | Status | Notes |
| --- | --- | --- |
| Governance baseline | Done | Initial roadmap, status, ledger, plan registry, local skill, and lifecycle docs are created. |
| Product brief | Done | Local-first handoff/review protocol and CLI-first MVP are captured. |
| Open-source hardening | Done | Security, contribution, conduct, issue/PR templates, Dependabot, and first CI workflow are in place. |
| Review-request packet spec | Done | Protocol doc plus synthetic Markdown/JSON examples define the smallest useful review packet. |
| Runtime/schema CLI planning | Done | PR #9 merged the TypeScript CLI-first design and implementation plan. |
| Runtime/schema validation CLI | Done | PR #11 merged TypeScript package config, JSON Schema, reusable validator, `open-relay validate`, tests, and runtime CI. |
| Git-state generator planning | Done | PR #13 merged the JSON-first packet generation design, explicit output/stdout storage choice, and fail-closed redaction defaults. |
| Git-state generator implementation | Done | PR #14 merged argument parsing, typo/unknown/duplicate flag rejection, sanitized git/write errors and output messages, git context collection, redaction, packet assembly, and the `generate review-request` CLI route. |
| Render-template planning | In progress | Design and implementation plan now define `open-relay render review-request <packet.json> [--output <relay.md>]` as the next renderer-first slice. |
| Product implementation | In progress | Validation and JSON-only packet generation are merged; Markdown rendering is planned next; direct generator Markdown output, agent-specific prompt dialects, package publishing, and release smoke remain unbuilt. |
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
| 2026-06-26 | Git-state generator planning branch checks | Passed | PR #13: `https://github.com/AcrossWorksAPI/open-relay/pull/13`; `npm run check`, `git diff --check`, placeholder scan, and secret-pattern scan passed locally; `Governance Checks` passed. |
| 2026-06-26 | Claude plan review for PR #13 | Findings addressed | Tightened redaction semantics, typed embedded builder snippets, redaction test expectations, remote-redaction reasons, explicit two-dot diff decision, NUL-delimited name-status parsing, and parser limitation notes. |
| 2026-06-26 | Git-state generator implementation branch checks | Passed | PR #14 branch: `https://github.com/AcrossWorksAPI/open-relay/pull/14`; local `npm ci`, `npm run check` with 31 tests, `git diff --check`, generated packet smoke to `/private/tmp/open-relay-review-request.json`, generated packet validation, unknown/duplicate flag rejection, invalid-ref and output-path leak regressions, sanitized success output, NUL-delimited name-status parsing, precise remote-redaction reasons, and local-path/secret-pattern smoke scan passed; `Governance Checks` passed before merge. |
| 2026-06-26 | PR #13 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/13`; merge commit `cd1462c`; `Governance Checks` passed. |
| 2026-06-26 | PR #14 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/14`; merge commit `fd0960c`; final merged-main `npm run check` passed with 31 tests, `git diff --check` passed, generated packet smoke and validation passed, and packet leak scan found no local paths or secret-shaped strings. |
| 2026-06-26 | Render-template planning branch | In progress | Design source `docs/superpowers/specs/2026-06-26-render-review-request-design.md`; implementation source `docs/superpowers/plans/2026-06-26-render-review-request.md`; local verification pending before PR. |
| 2026-06-26 | Claude review for PR #16 | Findings addressed | Corrected the plan's verification-field model from `notes` to schema-valid `evidence`, added example Markdown snapshot parity, added inline/list newline-normalization requirements, and recorded prompt-injection risk for packet-authored free text; `npm run check`, `git diff --check`, and targeted stale-field scan passed locally. |

## Next Step

Open the render-template planning PR, then implement the renderer in a stacked
or follow-on implementation PR after planning review is green.

## Owner Decisions Needed

- Should permanent packet storage live inside each repo, a global user
  directory, or both? The generator plan avoids this by using stdout or an
  explicit `--output` path.
- How opinionated should Open Relay be about Codex and Claude specifically?
  The current renderer plan keeps the first template agent-neutral and defers
  agent-specific prompt dialects.
- Should private redaction rule files exist from day one? The generator plan
  starts with fixed fail-closed redaction defaults.
- What package and release target should be used when the CLI is ready to
  publish?
- What release smoke evidence should be required before the CLI is called live?
