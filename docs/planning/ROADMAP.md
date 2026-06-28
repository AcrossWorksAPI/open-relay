# Open Relay Roadmap

Project: Open Relay
Status: Product brief, governance baseline, review-request protocol baseline, runtime/schema validation CLI baseline, git-state generator CLI MVP, review-request Markdown renderer merged, package/release smoke implementation merged, direct Markdown generation merged, local handoff workflow merged, repo-local packet storage merged, protocol envelope dispatch merged, review-loop roadmap re-anchored, review-response implementation merged, GitHub PR packet transport merged, reviewer-produced review-response workflow merged, packet evidence enrichment merged, private redaction rules implementation merged, release workflow implementation merged, and agent-ready prompt rendering planning in progress
Last updated: 2026-06-28
Current live version: None yet; first public release not published
Current baseline: Open Relay project brief, governance baseline, first protocol baseline, TypeScript schema-validation CLI baseline, merged JSON-only git-state generator CLI MVP, merged review-request Markdown renderer, package/release smoke implementation merged, direct Markdown generation merged, local handoff workflow merged, repo-local packet storage merged, protocol envelope dispatch merged, review-loop roadmap re-anchored, review-response implementation merged, GitHub PR packet transport merged, reviewer-produced review-response workflow merged, packet evidence enrichment merged, private redaction rules implementation merged, release workflow implementation merged, and agent-ready prompt rendering planning in progress

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
| Unversioned | Codex and Claude render templates (neutral renderer only) | Done | Medium | No | Review-request packet CLI MVP | docs/superpowers/plans/2026-06-26-render-review-request.md |
| Unversioned | Package and release target | Done | Medium | No | Codex and Claude render templates (neutral renderer only) | docs/superpowers/plans/2026-06-26-package-release-smoke.md |
| Unversioned | Direct Markdown generation | Done | Medium | No | Package and release target | docs/superpowers/plans/2026-06-26-direct-markdown-generation.md |
| Unversioned | Local handoff workflow | Done | Medium | No | Direct Markdown generation | docs/superpowers/plans/2026-06-26-handoff-review-request.md |
| Unversioned | Repo-local packet storage | Done | Medium | No | Local handoff workflow | docs/superpowers/plans/2026-06-26-repo-local-packet-storage.md |
| Unversioned | Relay protocol envelope and multi-type validation | Done | High | No | Repo-local packet storage | docs/superpowers/plans/2026-06-27-relay-protocol-envelope.md |
| Unversioned | Boundary/transport decision | Done | High | No | Repo-local packet storage | docs/superpowers/plans/2026-06-27-github-pr-transport.md |
| Unversioned | Packet evidence enrichment | Done | Medium | No | Relay protocol envelope and multi-type validation | docs/superpowers/plans/2026-06-28-review-request-evidence-enrichment.md |
| Unversioned | Private redaction rules | Done | Medium | No | Review-request packet CLI MVP | docs/superpowers/plans/2026-06-28-private-redaction-rules.md |
| Unversioned | Review-response packet type | Done | High | No | Relay protocol envelope and multi-type validation | docs/superpowers/plans/2026-06-27-review-response-packet-implementation.md |
| Unversioned | Reviewer-produced review-response workflow | Done | High | No | Review-response packet type; Boundary/transport decision | docs/superpowers/plans/2026-06-27-review-response-producer-workflow.md |
| Unversioned | Release workflow and first npm publish gate | Done | High | No | Package and release target; Private redaction rules | docs/superpowers/plans/2026-06-28-release-workflow.md |
| Unversioned | Implementation-handoff packet type | Planned | Medium | No | Relay protocol envelope and multi-type validation | - |
| Unversioned | Resume-project packet type | Planned | Medium | No | Review-response packet type | - |
| Unversioned | Agent-ready prompt rendering | In progress | Medium | No | Review-response packet type | docs/superpowers/plans/2026-06-28-agent-ready-prompt-rendering.md |

## Brief MVP Mapping For Planned Slices

| Planned slice | Brief MVP feature advanced |
| --- | --- |
| Relay protocol envelope and multi-type validation | Feature 5: support review loops by making additional packet types possible. |
| Boundary/transport decision | Product thesis and Feature 5: define how packets move between agents/workspaces. |
| Packet evidence enrichment | Feature 2: include diff summary and tests run. |
| Private redaction rules | Feature 2 and product thesis: make generated review context safer to share by scrubbing repository-specific private metadata before packet output. |
| Review-response packet type | Feature 5: support review response. |
| Reviewer-produced review-response workflow | Feature 5: close the review loop by letting reviewers create and send response packets without manual copy/paste. |
| Release workflow and first npm publish gate | Product thesis: make the local CLI installable from a public package with release evidence before any live claim. |
| Implementation-handoff packet type | Feature 5: support implementation handoff. |
| Resume-project packet type | Feature 5: support resume project. |
| Agent-ready prompt rendering | Feature 3: output Codex-ready and Claude-ready prompts. |

## Candidate Scope

| Lane | Candidate | Proposed insertion | Status | Trigger | Source plan |
| --- | --- | --- | --- | --- | --- |
| Protocol | Packet-version migrators | After a second packet version exists | Candidate | A breaking packet version ships and old stored bundles must still load | - |
| Security | Non-GitHub remote allowlist | When non-GitHub users appear | Candidate | Target users report dropped safe GitLab, Codeberg, or GitHub Enterprise remotes | - |

## Update Rules

- This roadmap is commit-updated and must remain parseable Markdown.
- Status values must be one of: `Live`, `Done`, `In progress`, `Planned`,
  `Deferred`, `Candidate`.
- Priority values must be one of: `High`, `Medium`, `Low`, `-`.
- Client gate values must be one of: `Required`, `No`, `Candidate`, `-`.
- Plan and source-plan cells must point to committed repo-relative Markdown docs
  or `-`.
- Every new Versioned Slice must name the brief MVP feature it advances; a
  slice that advances none is out of scope until the brief changes.
- No new packet type may be implemented before the relay protocol envelope
  slice is merged.
- Do not add another command that only re-emits an existing packet. Current
  creation/output coverage is `generate`, `render`, `handoff`, and `save`.
- Do not mark a slice `Live` without deploy and smoke evidence in
  `docs/planning/VERSION_LEDGER.md` and `docs/STATUS.md`.
