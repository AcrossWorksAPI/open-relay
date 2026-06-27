# Open Relay Status

Last updated: 2026-06-27

## Current Baseline

Open Relay has a project foundation governance baseline merged to `main`.
Product purpose and target users are captured from the owner brief. The first
protocol slice now defines a narrow `review-request` packet for Codex-to-Claude
review handoffs. The first runtime direction is approved as a TypeScript CLI on
Node.js with npm, the validation CLI is merged, and the first JSON-only
git-state review-request generator is merged to `main`. Release/versioning
convention is still `Unknown; needs owner decision`. The neutral
`review-request` JSON-to-Markdown renderer is merged for Codex, Claude, or
another reviewer without introducing agent-specific prompt dialects yet. npm
package metadata, an allowlisted package packlist, and local tarball install
smoke are merged as the release-readiness gate before publishing. Direct
Markdown generation is merged so the generator can emit review-ready Markdown
without a separate render step. Local `handoff review-request` is merged as a
Markdown-first workflow command that composes the existing generator and
renderer path. Repo-local packet storage is merged. Protocol envelope dispatch
is merged, so new packet types can now be introduced through schema and
renderer registry entries. npm registry publishing, global packet storage,
external agent invocation, and private redaction rules remain deferred. The
next protocol slice is the first `review-response` packet type.

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
| Render-template planning | Done | PR #16 merged the renderer-first design and implementation plan for `open-relay render review-request <packet.json> [--output <relay.md>]`. |
| Render-template implementation | Done | PR #17 merged the pure Markdown renderer, CLI route, package export, regenerated example Markdown snapshot, strict parser tests, escaping tests, and render behavior tests. |
| Package/release smoke planning | Done | PR #19 merged the npm package target, packlist, tarball install smoke, CI guardrail, and release-readiness closeout plan. |
| Package/release smoke implementation | Done | PR #20 merged `private: true` package metadata, `files` allowlist, `prepack`, `npm run smoke:pack`, tarball-content assertions, installed CLI validate/render/generate smokes, and CI execution. |
| Direct Markdown generation planning | Done | PR #22 merged the design and implementation plan for `generate review-request --format markdown` while keeping JSON as the default and reusing the existing renderer. |
| Direct Markdown generation implementation | Done | PR #23 merged `--format json|markdown`, direct Markdown stdout/file output, parser and CLI regressions, and installed-package smoke coverage. |
| Local handoff workflow planning | Done | PR #25 merged the design and implementation plan for `handoff review-request` as a Markdown-first local workflow command that reuses the existing generator and renderer path. |
| Local handoff workflow implementation | Done | PR #26 merged `handoff review-request`, local-only help text, CLI regressions, parity with direct Markdown generation, sanitized write-error behavior, and installed-package smoke coverage. |
| Repo-local packet storage implementation | Done | PR #29 merged explicit `save review-request` repo-local bundle storage under `.open-relay/review-requests`. |
| Protocol envelope planning | Done | PR #30 merged the multi-type/version dispatch design and implementation plan before review-response, implementation-handoff, resume, or future packet versions. |
| Protocol envelope implementation | Done | PR #31 merged schema registry dispatch, renderer dispatch, unsupported-combination errors, package export, and second-type registry proof tests. |
| Review-response packet planning | In progress | Branch `codex/review-response-packet-spec` defines `review-response` 0.1 as the first consumer of the protocol envelope, carries forward the validate-message follow-up, and introduces generic packet rendering for the second packet type. |
| Product implementation | In progress | Validation, JSON packet generation, Markdown rendering, package install smoke, direct generator Markdown output, local handoff workflow, repo-local packet storage, and protocol envelope dispatch are merged; review-response implementation, implementation-handoff, resume-project, agent-ready prompts, diff-summary capture, test-evidence capture, registry publishing, private redaction rules, global storage, list/read/delete/archive commands, and external orchestration remain unbuilt. |
| Verification setup | Done | `git diff --check`, `npm ci`, `npm run build`, `npm test`, `npm run check`, and `npm run smoke:pack` are local; GitHub Actions `Governance Checks` includes runtime and package smoke checks. |
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
| 2026-06-26 | Render-template planning branch | Merged | Design source `docs/superpowers/specs/2026-06-26-render-review-request-design.md`; implementation source `docs/superpowers/plans/2026-06-26-render-review-request.md`; PR #16 merged after CI and Claude review. |
| 2026-06-26 | Claude review for PR #16 | Findings addressed | Corrected the plan's verification-field model from `notes` to schema-valid `evidence`, added example Markdown snapshot parity, added inline/list newline-normalization requirements, and recorded prompt-injection risk for packet-authored free text; `npm run check`, `git diff --check`, and targeted stale-field scan passed locally. |
| 2026-06-26 | PR #16 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/16`; merge commit `5b03b8d`; `Governance Checks` passed and Claude re-review reported no remaining findings. |
| 2026-06-26 | Render-template implementation branch checks | Passed | `npm run check` passed with 48 tests, `git diff --check` passed, stdout render smoke passed, output-file render smoke passed, and invalid-JSON render leak smoke did not print `SECRET_TOKEN_SHOULD_NOT_APPEAR`. |
| 2026-06-26 | PR #17 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/17`; merge commit `c62ea27`; `Governance Checks` passed, Claude re-review reported no remaining findings, merged-main `npm run check` passed with 48 tests, `git diff --check` passed, stdout/output-file render smokes passed, and invalid-JSON render leak smoke passed. |
| 2026-06-26 | Package/release smoke planning branch | Merged | Design source `docs/superpowers/specs/2026-06-26-package-release-smoke-design.md`; implementation source `docs/superpowers/plans/2026-06-26-package-release-smoke.md`; local `npm run check` and `git diff --check` passed before PR. |
| 2026-06-26 | Claude review for PR #19 | Findings addressed | Tightened the planned package `files` allowlist from all `dist/` to `dist/src/` plus `dist/schemas/` so compiled tests are excluded, and added `npm pack --json` tarball-content assertions to fail on `dist/tests/`, source tests, planning docs, GitHub config, or Codex config. |
| 2026-06-26 | PR #19 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/19`; package/release smoke planning merged to `main`. |
| 2026-06-26 | Package/release smoke implementation branch checks | Passed | `npm run check` passed with 48 tests; `npm run smoke:pack` built, packed, installed the tarball into a clean temp project, verified installed `open-relay` help/validate/render/generate behavior, asserted the package packlist excludes tests/planning/GitHub/Codex config, and confirmed invalid JSON errors do not leak `SECRET_TOKEN_SHOULD_NOT_APPEAR`. |
| 2026-06-26 | PR #20 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/20`; merge commit `21c67cb`; `Governance Checks` passed, Claude review reported no remaining findings, and package/release smoke implementation merged without registry publish or live release claim. |
| 2026-06-26 | Direct Markdown generation planning branch | Merged | Design source `docs/superpowers/specs/2026-06-26-direct-markdown-generation-design.md`; implementation source `docs/superpowers/plans/2026-06-26-direct-markdown-generation.md`; `npm run check`, `npm run smoke:pack`, and `git diff --check` passed locally before PR. |
| 2026-06-26 | PR #22 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/22`; merge commit `36f95dc`; `Governance Checks` passed and Claude plan review reported no substantive findings. |
| 2026-06-26 | Direct Markdown generation implementation branch checks | Passed | `npm run check` passed with 55 tests; `npm run smoke:pack` built, packed, installed the tarball into a clean temp project, and verified installed CLI direct Markdown generation; `git diff --check` passed. |
| 2026-06-26 | PR #23 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/23`; merge commit `80501da`; `Governance Checks` passed, Claude review reported no findings, and direct Markdown generation merged without agent-specific templates, storage, publish, or live-release claims. |
| 2026-06-26 | PR #25 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/25`; merge commit `c36dd76`; design source `docs/superpowers/specs/2026-06-26-handoff-review-request-design.md`; implementation source `docs/superpowers/plans/2026-06-26-handoff-review-request.md`; `Governance Checks` passed after review fixes. |
| 2026-06-26 | Claude review fixes for PR #25 | Passed | Added visible local-only help wording, tightened planned `--format` rejection to include `--format=...`, narrowed lifecycle wording to local request creation, and re-ran `npm run check`, `npm run smoke:pack`, and `git diff --check`. |
| 2026-06-26 | PR #26 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/26`; merge commit `c95f409`; `Governance Checks` passed, Claude review reported no findings, merged-main `npm run check` passed with 61 tests, `npm run smoke:pack` verified installed CLI `handoff review-request`, and `git diff --check` passed. |
| 2026-06-27 | PR #28 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/28`; merge commit `bdefbb8`; `Governance Checks` passed, Claude re-review reported no remaining findings, and repo-local packet storage planning merged. |
| 2026-06-27 | PR #29 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/29`; merge commit `87f0bb7`; `Governance Checks` passed; branch `npm run check` passed with 69 tests, `npm run smoke:pack` verified installed CLI save behavior, and `git diff --check` passed. |
| 2026-06-27 | Review-loop roadmap re-anchor | Merged | PR #30: `https://github.com/AcrossWorksAPI/open-relay/pull/30`; merge commit `7f79246`; added protocol envelope design and implementation plan, restored roadmap slices for boundary/transport, packet evidence enrichment, review-response, implementation-handoff, resume-project, and agent-ready prompts, and addressed Claude review feedback by limiting the shared header to dispatch keys plus adding supported combinations to unsupported-type errors; `Governance Checks` passed and Claude re-review reported merge-ready. |
| 2026-06-27 | Protocol envelope implementation branch checks | Passed | PR #31: `https://github.com/AcrossWorksAPI/open-relay/pull/31`; `npm run check` passed with 77 tests, `npm run smoke:pack` passed, and `git diff --check` passed locally. |
| 2026-06-27 | PR #31 | Merged | `https://github.com/AcrossWorksAPI/open-relay/pull/31`; merge commit `5c3b739`; `Governance Checks` passed, Claude handoff review reported merge-ready with one low command-message follow-up for the review-response slice, and fresh local `npm run check` passed with 77 tests before merge. |
| 2026-06-27 | Review-response packet spec branch checks | Passed | PR #33: `https://github.com/AcrossWorksAPI/open-relay/pull/33`; `npm run check` passed with 77 tests and `git diff --check` passed locally. Independent Claude plan was compared against the branch spec; the branch adopted top-level `verification` reuse and generic `render <packet.json>` while keeping the `outcome`/`confidence` decision model. Claude's follow-up also led to an explicit Markdown requirement to surface `confidence` next to the outcome. |

## Next Step

Open the `review-response` packet spec PR, wait for CI and Claude review, then
write the implementation plan after the spec is approved.

## Owner Decisions Needed

- Should global user packet storage be added in addition to repo-local
  `.open-relay/review-requests` storage?
- How opinionated should Open Relay be about Codex and Claude specifically?
  The current renderer plan keeps the first template agent-neutral and defers
  agent-specific prompt dialects.
- Which first transport boundary should move packets between agents: committed
  file, clipboard, MCP tool, PR comment, or another local mechanism?
- Should private redaction rule files exist from day one? The generator plan
  starts with fixed fail-closed redaction defaults.
- What npm account or organization should own the eventual first publish?
- What first published version should be used when the CLI is ready to release?
