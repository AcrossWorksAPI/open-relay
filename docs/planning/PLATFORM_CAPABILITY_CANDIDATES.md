# Platform Capability Candidates

Last updated: 2026-06-26

These are candidate registers, not commitments. Applicability depends on the
local CLI runtime, packet schema, users, distribution path, and whether packets
include sensitive repo data.

| ID | Category | Candidate | Applicability | Status | Trigger | First evidence needed | Source plan |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PC-001 | Protocol | Minimal relay packet schema | Applicable | Candidate | TypeScript CLI direction is approved | JSON schema validates a sample review-request packet | docs/superpowers/plans/2026-06-26-runtime-schema-cli.md |
| PC-002 | Templates | Codex and Claude render templates | Applicable | Candidate | Packet fields stabilize | Rendered prompts include goal, diff summary, tests, risks, and requested action | - |
| PC-003 | Security | Local redaction rules for secrets and sensitive paths | Applicable | Candidate | Packets include diffs, logs, notes, or env metadata | Redaction smoke with seeded secret-like values | - |
| PC-004 | Provenance | Source links for claims, files, commands, and diffs | Applicable | Candidate | Packet generator summarizes repo state | Packet claims link back to files, commands, diffs, or user notes | - |
| PC-005 | Supply chain | Dependency hygiene and update workflow | Future candidate | Candidate | Runtime/dependencies are added | Lockfile, audit policy, update cadence | - |
| PC-006 | Release | Package, version, and release process | Future candidate | Candidate | Runtime schema validation CLI passes local and CI checks | Release checklist and rollback path | docs/superpowers/plans/2026-06-26-runtime-schema-cli.md |
| PC-007 | Storage | Repo-local and/or global packet storage | Unknown; needs owner decision | Candidate | Owner chooses storage model | Storage smoke for create/list/read/delete packet files | - |
| PC-008 | Integration | MCP server readiness | Deferred | Candidate | CLI usefulness is proven | Local MCP smoke with one packet-render tool | - |
| PC-009 | Operations | Error handling and diagnostics for local CLI | Future candidate | Candidate | CLI exists | Failing git repo/no git repo smoke output is neutral and actionable | - |
| PC-010 | AI governance | Provider-neutral prompt governance | Applicable | Candidate | Templates target named agents | Templates avoid vendor lock-in where practical | - |
| PC-011 | Data rights | Packet deletion and local retention guidance | Future candidate | Candidate | Packet storage exists | Delete packet smoke and retention docs | - |
| PC-012 | File intake | Verified content rules for imported notes/files | Future candidate | Candidate | Packets import external files | Imported file bytes are verified before claims say verified | - |
| PC-013 | Notifications | Review delivery handoff | Deferred | Candidate | Agent/host integrations exist | Delivery evidence, not just packet capture | - |
| PC-014 | Billing | Billing, quotas, discounts, refunds | N/A for MVP | Candidate | Paid hosted product is proposed | Owner decision and billing lifecycle tests | - |
| PC-015 | Hosted UX | In-app update notices or release banners | N/A for MVP | Candidate | Hosted UI exists | Banner display and dismiss smoke | - |
