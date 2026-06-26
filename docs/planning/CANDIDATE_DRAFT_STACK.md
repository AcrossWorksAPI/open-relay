# Candidate Draft Stack

Last updated: 2026-06-26

Candidate packets are review-ready only after the owner confirms applicability.
Each candidate should become its own branch and PR.

| Candidate | Goal | Exclusions | Dependencies | First slice | Review focus | Verification/smoke expectation |
| --- | --- | --- | --- | --- | --- | --- |
| PC-001 Smallest useful relay packet | Define required fields for a review-request packet from local git state. | Runtime choice, CLI implementation, hosted sync. | Owner answers packet-scope questions. | Draft packet examples in Markdown and JSON. | Field completeness, provenance, redaction, and agent usefulness. | Validate examples by checklist and `git diff --check`. |
| PC-002 Runtime and verification baseline | Implement the TypeScript CLI scaffold and define local commands. | Product generator features and deployment. | PC-001 packet shape and runtime/schema CLI plan. | Add package config, formal schema, validation command, and verified commands. | No hidden stack assumptions; commands are real. | Run `npm ci`, runtime checks, and `git diff --check`. |
| PC-003 Review-request CLI MVP | Generate a packet from branch, status, changed files, diff summary, tests, risks, and requested action. | Multi-agent execution, hosted app, deep IDE integration. | Runtime baseline and packet schema. | One command emits `relay.md` and `relay.json`. | Provenance, safe redaction, useful defaults. | CLI smoke in a sample git repo. |
| PC-004 Render templates | Render Codex-ready and Claude-ready prompts from one packet. | Vendor-specific automation beyond templates. | Review-request CLI MVP. | Two templates render from same packet fixture. | Prompt clarity and no stale/manual context gaps. | Snapshot or fixture tests for rendered output. |
| PC-005 MCP server candidate | Expose packet validation/rendering as MCP tools. | Replacing CLI as primary MVP. | CLI usefulness proven. | One local MCP tool validates a packet. | Scope control and local-file safety. | Local MCP smoke with sample packet. |
