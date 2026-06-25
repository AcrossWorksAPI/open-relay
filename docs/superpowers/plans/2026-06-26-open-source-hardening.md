# Open Source Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add public open-source safety, contribution, issue, PR, dependency, and CI guardrails before product implementation begins.

**Architecture:** Add standard GitHub community files and a dependency-free GitHub Actions workflow. Keep the workflow conservative because Open Relay has no runtime or package manager yet. Update planning docs and branch protection after the workflow proves itself on `main`.

**Tech Stack:** Markdown, GitHub issue forms, Dependabot YAML, and GitHub Actions shell checks.

---

## Files

- Create: `SECURITY.md`
- Create: `CONTRIBUTING.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `.github/PULL_REQUEST_TEMPLATE.md`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/ISSUE_TEMPLATE/question.yml`
- Create: `.github/ISSUE_TEMPLATE/config.yml`
- Create: `.github/dependabot.yml`
- Create: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`

## Acceptance Criteria

- [x] Security policy exists and points to private vulnerability reporting.
- [x] Contribution guide defines current checks and Claude review timing.
- [x] Code of conduct exists.
- [x] Issue and PR templates exist.
- [x] Dependabot config covers GitHub Actions.
- [x] CI workflow runs without package/runtime dependencies.
- [x] `git diff --check` passes locally.
- [ ] CI passes on the PR.
- [ ] PR is merged to `main`.
- [ ] Local `main` is pulled and pruned.
- [ ] The CI check is required on `main` branch protection.

## Test Plan

- Run `git diff --check`.
- Run the workflow shell checks locally where practical.
- Push the PR and verify GitHub Actions passes.

## Smoke Plan

- Confirm PR template and issue templates render in GitHub.
- Confirm Dependabot recognizes GitHub Actions updates.
- Confirm `main` branch protection requires the new CI check only after the
  workflow exists on `main`.
