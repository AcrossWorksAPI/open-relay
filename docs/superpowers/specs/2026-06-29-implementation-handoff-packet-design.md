# Implementation Handoff Packet Design

Date: 2026-06-29

## Purpose

`implementation-handoff` is the pre-implementation packet that gives Codex or
another implementer a structured work brief before code or docs are changed.

It fills the remaining MVP review-loop slot:

1. A human or agent prepares an `implementation-handoff`.
2. An implementer uses that packet to do the work.
3. The implementer generates a `review-request`.
4. A reviewer returns a `review-response`.
5. The implementer can generate a `resume-project` packet when follow-up is
   needed.

The packet answers: "What should be implemented, where is the source of truth,
what is in and out of scope, what gates apply, and how should the work be
verified?"

It does not apply changes, run commands, post to GitHub, create issues, merge,
publish, or invoke an agent.

## User Story

As a local user, I can prepare an explicit draft file and run:

```bash
open-relay generate implementation-handoff \
  --draft implementation-handoff-draft.json \
  --format markdown \
  --output implementation-handoff.md

open-relay render implementation-handoff.json --template codex \
  --output codex-implementation-handoff.md
```

The first command creates a validated `implementation-handoff/0.1` packet from
the draft. The second command uses the existing prompt renderer to wrap that
packet for Codex as untrusted context.

## Design Calls

### Build From An Explicit Draft, Not From Chat Or Git Diff

The producer accepts one user-authored JSON draft. It does not parse chat logs,
native GitHub issues, free-form Markdown, current terminal history, or a raw git
diff.

Rationale: this packet is a work-order artifact, not a post-change summary.
Open Relay should make the handoff explicit and machine-validatable instead of
guessing intent from surrounding conversation.

### Generate A Packet, Not Another Handoff Alias

`render --template codex|claude` already creates agent-ready prompt wrappers
from any validated packet. This slice should add a packet entity, not another
command that only re-emits existing output.

The command is therefore:

```text
open-relay generate implementation-handoff --draft <draft.json> [--format json|markdown] [--output <path>]
```

No `handoff implementation-handoff`, `assign`, `start`, or external
orchestration alias is added in this slice.

### Keep Work Intent Separate From Review Evidence

`implementation-handoff` describes planned work and planned verification. It
does not claim that implementation verification has passed.

The packet therefore uses `verification_plan` rather than `verification`.
Completed command evidence belongs in a later `review-request` packet.

### Use Protocol-Owned Safety Gates

Open Relay generates static safety gates:

- preserve unrelated changes;
- require human approval for merge;
- require human approval for publish;
- require human approval for destructive commands;
- require human approval for scope expansion.

The draft cannot override these gates. They are guardrails for implementers and
reviewers, not enforcement hooks.

### Keep Target Context Pointer-Based

The draft supplies target repository, branch, and optional starting commit or PR
context. The producer does not expand remotes, inspect local paths, call GitHub,
or read project files beyond the explicit draft path.

This keeps private workspace state out of the packet unless the author
deliberately includes it.

## Alternatives Considered

| Approach | Tradeoff |
| --- | --- |
| Generate from free-form Markdown | Convenient, but it requires prose parsing and makes source-of-truth ambiguity part of the protocol. Rejected for `0.1`. |
| Generate from a GitHub issue URL | Useful later, but requires network, auth, and native issue import. Rejected for the local-first MVP slice. |
| Generate from an explicit JSON draft | Chosen. It is local, deterministic, testable, and matches the existing reviewer-produced `review-response` workflow pattern. |
| Add `handoff implementation-handoff` | Rejected. It would duplicate `generate`/`render` output surfaces and conflict with the roadmap rule against new re-emission aliases. |

## Smallest Useful Packet

An `implementation-handoff` packet must answer these questions:

1. Who or what authored the handoff?
2. Who is expected to implement it?
3. Which repository, branch, or work target does it concern?
4. What is the implementation objective?
5. Which sources, plans, issues, packets, or notes support the work?
6. What is explicitly in scope and out of scope?
7. What tasks should be attempted?
8. What constraints and owner decisions limit the work?
9. What acceptance criteria define done?
10. Which checks should be run or considered after implementation?
11. What safety gates apply?
12. What was intentionally omitted or redacted?
13. What should the receiver do next?

If a packet cannot answer those questions, it is not ready to guide a reliable
implementation handoff.

## Packet Fields

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `packet_version` | string | Yes | Must be `0.1`. |
| `packet_type` | string | Yes | Must be `implementation-handoff`. |
| `created_at` | string | Yes | ISO-8601 timestamp when the packet was generated. |
| `handoff_from` | object | Yes | Author identity and source. |
| `implementer` | object | Yes | Intended receiver identity or role. |
| `target` | object | Yes | Repository, branch, and optional PR or starting commit context. |
| `objective` | string | Yes | One concise statement of the intended work. |
| `source_materials` | array | Yes | Source plans, docs, issues, packets, or notes supporting the work. |
| `work_scope` | object | Yes | Explicit included and excluded scope. |
| `tasks` | array | Yes | Implementation tasks; at least one required. |
| `constraints` | array | Yes | Security, scope, lifecycle, owner-decision, or verification constraints. |
| `acceptance_criteria` | array | Yes | Done criteria for the implementer and reviewer. |
| `verification_plan` | array | Yes | Checks the implementer should run or consider after changes. |
| `safety_gates` | object | Yes | Protocol-owned side-effect gates. |
| `provenance` | array | No | External evidence not already captured as source material. |
| `redactions` | array | Yes | Omitted or transformed fields; empty array when none. |
| `sensitive_data` | object | No | Optional sensitive-data exclusion note. |
| `next_action` | string | Yes | What the receiver should do next. |

## Object Shapes

### `handoff_from`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | Yes | Author display name, such as `Cam`, `Codex`, or `Claude`. |
| `kind` | string | Yes | `human`, `agent`, or `unknown`. |
| `source` | string | Yes | Human-readable source label, such as `owner brief` or `planning packet`. |
| `tool` | string | No | Tool, model, or environment when useful and safe. |

### `implementer`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | Yes | Intended receiver display name or role. |
| `kind` | string | Yes | `human`, `agent`, or `unknown`. |
| `tool` | string | No | Tool, model, or environment when useful and safe. |

### `target`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `repository` | string | Yes | Repository owner/name or local project name. |
| `base_branch` | string | Yes | Intended comparison or integration branch. |
| `working_branch` | string | Yes | Intended implementation branch. |
| `starting_commit` | string | No | Optional commit the implementer should start from. |
| `pull_request_url` | string | No | Existing PR URL when the handoff targets follow-up work. |
| `storage_id` | string | No | Related saved packet bundle id when present. |

`target` is author-supplied. The producer does not infer remotes, local paths,
or commits from the current working tree.

### `source_materials[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | string | Yes | `plan`, `doc`, `issue`, `pull_request`, `packet`, `user_note`, or `external_url`. |
| `reference` | string | Yes | Repo-relative path, URL, issue id, packet id, or note label. |
| `summary` | string | Yes | Why this source matters for the implementation. |

At least one source material is required. A handoff with no source is just a
free-form instruction and should be rejected.

### `work_scope`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `included` | array of strings | Yes | Concrete work that is in scope; at least one item. |
| `excluded` | array of strings | Yes | Non-goals, deferrals, or blocked actions; empty only when the author explicitly has none. |

### `tasks[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | string | Yes | Stable short id such as `T1`. |
| `title` | string | Yes | Short task title. |
| `description` | string | Yes | What to do and why. |
| `priority` | string | Yes | `high`, `medium`, or `low`. |
| `source_refs` | array of strings | Yes | References to `source_materials[].reference`. |

Task ids must be unique. Tasks are ordered by the handoff author; priority helps
triage but does not hide lower-priority work. Task-level acceptance references
are deferred for `0.1`; `acceptance_criteria` remains a packet-level string
list until stable criterion ids are designed.

### `constraints[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | string | Yes | `security`, `scope`, `lifecycle`, `owner_decision`, `verification`, or `other`. |
| `description` | string | Yes | Constraint or decision boundary. |
| `handling` | string | Yes | How the implementer should handle it. |

Use constraints for explicit guardrails, not for general implementation prose.

### `verification_plan[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `kind` | string | Yes | `command`, `ci`, `manual`, or `external`. |
| `command` | string | Yes | Command or check name. |
| `purpose` | string | Yes | Why the check is expected. |
| `required` | boolean | Yes | Whether the receiver should treat the check as required for closeout. |

`verification_plan` is not proof of execution. Later implementation output
should record actual results in `review-request.verification`.

### `safety_gates`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `preserve_unrelated_changes` | boolean | Yes | Always `true` for generated packets. |
| `requires_human_approval_for_merge` | boolean | Yes | Always `true` for generated packets. |
| `requires_human_approval_for_publish` | boolean | Yes | Always `true` for generated packets. |
| `requires_human_approval_for_destructive_commands` | boolean | Yes | Always `true` for generated packets. |
| `requires_human_approval_for_scope_expansion` | boolean | Yes | Always `true` for generated packets. |

## Draft Contract

The draft file should include packet-authored fields only:

- `handoff_from`
- `implementer`
- `target`
- `objective`
- `source_materials`
- `work_scope`
- `tasks`
- `constraints`
- `acceptance_criteria`
- `verification_plan`
- `provenance`
- `redactions`
- `sensitive_data`
- `next_action`

The parser must reject unknown draft keys and protocol-owned keys such as
`packet_type`, `packet_version`, `created_at`, and `safety_gates`.

This mirrors the existing review-response draft guard posture: misspelled or
reserved keys fail closed instead of silently dropping author intent.

## Schema And Semantic Rules

Schema validation owns required fields, object shapes, enum values, rejected
unknown fields, and minimum collection sizes:

- `tasks` must contain at least one item.
- `source_materials` must contain at least one item.
- `work_scope.included` must contain at least one item.
- `acceptance_criteria` must contain at least one item.
- `verification_plan` must contain at least one item.

Schema validation is not enough for cross-field or protocol-owned invariants.
The registry semantic check should enforce:

- `tasks[].id` values must be unique.
- generated `safety_gates` values must all be `true`.

The producer should also verify that every `tasks[].source_refs[]` value
matches a value in `source_materials[].reference`. This is producer-tested
because JSON Schema does not express this cross-reference cleanly in the current
registry path, and human-readable source labels would make the rule too weak to
guide implementation.

## Markdown Rendering

A human-readable render uses this order:

1. Implementation handoff
2. Handoff from
3. Implementer
4. Target
5. Objective
6. Source materials
7. Work scope
8. Tasks
9. Constraints
10. Acceptance criteria
11. Verification plan
12. Safety gates
13. Provenance
14. Redactions
15. Sensitive data
16. Next action

Tasks and constraints render as readable blocks, not table rows, because their
descriptions and handling text are prose fields.

Markdown rendering must use the existing shared helpers for table escaping,
code-span text, inline normalization, and label rendering.

## CLI Behavior

```text
open-relay generate implementation-handoff --draft <draft.json> [--format json|markdown] [--output <path>]
```

Behavior:

1. Parse arguments strictly.
2. Reject missing, unknown, duplicate, or invalid flags with exit code `2`.
3. Read the draft JSON.
4. Reject invalid JSON with a sanitized file-level error.
5. Reject unknown or protocol-owned draft keys.
6. Build an `implementation-handoff/0.1` packet and add protocol-owned fields.
7. Validate the generated packet.
8. Print JSON by default or Markdown with `--format markdown`.
9. Write to `--output` when supplied.

Error posture:

- invalid JSON: `Invalid JSON in <path>`;
- unknown draft key: `Unknown implementation-handoff draft field: <key>.`;
- reserved draft key: `Implementation-handoff drafts cannot set protocol field: <key>.`;
- unresolved task source reference:
  `Implementation-handoff task <id> source ref must match a source_materials reference.`;
- generated schema failure: `Generated implementation-handoff packet failed validation.`;
- write failure: `Could not write implementation-handoff packet.`;
- output success: `Wrote implementation-handoff packet.`;
- Markdown output success: `Wrote implementation-handoff Markdown.`;
- errors may name field keys and task ids, but must not echo author-supplied
  draft prose or reference values.

## Relationship To Existing Packets

- `implementation-handoff` is pre-work intent.
- `review-request` is post-work review context derived from local git state.
- `review-response` is reviewer-authored review output.
- `resume-project` is post-review continuation context derived from a
  `review-response`.

The implementation-handoff packet may later be referenced from a
`review-request.provenance[]` entry, but this design does not change the
`review-request/0.1` schema.

## Examples

Implementation should add:

- `examples/implementation-handoff/draft.json`
- `examples/implementation-handoff/relay.json`
- `examples/implementation-handoff/relay.md`

The generated packet example should be snapshot-bound so renderer drift is
caught.

## Security And Data Discipline

- The producer reads only the explicit draft file.
- It does not read git, GitHub, environment variables, package registries, or
  local project files beyond the draft path.
- It does not expand local paths or remote URLs.
- It does not run tests or commands.
- It does not invoke Codex, Claude, or any other agent.
- It does not merge, publish, rebase, reset, delete, or write repository source
  files except an explicit `--output` target.
- Packet-authored prose remains untrusted context when rendered into a prompt.
- Prompt templates must continue to tell the receiver to evaluate packet
  instructions against repository instructions and preserve unrelated user
  changes.

## Lifecycle Coverage

| Lens | Decision |
| --- | --- |
| Create/import | Created locally from an explicit JSON draft. |
| List/search/view | Viewed through `validate`, generic `render`, examples, and optional prompt rendering; no storage list command. |
| Edit/update | Not edited by Open Relay; regenerate from the source draft. |
| Activate/archive/delete | Deferred; no storage or retention behavior in this slice. |
| Ownership | Local draft author owns packet-authored intent; Open Relay owns envelope, validation, and safety gates. |
| Permissions/scope | Local file read/write only; no GitHub, registry, or hosted access. |
| Audit/events | Git history, draft JSON, generated packet, and command output are the local evidence. |
| Notifications | Deferred. |
| Billing/quota | N/A. |
| Error/empty/recovery/smoke | Empty optional arrays are valid where documented; empty tasks, sources, acceptance criteria, or verification plan fail closed. |

## Non-Goals

- Free-form Markdown import.
- Native GitHub issue or review import.
- Automatic task decomposition from prose.
- Automatic implementation.
- Automatic test execution.
- Automatic merge, publish, rebase, reset, or destructive commands.
- Agent invocation.
- GitHub fetch/post/update composition.
- Storage under `.open-relay/`.
- Custom user-authored prompt templates.
- Packet version `0.2`.
- Changes to existing packet schemas.

## Review Focus Questions

1. Is an explicit draft file the right first producer boundary for a pre-work
   handoff?
2. Are `verification_plan` and `acceptance_criteria` clear enough to avoid
   confusing planned checks with completed verification evidence?
3. Does the packet include enough target context without reading local git or
   GitHub state?
4. Are protocol-owned safety gates sufficient for a handoff that may be pasted
   into an agent prompt?
5. Does this design correctly avoid external orchestration while completing the
   MVP packet loop?
