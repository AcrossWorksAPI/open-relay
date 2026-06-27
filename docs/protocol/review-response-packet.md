# Review Response Relay Packet

Last updated: 2026-06-27

## Purpose

A `review-response` packet is the reviewer's structured answer to a
`review-request` or reviewed change. It records the review outcome, confidence,
findings, inspected scope, verification evidence, limits, redactions, and next
action in a machine-validatable shape.

This packet is reviewer-authored. It is not a transport mechanism, PR comment
poster, merge decision executor, or generated summary of local git state.

## Smallest Useful Packet

The smallest useful `review-response` packet must answer these questions:

1. Which request or change does this response answer?
2. Who or what reviewed it?
3. What was the review outcome?
4. How confident is the reviewer?
5. What findings were raised?
6. Which files, commands, checks, or evidence were inspected?
7. What limits or access gaps affected the review?
8. What should the receiver do next?
9. What was intentionally omitted or redacted?

If a packet cannot answer those questions, it is not ready to close a review
loop.

## Packet Fields

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `packet_version` | string | Yes | Must be `0.1`. |
| `packet_type` | string | Yes | Must be `review-response`. |
| `created_at` | string | Yes | ISO-8601 timestamp when the response was created. |
| `response_to` | object | Yes | Stable reference to the request or reviewed change. |
| `reviewer` | object | Yes | Reviewer identity and kind. |
| `outcome` | string | Yes | `approved`, `changes_requested`, `commentary`, or `blocked`. |
| `confidence` | string | Yes | `high`, `medium`, or `low`. |
| `summary` | string | Yes | Concise review summary. |
| `findings` | array | Yes | Structured findings; use an empty array when none exist. |
| `reviewed_scope` | object | Yes | Reviewed files and limitations. |
| `verification` | array | Yes | Commands or checks considered; use an empty array when none were run. |
| `provenance` | array | No | External evidence not already captured elsewhere. |
| `redactions` | array | Yes | Omitted or transformed fields; use an empty array when none exist. |
| `sensitive_data` | object | No | Optional sensitive-data exclusion note. |
| `next_action` | string | Yes | What the receiver should do next. |

## Object Shapes

### `response_to`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `packet_type` | string | Yes | Usually `review-request`, but not restricted for future response targets. |
| `packet_version` | string | Yes | Version of the packet or request being answered. |
| `repository` | string | Yes | Repository owner/name or local project name. |
| `working_branch` | string | Yes | Branch under review. |
| `base_commit` | string | Yes | Fixed lower bound for the reviewed diff. |
| `head_commit` | string | Yes | Fixed upper bound for the reviewed diff. |
| `diff_range` | string | Yes | Reproducible range, such as `base..head`. |
| `pull_request_url` | string | No | Safe PR URL when available. |
| `storage_id` | string | No | Saved request bundle id when available. |
| `source` | string | No | Human-readable source label. |

`response_to` references the request instead of embedding it. The receiver must
use the named repository, commits, PR, or saved packet when deeper inspection is
needed.

### `reviewer`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | Yes | Reviewer display name. |
| `kind` | string | Yes | `agent`, `human`, or `unknown`. |
| `tool` | string | No | Tool, model, or environment when useful and safe. |
| `requested_by` | string | No | Human or agent that requested the review. |

### `findings[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | Yes | Stable short id such as `F1`. |
| `severity` | string | Yes | `high`, `medium`, `low`, or `info`. |
| `blocking` | boolean | Yes | Whether this finding blocks merge or continuation. |
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
| `files` | array | Yes | Reviewed files or sections; use an empty array when none were directly inspected. |
| `limitations` | array | Yes | Access gaps, skipped areas, assumptions, or reasons the review is partial. |

### `verification[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `kind` | string | Yes | `command`, `ci`, `manual`, or `external`. |
| `command` | string | Yes | Command, check name, or evidence label. |
| `result` | string | Yes | `passed`, `failed`, `not_run`, or `unknown`. |
| `evidence` | string | Yes | Short evidence note, URL, run ID, or reason. |

`verification` uses the same shape as `review-request` so checks have one
stable vocabulary across request and response packets.

### `provenance[]`, `redactions[]`, And `sensitive_data`

`provenance`, `redactions`, and `sensitive_data` use the same object shapes as
`review-request`.

## Outcome Rules

- `approved`: no finding may have `blocking: true`.
- `changes_requested`: at least one finding must have `blocking: true`.
- `commentary`: no finding may have `blocking: true`.
- `blocked`: `reviewed_scope.limitations` must contain at least one limitation.

These rules are semantic checks layered on top of JSON Schema validation.

## Markdown Rendering

A human-readable render uses this order:

1. Review response
2. Response to
3. Reviewer
4. Outcome and confidence
5. Summary
6. Findings
7. Reviewed scope
8. Verification
9. Provenance
10. Redactions
11. Sensitive data
12. Next action

Markdown rendering must escape table pipes, normalize inline/list line breaks,
and strip backticks from code-span values. Block free-text fields such as
`summary`, `findings[].description`, and `next_action` remain packet-authored
prompt surfaces under the same accepted posture as `review-request`.

## Non-Goals

This packet does not:

- generate a review response from Claude or another reviewer;
- parse Markdown reviews into JSON;
- post comments to GitHub;
- trigger Codex fixes or auto-merge;
- save review responses under `.open-relay/`;
- define a transport boundary;
- add agent-specific prompt dialects.
