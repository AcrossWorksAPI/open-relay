# Direct Markdown Generation Design

## Purpose

Open Relay can already generate a schema-valid `review-request` JSON packet
from local git state and render an existing packet to Markdown. The next slice
removes the two-step handoff for the common review workflow by letting the
generator emit Markdown directly.

This slice adds output-format selection only. It does not change the packet
schema, add agent-specific prompt dialects, choose permanent packet storage,
publish the package, or introduce a hosted/app orchestration layer.

## User Outcome

A local CLI user can run:

```bash
open-relay generate review-request \
  --base origin/main \
  --head HEAD \
  --goal "Review package smoke implementation" \
  --summary "Adds npm pack/install smoke and CI guardrail." \
  --behavioral-intent "Prove the installable package works before publish." \
  --format markdown \
  --output relay.md
```

and receive the same Markdown shape produced by
`open-relay render review-request`, without first writing a temporary JSON
packet.

## Scope

### Included

- Add `--format json|markdown` to `generate review-request`.
- Keep `json` as the default format so existing callers are not broken.
- Render Markdown by reusing the existing `renderReviewRequestMarkdown(packet)`
  function after packet validation.
- Keep `--output` semantics format-aware:
  - JSON format writes packet JSON to stdout or `--output`.
  - Markdown format writes rendered Markdown to stdout or `--output`.
- Keep success messages sanitized:
  - JSON file output prints `Wrote review-request packet.`
  - Markdown file output prints `Wrote review-request Markdown.`
- Preserve the existing `render review-request <packet.json>` command.
- Add parser and CLI tests for explicit JSON, Markdown stdout, Markdown file
  output, invalid format, duplicate format, and sanitized write failure.
- Update package smoke so the installed CLI proves direct Markdown generation.

### Deferred

- A new `handoff` command.
- Side-by-side JSON and Markdown output in one invocation.
- Agent-specific prompt variants such as `--template claude` or
  `--template codex`.
- Persistent packet storage location.
- Private redaction rule files.
- npm registry publish and live release workflow.
- Hosted app orchestration.

## Command Contract

Current command:

```bash
open-relay generate review-request \
  --base <ref> \
  --head <ref> \
  --goal <text> \
  --summary <text> \
  --behavioral-intent <text> \
  [--output <path>]
```

New optional flag:

```bash
[--format json|markdown]
```

Parsing remains strict:

- Missing required flags exit `2`.
- Unknown flags exit `2`.
- Duplicate singleton flags exit `2`, including duplicate `--format`.
- Missing `--format` value exits `2`.
- Unsupported format exits `2` with `Invalid format: <value>`.
- Git collection, packet validation, and write failures preserve the existing
  sanitized error posture.

## Architecture

Extend the existing generator argument parser with:

```ts
type GenerateReviewRequestFormat = "json" | "markdown";
```

and add `format` to `GenerateReviewRequestOptions`, defaulting to `json`.

The CLI generation flow remains:

1. Parse options.
2. Collect local git context.
3. Build a `ReviewRequestPacket`.
4. Validate the packet.
5. Format the validated packet as JSON or Markdown.
6. Write to stdout or the explicit `--output` path.

Markdown generation must call the existing renderer rather than duplicating
presentation code. That makes `render review-request` and
`generate review-request --format markdown` share one Markdown implementation.

## Security And Privacy

This slice must not collect additional data. It only changes the representation
of the packet already built by the generator.

The generator already avoids echoing sensitive git refs and output paths in
error paths. Direct Markdown output must keep that behavior:

- invalid refs do not echo the supplied ref value;
- output write failures do not echo output paths;
- successful file writes do not echo output paths;
- generated Markdown can contain packet-authored text because the packet is the
  intended review payload.

Markdown remains a prompt handoff surface. This slice does not add
agent-specific instruction wrappers; it emits the same neutral renderer output
already reviewed for Markdown escaping and line-break normalization.

## Lifecycle And Scope Coverage

| Area | Decision |
| --- | --- |
| Lifecycle | Adds a second generated packet view, not a new stored entity. Edit, archive, delete, and restore remain deferred with storage. |
| Scope | Local CLI only. No hosted service, MCP server, or app orchestration. |
| Permissions | Local user controls repository, git refs, packet text, and optional output path. No new network access. |
| Ownership | Generated stdout/file output belongs to the local CLI user. |
| Audit | Git history, PR review, tests, and CLI/package smoke provide evidence. No runtime telemetry is added. |
| Notifications | Deferred; no notification surface exists. |
| Billing/quota | N/A; local CLI only. |
| Recovery | Failed generation leaves stdout empty and prints sanitized errors. Existing repository files are not modified except an explicit `--output` target. |
| Smoke | `npm run check`, `npm run smoke:pack`, `git diff --check`, direct Markdown stdout/file smokes, and write-failure leak regression. |

## Testing Strategy

- Parser tests:
  - default format is `json`;
  - `--format markdown` parses;
  - unsupported format is rejected;
  - duplicate `--format` is rejected.
- CLI tests:
  - default generation still emits schema-valid JSON;
  - explicit `--format json` emits schema-valid JSON;
  - `--format markdown` emits Markdown to stdout;
  - `--format markdown --output relay.md` writes Markdown and prints a
    sanitized success message;
  - invalid format exits `2`;
  - Markdown output write failure does not echo sensitive output paths.
- Package smoke:
  - installed CLI generates Markdown from a temp git repo and validates the
    rendered output has `# Review Request Relay Packet` and `## Next Action`.

## Open Decisions

- Permanent packet storage remains `Unknown; needs owner decision`.
- Agent-specific templates remain deferred until the neutral one-command
  Markdown workflow is proven.
- npm publishing remains deferred until owner, version, changelog, tag, and
  `private: true` removal are approved.
