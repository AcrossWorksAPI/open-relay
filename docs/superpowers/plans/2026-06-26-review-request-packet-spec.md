# Review Request Packet Spec Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Define the smallest useful `review-request` relay packet and publish reviewable Markdown/JSON examples before implementation starts.

**Architecture:** Add protocol documentation and examples only. Update roadmap/status docs so the next implementation slice can choose a runtime and build a CLI around a reviewed packet shape.

**Tech Stack:** Markdown and JSON only. Runtime remains undecided.

---

## Files

- Create: `docs/protocol/review-request-packet.md`
- Create: `examples/review-request/relay.md`
- Create: `examples/review-request/relay.json`
- Create: `docs/superpowers/specs/2026-06-26-review-request-packet-design.md`
- Create: `docs/superpowers/plans/2026-06-26-review-request-packet-spec.md`
- Modify: `README.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

## Acceptance Criteria

- [x] Packet purpose and review workflow are documented.
- [x] Reviewer repository-access assumption is documented.
- [x] Base commit, head commit, and diff range are documented.
- [x] Required fields are listed with purpose.
- [x] Nested object and array-entry shapes are documented.
- [x] `changed_files` exhaustiveness is defined.
- [x] Markdown and JSON examples carry the same required facts.
- [x] Markdown rendering order is defined.
- [x] JSON top-level shape is documented.
- [x] Synthetic Markdown example exists.
- [x] Synthetic JSON example exists and is valid JSON.
- [x] Local governance checks pass.
- [x] PR is opened and CI passes.
- [x] Claude review is requested after CI passes.

## Test Plan

- Run `git diff --check`.
- Run the local equivalents of `Governance Checks`.
- Parse `examples/review-request/relay.json`.

## Smoke Plan

- Confirm the packet can be read top-to-bottom as a review prompt.
- Confirm the JSON and Markdown examples contain the same core facts.
- Confirm no secrets, private paths, or real repo data appear in examples.
