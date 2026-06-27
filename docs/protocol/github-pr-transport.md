# GitHub PR Packet Transport

Last updated: 2026-06-28

## Purpose

GitHub PR packet transport lets a local Open Relay CLI user post and fetch exact
validated relay packets through GitHub pull request comments. It is the first
outward transport boundary for the review loop.

## Commands

```text
open-relay transport github-pr send <packet.json> --pr <url-or-owner/repo#number> [--dry-run] [--update] [--confirm-public]
open-relay transport github-pr fetch --pr <url-or-owner/repo#number> --packet-type <type> --author <login> [--packet-version <version>] [--output <packet.json>]
```

`send` validates and renders the packet before posting. `fetch` reads marked
comments, filters by author and packet type/version, decodes the marker payload,
and validates the fetched packet before printing or writing it.

With `--update`, `send` edits the newest matching packet comment authored by
the authenticated `gh` user. If no matching comment by that user exists, it
posts a new comment.

## Packet Producer Contract

This transport moves exact Open Relay packets. The reviewing agent or human must
create a valid packet, such as `review-response/0.1`, and post it with `send`
before another agent can retrieve it with `fetch`.

The local way to create reviewer-authored response packets is the producer
workflow:

```text
open-relay generate review-response --request <review-request.json> --review <review-response-draft.json>
open-relay respond github-pr --request <review-request.json> --review <review-response-draft.json> --pr <url-or-owner/repo#number>
```

See `docs/protocol/review-response-producer.md` for the draft contract,
reserved-field guard, unknown-field guard, and `response_to` derivation rules.

`fetch` does not synthesize packets from native GitHub review approvals, review
requests, inline comments, or prose. Native GitHub review import is a separate
future transport mode.

## Marker Contract

The machine-readable payload is a base64-encoded JSON packet in an HTML comment:

```markdown
<!-- open-relay-packet
packet_type: review-request
packet_version: 0.1
payload_base64: eyJwYWNrZXRfdHlwZSI6InJldmlldy1yZXF1ZXN0In0=
-->
# Open Relay Packet: review-request/0.1

<rendered packet markdown>
```

The rendered Markdown is not the machine source of truth. Implementations must
decode the marker payload and validate the decoded packet.

## Authentication

Open Relay uses the local GitHub CLI (`gh`) for authentication. Open Relay does
not read GitHub token environment variables and does not print raw `gh` output
on failure. GitHub CLI failures include only a safe troubleshooting hint to
check `gh auth status` and the PR target.

## Authorship And Trust

`fetch` requires `--author` because valid packet shape is not proof of identity.
The author filter checks GitHub's comment author login. This is a practical
filter, not cryptographic authenticity.

## Public Repositories

Non-dry-run sends check repository visibility. Public repositories require
`--confirm-public` before posting.

## Non-Goals

- Importing native GitHub review state or inline review comments.
- Requesting external reviews.
- Triggering fixes or merges.
- Persisting fetched packets.
- Supporting non-GitHub transports.
