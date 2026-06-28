# Review Request Relay Packet

Last updated: 2026-06-28

## Purpose

A `review-request` packet gives a second reviewer enough structured context to
review completed work without the human reassembling goal, branch, files,
checks, risks, and review focus by hand.

This first packet type is a pointer-and-framing artifact, not a diff bundle. It
assumes the reviewer has read access to the named repository, branch, and commit
range. If the reviewer cannot access that source, the diff or patch must be
attached outside the packet.

The first target workflow is:

> Codex has completed work in a repository. Generate a Claude-ready review
> packet from local git state.

## Smallest Useful Packet

The smallest useful `review-request` packet must answer these questions:

1. What was the goal?
2. Which repository, branch, and fixed diff range does this concern?
3. What changed?
4. Which files should the reviewer inspect first?
5. What checks or tests were run?
6. What risks, assumptions, or known gaps remain?
7. What kind of review is requested?
8. What evidence supports each claim?
9. What was intentionally excluded or redacted?

If a packet cannot answer those questions, it is not ready for a useful
cross-agent review.

## Packet Fields

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `packet_version` | string | Yes | Version of the packet format. Start with `0.1`. |
| `packet_type` | string | Yes | Must be `review-request` for this packet. |
| `created_at` | string | Yes | ISO-8601 timestamp when the packet was generated. |
| `goal` | string | Yes | One or two sentences describing the intended outcome. |
| `requested_review` | object | Yes | Review audience, review focus, and requested output. |
| `repository` | object | Yes | Repo name, access assumption, branch, base commit, head commit, and diff range. |
| `change_summary` | object | Yes | Human summary of changed files and behavioral intent. |
| `changed_files` | array | Yes | Exhaustive file-level list with role, status, and review priority. |
| `verification` | array | Yes | Commands, checks, or evidence used to validate the work. |
| `risks` | array | Yes | Known risks, assumptions, gaps, and follow-up notes. |
| `provenance` | array | No | Additional source-linked evidence not already captured in file or verification entries. |
| `redactions` | array | Yes | Sensitive details intentionally omitted or transformed; use an empty array when none exist. |
| `sensitive_data` | object | No | Optional note about secret, token, private log, or customer data exclusion. |
| `next_action` | string | Yes | What the receiver should do next. |

## Reviewer Access And Diff Range

A `review-request` packet must make reviewer access explicit:

- If the reviewer can read the repository, set `repository.reviewer_access` to
  the required access level or assumption.
- If the reviewer cannot read the repository, attach the diff out-of-band and
  mention that in `risks`.
- Always include `repository.base_commit`, `repository.head_commit`, and
  `repository.diff_range` when git history is available.

`base_branch` is useful context, but it is not enough to reproduce a diff
because the branch can move after packet generation.

## Object Shapes

The first protocol shape uses these object keys. A later JSON Schema should
turn these into machine-validated requirements.

### `requested_review`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `audience` | string | Yes | Human or agent expected to review. |
| `focus` | array of strings | Yes | Short review focus areas. |
| `requested_output` | string | Yes | Desired review format. |

### `repository`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `name` | string | Yes | Repository owner/name or local project name. |
| `remote_url` | string | No | Include only when public or safe. |
| `local_path` | string | No | Omit or redact if sensitive. |
| `base_branch` | string | Yes | Human branch context. |
| `working_branch` | string | Yes | Branch under review. |
| `base_commit` | string | Yes | Fixed lower bound for the diff. |
| `head_commit` | string | Yes | Fixed upper bound for the diff. |
| `diff_range` | string | Yes | Reproducible range, such as `base..head`. |
| `pull_request_url` | string | No | Include when available and safe. |
| `reviewer_access` | string | Yes | Access assumption or attachment requirement. |

### `change_summary`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `summary` | string | Yes | Short description of the change. |
| `behavioral_intent` | string | Yes | What the change intends to affect. |
| `excluded_scope` | array of strings | Yes | Explicit non-goals for this packet. |
| `total_files_changed` | number | Yes | Must equal the number of `changed_files` entries. |

### `changed_files[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `path` | string | Yes | Repo-relative file path. |
| `status` | string | Yes | `added`, `modified`, `deleted`, `renamed`, or `unknown`. |
| `role` | string | Yes | Why the file matters to the review. |
| `review_priority` | string | Yes | `high`, `medium`, or `low`. |
| `evidence` | string | No | Inline evidence when the file role is not obvious; generators may use this for safe diff-stat notes. |

`changed_files` must be exhaustive for the diff range. Review priority can help
the reviewer start in the right place, but it must not hide lower-priority files.
Generated packets may populate `changed_files[].evidence` with git-derived
line-count evidence such as `Diff stats: +12 -3.` or
`Diff stats: binary file.`. These counts help triage review effort without
embedding raw diff hunks or file contents. If git cannot provide stats safely,
omit the stat evidence for that file.

### `verification[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `kind` | string | Yes | `command`, `ci`, `manual`, or `external`. |
| `command` | string | Yes | Command, check name, or evidence label. |
| `result` | string | Yes | `passed`, `failed`, `not_run`, or `unknown`. |
| `evidence` | string | Yes | Short evidence note, URL, run ID, or reason. |

Use `result: "not_run"` to record a skipped command or check. `kind` should
describe the check type, not its result.

### `risks[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `severity` | string | Yes | `high`, `medium`, `low`, or `info`. |
| `description` | string | Yes | Risk, assumption, or gap. |
| `handling` | string | Yes | Current handling or proposed follow-up. |

### `provenance[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `type` | string | Yes | `pull_request`, `ci_run`, `commit`, `issue`, `user_note`, or `external_url`. |
| `reference` | string | Yes | URL, commit SHA, issue ID, or note label. |
| `supports` | string | Yes | Claim supported by the reference. |

Use `provenance` for evidence that does not belong naturally in `changed_files`
or `verification`. Do not duplicate every file path or command there.

### `redactions[]`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `field` | string | Yes | Packet field that was omitted or transformed. |
| `reason` | string | Yes | Why the value was omitted or transformed. |
| `replacement` | string | No | Safe replacement value, when useful. |

Do not use placeholder redactions such as `field: "all"` for a general "no
secrets included" claim. Use an empty `redactions` array when no field was
redacted, and use `sensitive_data` for optional exclusion notes.

Generators may apply private redaction rules before output. A redaction rule
file must not be embedded in the packet; only the resulting `redactions[]`
records should appear. Matching is case-insensitive and literal-only. Redaction
records should name generic fields such as `changed_files[].path` and must not
reveal the matched private value. Rule names, reasons, and replacements must
not contain configured match values because they can appear in audit metadata.

### `sensitive_data`

| Key | Type | Required | Notes |
| --- | --- | --- | --- |
| `excluded` | boolean | Yes | Whether secrets, tokens, private logs, customer data, or private repository content were excluded. |
| `notes` | string | Yes | Short human-readable exclusion note. |

## Field Rules

- `packet_version` should change only when the format changes.
- `packet_type` must be stable and machine-readable.
- `goal` should describe the work, not the reviewer instruction.
- `requested_review.focus` should be short enough to scan.
- `repository.local_path` can be omitted or redacted if local paths are
  sensitive.
- `repository.remote_url` should be included only when it is public or safe.
- `repository.base_commit` and `repository.head_commit` must pin a reproducible
  diff when git history is available.
- `changed_files[].review_priority` should be `high`, `medium`, or `low`.
- `changed_files[].evidence` should stay compact and must not include raw diff
  hunks or file contents.
- `verification[].result` should be `passed`, `failed`, `not_run`, or
  `unknown`.
- `risks[].severity` should be `high`, `medium`, `low`, or `info`.
- `provenance` entries should point to PRs, CI runs, commits, issues, external
  URLs, or user notes that are not already captured elsewhere.
- `redactions` must say what was removed and why without revealing the
  sensitive value; empty arrays are acceptable.

## Markdown Rendering

A human-readable `relay.md` should render the same packet in this order:

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

Markdown should be concise enough to paste into an AI review prompt, but it
must not hide risk or verification gaps.

## JSON Shape

The initial JSON packet is an object with stable top-level keys:

```json
{
  "packet_version": "0.1",
  "packet_type": "review-request",
  "created_at": "2026-06-26T00:00:00Z",
  "goal": "...",
  "requested_review": {},
  "repository": {},
  "change_summary": {},
  "changed_files": [],
  "verification": [],
  "risks": [],
  "provenance": [],
  "redactions": [],
  "sensitive_data": {},
  "next_action": "..."
}
```

`provenance` and `sensitive_data` are optional top-level keys. This is a
protocol shape, not a final JSON Schema. A later slice should convert it into
`schemas/relay.schema.json` after the example packet survives review.

Under the protocol envelope, `review-request` keeps `additionalProperties:
false`. Any new accepted field, including optional additions, requires a new
`packet_version` unless a future version explicitly defines an extension point.

## Review-Ready Standard

A `review-request` packet is review-ready when:

- It names the review focus clearly.
- It states whether the reviewer has repository access.
- It pins the review range with base and head commits.
- It includes enough changed-file context to guide inspection.
- It makes `changed_files` exhaustive for the diff range.
- It distinguishes passed checks from checks that were not run.
- It lists known risks instead of burying them.
- It links claims to evidence without duplicating every file and command in
  parallel arrays.
- It states redactions honestly.
- It avoids secrets, private logs, tokens, and raw sensitive local data.

## Non-Goals

This first packet does not:

- Execute an agent.
- Replace a pull request.
- Store long-term memory.
- Define every future packet type.
- Implement the TypeScript CLI runtime.
- Define package publishing or release flow.
- Include private redaction rule syntax beyond the required redaction notes.

## Example Files

- Markdown example: `examples/review-request/relay.md`
- JSON example: `examples/review-request/relay.json`
