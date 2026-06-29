# Resume Project Relay Packet

Last updated: 2026-06-29

## Purpose

A `resume-project` packet is a local continuation record derived from a
validated `review-response/0.1` packet. It gives Codex or another implementer a
structured, source-linked set of review findings to evaluate next.

It is a packet entity, not just a prompt view. It can be validated, rendered,
transported later, and wrapped with `render --template codex`.

This packet does not apply fixes, run commands, post to GitHub, merge, publish,
or invoke an agent.

## Command

```text
open-relay generate resume-project --response <review-response.json> [--format json|markdown] [--output <path>]
```

The command reads one explicit `review-response` file, validates it through the
generic packet validator, derives a `resume-project/0.1` packet, validates the
generated packet, and emits JSON by default or Markdown with
`--format markdown`.

## Packet Fields

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `packet_version` | string | Yes | Must be `0.1`. |
| `packet_type` | string | Yes | Must be `resume-project`. |
| `created_at` | string | Yes | ISO-8601 timestamp when the resume packet was created. |
| `resume_from` | object | Yes | Stable reference to the source review response. |
| `target` | object | Yes | Repository, branch, commits, and diff being resumed. |
| `resume_status` | string | Yes | Derived continuation status. |
| `confidence` | string | Yes | Copied from the review response. |
| `summary` | string | Yes | Copied review summary. |
| `tasks` | array | Yes | 1:1 producer projection of review findings; empty when none exist. |
| `reviewed_scope` | object | Yes | Reviewed files and limitations from the response. |
| `prior_verification` | array | Yes | Review-time verification evidence from the response. |
| `safety_gates` | object | Yes | Protocol-owned continuation safety gates. |
| `provenance` | array | No | External evidence copied from the response when present. |
| `redactions` | array | Yes | Redactions copied from the response; empty when none exist. |
| `sensitive_data` | object | No | Optional sensitive-data note copied from the response. |
| `next_action` | string | Yes | Copied review next action. |

## Object Shapes

### `resume_from`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `packet_type` | string | Yes | Must be `review-response`. |
| `packet_version` | string | Yes | Source response version. |
| `created_at` | string | Yes | Source response timestamp. |
| `reviewer_name` | string | Yes | Source reviewer display name. |
| `reviewer_kind` | string | Yes | `agent`, `human`, or `unknown`. |
| `outcome` | string | Yes | Source review outcome. |
| `source` | string | Yes | `review-response packet`. |

### `target`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `repository` | string | Yes | Repository owner/name or local project name. |
| `working_branch` | string | Yes | Branch under review. |
| `base_commit` | string | Yes | Fixed lower bound for the reviewed diff. |
| `head_commit` | string | Yes | Fixed upper bound for the reviewed diff. |
| `diff_range` | string | Yes | Reproducible range, such as `base..head`. |
| `pull_request_url` | string | No | Safe PR URL when present. |
| `storage_id` | string | No | Source storage id when present. |

`target` is derived from `review-response.response_to`. Open Relay does not
expand local paths, remotes, request prose, or reviewer draft paths.

### `tasks[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `source_finding_id` | string | Yes | Source review finding id, such as `F1`. |
| `severity` | string | Yes | `high`, `medium`, `low`, or `info`. |
| `blocking` | boolean | Yes | Copied from the finding. |
| `title` | string | Yes | Copied finding title. |
| `description` | string | Yes | Copied finding description. |
| `evidence` | string | Yes | Copied source-linked evidence or reasoning. |
| `recommendation` | string | Yes | Copied requested change or owner decision. |
| `location` | object | No | Copied optional file/line/symbol pointer. |

The official producer maps findings to tasks 1:1 and does not rewrite reviewer
meaning. That faithfulness is a producer property, not a standalone schema
invariant; a hand-edited resume packet can still validate if it satisfies the
packet schema and semantic status rules.

### `reviewed_scope`

`reviewed_scope` uses the same shape as `review-response.reviewed_scope`.

### `prior_verification[]`

`prior_verification` uses the same object shape as `review-response.verification`.

The field is named `prior_verification` because these checks were considered at
review time. They are not proof that the implementer has applied fixes or run
post-fix verification.

### `safety_gates`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `preserve_unrelated_changes` | boolean | Yes | Always `true` for generated packets. |
| `requires_human_approval_for_merge` | boolean | Yes | Always `true` for generated packets. |
| `requires_human_approval_for_publish` | boolean | Yes | Always `true` for generated packets. |
| `requires_human_approval_for_destructive_commands` | boolean | Yes | Always `true` for generated packets. |

Safety gates are guardrails for the receiver. They are not an enforcement
mechanism.

## Status Derivation

| Source `review-response.outcome` | `resume_status` |
| --- | --- |
| `approved` | `owner_decision` |
| `changes_requested` | `address_findings` |
| `commentary` | `continue_with_context` |
| `blocked` | `blocked` |

`owner_decision` is intentionally not named `ready_to_merge`. Review approval
does not bypass owner, CI, branch protection, release, or project gates.

## Semantic Rules

The schema registry enforces:

- `address_findings` requires at least one blocking task.
- `owner_decision` forbids blocking tasks.
- `continue_with_context` forbids blocking tasks.
- `blocked` requires at least one reviewed-scope limitation.

The producer also preserves a 1:1 task projection from response findings.

## Markdown Rendering

A human-readable render uses this order:

1. Resume project
2. Resume from
3. Target
4. Status and confidence
5. Summary
6. Tasks
7. Reviewed scope
8. Prior verification
9. Safety gates
10. Provenance
11. Redactions
12. Sensitive data
13. Next action

Tasks render as readable blocks, not table rows, because descriptions,
evidence, and recommendations are prose fields.

## Relationship To Prompt Rendering

Use:

```bash
open-relay render resume-project.json --template codex --output codex-resume.md
```

to wrap a validated resume packet for Codex. The wrapper treats packet Markdown
as untrusted context. It does not call Codex or authorize side effects.

## Non-Goals

- Open Relay does not apply fixes from a `resume-project` packet.
- Open Relay does not run verification commands automatically.
- Open Relay does not merge, publish, rebase, reset, or delete anything.
- Open Relay does not invoke Codex, Claude, or another agent.
- Open Relay does not fetch or post GitHub comments in this command.
- Open Relay does not import native GitHub reviews.
- Open Relay does not add response or resume storage under `.open-relay/`.
- Open Relay does not add packet version `0.2`.
