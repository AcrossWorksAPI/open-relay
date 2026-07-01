# Open Relay Roadmap

Project: Open Relay
Status: Product brief, governance baseline, review-request protocol baseline, runtime/schema validation CLI baseline, git-state generator CLI MVP, review-request Markdown renderer merged, package/release smoke implementation merged, direct Markdown generation merged, local handoff workflow merged, repo-local packet storage merged, protocol envelope dispatch merged, review-loop roadmap re-anchored, review-response implementation merged, GitHub PR packet transport merged, reviewer-produced review-response workflow merged, packet evidence enrichment merged, private redaction rules implementation merged, release workflow implementation merged, roadmap pre-release tracking merged, agent-ready prompt rendering merged, resume-project packet planning merged, resume-project packet implementation merged, local watcher proof merged, local relay watch foreground orchestrator merged, local relay status indicator merged, local response watch foreground orchestrator merged, and local orchestra status GUI in progress
Last updated: 2026-07-02
Current live version: None yet; first public release not published
Current baseline: Open Relay project brief, governance baseline, first protocol baseline, TypeScript schema-validation CLI baseline, merged JSON-only git-state generator CLI MVP, merged review-request Markdown renderer, package/release smoke implementation merged, direct Markdown generation merged, local handoff workflow merged, repo-local packet storage merged, protocol envelope dispatch merged, review-loop roadmap re-anchored, review-response implementation merged, GitHub PR packet transport merged, reviewer-produced review-response workflow merged, packet evidence enrichment merged, private redaction rules implementation merged, release workflow implementation merged, PR-indexed pre-release roadmap tracking, merged agent-ready prompt rendering, merged resume-project packet planning, merged resume-project packet implementation, merged local watcher proof, merged local relay watch foreground orchestrator, merged local relay status indicator, merged local response watch foreground orchestrator, and local orchestra status GUI in progress

## Project Purpose

Open Relay is an open-source, local-first handoff and review protocol for
moving structured project context between AI coding agents, humans, and project
workspaces without repetitive copy/paste. The MVP direction is a local CLI plus
Markdown/JSON relay packet schema, not a SaaS app.

## Versioned Slices

| Version | Slice | Status | Priority | Client gate | Depends on | Plan |
| --- | --- | --- | --- | --- | --- | --- |
| v0.1.0-pre.1 | Project foundation governance baseline | Done | High | No | - | - |
| v0.1.0-pre.1 | Open Relay brief and remote alignment | Done | High | No | Project foundation governance baseline | - |
| v0.1.0-pre.2 | Open-source hardening and first CI | Done | High | No | Open Relay brief and remote alignment | - |
| v0.1.0-pre.5 | Smallest useful relay packet definition | Done | High | No | Open Relay brief and remote alignment | - |
| v0.1.0-pre.9 | Runtime and verification selection | Done | High | No | Smallest useful relay packet definition | docs/superpowers/specs/2026-06-26-runtime-schema-cli-design.md |
| v0.1.0-pre.11 | Runtime schema validation CLI | Done | High | No | Runtime and verification selection | docs/superpowers/plans/2026-06-26-runtime-schema-cli.md |
| v0.1.0-pre.14 | Review-request packet CLI MVP | Done | High | No | Runtime schema validation CLI | docs/superpowers/plans/2026-06-26-git-state-generator.md |
| v0.1.0-pre.17 | Codex and Claude render templates (neutral renderer only) | Done | Medium | No | Review-request packet CLI MVP | docs/superpowers/plans/2026-06-26-render-review-request.md |
| v0.1.0-pre.20 | Package and release target | Done | Medium | No | Codex and Claude render templates (neutral renderer only) | docs/superpowers/plans/2026-06-26-package-release-smoke.md |
| v0.1.0-pre.23 | Direct Markdown generation | Done | Medium | No | Package and release target | docs/superpowers/plans/2026-06-26-direct-markdown-generation.md |
| v0.1.0-pre.26 | Local handoff workflow | Done | Medium | No | Direct Markdown generation | docs/superpowers/plans/2026-06-26-handoff-review-request.md |
| v0.1.0-pre.29 | Repo-local packet storage | Done | Medium | No | Local handoff workflow | docs/superpowers/plans/2026-06-26-repo-local-packet-storage.md |
| v0.1.0-pre.31 | Relay protocol envelope and multi-type validation | Done | High | No | Repo-local packet storage | docs/superpowers/plans/2026-06-27-relay-protocol-envelope.md |
| v0.1.0-pre.34 | Review-response packet type | Done | High | No | Relay protocol envelope and multi-type validation | docs/superpowers/plans/2026-06-27-review-response-packet-implementation.md |
| v0.1.0-pre.36 | Boundary/transport decision | Done | High | No | Repo-local packet storage | docs/superpowers/plans/2026-06-27-github-pr-transport.md |
| v0.1.0-pre.39 | Reviewer-produced review-response workflow | Done | High | No | Review-response packet type; Boundary/transport decision | docs/superpowers/plans/2026-06-27-review-response-producer-workflow.md |
| v0.1.0-pre.42 | Packet evidence enrichment | Done | Medium | No | Relay protocol envelope and multi-type validation | docs/superpowers/plans/2026-06-28-review-request-evidence-enrichment.md |
| v0.1.0-pre.45 | Private redaction rules | Done | Medium | No | Review-request packet CLI MVP | docs/superpowers/plans/2026-06-28-private-redaction-rules.md |
| v0.1.0-pre.48 | Release workflow and first npm publish gate | Done | High | No | Package and release target; Private redaction rules | docs/superpowers/plans/2026-06-28-release-workflow.md |
| v0.1.0-pre.52 | Agent-ready prompt rendering | Done | Medium | No | Review-response packet type | docs/superpowers/plans/2026-06-28-agent-ready-prompt-rendering.md |
| v0.1.0-pre.59 | Local watcher proof | Done | High | Required | Agent-ready prompt rendering; Boundary/transport decision | docs/superpowers/plans/2026-06-30-local-watcher-proof.md |
| v0.1.0-pre.60 | Local relay watch foreground orchestrator | Done | High | Required | Local watcher proof; Boundary/transport decision; Reviewer-produced review-response workflow; Agent-ready prompt rendering | docs/superpowers/plans/2026-06-30-local-relay-watch.md |
| v0.1.0-pre.61 | Local relay status indicator | Done | High | Required | Local relay watch foreground orchestrator | docs/superpowers/plans/2026-07-01-local-relay-status-indicator.md |
| v0.1.0-pre.62 | Local response watch foreground orchestrator | Done | High | Required | Local relay watch foreground orchestrator; Local relay status indicator; Resume-project packet type | docs/superpowers/plans/2026-07-01-local-response-watch.md |
| v0.1.0-pre.63 | Local orchestra status GUI | In progress | High | Required | Local relay watch foreground orchestrator; Local response watch foreground orchestrator; Local relay status indicator | docs/superpowers/plans/2026-07-02-local-orchestra-status-gui.md |
| v0.1.0-pre.next | Implementation-handoff packet type | Planned | Medium | No | Relay protocol envelope and multi-type validation | - |
| v0.1.0-pre.54 | Resume-project packet type | Done | Medium | No | Review-response packet type | docs/superpowers/plans/2026-06-29-resume-project-packet.md |

## Brief MVP Mapping For Planned Slices

| Planned slice | Brief MVP feature advanced |
| --- | --- |
| Relay protocol envelope and multi-type validation | Feature 5: support review loops by making additional packet types possible. |
| Boundary/transport decision | Product thesis and Feature 5: define how packets move between agents/workspaces. |
| Packet evidence enrichment | Feature 2: include diff summary and tests run. |
| Private redaction rules | Feature 2 and product thesis: make generated review context safer to share by scrubbing repository-specific private metadata before packet output. |
| Review-response packet type | Feature 5: support review response. |
| Reviewer-produced review-response workflow | Feature 5: close the review loop by letting reviewers create and send response packets without manual copy/paste. |
| Local watcher proof | Product thesis and Feature 5: prove local agent trigger surfaces can be driven without copy/paste before building a production orchestrator. |
| Local relay watch foreground orchestrator | Product thesis and Feature 5: run the first packet-native local loop that fetches a PR request packet, invokes headless Claude, validates the response packet, and posts it back without human packet-body copy/paste while keeping live watch posting bounded. |
| Local relay status indicator | Product thesis and Feature 5: give the local foreground watcher visible operator status without turning it into a production daemon or changing packet transport. |
| Local response watch foreground orchestrator | Product thesis and Feature 5: run the reverse packet-native local loop that fetches a PR response packet, derives a resume-project packet, and resumes Codex without human packet-body copy/paste while keeping live Codex turns bounded. |
| Local orchestra status GUI | Product thesis and Feature 5: give the local operator a versioned dashboard that shows whether the packet-native relay systems are reachable and backed by watcher evidence without becoming production daemon orchestration. |
| Release workflow and first npm publish gate | Product thesis: make the local CLI installable from a public package with release evidence before any live claim. |
| Implementation-handoff packet type | Feature 5: support implementation handoff. |
| Resume-project packet type | Feature 5: support resume project. |
| Agent-ready prompt rendering | Feature 3: output Codex-ready and Claude-ready prompts. |

## Candidate Scope

| Lane | Candidate | Proposed insertion | Status | Trigger | Source plan |
| --- | --- | --- | --- | --- | --- |
| Protocol | Packet-version migrators | After a second packet version exists | Candidate | A breaking packet version ships and old stored bundles must still load | - |
| Workflow | Relay session identifiers | Before project/session orchestration, or when trials need linked Codex and Claude threads | Candidate | Multi-agent trials need a shared non-secret sync key such as `<relay_session_id>-OR-CX` and `<relay_session_id>-OR-CD` across thread titles, packet trails, and future manifests | - |
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
- Before the first public npm publish, roadmap version cells use
  `v0.1.0-pre.<PR_NUMBER>` for slices with a PR and `v0.1.0-pre.next` only for
  planned slices without a PR. These are roadmap tracking labels, not npm tags,
  GitHub Releases, or live package versions.
- Every future PR that changes scope, status, or behavior must update the
  roadmap version cell to its PR-numbered pre-release label and record evidence
  in `docs/planning/VERSION_LEDGER.md`.
- No new packet type may be implemented before the relay protocol envelope
  slice is merged.
- Do not add another command that only re-emits an existing packet. Current
  creation/output coverage is `generate`, `render`, `handoff`, and `save`.
- Do not mark a slice `Live` without deploy and smoke evidence in
  `docs/planning/VERSION_LEDGER.md` and `docs/STATUS.md`.
