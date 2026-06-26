# Open Relay Roadmap

Project: Open Relay
Status: Product brief, governance baseline, and review-request protocol baseline
Last updated: 2026-06-26
Current live version: Unknown; needs owner decision
Current baseline: Open Relay project brief, governance baseline, and first protocol baseline

## Project Purpose

Open Relay is an open-source, local-first handoff and review protocol for
moving structured project context between AI coding agents, humans, and project
workspaces without repetitive copy/paste. The MVP direction is a local CLI plus
Markdown/JSON relay packet schema, not a SaaS app.

## Versioned Slices

| Version | Slice | Status | Priority | Client gate | Depends on | Plan |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline | Project foundation governance baseline | Done | High | No | - | - |
| Baseline | Open Relay brief and remote alignment | Done | High | No | Project foundation governance baseline | - |
| Baseline | Open-source hardening and first CI | Done | High | No | Open Relay brief and remote alignment | - |
| Unversioned | Smallest useful relay packet definition | Done | High | No | Open Relay brief and remote alignment | - |
| Unversioned | Runtime and verification selection | Planned | High | Required | Smallest useful relay packet definition | - |
| Unversioned | Review-request packet CLI MVP | Candidate | Medium | Candidate | Runtime and verification selection | - |
| Unversioned | Codex and Claude render templates | Candidate | Medium | Candidate | Review-request packet CLI MVP | - |

## Candidate Scope

| Lane | Candidate | Proposed insertion | Status | Trigger | Source plan |
| --- | --- | --- | --- | --- | --- |
| Protocol | Formal JSON Schema for reviewed packet | Before CLI implementation | Candidate | Runtime and package target selected | - |
| Runtime | TypeScript or Python CLI runtime | Before implementation | Candidate | Owner chooses runtime or repo adds config | - |
| Templates | Codex/Claude review prompt templates | Alongside CLI MVP | Candidate | JSON Schema and generator plan are drafted | - |
| Security | Local redaction and provenance rules | Before packets include sensitive data | Candidate | Packet schema includes repo diffs, logs, or notes | - |
| Release | Branch, PR, package, and smoke workflow | Before live claims | Candidate | Runtime/package target selected | - |

## Update Rules

- This roadmap is commit-updated and must remain parseable Markdown.
- Status values must be one of: `Live`, `Done`, `In progress`, `Planned`,
  `Deferred`, `Candidate`.
- Priority values must be one of: `High`, `Medium`, `Low`, `-`.
- Client gate values must be one of: `Required`, `No`, `Candidate`, `-`.
- Plan and source-plan cells must point to committed repo-relative Markdown docs
  or `-`.
- Do not mark a slice `Live` without deploy and smoke evidence in
  `docs/planning/VERSION_LEDGER.md` and `docs/STATUS.md`.
