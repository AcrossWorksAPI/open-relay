# Contributing To Open Relay

Thank you for helping shape Open Relay. This project is early, so clarity and
small reviewable changes matter more than volume.

## Current Project Shape

Open Relay is currently defining a local-first handoff and review protocol for
AI-assisted work. There is no runtime or package manager yet. Do not assume
TypeScript, Python, npm, Cloudflare, Render, or any other stack until the repo
adds that configuration.

Start with:

- `README.md`
- `docs/product/PROJECT_BRIEF.md`
- `docs/planning/ROADMAP.md`
- `docs/planning/ACTIVE_WORK.md`
- `AGENTS.md`

## Development Workflow

1. Open or choose an issue, discussion, or roadmap slice.
2. Create a focused branch from `main`.
3. Keep one concept per pull request.
4. Update planning docs when scope, status, risk, or evidence changes.
5. Run the available checks before opening or updating a PR.
6. Ask for review with clear context and evidence.

## Current Checks

Until a runtime exists, run:

```bash
git diff --check
```

The GitHub Actions workflow also checks required files, roadmap table values,
and common sensitive placeholder patterns.

## Pull Request Expectations

Every PR should include:

- What changed.
- Why it changed.
- Verification performed.
- Risks or follow-up work.
- Planning docs updated, or a note saying no planning update was needed.

## Review Style

Open Relay uses findings-first review. Reviewers should lead with bugs, security
or privacy risks, behavioral regressions, missing tests, missing evidence, or
unclear scope. Praise and general commentary can follow after actionable
findings.

Claude should review PRs after CI is passing and before merge when the PR
changes protocol shape, packet fields, templates, security rules, user-facing
docs, or implementation behavior. Small typo-only changes can skip Claude review
unless the maintainer asks for it.

## Security And Privacy

Do not add real secrets, private repo data, customer/client data, or private
conversation logs to examples, fixtures, issues, PRs, or documentation.

Use synthetic examples. If a security concern needs private detail, follow
`SECURITY.md`.
