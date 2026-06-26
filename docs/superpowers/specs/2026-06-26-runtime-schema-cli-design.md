# Runtime Schema CLI Design

Last updated: 2026-06-26

## Goal

Record the approved first implementation direction for Open Relay: a local
TypeScript CLI that validates the reviewed `review-request` packet shape before
adding packet generation, render-template expansion, MCP support, or package
publishing.

## Decision

Open Relay should start with a TypeScript CLI on Node.js, managed by npm. The
first implementation slice should add runtime configuration, a formal JSON
Schema for the reviewed `review-request` packet, and a small CLI command that
validates packet JSON against that schema.

The owner-approved direction is:

- TypeScript first.
- CLI-only for the MVP.
- JSON Schema before packet generation.
- MCP server support deferred until the CLI is useful and stable.

This decision closes the TypeScript-versus-Python and CLI-versus-MCP questions
for the first implementation slice. It does not choose package publishing,
release cadence, packet storage location, or private redaction-rule syntax.

## Recommended Approach

Build the first code slice as a dependency-light TypeScript CLI:

1. Add Node/npm runtime configuration without publishing the package yet.
2. Convert `docs/protocol/review-request-packet.md` and
   `examples/review-request/relay.json` into
   `schemas/review-request.schema.json`.
3. Add a schema validation module and tests that prove the synthetic example is
   accepted, malformed packets are rejected, and `total_files_changed` matches
   the `changed_files` entry count.
4. Add `open-relay validate <packet.json>` as the first CLI command.
5. Update GitHub Actions to run runtime checks after the package exists.

This keeps the first implementation honest: the project can validate the packet
contract before it starts generating packets from real repositories.

## Alternatives Considered

| Approach | Tradeoff |
| --- | --- |
| TypeScript CLI first | Matches the expected open-source developer workflow, keeps future npm distribution natural, and lets the CLI grow into MCP support later. |
| Python CLI first | Good for scripting and local automation, but less natural for npm-style open-source CLI distribution and future TypeScript-based agent tooling. |
| MCP server first | Useful later for agent integrations, but premature before the packet contract and local CLI behavior are proven. |
| Schema only, no CLI | Safest as documentation, but does not create a usable product surface or runtime verification command. |

## Architecture

The first runtime slice should keep boundaries small:

- `schemas/review-request.schema.json` is the machine contract.
- `src/schema.ts` loads and validates packets.
- `src/cli.ts` owns argument parsing, user-facing messages, and exit codes.
- `src/index.ts` exports reusable validation functions for future commands.
- `tests/` proves schema and CLI behavior through Node's built-in test runner.

The CLI should use Node standard-library argument handling for the first slice.
JSON Schema validation should use a dedicated validator library because Node
does not provide native JSON Schema validation.

## Data Flow

`open-relay validate examples/review-request/relay.json` should:

1. Read the packet file from the local filesystem.
2. Parse JSON with a clear parse-error message if the file is invalid JSON.
3. Validate the parsed object against `schemas/review-request.schema.json`.
4. Run semantic checks that JSON Schema cannot express cleanly, including the
   changed-file count match.
5. Print a short success message and exit `0` when valid.
6. Print actionable schema or semantic errors and exit non-zero when invalid.

The CLI must not read repository diffs, shell history, logs, environment
variables, or user directories in this first slice.

## Error Handling

The first CLI command should fail closed:

- Missing path: print usage and exit non-zero.
- Unreadable file: print the path and operating-system error message.
- Invalid JSON: print parse failure without echoing large file contents.
- Schema failure: print the JSON pointer or field path and validator message.
- Unexpected error: print a concise failure and exit non-zero.

## Security And Privacy

The validation slice should not collect local repository data. It only reads a
packet file explicitly named by the user.

Sensitive-data handling remains protocol-level in this slice:

- `redactions` and `sensitive_data` stay part of the schema.
- Private redaction-rule syntax is deferred.
- Automatic secret scanning of repository diffs is deferred until a generator
  reads real repository content.

## Lifecycle Coverage

| Lens | Handling for this slice |
| --- | --- |
| Create/invite/attach | Validate existing local packet files only; packet generation is a later slice. |
| List/search/view | CLI validates one explicit file path; no packet index or storage location yet. |
| Edit/update | CLI does not mutate packets. |
| Activate/deactivate/archive | Not applicable for schema validation. |
| Remove/delete/offboard | CLI does not delete files. |
| Transfer/reassignment/ownership | Not applicable for local validation. |
| Internal notes/support metadata | No private operational metadata is created. |
| Permissions/roles/scope | Local CLI user can validate files they can already read. |
| Audit/events | Shell command, git history, and CI logs are the evidence trail. |
| Notifications | Not applicable for local validation. |
| Billing/quota impact | Not applicable. |
| Error/empty/recovery/smoke states | Invalid JSON, invalid packet shape, missing file, and valid example are tested. |

## Verification

The implementation slice should introduce real runtime checks:

- `npm ci`
- `npm run build`
- `npm test`
- `npm run check`
- `git diff --check`
- GitHub Actions running the same runtime checks and governance checks.

Until runtime configuration exists, the repository's only local command remains
`git diff --check`.

## Out Of Scope

- MCP server implementation.
- Automatic packet generation from git state.
- Codex/Claude render templates beyond the existing synthetic Markdown example.
- Package publishing.
- Release versioning.
- Hosted service or deployment.
- Private redaction-rule syntax.
- Global packet storage.
