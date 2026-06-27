# Review Response Packet Design

Last updated: 2026-06-27

## Purpose

The protocol envelope now supports multiple packet types. The next packet type
should close the first useful loop:

1. Codex creates a `review-request`.
2. A reviewer reads the packet and the referenced repository or PR.
3. The reviewer returns a structured `review-response`.
4. Codex or a human can decide whether to merge, fix, re-review, or stop.

This design defines `review-response` version `0.1`. It is a
reviewer-authored packet, not an implementation handoff and not a transport
mechanism. It records the review verdict, findings, evidence, limits, and next
action in a machine-validatable shape.

## Decision

Use a flat packet with:

- `packet_type: "review-response"`;
- `packet_version: "0.1"`;
- a `response_to` object that pins the original `review-request` context;
- an `outcome` enum for the review decision;
- structured findings and review evidence;
- a required `next_action` for the receiver.

The first implementation should add validation and rendering only. It should
not add external delivery, PR commenting, merge automation, global storage, or
agent-specific templates.

## Alternatives Considered

| Approach | Tradeoff |
| --- | --- |
| Free-form Markdown review only | Easy for humans, but not machine-validatable and cannot safely drive later automation. |
| Embed the entire original `review-request` packet | Self-contained, but duplicates large content, increases leak risk, and makes response packets drift from the request source. |
| Reference the original request by repository, diff range, PR, and optional saved packet id | Chosen. Keeps the response compact while preserving reproducible context and storage linkage. |

## Smallest Useful Packet

A `review-response` packet must answer:

1. Which `review-request` or change does this response answer?
2. Who or what reviewed it?
3. What was the review outcome?
4. How confident is the reviewer?
5. What findings, if any, were raised?
6. Which files, commands, checks, or evidence were inspected?
7. What limits or access gaps affected the review?
8. What should the receiver do next?
9. What was intentionally omitted or redacted?

If it cannot answer those questions, it is not useful enough to close a review
loop.

## Packet Fields

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `packet_version` | string | Yes | Must be `0.1` for this packet. |
| `packet_type` | string | Yes | Must be `review-response`. |
| `created_at` | string | Yes | ISO-8601 timestamp when the response packet was created. |
| `response_to` | object | Yes | Stable reference to the review request or reviewed change. |
| `reviewer` | object | Yes | Reviewer identity and kind. |
| `outcome` | string | Yes | Review decision: `approved`, `changes_requested`, `commentary`, or `blocked`. |
| `confidence` | string | Yes | Reviewer confidence: `high`, `medium`, or `low`. |
| `summary` | string | Yes | Concise review summary. |
| `findings` | array | Yes | Structured issues, nits, risks, or observations; use an empty array when none exist. |
| `reviewed_scope` | object | Yes | Files, commands, checks, and limitations covered by the review. |
| `provenance` | array | No | External or source-linked evidence not already captured in findings or reviewed scope. |
| `redactions` | array | Yes | Sensitive details intentionally omitted or transformed; use an empty array when none exist. |
| `sensitive_data` | object | No | Optional note about secret, token, private log, or customer data exclusion. |
| `next_action` | string | Yes | What the receiver should do next. |

## Object Shapes

### `response_to`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `packet_type` | string | Yes | Usually `review-request`. |
| `packet_version` | string | Yes | Version of the request packet being answered. |
| `repository` | string | Yes | Repository owner/name or local project name from the request. |
| `working_branch` | string | Yes | Branch under review. |
| `base_commit` | string | Yes | Fixed lower bound for the reviewed diff. |
| `head_commit` | string | Yes | Fixed upper bound for the reviewed diff. |
| `diff_range` | string | Yes | Reproducible range, such as `base..head`. |
| `pull_request_url` | string | No | Safe PR URL when available. |
| `storage_id` | string | No | Repo-local saved packet id when the request came from `save review-request`. |
| `source` | string | No | Human-readable source label such as `PR #31`, `relay.md`, or `GitHub comment`. |

`response_to` intentionally references the request instead of embedding it.
The receiver must still use the named repository, commits, PR, or saved packet
when deeper inspection is needed.

### `reviewer`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | Yes | Reviewer display name, for example `Claude`, `Codex`, or a human name. |
| `kind` | string | Yes | `agent`, `human`, or `unknown`. |
| `tool` | string | No | Tool, model, or environment when useful and safe. |
| `requested_by` | string | No | Human or agent that requested the review. |

### `findings[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | Yes | Stable short id such as `F1`. |
| `severity` | string | Yes | `high`, `medium`, `low`, or `info`. |
| `blocking` | boolean | Yes | Whether this finding should block merge or implementation continuation. |
| `title` | string | Yes | Short finding title. |
| `description` | string | Yes | What is wrong, risky, unclear, or noteworthy. |
| `evidence` | string | Yes | Source-linked evidence or reasoning. |
| `recommendation` | string | Yes | Concrete requested change or owner decision. |
| `location` | object | No | Optional file/line/symbol pointer. |

### `location`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `path` | string | Yes | Repo-relative file path. |
| `line` | number | No | 1-based line number when available. |
| `symbol` | string | No | Function, command, section, or object name when useful. |

### `reviewed_scope`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `files` | array | Yes | Files or doc sections reviewed; use an empty array when none were directly inspected. |
| `checks` | array | Yes | Commands, CI checks, manual checks, or external checks the reviewer considered. |
| `limitations` | array | Yes | Access gaps, assumptions, skipped areas, or reasons the review is partial. |

### `reviewed_scope.files[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `path` | string | Yes | Repo-relative file path or documented source label. |
| `notes` | string | No | Short note about why it was reviewed. |

### `reviewed_scope.checks[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `kind` | string | Yes | `command`, `ci`, `manual`, or `external`. |
| `command` | string | Yes | Command, check name, or evidence label. |
| `result` | string | Yes | `passed`, `failed`, `not_run`, or `unknown`. |
| `evidence` | string | Yes | Short evidence note, URL, run ID, or reason. |

### `provenance[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | string | Yes | `pull_request`, `ci_run`, `commit`, `issue`, `user_note`, or `external_url`. |
| `reference` | string | Yes | URL, commit SHA, issue ID, or note label. |
| `supports` | string | Yes | Claim supported by the reference. |

### `redactions[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `field` | string | Yes | Packet field that was omitted or transformed. |
| `reason` | string | Yes | Why the value was omitted or transformed. |
| `replacement` | string | No | Safe replacement value, when useful. |

### `sensitive_data`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `excluded` | boolean | Yes | Whether secrets, tokens, private logs, customer data, or private repository content were excluded. |
| `notes` | string | Yes | Short human-readable exclusion note. |

## Outcome Rules

- `approved`: no blocking findings; receiver may proceed if local policy allows.
- `changes_requested`: at least one finding must have `blocking: true`.
- `commentary`: advisory review with no approval decision.
- `blocked`: reviewer could not complete the review; `reviewed_scope.limitations`
  must explain why.

These rules are semantic checks for the implementation plan. They are intended
to catch contradictory packets such as `approved` with blocking high-severity
findings, or `blocked` with no limitation.

## JSON Shape

```json
{
  "packet_version": "0.1",
  "packet_type": "review-response",
  "created_at": "2026-06-27T00:00:00.000Z",
  "response_to": {
    "packet_type": "review-request",
    "packet_version": "0.1",
    "repository": "AcrossWorksAPI/open-relay",
    "working_branch": "codex/relay-protocol-envelope-implementation",
    "base_commit": "7f79246",
    "head_commit": "beeda6b",
    "diff_range": "7f79246..beeda6b",
    "pull_request_url": "https://github.com/AcrossWorksAPI/open-relay/pull/31",
    "source": "PR #31 review"
  },
  "reviewer": {
    "name": "Claude",
    "kind": "agent",
    "tool": "GitHub PR review"
  },
  "outcome": "approved",
  "confidence": "high",
  "summary": "The implementation is non-breaking and safe to merge.",
  "findings": [
    {
      "id": "F1",
      "severity": "low",
      "blocking": false,
      "title": "Validation messages are still review-request-specific",
      "description": "The validate command labels unsupported packets as invalid review-request packets.",
      "evidence": "A bogus packet prints 'Invalid review-request packet' before the correct unsupported type/version error.",
      "recommendation": "Make validate command messages packet-neutral or type-aware before the second packet type is user-visible."
    }
  ],
  "reviewed_scope": {
    "files": [
      {
        "path": "src/schema.ts",
        "notes": "Validator dispatch path reviewed."
      }
    ],
    "checks": [
      {
        "kind": "command",
        "command": "npm run check",
        "result": "passed",
        "evidence": "77 tests passed at PR head."
      }
    ],
    "limitations": []
  },
  "provenance": [],
  "redactions": [],
  "sensitive_data": {
    "excluded": true,
    "notes": "No secrets, private logs, or customer data included."
  },
  "next_action": "Merge the PR, then fix the validate-message seam with the review-response implementation."
}
```

## Markdown Rendering

A human-readable `review-response` Markdown render should use this order:

1. Review response
2. Response to
3. Reviewer
4. Outcome
5. Summary
6. Findings
7. Reviewed scope
8. Provenance
9. Redactions
10. Sensitive data
11. Next action

The renderer should preserve the existing escaping posture:

- escape Markdown table pipes and line breaks;
- strip or normalize code-span backticks where values are wrapped in code;
- normalize inline/list line breaks so packet-authored text cannot create
  accidental headings, bullets, or table rows.

Block free-text fields such as `summary`, `findings[].description`, and
`next_action` remain packet-authored prompt surfaces, matching the current
review-request renderer posture.

## CLI And Registry Implications

The implementation should:

- add `schemas/review-response.schema.json`;
- register `review-response` `0.1` in `src/schemaRegistry.ts`;
- add a `renderReviewResponseMarkdown` renderer and register it in
  `src/renderPacket.ts`;
- add `open-relay render review-response <packet.json> [--output <relay.md>]`;
- keep `open-relay render review-request` unchanged;
- make `open-relay validate <packet.json>` messages packet-neutral or type-aware
  instead of saying `review-request` for every invalid packet;
- add example JSON and Markdown under `examples/review-response/`;
- export the review-response renderer from `src/index.ts`.

This keeps public commands explicit while using the generic dispatcher
internally. A future generic `open-relay render <packet.json>` alias remains
deferred until more packet types exist.

## Security And Privacy

`review-response` must not echo raw request packets, private diff contents, or
secret-shaped values merely to explain a review. Findings should cite file
paths, line numbers, PR URLs, commits, CI runs, or short evidence notes.

Unsupported packet errors and validation errors must remain sanitized. The
validate-message fix must not introduce raw packet-content echoes.

## Lifecycle And Scope Coverage

| Area | Decision |
| --- | --- |
| Create | First implementation accepts authored JSON examples and validation/rendering. Automatic generation from Claude/GitHub is deferred. |
| List/view | Rendering to Markdown is included. Storage list/read surfaces are deferred. |
| Edit/update | Packet edits are manual JSON edits in this slice. Mutation workflows are deferred. |
| Archive/delete | Deferred to future storage commands. |
| Ownership | The reviewer owns packet contents; the local user decides whether to trust or act on them. |
| Permissions | Local CLI only. No external agent access, PR write access, merge authority, or hosted sync. |
| Audit | Git history, PR review, examples, schema tests, renderer tests, and CI provide evidence. |
| Notifications | Deferred; this packet does not send itself anywhere. |
| Billing/quota | N/A for local CLI. |
| Recovery/smoke | Invalid packets fail validation; renderer tests and package smoke prove installed behavior. |

## Testing Strategy

- Validate a committed `examples/review-response/relay.json` packet.
- Snapshot render it against `examples/review-response/relay.md`.
- Test all `outcome`, `confidence`, `severity`, `kind`, and `result` enum
  values that the schema accepts.
- Test semantic rules:
  - `changes_requested` requires at least one blocking finding;
  - `approved` rejects blocking findings;
  - `blocked` requires at least one limitation.
- Test `validate` success and failure messages are packet-neutral or type-aware.
- Test unsupported `review-response` version still reports supported
  combinations and does not echo non-dispatch fields.
- Test `render review-response` stdout, `--output`, parser failures, invalid
  JSON, schema-invalid JSON, and sanitized write failures.
- Test `renderPacketMarkdown` dispatches review-response without changing
  review-request rendering.
- Run `npm run check`, `npm run smoke:pack`, and `git diff --check`.

## Deferred

- `generate review-response` from Claude output.
- Parsing Markdown reviews into JSON.
- Posting review responses to GitHub PR comments.
- Triggering Codex fixes or auto-merge decisions.
- Saving review-response bundles under `.open-relay/`.
- Generic `render <packet.json>` CLI alias.
- Agent-specific prompt dialects.

## Open Decisions

- First transport boundary remains `Unknown; needs owner decision`.
- Whether response packets should eventually be saved next to their originating
  request bundle remains `Unknown; needs owner decision`.
- Whether findings need stable cross-packet lifecycle ids beyond `F1`, `F2`,
  etc. remains a future decision after the first implementation.
