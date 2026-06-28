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

The first runtime direction is a TypeScript CLI on Node.js, managed by npm. MCP
server support is deferred until the local CLI and packet contract are useful.

The first protocol question was:

> What is the smallest useful relay packet?

Recommended first workflow:

> Codex has completed work in a repo. Generate a Claude-ready review packet from
> local git state.

That narrow path should inspect repo state, summarize changed files, collect
tests run, produce structured Markdown, preserve provenance, and ask the second
agent for review.

## Protocol

The first loop uses two packet types plus exact-packet transport:

- Review request spec: `docs/protocol/review-request-packet.md`
- Review response spec: `docs/protocol/review-response-packet.md`
- Review response producer: `docs/protocol/review-response-producer.md`
- GitHub PR exact-packet transport: `docs/protocol/github-pr-transport.md`
- Agent-ready prompt rendering: `docs/protocol/agent-ready-prompt-rendering.md`
- Review request example: `examples/review-request/relay.json`
- Review response example: `examples/review-response/relay.json`

The packets are intentionally narrow. A `review-request` asks another reviewer
to inspect a fixed diff. A `review-response` records reviewer-authored outcome,
findings, scope, verification, and next action.

## CLI

Open Relay starts as a local TypeScript CLI.

```bash
npm ci
npm run check
node dist/src/cli.js validate examples/review-request/relay.json
```

The validate command checks a `review-request` JSON packet against
`schemas/review-request.schema.json`; packet dispatch also validates
`review-response/0.1`.

## Install

Open Relay is prepared for npm publishing as `@acrossworks/open-relay`.
Until the first npm release is published and smoke-tested from the registry,
use the repository checkout:

```bash
npm ci
npm run build
node dist/src/cli.js --help
```

After the first public release:

```bash
npm install -g @acrossworks/open-relay
open-relay --help
```

## Generate Review Packets

Generate a `review-request` packet from local git state:

```bash
npm run build
node dist/src/cli.js generate review-request \
  --base origin/main \
  --head HEAD \
  --goal "Review this implementation slice" \
  --summary "Summarizes the branch for review." \
  --behavioral-intent "Help a second reviewer inspect the exact diff range." \
  --output relay.json
node dist/src/cli.js validate relay.json
node dist/src/cli.js generate review-request \
  --base origin/main \
  --head HEAD \
  --goal "Review this implementation slice" \
  --summary "Summarizes the branch for review." \
  --behavioral-intent "Help a second reviewer inspect the exact diff range." \
  --format markdown \
  --output relay.md
```

Markdown rendering is also available through `open-relay render <packet.json>`.
Generated review-request packets include per-file churn evidence when git can
provide it, such as `Diff stats: +12 -3.` or `Diff stats: binary file.`. Open
Relay records counts, not raw diff hunks, and it does not run test commands
automatically; checks belong in explicit verification entries.

Private redaction rules can be provided with `--redaction-rules <path>`.
When no explicit path is supplied, Open Relay looks for
`.open-relay/redaction-rules.json` in the current repository. Missing default
rules are ignored; invalid present or explicit rules fail closed before packet
output. Rule files are case-insensitive literal-only JSON and should stay
private. Formatting variants still need their own rules, and redacting file
paths can make those paths less useful for direct review navigation. Rule
names, reasons, and replacements must not contain the private match text.

## Render Agent Prompts

Render a Claude-oriented review prompt from a request packet:

```bash
open-relay render relay.json --template claude --output claude-review.md
```

Render a Codex-oriented follow-up prompt from a response packet:

```bash
open-relay render review-response.json --template codex --output codex-follow-up.md
```

Templates wrap the validated packet as untrusted context. They do not call an
agent, post to GitHub, merge, publish, or run commands. Fencing prevents
syntactic break-out from the packet block, but it does not eliminate semantic
prompt-injection risk; a human or surrounding tool must still evaluate the
agent response before authorizing side effects.

## Close A Review Loop

Fetch a request packet from a PR, write a reviewer draft, then produce and
dry-run the exact response packet comment:

```bash
node dist/src/cli.js transport github-pr fetch \
  --pr AcrossWorksAPI/open-relay#36 \
  --packet-type review-request \
  --author codex \
  --output request.json

node dist/src/cli.js respond github-pr \
  --request request.json \
  --review review-draft.json \
  --pr AcrossWorksAPI/open-relay#36 \
  --dry-run
```

The reviewer still authors `review-draft.json`. Open Relay derives packet
envelope fields, validates the final `review-response/0.1`, renders it, and can
post the exact packet through GitHub PR transport.

## Runtime Plan

- Runtime/schema CLI design:
  `docs/superpowers/specs/2026-06-26-runtime-schema-cli-design.md`
- Runtime/schema CLI implementation plan:
  `docs/superpowers/plans/2026-06-26-runtime-schema-cli.md`
- Git-state generator design:
  `docs/superpowers/specs/2026-06-26-git-state-generator-design.md`
- Git-state generator implementation plan:
  `docs/superpowers/plans/2026-06-26-git-state-generator.md`

The first code slice validates `review-request` JSON packets against a formal
schema. The next implementation slice generates JSON packets from live git
state while keeping Markdown rendering deferred.

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

## Community And Security

- Contribution guide: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
