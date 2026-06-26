# Entity Lifecycle Scope Matrix

Last updated: 2026-06-26

Allowed cell values: `Shipped`, `In progress`, `Planned`, `Deferred`,
`Future candidate`, `N/A`, `Unknown`, `GAP`.

## Current Snapshot

| Entity or surface | Create/invite/attach | List/search/view | Edit/update | Activate/deactivate/archive | Remove/delete/offboard | Transfer/reassignment/ownership | Notes/support metadata | Permissions/roles/scope | Audit/events | Notifications | Billing/quota | Error/empty/recovery/smoke | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Roadmap governance docs | Shipped | Shipped | Shipped | Planned | N/A | N/A | Shipped | Planned | Planned | N/A | N/A | Planned | Docs created in this baseline; git history becomes evidence after commit. |
| Local Codex roadmap skill | Shipped | Shipped | Shipped | Planned | N/A | N/A | Shipped | N/A | Planned | N/A | N/A | Planned | Project-local skill at `.codex/skills/project-roadmap-system/SKILL.md`. |
| Relay packet | Shipped | Shipped | Planned | Planned | Planned | N/A | Shipped | Planned | Shipped | Deferred | N/A | Shipped | Review-request docs, examples, validation, JSON-only packet generation, and Markdown rendering are merged. |
| Relay packet schema | Shipped | Shipped | Planned | Planned | Planned | N/A | Shipped | Planned | Planned | N/A | N/A | Shipped | Formal JSON Schema and CLI validation merged in PR #11; future schema versions need version-aware validation. |
| Render template | Shipped | Shipped | Planned | Planned | Planned | N/A | Shipped | Planned | Shipped | N/A | N/A | Shipped | Review-request Markdown renderer and direct generator Markdown output are merged with CLI routes, package export, snapshot/parser/escaping tests, installed-package smoke, and sanitized error handling; agent-specific dialects remain deferred. |
| Local repository context collector | Shipped | Shipped | Planned | N/A | N/A | N/A | Shipped | Shipped | Shipped | N/A | N/A | Shipped | Merged generator collects base/head commits, diff range, changed files, safe remote metadata, and fail-closed redaction defaults. |
| Review loop | Shipped | Future candidate | Future candidate | Future candidate | Future candidate | N/A | Future candidate | Future candidate | Future candidate | Deferred | N/A | Shipped | Local review-request handoff creation is shipped through `handoff review-request`; review response, resume project, notifications, and external agent invocation remain future candidates. |
| Packet storage | In progress | Planned | Future candidate | Future candidate | Future candidate | N/A | Planned | Planned | Planned | Deferred | N/A | In progress | Repo-local `.open-relay/review-requests` planning is active for saved review-request bundles; global storage, list/read/delete/archive, retention, and hosted sync remain deferred. |
| Manager/library/assignment surfaces | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown; needs owner decision if multi-user or hosted scope appears. |
| Runtime/deployment surfaces | Shipped | Shipped | Shipped | N/A | N/A | N/A | Shipped | Planned | Shipped | N/A | N/A | Shipped | TypeScript package, CLI source, validation/generator/render tests, runtime CI, package target, and local tarball install smoke are merged; registry publishing remains planned. |

## Assignment And Scope Matrix

| Actor role | Item scope | Allowed actions | Blocked actions | Ownership | Transfer/reassignment | Inactive user behavior | Audit/event requirements |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Repository owner | Governance docs and roadmap workflow | Approve direction, merge PRs, set release gates | Destructive commands without explicit approval | Repository and release decisions | Unknown; needs owner decision | Unknown; needs owner decision | Git history and PR review |
| Local CLI user | Local repository workspace | Generate, validate, render, and delete local relay packets | Access secrets or files outside allowed local scope | Owns local packets | N/A | N/A | Local command evidence and packet provenance |
| External reviewer agent | Rendered packet only | Review the packet and return findings or plan feedback | Read unstated local files, secrets, or raw unredacted data | N/A | N/A | N/A | Review response should cite packet evidence |
| Future maintainer/operator | Runtime/package/release surfaces | Unknown; needs owner decision | Unknown; needs owner decision | Unknown; needs owner decision | Unknown; needs owner decision | Unknown; needs owner decision | Unknown; needs owner decision |
