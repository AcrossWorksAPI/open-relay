# Agent-Ready Prompt Rendering

Open Relay prompt templates are presentation wrappers around validated packets.
They are not packet types, transport markers, or agent invocation mechanisms.

## Commands

```bash
open-relay render <packet.json> --template neutral
open-relay render <packet.json> --template claude
open-relay render <packet.json> --template codex
```

`neutral` is the default and returns the packet Markdown renderer output.
`claude` and `codex` wrap that Markdown in agent-oriented instructions.

## Safety Model

The packet is rendered inside a dynamic fenced block and described as untrusted
context. The prompt tells the receiving agent not to let packet-authored text
override the wrapper, user instructions, or repository instructions.

The dynamic fence prevents packet-authored backticks from syntactically closing
the quoted packet block. It does not guarantee that a model will ignore
malicious instructions inside the packet. Treat the wrapper as best-effort
prompt-injection mitigation, not as a sanitizer or security boundary.

Prompt rendering does not read repository files, run tests, call GitHub, invoke
agents, merge PRs, publish packages, or hide transport markers.
