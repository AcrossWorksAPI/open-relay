# npm Release Runbook

## First Release Target

- Package: `@acrossworks/open-relay`
- First version: `0.1.0`
- Tag: `v0.1.0`
- Publish path: GitHub Release published event using npm trusted publishing
  and provenance.

## Required Owner Setup

1. Confirm the npm org/account can publish `@acrossworks/open-relay`.
2. Configure npm trusted publishing for this GitHub repository:
   - package: `@acrossworks/open-relay`
   - repository owner: `AcrossWorksAPI`
   - repository name: `open-relay`
   - workflow filename: `release.yml`
   - environment: leave blank unless a GitHub environment is intentionally
     added later.
3. Confirm branch protection still requires `Governance Checks`.
4. Confirm the release PR changed `package.json`, `package-lock.json`,
   `CHANGELOG.md`, and release docs intentionally.
5. Confirm `package.json` on `main` still has `private: true`; the release
   workflow deletes that field only in the checked-out release job.
6. Confirm the release workflow uses Node.js 24, disables package-manager
   caching, and does not reference `NPM_TOKEN`.

## Pre-Publish Checklist

Run locally before creating the release:

```bash
npm ci
npm run check
npm run smoke:pack
npm run release:preflight -- 0.1.0
git diff --check
```

Expected: all commands pass.

## Publish Steps

1. Merge the release implementation PR.
2. Confirm local `main` matches `origin/main`.
3. Create tag `v0.1.0` from `main`.
4. Create and publish a non-prerelease GitHub Release for `v0.1.0`.
5. Wait for `Open Relay Release / Publish npm package`.
6. If the workflow fails, do not retry blindly. Read the log, fix in a PR, and
   publish a corrected release only after checks pass.

Pre-release tags such as `v0.1.0-rc.1` are intentionally unsupported by the
first release workflow.

## Post-Publish Smoke

Use a clean temp project:

```bash
tmpdir="$(mktemp -d)"
cd "$tmpdir"
npm init -y
npm install @acrossworks/open-relay@0.1.0
npx open-relay --help
npx open-relay validate /path/to/open-relay/examples/review-request/relay.json
npx open-relay render /path/to/open-relay/examples/review-response/relay.json
```

Record the npm package URL, GitHub Release URL, workflow run URL, and smoke
output in `docs/STATUS.md` and `docs/planning/VERSION_LEDGER.md`.

## Rollback Or Bad Release

Do not rewrite git history after a public publish. For a bad release:

1. Decide whether npm deprecation is needed.
2. Publish a patch release with the fix.
3. Record the bad version, corrective version, and smoke evidence in the
   version ledger.

## Emergency Fallback

Trusted publishing is the supported release path. If trusted publishing is
unavailable, do not add an npm token to GitHub Actions. A fallback requires a
separate owner-approved plan for a one-time manual publish using a granular,
short-lived npm token that is never committed, logged, or stored as a GitHub
secret.
