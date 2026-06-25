# Open Relay Brief And Remote Alignment Plan

> For agentic workers: REQUIRED SUB-SKILL: Use
> `superpowers:subagent-driven-development` or `superpowers:executing-plans`
> to implement future multi-step plans. This plan is implemented as a
> governance-only update.

**Goal:** Capture the owner-supplied Open Relay product brief, align the
foundation docs with the GitHub repository, and prepare the branch for a normal
draft PR.

**Architecture:** Update Markdown governance docs only. Preserve the remote
README, license, and `.gitignore`; do not implement the CLI, schema, templates,
or runtime config in this pass.

**Tech Stack:** Markdown and git only. Product runtime remains undecided.

---

## Constraints

- Do not implement product features.
- Do not choose TypeScript or Python yet.
- Keep unknown facts explicit with `Unknown; needs owner decision`.
- Preserve GitHub `main` history and open a normal PR from a branch based on
  `origin/main`.

## Acceptance Criteria

- [x] Product name and purpose are updated to Open Relay.
- [x] README includes the product thesis, MVP direction, and planning links.
- [x] `docs/product/PROJECT_BRIEF.md` captures the owner brief.
- [x] Roadmap points to the smallest useful relay packet as the next slice.
- [x] Active work, status, plan registry, version ledger, and lifecycle matrix
  reflect current product facts.
- [x] Remote `origin` points to `https://github.com/AcrossWorksAPI/open-relay.git`.
- [x] `git diff --check` passes.
- [ ] Branch is pushed.
- [ ] Draft PR is opened.

## Test Plan

- Run `git diff --check`.
- Do not invent package, lint, build, or test commands because no runtime config
  exists yet.

## Smoke Plan

- Confirm the branch is based on `origin/main`.
- Confirm the draft PR targets `main`.
- Confirm docs remain parseable Markdown.
