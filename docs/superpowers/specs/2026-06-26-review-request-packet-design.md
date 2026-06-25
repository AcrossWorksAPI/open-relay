# Review Request Packet Design

Last updated: 2026-06-26

## Goal

Define the smallest useful Open Relay packet for handing completed Codex work to
Claude for review without extra copy/paste.

## Recommended Approach

Use a narrow `review-request` packet first. It should be human-readable in
Markdown, machine-readable in JSON, source-linked through inline evidence and
optional provenance entries, and honest about verification gaps and redactions.

This avoids choosing a runtime before the protocol shape is useful. The packet
is a pointer-and-framing artifact, not a diff bundle, so it must state that the
reviewer needs repository access and must pin the review range with base and
head commits.

## Alternatives Considered

| Approach | Tradeoff |
| --- | --- |
| Generic all-purpose packet | Flexible, but too vague to prove immediate value. |
| Review-request packet first | Narrow, concrete, and directly useful for the current Codex-to-Claude workflow. |
| Full JSON Schema first | Precise, but likely premature before the example survives review. |

## Design

The first packet type is `review-request`. It must include:

- goal
- repository, branch, access, and fixed diff-range context
- exhaustive changed-file summary
- verification evidence
- known risks
- requested review focus
- optional additional provenance links
- redaction notes
- next action

The packet has two renderings:

- `relay.md` for humans and agent prompts
- `relay.json` for future tools

The Markdown and JSON examples should contain the same facts.

## Review Question

Claude should review the PR with this question:

> Could you perform a useful review from this packet without asking the human to
> paste extra context?

## Out Of Scope

- CLI implementation
- runtime selection
- JSON Schema generation
- MCP server support
- package publishing
- private redaction-rule syntax
- embedding full diffs in the packet
