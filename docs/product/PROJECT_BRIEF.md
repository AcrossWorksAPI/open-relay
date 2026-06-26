# Open Relay Project Brief

Last updated: 2026-06-26

## Working Name

Open Relay

## One-Line Summary

Open Relay is an open-source handoff and review protocol for moving structured
project context between AI coding agents, humans, and project workspaces without
repetitive copy/paste.

## Core Problem

AI-assisted builders increasingly use multiple agents and tools: Codex, Claude
Code, GitHub, Linear, local repos, skills, plugins, MCP servers, planning docs,
and review workflows. The workflow between them is still manual, which creates
friction, context loss, stale summaries, and inconsistent reviews.

## Target Users

Primary users:

- solo builders using multiple AI agents
- small studios and consultants
- open-source maintainers
- developers who use Codex and Claude Code together
- teams that want AI-assisted planning, implementation, and review without a
  heavy platform

Secondary users:

- agent, plugin, and skill authors
- teams building MCP-based workflows
- engineering leads who want auditable AI handoffs

## Product Thesis

AI agents do better work when handoffs are explicit, structured, source-linked,
and tool-aware. Open Relay should become the lightweight shared format and CLI
for creating, validating, transforming, and consuming those handoffs.

## MVP

The first version should be a local CLI and Markdown/JSON schema, not a SaaS
app. The approved first runtime direction is TypeScript on Node.js with npm,
CLI-only for the MVP. MCP server support is deferred until the CLI and packet
contract are useful.

MVP features:

1. Generate a relay packet from a local repo.
2. Include goal, current branch, git status, changed files, diff summary, tests
   run, known risks, and requested next action.
3. Output human-readable Markdown, Codex-ready prompt, Claude-ready prompt, and
   JSON for tools.
4. Validate that a packet includes required fields.
5. Support review loops: implementation handoff, review request, review
   response, and resume project.
6. Preserve provenance by linking claims back to files, commands, diffs, or
   user-provided notes.

## Recommended First Planning Focus

Start with one concrete workflow:

> Codex has completed work in a repo. Generate a Claude-ready review packet from
> the local git state.

The first planning question is:

> What is the smallest useful relay packet?

## Non-Goals For MVP

- Full project management app
- Linear or Jira replacement
- Hosted cloud product
- Universal memory database
- Complex GUI
- Automatic agent execution across vendors
- Deep IDE integration

## Open Questions

- Should packet storage live inside each repo, in a global user directory, or
  both?
- How opinionated should it be about Codex and Claude specifically?
- Should the schema support private redaction rules from day one?
- What package and release target should the first CLI use when it is ready to
  publish?
- Which packet type should follow the reviewed `review-request` packet?

## Success Criteria

The first release is successful if a user can run one command after an agent
finishes work and receive a high-quality review packet that saves 10-20 minutes
of manual context assembly.
