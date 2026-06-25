# Security Policy

Open Relay is a local-first project intended to handle repository context,
diffs, notes, and agent handoff packets. Treat packet content as potentially
sensitive until redaction rules and provenance checks prove otherwise.

## Supported Versions

Open Relay is pre-release. Security fixes target the default branch, `main`,
until a versioned release policy exists.

## Reporting A Vulnerability

Please use GitHub private vulnerability reporting for this repository when
available:

`https://github.com/AcrossWorksAPI/open-relay/security/advisories/new`

If private reporting is unavailable, open a public issue that only says you
would like to report a vulnerability. Do not include exploit details, secrets,
tokens, private repository paths, or sensitive payloads in a public issue.

## What To Include

- A concise description of the issue.
- Affected files, commands, packet fields, or workflows.
- Reproduction steps using non-sensitive sample data.
- Expected impact.
- Suggested fix, if known.

## Project Security Principles

- Public or agent-facing packets should be projections, not raw local state.
- Do not include tokens, secrets, object keys, presigned URLs, or private
  credentials in packet JSON, Markdown, prompts, logs, metadata, or audit rows.
- Prefer exact-path allowlists for file reading and packet generation.
- Fail closed for security-sensitive operations.
- Distinguish declared metadata from verified content.
- Do not call content verified unless bytes were actually checked.
- Preserve provenance for claims by linking back to files, commands, diffs, or
  user-provided notes.
