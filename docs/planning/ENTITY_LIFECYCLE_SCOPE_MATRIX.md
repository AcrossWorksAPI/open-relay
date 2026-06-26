# Entity Lifecycle Scope Matrix

Last updated: 2026-06-26

Allowed cell values: `Shipped`, `In progress`, `Planned`, `Deferred`,
`Future candidate`, `N/A`, `Unknown`, `GAP`.

## Current Snapshot

| Entity or surface | Create/invite/attach | List/search/view | Edit/update | Activate/deactivate/archive | Remove/delete/offboard | Transfer/reassignment/ownership | Notes/support metadata | Permissions/roles/scope | Audit/events | Notifications | Billing/quota | Error/empty/recovery/smoke | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Roadmap governance docs | Shipped | Shipped | Shipped | Planned | N/A | N/A | Shipped | Planned | Planned | N/A | N/A | Planned | Docs created in this baseline; git history becomes evidence after commit. |
| Local Codex roadmap skill | Shipped | Shipped | Shipped | Planned | N/A | N/A | Shipped | N/A | Planned | N/A | N/A | Planned | Project-local skill at `.codex/skills/project-roadmap-system/SKILL.md`. |
| Relay packet | In progress | Shipped | Planned | Planned | Planned | N/A | Shipped | Planned | In progress | Deferred | N/A | Shipped | Review-request docs, examples, and validation are shipped; packet creation is implemented on draft PR #14 but not merged. |
| Relay packet schema | Shipped | Shipped | Planned | Planned | Planned | N/A | Shipped | Planned | Planned | N/A | N/A | Shipped | Formal JSON Schema and CLI validation merged in PR #11; future schema versions need version-aware validation. |
| Render template | Planned | Planned | Planned | Planned | Planned | N/A | Planned | Planned | Planned | N/A | N/A | Planned | Initial review-request Markdown rendering order is documented; template tooling remains planned. |
| Local repository context collector | In progress | In progress | Planned | N/A | N/A | N/A | In progress | In progress | In progress | N/A | N/A | In progress | Draft PR #14 collects base/head commits, diff range, changed files, safe remote metadata, and fail-closed redaction defaults. |
| Review loop | Future candidate | Future candidate | Future candidate | Future candidate | Future candidate | N/A | Future candidate | Future candidate | Future candidate | Deferred | N/A | Future candidate | Implementation handoff, review request, review response, resume project. |
| Manager/library/assignment surfaces | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown; needs owner decision if multi-user or hosted scope appears. |
| Runtime/deployment surfaces | Shipped | Shipped | Shipped | N/A | N/A | N/A | Shipped | Planned | Planned | N/A | N/A | Shipped | TypeScript package, CLI source, tests, runtime CI, and local validation smoke merged in PR #11; package publishing and release smoke remain planned. |

## Assignment And Scope Matrix

| Actor role | Item scope | Allowed actions | Blocked actions | Ownership | Transfer/reassignment | Inactive user behavior | Audit/event requirements |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Repository owner | Governance docs and roadmap workflow | Approve direction, merge PRs, set release gates | Destructive commands without explicit approval | Repository and release decisions | Unknown; needs owner decision | Unknown; needs owner decision | Git history and PR review |
| Local CLI user | Local repository workspace | Generate, validate, render, and delete local relay packets | Access secrets or files outside allowed local scope | Owns local packets | N/A | N/A | Local command evidence and packet provenance |
| External reviewer agent | Rendered packet only | Review the packet and return findings or plan feedback | Read unstated local files, secrets, or raw unredacted data | N/A | N/A | N/A | Review response should cite packet evidence |
| Future maintainer/operator | Runtime/package/release surfaces | Unknown; needs owner decision | Unknown; needs owner decision | Unknown; needs owner decision | Unknown; needs owner decision | Unknown; needs owner decision | Unknown; needs owner decision |
