# Open Relay Roadmap

- Project name: Open Relay
- Status: Product brief, governance baseline, and review-request protocol draft
- Last updated: 2026-06-26
- Current live version: Unknown; needs owner decision
- Current baseline: Open Relay project brief, governance baseline, and first protocol draft

## Project Purpose

Open Relay is an open-source, local-first handoff and review protocol for
moving structured project context between AI coding agents, humans, and project
workspaces without repetitive copy/paste. The MVP direction is a local CLI plus
Markdown/JSON relay packet schema, not a SaaS app.

## Versioned Slices

| Version | Slice | Status | Priority | Client gate | Depends on | Plan |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline | Project foundation governance baseline | Done | P0 | No | - | docs/superpowers/plans/2026-06-26-project-foundation-baseline.md |
| Baseline | Open Relay brief and remote alignment | Done | P0 | No | Project foundation governance baseline | docs/superpowers/plans/2026-06-26-open-relay-brief-and-remote.md |
| Baseline | Open-source hardening and first CI | Done | P0 | No | Open Relay brief and remote alignment | docs/superpowers/plans/2026-06-26-open-source-hardening.md |
| Unversioned | Smallest useful relay packet definition | In progress | P0 | Required | Open Relay brief and remote alignment | docs/superpowers/plans/2026-06-26-review-request-packet-spec.md |
| Unversioned | Runtime and verification selection | Planned | P0 | Required | Smallest useful relay packet definition | - |
| Unversioned | Review-request packet CLI MVP | Candidate | P1 | Candidate | Runtime and verification selection | - |
| Unversioned | Codex and Claude render templates | Candidate | P1 | Candidate | Review-request packet CLI MVP | - |

## Candidate Scope

| Lane | Candidate | Proposed insertion | Status | Trigger | Source plan |
| --- | --- | --- | --- | --- | --- |
| Protocol | Minimal relay packet fields | Before CLI implementation | Candidate | Review-request packet PR passes CI and review | docs/superpowers/plans/2026-06-26-review-request-packet-spec.md |
| Runtime | TypeScript or Python CLI runtime | Before implementation | Candidate | Review-request packet shape is accepted | - |
| Templates | Codex/Claude review prompt templates | Alongside CLI MVP | Candidate | First packet spec survives review | - |
| Security | Local redaction and provenance rules | Before packets include sensitive data | Candidate | Packet schema includes repo diffs, logs, or notes | - |
| Release | Branch, PR, package, and smoke workflow | Before live claims | Candidate | Runtime/package target selected | - |

## Update Rules

- This roadmap is commit-updated and must remain parseable Markdown.
- Status values must be one of: `Live`, `Done`, `In progress`, `Planned`,
  `Deferred`, `Candidate`.
- Client gate values must be one of: `Required`, `No`, `Candidate`, `-`.
- Plan and source-plan cells must point to committed repo-relative Markdown docs
  or `-`.
- Do not mark a slice `Live` without deploy and smoke evidence in
  `docs/planning/VERSION_LEDGER.md` and `docs/STATUS.md`.
