# Handoff Review Request Design

## Purpose

Open Relay can now generate review-request packets as JSON or Markdown. The
next slice adds a clearer command for the common human workflow:

> I finished a change. Give me the Markdown handoff packet to send for review.

This slice adds a Markdown-first local CLI command. It does not add background
orchestration, agent-to-agent messaging, persistent packet storage, or
agent-specific prompt templates.

## User Outcome

A local CLI user can run:

```bash
open-relay handoff review-request \
  --base origin/main \
  --head HEAD \
  --goal "Review direct Markdown generation" \
  --summary "Adds a Markdown output path for generated packets." \
  --behavioral-intent "Reduce handoff friction for reviewer workflows." \
  --output relay.md
```

and get the same Markdown produced by:

```bash
open-relay generate review-request ... --format markdown --output relay.md
```

but with a command name that matches the product workflow instead of the output
format mechanism.

## Scope

### Included

- Add a new CLI route:

  ```bash
  open-relay handoff review-request <generator flags> [--output <relay.md>]
  ```

- Reuse the existing generator options and defaults:
  - required `--base`, `--head`, `--goal`, `--summary`,
    `--behavioral-intent`;
  - optional `--audience`, repeated `--focus`, `--requested-output`,
    `--reviewer-access`, `--pr-url`, repeated `--verification`, repeated
    `--risk`, repeated `--excluded-scope`, `--include-local-path`, and
    `--output`.
- Render Markdown by composing the existing generate pipeline with
  `format: "markdown"`.
- Reject `--format` on the handoff command with a clear parser error so users
  use `generate review-request --format json|markdown` when they need explicit
  format control.
- Preserve `generate review-request` and `render review-request` behavior.
- Add CLI tests and package smoke for the installed `handoff review-request`
  command.
- Update public help, roadmap/status docs, and package smoke evidence.

### Deferred

- Persistent packet storage or packet history.
- Side-by-side JSON and Markdown output from the handoff command.
- Agent-specific `--template claude` or `--template codex` dialects.
- Automatic Claude/Codex invocation, PR commenting, merging, or task planning.
- App/daemon orchestration.
- npm publish and live release workflow.

## Command Contract

The command accepts the same review-request content flags as
`generate review-request`, except `--format`.

```bash
open-relay handoff review-request \
  --base <ref> \
  --head <ref> \
  --goal <text> \
  --summary <text> \
  --behavioral-intent <text> \
  [--output <relay.md>]
```

Behavior:

- Missing required flags exit `2`.
- Unknown flags exit `2`.
- Duplicate singleton flags exit `2`.
- `--format` exits `2` with `--format is not supported for handoff review-request; use generate review-request --format instead.`
- Without `--output`, Markdown is written to stdout.
- With `--output`, Markdown is written to that path and stdout prints
  `Wrote review-request Markdown.`
- Write failures exit `1` with `Could not write review-request Markdown.`
- Git/ref/packet-generation failures inherit the existing sanitized generator
  error posture.

## Architecture

Add a small handoff CLI helper that rejects any explicit `--format` token, then
calls the existing generator command with `--format markdown` appended. The
existing `generate review-request` route is unchanged. That keeps the handoff
command on the same path as direct Markdown generation:

1. parse generator-compatible flags;
2. collect git context;
3. build `ReviewRequestPacket`;
4. validate packet;
5. render with `renderReviewRequestMarkdown(packet)`;
6. write stdout or file output.

No new dependency, schema change, renderer, or storage abstraction is required.

## Security And Privacy

This slice collects no new data. It reuses the existing git collector,
redaction defaults, packet builder, validator, and renderer.

The handoff command must preserve existing sanitization:

- no output path echo on success or write failure;
- no sensitive git ref echo on invalid refs;
- no raw packet or file content echo on failures;
- packet-authored Markdown remains visible because it is the intended handoff
  payload.

The command name should not imply delivery to Claude, Codex, GitHub, or any
external service. It creates a local handoff packet only.

## Lifecycle And Scope Coverage

| Area | Decision |
| --- | --- |
| Lifecycle | Adds a new local create/view workflow for review-request Markdown; edit, archive, delete, and restore remain deferred until storage exists. |
| Scope | Local CLI only. No hosted service, MCP server, app daemon, or external review invocation. |
| Permissions | Local user controls repository, refs, text fields, and optional output path. |
| Ownership | Generated stdout/file output belongs to the local CLI user. |
| Audit | Git history, PR review, tests, and package smoke provide evidence. No runtime telemetry is added. |
| Notifications | Deferred; the command does not notify reviewers. |
| Billing/quota | N/A; local CLI only. |
| Recovery | Failed handoffs leave stdout empty and print sanitized errors. Existing repository files are not modified except an explicit `--output` target. |
| Smoke | `npm run check`, `npm run smoke:pack`, `git diff --check`, handoff stdout/file smokes, and installed CLI package smoke. |

## Testing Strategy

- CLI help includes `open-relay handoff review-request`.
- `handoff review-request` writes Markdown to stdout.
- `handoff review-request --output relay.md` writes Markdown and prints the
  sanitized success message.
- `handoff review-request --format markdown` exits `2` with the handoff-specific
  format error.
- Missing required flags reuse existing generator parse errors.
- Output write failure does not echo sensitive output paths.
- Handoff Markdown output matches `generate review-request --format markdown`
  for the same temp git fixture.
- Package smoke runs the installed CLI through the handoff command.

## Open Decisions

- Permanent packet storage remains `Unknown; needs owner decision`.
- Agent-specific templates remain deferred.
- Automatic PR comments, Claude/Codex invocation, merge automation, and next
  slice planning remain future orchestration work.
- npm publishing remains deferred until owner, version, changelog, tag, and
  `private: true` removal are approved.
