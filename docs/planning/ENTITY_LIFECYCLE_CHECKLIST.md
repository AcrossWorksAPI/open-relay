# Entity Lifecycle Checklist

Last updated: 2026-06-26

For each entity or surface touched by future work, plans must explicitly cover
or defer every lens below. Do not omit a lens because it is inconvenient; mark
it `N/A`, `Deferred`, `Future candidate`, `GAP`, or `Unknown; needs owner
decision` with a reason.

## Required Lifecycle Lenses

| Lens | Required question |
| --- | --- |
| Create/invite/attach | How is the entity created, invited, attached, imported, or initialized? |
| List/search/view | How is it found, listed, searched, filtered, opened, and viewed? |
| Edit/update | Which fields or relationships can change, and by whom? |
| Activate/deactivate/archive | How can the entity be paused, archived, restored, or made inactive? |
| Remove/delete/offboard | What removal path exists, and what safeguards apply? |
| Transfer/reassignment/ownership | Who owns it, and how can ownership or assignment move? |
| Internal notes/support metadata | What private operational metadata exists, and who can see it? |
| Permissions/roles/scope | Which actor scopes allow or block each action? |
| Audit/events | Which events are recorded, retained, and reviewed? |
| Notifications | Which actor receives which notification, and how is delivery proven? |
| Billing/quota impact | Does the action affect billing, limits, quotas, or plan entitlements? |
| Error/empty/recovery/smoke states | What happens when data is empty, invalid, partial, failed, or recovered? |

## Assignment And Scope Matrix Requirement

Manager, library, and assignment-heavy surfaces must include a matrix covering:

- actor roles
- item scope
- allowed actions
- blocked actions
- ownership
- transfer/reassignment
- inactive user behavior
- audit/event requirements

## Closeout Rule

When work ships or is deferred, update
`docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md` with evidence and status.
