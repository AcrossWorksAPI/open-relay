# Open Relay

Local-first handoff and review packets for Codex, Claude Code, and other AI
coding agents.

Open Relay is an open-source handoff and review protocol for moving structured
project context between AI coding agents, humans, and project workspaces without
repetitive copy/paste.

## Product Thesis

AI agents do better work when handoffs are explicit, structured, source-linked,
and tool-aware. Open Relay is intended to become a lightweight shared format and
CLI for creating, validating, transforming, and consuming those handoffs.

## MVP Direction

The first version should be a local CLI plus Markdown/JSON packet schema, not a
SaaS app.

The first planning question is:

> What is the smallest useful relay packet?

Recommended first workflow:

> Codex has completed work in a repo. Generate a Claude-ready review packet from
> local git state.

That narrow path should inspect repo state, summarize changed files, collect
tests run, produce structured Markdown, preserve provenance, and ask the second
agent for review.

## Non-Goals For MVP

- Full project management app
- Linear or Jira replacement
- Hosted cloud product
- Universal memory database
- Complex GUI
- Automatic agent execution across vendors
- Deep IDE integration

## Planning System

This repository uses the Across Works Codex roadmap baseline:

- `master_build.md`
- `docs/STATUS.md`
- `docs/planning/ROADMAP.md`
- `docs/planning/ACTIVE_WORK.md`
- `docs/planning/PLAN_REGISTRY.md`
- `.codex/skills/project-roadmap-system/SKILL.md`

See `docs/product/PROJECT_BRIEF.md` for the current product brief.
