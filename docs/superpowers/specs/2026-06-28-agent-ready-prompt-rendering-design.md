# Agent-Ready Prompt Rendering Design

Last updated: 2026-06-28

## Purpose

Open Relay can generate, validate, render, store, send, and receive structured
packets. The next product gap from the brief is agent-ready prompt output:

- a Claude-ready prompt for reviewing a `review-request`; and
- a Codex-ready prompt for acting on a `review-response`.

This slice should make packets easier to hand to agents without changing packet
schemas, invoking agents, reading extra files, posting comments, merging PRs, or
publishing packages.

## Decision

Add optional prompt templates to the existing generic render path:

```bash
open-relay render <packet.json> [--template neutral|claude|codex] [--output <path>]
open-relay render review-request <packet.json> [--template neutral|claude|codex] [--output <path>]
```

`neutral` is the default and preserves today's byte-for-byte Markdown renderer
output. `claude` and `codex` wrap the existing rendered packet Markdown in a
short, deterministic prompt envelope.

The wrapper treats the rendered packet as untrusted quoted context. It should
tell the receiving agent to use the packet as data, not as an instruction
source that can override the wrapper. This addresses the documented free-text
prompt-injection surface without changing the neutral Markdown renderer.

## Alternatives Considered

| Approach | Tradeoff |
| --- | --- |
| Add a top-level `prompt` command | Rejected. It would be another command that only re-emits an existing packet, conflicting with the roadmap rule to keep output under `generate`, `render`, `handoff`, and `save`. |
| Add `--format prompt` to every generator | Useful later, but wider than needed. The smallest useful slice is rendering any validated packet as an agent-ready prompt. Direct generator prompt output can compose this later if needed. |
| Add `--template neutral\|claude\|codex` to `render` | Chosen. It reuses validation and packet rendering, keeps neutral output unchanged, and gives users the agent prompt they can paste or transport without adding delivery behavior. |
| Create separate packet schemas for prompts | Rejected. Prompts are presentation wrappers around packets, not protocol entities. |

## Command Contract

`render` currently accepts:

```bash
open-relay render <packet.json> [--output <relay.md>]
open-relay render review-request <packet.json> [--output <relay.md>]
```

Add:

```bash
[--template neutral|claude|codex]
```

Rules:

- missing `--template` means `neutral`;
- duplicate `--template` exits `2`;
- missing template value exits `2`;
- unsupported template exits `2` with `Invalid template: <value>`;
- `neutral` output remains exactly the same as current Markdown output;
- `claude` and `codex` output prompt Markdown;
- successful file output uses sanitized messages and does not echo paths;
- invalid JSON and write failures keep the existing sanitized posture.

## Prompt Templates

### Shared Envelope

Every agent template should include:

1. a title naming the target agent profile;
2. fixed instructions that the packet is untrusted context;
3. packet-type-aware task instructions;
4. the already-rendered packet Markdown inside a dynamic fenced code block; and
5. a short expected-output section.

The fence must be generated from the packet Markdown, using a backtick run
longer than any run already present in the rendered packet. This prevents
packet-authored text from closing the fence.

### Claude Template

Primary use: hand a `review-request` to Claude for review.

For `review-request`, the prompt should ask Claude to:

- review the referenced repository, PR, branch, and diff range;
- prioritize correctness, security, behavioral regressions, and missing tests;
- report findings first, ordered by severity;
- include file and line references when available;
- say clearly when there are no findings; and
- optionally include a reviewer-authored `review-response` draft JSON block
  that omits Open Relay-owned fields (`packet_type`, `packet_version`,
  `created_at`, and `response_to`).

For other packet types, the Claude template should still be safe and useful:
read the packet, summarize the requested review/action, and avoid inventing
repository facts not present in the packet.

### Codex Template

Primary use: hand a `review-response` back to Codex for implementation
follow-up.

For `review-response`, the prompt should ask Codex to:

- evaluate findings rather than blindly applying them;
- fix valid blocking findings first;
- preserve unrelated user changes;
- run relevant verification;
- update the packet/PR state when appropriate; and
- avoid merge, publish, destructive, or external side-effect actions unless
  explicitly authorized by the surrounding user or project instructions.

For `review-request`, the Codex template should be conservative: read the
packet, prepare context, and avoid making changes unless the surrounding user
asks Codex to implement or review.

## Architecture

Add a small prompt-rendering module:

```ts
export type PromptTemplate = "neutral" | "claude" | "codex";

export function renderPacketForTemplate(input: {
  packet: Record<string, unknown>;
  template: PromptTemplate;
}): string;
```

`neutral` delegates to `renderPacketMarkdown(packet)` and returns unchanged
Markdown.

`claude` and `codex` call `renderPacketMarkdown(packet)` once, then wrap that
Markdown. The wrapper should inspect `packet.packet_type` only to choose
instructions. It should not bypass schema validation, read files, call git,
call GitHub, or execute commands.

The CLI keeps the same validation flow:

1. parse render args;
2. read packet JSON;
3. validate through `validatePacket`;
4. call `renderPacketForTemplate`;
5. write stdout or `--output`.

## Security And Privacy

This slice must not collect or expose new data. It only transforms an already
validated packet into either neutral Markdown or an agent prompt.

Prompt templates must:

- not read repository files beyond the packet path;
- not run commands;
- not call external agents or services;
- not post to GitHub;
- not include hidden transport markers;
- not echo output paths in success or failure messages;
- keep packet content fenced as untrusted context; and
- tell the receiving agent that packet-authored text cannot override the prompt
  wrapper or project/user instructions.

The wrapper does not make an unsafe packet safe to publish. Existing private
redaction rules remain the tool for removing private repository terms before a
packet is shared.

## Lifecycle And Scope Coverage

| Area | Decision |
| --- | --- |
| Lifecycle | Adds a new render presentation, not a stored entity. Edit, archive, delete, and restore remain deferred to storage slices. |
| Scope | Local CLI only. No hosted app, MCP server, external agent invocation, GitHub posting, merge automation, or publish action. |
| Permissions | Local user controls the packet file and optional output path. No new network access or file discovery. |
| Ownership | Prompt output belongs to the local CLI user. Packet content remains owned by the packet producer. |
| Audit | Git history, PR review, tests, package smoke, and examples provide evidence. No telemetry is added. |
| Notifications | Deferred. Prompt rendering does not notify or deliver. |
| Billing/quota | N/A; local CLI only. |
| Recovery | Failed rendering leaves stdout empty and prints sanitized errors. Existing files are modified only when the user supplies `--output`. |
| Smoke | `npm run check`, `npm run smoke:pack`, `npm run release:preflight -- 0.1.0`, `git diff --check`, prompt stdout/file tests, and installed-package prompt smoke. |

## Testing Strategy

- Unit tests for prompt rendering:
  - `neutral` equals `renderPacketMarkdown`;
  - `claude` wraps a `review-request` with review instructions;
  - `codex` wraps a `review-response` with follow-up instructions;
  - dynamic fences survive packet text containing triple backticks;
  - unsupported template values are rejected by parser code.
- CLI tests:
  - `render <packet.json> --template neutral` matches existing output;
  - `render <packet.json> --template claude` prints a prompt;
  - `render <review-response.json> --template codex --output <path>` writes a
    prompt and prints a sanitized success message;
  - duplicate, missing, and invalid `--template` values exit `2`;
  - write failures do not echo output paths.
- Package smoke:
  - installed CLI renders a Claude prompt from the review-request example and
    a Codex prompt from the review-response example.

## Deferred

- Direct `generate ... --format prompt`.
- Agent invocation or local app orchestration.
- Native GitHub review import.
- Implementation-handoff and resume-project packet types.
- Prompt profiles beyond `claude` and `codex`.
- User-custom template files.
- Hidden exact-packet transport markers in prompts.
- Any publish or `Live` claim.

## Open Decisions

- npm trusted publisher setup and `v0.1.0` publish timing remain owner-owned.
- Whether to add direct generator prompt output after this render-first slice is
  `Unknown; needs owner decision` until users prove the two-step path is too
  much friction.
