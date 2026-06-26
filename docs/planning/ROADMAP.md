# Open Relay Roadmap

Project: Open Relay
Status: Product brief, governance baseline, review-request protocol baseline, runtime/schema validation CLI baseline, git-state generator CLI MVP, review-request Markdown renderer merged, package/release smoke implementation merged, direct Markdown generation merged, local handoff workflow merged, and repo-local packet storage implementation in progress
Last updated: 2026-06-27
Current live version: Unknown; needs owner decision
Current baseline: Open Relay project brief, governance baseline, first protocol baseline, TypeScript schema-validation CLI baseline, merged JSON-only git-state generator CLI MVP, merged review-request Markdown renderer, package/release smoke implementation merged, direct Markdown generation merged, local handoff workflow merged, and repo-local packet storage implementation in progress

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
| Unversioned | Runtime and verification selection | Done | High | No | Smallest useful relay packet definition | docs/superpowers/specs/2026-06-26-runtime-schema-cli-design.md |
| Unversioned | Runtime schema validation CLI | Done | High | No | Runtime and verification selection | docs/superpowers/plans/2026-06-26-runtime-schema-cli.md |
| Unversioned | Review-request packet CLI MVP | Done | High | No | Runtime schema validation CLI | docs/superpowers/plans/2026-06-26-git-state-generator.md |
| Unversioned | Codex and Claude render templates | Done | Medium | No | Review-request packet CLI MVP | docs/superpowers/plans/2026-06-26-render-review-request.md |
| Unversioned | Package and release target | Done | Medium | No | Codex and Claude render templates | docs/superpowers/plans/2026-06-26-package-release-smoke.md |
| Unversioned | Direct Markdown generation | Done | Medium | No | Package and release target | docs/superpowers/plans/2026-06-26-direct-markdown-generation.md |
| Unversioned | Local handoff workflow | Done | Medium | No | Direct Markdown generation | docs/superpowers/plans/2026-06-26-handoff-review-request.md |
| Unversioned | Repo-local packet storage | In progress | Medium | No | Local handoff workflow | docs/superpowers/plans/2026-06-26-repo-local-packet-storage.md |

## Candidate Scope

| Lane | Candidate | Proposed insertion | Status | Trigger | Source plan |
| --- | --- | --- | --- | --- | --- |
| Runtime | Publish to npm registry | Before first public live release | Candidate | Package smoke passes and publish authority is approved | - |
| Templates | Agent-specific prompt dialects | After neutral Markdown renderer | Candidate | Maintainers need Claude/Codex-specific variants beyond packet-authored audience/focus fields | - |
| Security | Private redaction rule files | Before packets include sensitive data beyond git metadata | Candidate | Fixed generator redaction defaults are insufficient | - |
| Release | Version, tag, changelog, and publish workflow | Before live claims | Candidate | Package smoke passes and publish authority is approved | - |

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
