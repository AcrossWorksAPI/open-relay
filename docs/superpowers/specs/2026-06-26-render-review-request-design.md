# Render Review Request Design

## Purpose

Open Relay can now generate and validate `review-request` JSON packets from
local git state. The next slice turns those packets into concise Markdown that
can be pasted into Codex, Claude, or another reviewer without manual
copy/paste assembly.

This slice adds deterministic rendering only. It does not change the packet
schema, collect additional git data, publish the package, add persistent packet
storage, or create agent-specific prompt dialects.

## User Outcome

A local CLI user can run:

```bash
open-relay render review-request packet.json
```

and receive Markdown on stdout using the protocol's documented 11-section
order. If they pass `--output relay.md`, Open Relay writes the same Markdown to
that path and prints a sanitized success message.

## Scope

### Included

- Add a `render review-request` CLI route.
- Read an existing packet JSON file.
- Validate the packet with the existing `validatePacket` path before rendering.
- Render Markdown in this exact order:
  1. Review request
  2. Goal
  3. Repository context
  4. Change summary
  5. Changed files
  6. Verification
  7. Risks and assumptions
  8. Provenance
  9. Redactions
  10. Sensitive data
  11. Next action
- Preserve the packet's own `requested_review.audience`, focus, and requested
  output instead of hardcoding Codex or Claude behavior.
- Support stdout by default and `--output <relay.md>` for explicit file output.
- Sanitize parse, validation, and write failures so CLI errors do not echo raw
  packet contents, secret-shaped values, or output paths.
- Export the renderer from the package entrypoint for programmatic use.
- Add unit and CLI tests for render order, table output, optional fields,
  invalid JSON, schema-invalid packets, output-path handling, and package
  exports.

### Deferred

- Direct `generate review-request --format markdown`.
- Side-by-side JSON and Markdown generation in one command.
- Agent-specific prompt variants such as `--template claude` or
  `--template codex`.
- Persistent packet storage location.
- Private redaction rule files.
- Package publishing and live release smoke.

## Command Shape

```bash
open-relay render review-request <packet.json> [--output <relay.md>]
```

Parsing is intentionally small and strict:

- Missing packet path exits `2`.
- Unknown flags exit `2`.
- Duplicate `--output` exits `2`.
- Extra positional arguments exit `2`.
- Invalid JSON exits `1` with `Invalid JSON in <packet.json>`.
- Schema-invalid packets exit `1` with validation errors but no raw packet
  content.
- Output write failures exit `1` with `Could not write review-request Markdown.`

## Architecture

Create a pure renderer module:

```ts
renderReviewRequestMarkdown(packet: ReviewRequestPacket): string
```

The module receives an already-validated `ReviewRequestPacket` and returns a
Markdown string ending in a single newline. It has no filesystem or process
dependencies. The CLI owns reading JSON, validating it, writing output, and
printing sanitized errors.

This keeps rendering reusable for a later `generate --format markdown` command:
that future path can build a packet, validate it, then call the same renderer
without reimplementing presentation logic.

## Rendering Rules

- Render packet metadata at the top:
  - packet version
  - packet type
  - created timestamp
- Use stable headings that match the existing example:
  - `# Review Request Relay Packet`
  - `## Review Request`
  - `## Goal`
  - `## Repository Context`
  - `## Change Summary`
  - `## Changed Files`
  - `## Verification`
  - `## Risks And Assumptions`
  - `## Provenance`
  - `## Redactions`
  - `## Sensitive Data`
  - `## Next Action`
- Render arrays as comma-separated prose when compact and tables when tabular.
- Escape Markdown table cell pipes and line breaks so packet values cannot
  corrupt table structure.
- Render missing optional repository fields as `redacted` or omit them when the
  existing example omits them:
  - `repository.local_path` missing renders as `redacted`.
  - `repository.remote_url` missing is omitted.
  - `repository.pull_request_url` missing is omitted.
- Render empty `excluded_scope`, `verification`, `risks`, `provenance`, or
  `redactions` honestly with neutral empty-state text.
- Render `sensitive_data` when present. If absent, say no sensitive-data note
  was provided.
- Normalize line breaks in inline and bullet-list values so packet strings
  cannot accidentally create new Markdown bullets, headings, or table rows.
- Keep the rendered `examples/review-request/relay.json` output byte-for-byte
  aligned with the committed `examples/review-request/relay.md`, or update the
  example through the same implementation PR when an intentional format change
  is made.

## Security And Privacy

The renderer must not collect or infer new data. It only formats fields already
present in the packet. Validation and file-read errors must avoid echoing raw
JSON parser excerpts, packet contents, secret-shaped values, or output paths.

The renderer may render sensitive-looking values if they are already present in
the packet because the packet is the source of truth. The CLI's responsibility
is to avoid leaking additional values in error paths.

Free-text packet fields such as `goal`, `change_summary.summary`, and
`next_action` are prompt-injection surfaces because the rendered Markdown is
intended for an AI reviewer. For this first renderer they remain packet-authored
content, but the implementation must record that risk in tests or docs and must
normalize accidental line-break injection in inline and list contexts. Fenced or
quoted free-text rendering is a future hardening option if real packets show
that packet-authored instructions are too ambiguous.

## Lifecycle And Scope Coverage

| Area | Decision |
| --- | --- |
| Lifecycle | Adds the first create/render path for Markdown relay packets; edit/delete/storage remain deferred. |
| Scope | Local CLI and programmatic renderer only. No hosted, MCP, package publishing, or persistent storage behavior. |
| Permissions | Local user controls input and optional output path. No network or cross-repository access is added. |
| Ownership | Rendered Markdown is owned by the local CLI user. |
| Audit | Git history, PR review, tests, and CLI smoke provide evidence. No runtime telemetry is added. |
| Notifications | Deferred; no notification surface exists. |
| Recovery | Failed renders leave stdout empty; failed writes print sanitized errors. Existing input packets are not modified. |
| Smoke | `npm run check`, `git diff --check`, example render smoke, output-file smoke, and invalid JSON leak smoke. |

## Testing Strategy

- Unit-test `renderReviewRequestMarkdown` against the example packet.
- Snapshot-test the example packet render against
  `examples/review-request/relay.md` so the committed Markdown example cannot
  drift from the renderer.
- Assert the 11 section headings appear in protocol order.
- Assert changed files, verification, risks, provenance, redactions, sensitive
  data, and next action render from packet fields.
- Assert table cells escape pipes and line breaks, and inline/list fields
  normalize line breaks.
- CLI-test stdout rendering from `examples/review-request/relay.json`.
- CLI-test `--output` file rendering and sanitized success output.
- CLI-test invalid JSON and schema-invalid packet failures.
- CLI-test output write failure does not echo the sensitive output path.
- Package-entrypoint smoke-test that `renderReviewRequestMarkdown` is exported.

## Open Decisions

- Permanent packet storage remains `Unknown; needs owner decision`.
- Package and release target remains `Unknown; needs owner decision`.
- Agent-specific templates remain deferred until the neutral renderer is proven.
