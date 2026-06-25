# Review Request Relay Packet

Last updated: 2026-06-26

## Purpose

A `review-request` packet gives a second reviewer enough structured context to
review completed work without the human reassembling goal, branch, files,
checks, risks, and review focus by hand.

The first target workflow is:

> Codex has completed work in a repository. Generate a Claude-ready review
> packet from local git state.

## Smallest Useful Packet

The smallest useful `review-request` packet must answer these questions:

1. What was the goal?
2. Which repository and branch does this concern?
3. What changed?
4. Which files should the reviewer inspect first?
5. What checks or tests were run?
6. What risks, assumptions, or known gaps remain?
7. What kind of review is requested?
8. What evidence supports each claim?
9. What was intentionally excluded or redacted?

If a packet cannot answer those questions, it is not ready for a useful
cross-agent review.

## Required Fields

| Field | Type | Required | Purpose |
| --- | --- | --- | --- |
| `packet_version` | string | Yes | Version of the packet format. Start with `0.1`. |
| `packet_type` | string | Yes | Must be `review-request` for this packet. |
| `created_at` | string | Yes | ISO-8601 timestamp when the packet was generated. |
| `goal` | string | Yes | One or two sentences describing the intended outcome. |
| `requested_review` | object | Yes | Review audience, review focus, and requested output. |
| `repository` | object | Yes | Repo name, path or URL, branch, base branch, and commit refs when known. |
| `change_summary` | object | Yes | Human summary of changed files and behavioral intent. |
| `changed_files` | array | Yes | File-level list with role, status, and review priority. |
| `verification` | array | Yes | Commands, checks, or evidence used to validate the work. |
| `risks` | array | Yes | Known risks, assumptions, gaps, and follow-up notes. |
| `provenance` | array | Yes | Source-linked evidence for claims in the packet. |
| `redactions` | array | Yes | Sensitive details intentionally omitted or transformed. |
| `next_action` | string | Yes | What the receiver should do next. |

## Field Rules

- `packet_version` should change only when the format changes.
- `packet_type` must be stable and machine-readable.
- `goal` should describe the work, not the reviewer instruction.
- `requested_review.focus` should be short enough to scan.
- `repository.path` can be omitted or redacted if local paths are sensitive.
- `repository.remote_url` should be included only when it is public or safe.
- `changed_files[].review_priority` should be `high`, `medium`, or `low`.
- `verification[].result` should be `passed`, `failed`, `not_run`, or
  `unknown`.
- `risks[].severity` should be `high`, `medium`, `low`, or `info`.
- `provenance` entries should point to files, commands, diffs, commits, PRs,
  issues, or user notes.
- `redactions` must say what was removed and why, without revealing the
  sensitive value.

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
10. Next action

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
  "next_action": "..."
}
```

This is a protocol shape, not a final JSON Schema. A later slice should convert
it into `schemas/relay.schema.json` after the example packet survives review.

## Review-Ready Standard

A `review-request` packet is review-ready when:

- It names the review focus clearly.
- It includes enough changed-file context to guide inspection.
- It distinguishes passed checks from checks that were not run.
- It lists known risks instead of burying them.
- It links claims to evidence.
- It states redactions honestly.
- It avoids secrets, private logs, tokens, and raw sensitive local data.

## Non-Goals

This first packet does not:

- Execute an agent.
- Replace a pull request.
- Store long-term memory.
- Define every future packet type.
- Choose TypeScript or Python.
- Define package publishing or release flow.
- Include private redaction rule syntax beyond the required redaction notes.

## Example Files

- Markdown example: `examples/review-request/relay.md`
- JSON example: `examples/review-request/relay.json`
