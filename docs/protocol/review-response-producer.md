# Review Response Producer Workflow

Last updated: 2026-06-28

## Purpose

The review-response producer turns a reviewer-authored draft plus an existing
`review-request` packet into a complete, validated `review-response/0.1`
packet.

The reviewer still authors the review. Open Relay derives the protocol-owned
fields, validates the final packet, renders it when requested, and can hand the
exact packet to GitHub PR packet transport.

## Commands

```text
open-relay generate review-response --request <review-request.json> --review <review-response-draft.json> [--format json|markdown] [--output <path>]
open-relay respond github-pr --request <review-request.json> --review <review-response-draft.json> --pr <url-or-owner/repo#number> [--dry-run] [--update] [--confirm-public]
```

`generate review-response` is the local producer. It prints JSON by default,
or rendered Markdown with `--format markdown`.

`respond github-pr` builds the same validated response packet in memory,
renders it, and sends it through GitHub PR exact-packet transport. It supports
the same `--dry-run`, `--update`, and `--confirm-public` meanings as
`transport github-pr send`.

## Draft Input

The draft file is reviewer-authored JSON. It contains review content only:

```json
{
  "reviewer": {
    "name": "Claude Code",
    "kind": "agent",
    "tool": "Claude Code"
  },
  "outcome": "approved",
  "confidence": "high",
  "summary": "No blocking findings.",
  "findings": [],
  "reviewed_scope": {
    "files": [
      {
        "path": "src/cli.ts",
        "notes": "Reviewed the response producer route."
      }
    ],
    "limitations": []
  },
  "verification": [],
  "redactions": [],
  "next_action": "Merge after CI passes."
}
```

`verification` and `redactions` may be omitted and default to empty arrays.
`provenance` and `sensitive_data` remain optional. The final packet still goes
through the `review-response/0.1` schema and semantic checks.

## Reserved And Unknown Fields

Drafts must not include protocol-owned fields:

- `packet_type`
- `packet_version`
- `created_at`
- `response_to`

Open Relay rejects those reserved fields because it owns the packet envelope
and request linkage. It also rejects unknown draft keys so typos such as
`verificaton` fail closed instead of silently dropping reviewer evidence.

Errors are generic and do not echo draft contents.

## `response_to` Derivation

The producer derives `response_to` from the validated request packet:

- request `packet_type`
- request `packet_version`
- repository name
- working branch
- base commit
- head commit
- diff range
- pull request URL, when present
- source label: `review-request packet`

It does not copy request `repository.local_path`, `remote_url`, or free-form
request prose into `response_to`.

## Relationship To GitHub PR Transport

GitHub PR transport moves exact Open Relay packets. The producer is the local
way for a reviewer to create a valid `review-response` packet before transport
sends it.

`respond github-pr` is a composition command: producer plus existing exact
packet transport. The transport layer still does not infer findings from prose,
native GitHub approvals, or inline comments.

## Non-Goals

- Calling Claude, Codex, or another reviewer.
- Inferring findings from Markdown or PR prose.
- Importing native GitHub review state.
- Posting native GitHub reviews.
- Triggering fixes, commits, rebases, merges, or auto-merge.
- Saving response bundles under `.open-relay/`.
- Adding agent-specific prompt templates.
