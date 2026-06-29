# Open Relay Agent Instructions

These instructions apply to work in this repository. Follow stricter direct
owner instructions when they exist.

## Project Scope

- Project name: Open Relay.
- Current known scope: local-first AI handoff/review protocol, TypeScript CLI
  validation, review-request packet generation, Markdown/JSON relay packet
  schema, Markdown rendering, direct Markdown generation, local handoff workflow
  command, repo-local packet storage, package-readiness smoke,
  implementation-handoff packet planning, and Across Works roadmap governance.
- Product purpose: Create structured, source-linked relay packets for moving
  project context between AI coding agents, humans, and local repositories.
- Runtime target: TypeScript on Node.js for the first CLI implementation.
- Package manager: npm.
- Deployment target: Local CLI, no hosted MVP.
- Test stack: TypeScript compiler plus Node's built-in test runner.
- Generator behavior: local git-state `review-request` JSON generation.
- Renderer behavior: `review-request` JSON-to-Markdown rendering through
  `open-relay render review-request`.
- Handoff behavior: `open-relay handoff review-request` creates local
  review-request Markdown by composing the existing generator and renderer path.
- Storage behavior: `open-relay save review-request` creates ignored
  repo-local `.open-relay/review-requests/<storage_id>/` bundles containing
  validated JSON, rendered Markdown, and a manifest.
- Prompt rendering behavior: `open-relay render <packet.json> --template
  neutral|claude|codex` preserves neutral Markdown by default and can wrap
  validated packet Markdown in deterministic Claude/Codex prompt instructions.
- Resume behavior: `open-relay generate resume-project` creates a local
  continuation packet from a validated `review-response` without applying fixes
  or invoking agents.
- Non-goals for the current runtime slice: MCP server support, package
  registry publishing, hosted deployment, external agent invocation,
  automatic fixes, automatic merge or publish, custom prompt-template systems,
  global packet storage, storage list/read/delete/archive commands, retention
  policies, and hosted sync.

## Required Starting Point

Before planning, implementing, reviewing, or closing out work, read:

1. `AGENTS.md`
2. `.codex/skills/project-roadmap-system/SKILL.md`
3. `master_build.md`
4. `docs/STATUS.md`
5. `docs/planning/ROADMAP.md`
6. `docs/planning/ACTIVE_WORK.md`
7. `docs/planning/PLAN_REGISTRY.md`
8. `docs/planning/VERSION_LEDGER.md`

Use the local `project-roadmap-system` skill for roadmap, status, planning,
ledger, lifecycle, or closeout work.

## Tool Lookup First

- Use installed plugins, MCP tools, connectors, and local project files before
  manual guessing.
- Use `tool_search` when a connector or MCP capability may fit the task.
- Inspect repository files before assuming npm, Python, Hosted Portal, Studio,
  Cloudflare, Render, or any other stack.
- If a fact is not present in the repository or owner instructions, write
  `Unknown; needs owner decision`.

## Git, Branch, And PR Rules

- Default branch prefix: `codex/`.
- Baseline branch: `codex/project-foundation-baseline`.
- Keep unrelated user changes intact.
- Do not delete, reset, rewrite, or run destructive commands without explicit
  owner approval.
- Use one focused branch and PR per candidate or implementation slice.
- Push and open a draft PR only after verification passes and a remote is
  configured.
- Do not mark anything `Live` without deploy and smoke evidence.
- Closeout must update roadmap, active work, plan registry, version ledger,
  status, and lifecycle/scope matrix when scope or status changes.

## Verification Commands

Discovered from this repository:

- `git diff --check`
- `npm ci`
- `npm run build`
- `npm test`
- `npm run check`
- GitHub Actions: `Open Relay CI / Governance Checks`

## Roadmap Governance

- Keep `docs/planning/ROADMAP.md` parseable Markdown.
- Update `docs/planning/ROADMAP.md`, `docs/planning/ACTIVE_WORK.md`, and
  `docs/planning/PLAN_REGISTRY.md` when scope, priority, status, or source of
  truth changes.
- Roadmap priority cells must use Hosted-Hub-safe values: `High`, `Medium`,
  `Low`, or `-`.
- Update `docs/planning/VERSION_LEDGER.md` when a baseline, version, PR,
  deploy, smoke, or rollback fact changes.
- Hosted Roadmap Hub displays committed snapshots only. Commit local roadmap
  changes before expecting them to appear in cross-project views.
- Source-plan cells in roadmap tables must point to committed repo-relative
  Markdown files or `-`.

## Lifecycle And Scope Gate

Every future plan that touches a core entity, manager surface, library surface,
assignment workflow, customer-facing capability, or destructive operation must
cover or explicitly defer the checklist in
`docs/planning/ENTITY_LIFECYCLE_CHECKLIST.md`.

Update `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md` whenever a capability is
shipped, deferred, discovered as a gap, or no longer applicable.

Manager, library, or assignment-heavy surfaces require an Assignment And Scope
Matrix that defines:

- actor roles
- item scope
- allowed actions
- blocked actions
- ownership
- transfer/reassignment
- inactive user behavior
- audit/event requirements

## Lean Implementation Ladder

For every implementation, prefer the smallest durable solution in this order:

1. Reuse existing project code, components, services, stores, helpers, tests,
   and design tokens.
2. Follow established local patterns before introducing a new pattern.
3. Prefer standard-library, platform-native, or already-installed dependency
   capabilities before adding a dependency.
4. Add dependencies, frameworks, or abstractions only when the plan names the
   reason, risk, owner, and verification path.

This is not a code-golf rule. Do not reduce security, permissions, tenant
isolation, accessibility, lifecycle completeness, audit coverage, error
handling, tests, or clear domain modelling just to save lines or tokens.

## Review, Smoke, And Closeout

- Use findings-first review style for PR/code review: bugs, risks, regressions,
  missing tests, and missing evidence first.
- Closeout must record evidence, not just assertion.
- "Built" is not "live"; "captured" is not "alert delivered"; "backup exists"
  is not "restore proven".
- Prefer neutral tone for empty, new, or unknown states; reserve red for real
  failure.
- Preserve refresh/navigation state where practical for UI work.
- For dependencies, justify why existing code or native APIs are insufficient.

## Security And Data Discipline

- Public/client payloads must be projections, not raw store rows.
- Use exact-path allowlists for doc viewers and file serving.
- Do not expose tokens, secrets, object keys, or presigned URLs in client
  payloads, logs, metadata, or audit rows.
- Validate scoped rows before storage deletion or destructive external calls.
- Fail closed for security. Fail open only for non-critical notification or
  telemetry hooks where explicitly intended.
- Use server-side enforcement for feature flags and permissions; UI disable is
  only convenience.
- For destructive actions, require confirmation proportional to risk.
- For new audit event types, update all allowlists and add consistency tests.
- For uploads, distinguish declared metadata from verified content. Do not call
  content verified unless bytes were actually checked.
- For disaster recovery, prove restore with a scratch target and integrity
  checks, not just backup existence.
- For monitoring, prove notification delivery, not only event capture.
