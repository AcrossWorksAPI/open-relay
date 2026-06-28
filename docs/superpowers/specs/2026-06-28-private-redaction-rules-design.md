# Private Redaction Rules Design

Last updated: 2026-06-28

## Purpose

Open Relay's generator already excludes high-risk data by default: raw diffs,
file contents, command output, environment variables, unsafe remote URLs, and
local paths unless explicitly requested. That is a good public baseline, but it
does not cover repository-specific private terms such as customer names,
internal project codenames, private hostnames, or account identifiers that can
appear in otherwise-safe metadata.

Before npm publishing, Open Relay should support a small repo-local private
redaction file so local users can scrub those terms from generated
`review-request/0.1` packets without changing packet schema or adding a hosted
secrets service.

## Decision

Add optional private redaction rules for `generate review-request` and every
command that composes it (`handoff review-request` and `save review-request`).

The default lookup path is:

```text
.open-relay/redaction-rules.json
```

`.open-relay/` is already ignored by git, so the default private rule file is
repo-local and untracked. Users may also pass an explicit file:

```bash
open-relay generate review-request ... --redaction-rules /path/to/rules.json
```

Default missing file behavior is permissive: if
`.open-relay/redaction-rules.json` is absent, generation proceeds with the
existing built-in redactions. Explicit file behavior is fail-closed: if
`--redaction-rules <path>` cannot be read, parsed, or validated, generation
fails with a sanitized error and no packet output.

## Rule File Shape

The rule file is strict JSON:

```json
{
  "version": 1,
  "rules": [
    {
      "name": "customer-codename",
      "match": "PrivateCustomerName",
      "replacement": "[private-customer]",
      "reason": "Private customer name."
    }
  ]
}
```

Rules use literal substring replacement only in this slice. Regex, glob, and
path-pattern syntax are deferred. Literal matching keeps the first release easy
to reason about and avoids regex escaping mistakes or catastrophic backtracking
risks in a privacy-sensitive feature.

Validation rules:

- top-level keys must be exactly `version` and `rules`;
- `version` must be `1`;
- `rules` must be a non-empty array when a rule file exists;
- each rule's keys must be exactly `name`, `match`, `replacement`, and
  `reason`;
- all rule fields must be non-empty strings;
- `match` must be at least three characters after trimming whitespace;
- `replacement` must not contain `match`;
- `reason` must not contain `match`;
- duplicate `name` values are rejected;
- duplicate `match` values are rejected.

The `reason` and `replacement` guards prevent the generated `redactions[]`
records from reintroducing the sensitive value they are meant to hide.

## Application Scope

Apply private rules after the normal packet is assembled and after built-in
remote/local-path redactions are recorded, but before final schema validation
and rendering/output.

Private rules may transform these packet string fields:

| Packet area | Fields |
| --- | --- |
| `goal` | `goal` |
| `requested_review` | `audience`, `focus[]`, `requested_output` |
| `repository` | `name`, `remote_url`, `local_path`, `base_branch`, `working_branch`, `pull_request_url`, `reviewer_access` |
| `change_summary` | `summary`, `behavioral_intent`, `excluded_scope[]` |
| `changed_files[]` | `path`, `role`, `evidence` |
| `verification[]` | `command`, `evidence` |
| `risks[]` | `description`, `handling` |
| `provenance[]` | `reference`, `supports` |
| `sensitive_data` | `notes` |
| `next_action` | `next_action` |

Do not transform protocol dispatch fields (`packet_type`, `packet_version`),
timestamps, commit SHAs, `repository.diff_range`, `change_summary.total_files_changed`,
`changed_files[].status`, `changed_files[].review_priority`, verification
enums, risk severities, provenance types, or the `redactions[]` array itself.

The result must still validate as `review-request/0.1`.

## Redaction Records

For every packet field changed by a private rule, append a redaction entry:

```json
{
  "field": "changed_files[].path",
  "reason": "Private redaction rule: customer-codename.",
  "replacement": "[private-customer]"
}
```

Use generic array field paths such as `changed_files[].path` and
`verification[].command` rather than indexes or original values. This keeps
redaction records useful without exposing which exact file or command contained
the private term.

If several values in the same generic field are changed by the same rule, record
one redaction entry for that field/rule/replacement combination. If multiple
rules affect the same field, record one entry per rule.

## CLI Contract

Add `--redaction-rules <path>` to `generate review-request`.

Because `handoff review-request` and `save review-request` forward into the
same generator path, they should accept the same flag without command-specific
behavior.

Parser behavior:

- unknown, duplicate, or missing-value flag errors remain exit `2`;
- `--redaction-rules` is a singleton flag;
- `--redaction-rules` must not echo its path in errors;
- invalid or unreadable rule files exit `1` with one of:
  - `Could not read redaction rules.`
  - `Invalid redaction rules.`

Default lookup behavior:

- if `.open-relay/redaction-rules.json` is absent, generation proceeds;
- if `.open-relay/redaction-rules.json` exists but is invalid, generation
  fails closed;
- if an explicit `--redaction-rules <path>` is supplied and invalid, generation
  fails closed;
- the generator never prints rule content, match strings, replacement strings,
  or rule file paths in error messages.

## Security And Privacy

This feature must not:

- read environment variables;
- fetch remote rules;
- read global user config;
- support regex in v1;
- transform raw diff/file contents, because those are not included in packets;
- echo rule file paths or rule contents in CLI errors;
- silently continue when a present or explicit rule file is malformed;
- add a packet-version bump.

The safest failure mode is:

- no default file present: proceed with built-in redactions;
- default or explicit file present but invalid: stop before packet output;
- valid rules present: apply, record redactions, then validate the final packet.

## Alternatives Considered

| Approach | Decision | Reason |
| --- | --- | --- |
| Repo-local ignored `.open-relay/redaction-rules.json` | Chosen | Matches existing local packet storage, keeps private terms out of git, and works before global storage exists. |
| Global user rules | Deferred | Useful later, but introduces precedence, discovery, and portability questions before there is a settings model. |
| Committed shared rules | Deferred | Teams may want non-sensitive allowlists later, but private literal terms should not be encouraged in git. |
| Regex rules | Deferred | More powerful but higher risk; literal replacement covers the first private-name use case. |
| Schema-level packet extensions | Rejected | `redactions[]` already records the effect; no `review-request/0.2` is needed. |
| Redact arbitrary JSON recursively | Rejected | Risks mutating protocol fields and enum values; use an allowlisted field walker. |

## Lifecycle Coverage

| Lens | Handling |
| --- | --- |
| Create/invite/attach | Users create a local ignored rule file or pass an explicit JSON file. |
| List/search/view | No list command; rules are local files inspected only by explicit generation commands. |
| Edit/update | Users edit the JSON file directly; Open Relay validates before use. |
| Activate/deactivate/archive | Delete or rename the local file, or omit `--redaction-rules`, to stop using rules. |
| Remove/delete/offboard | No delete command; local user owns local config deletion. |
| Transfer/reassignment/ownership | Local workspace owner controls repo-local private rules. |
| Notes/support metadata | Generated packets record redaction entries without revealing match strings. |
| Permissions/roles/scope | Uses local filesystem permissions only; no remote or environment rule loading. |
| Audit/events | Git history, generated packet output, local command evidence, and PR review are the audit trail. |
| Notifications | Deferred. |
| Billing/quota | Not applicable. |
| Error/empty/recovery/smoke | Tests cover missing default file, valid rules, invalid rules, explicit missing file, path/content leak prevention, package smoke, and schema-valid output. |

## Verification Strategy

Implementation should prove:

- parser accepts `--redaction-rules <path>` and rejects duplicates/missing
  values;
- missing default `.open-relay/redaction-rules.json` preserves current behavior;
- valid default and explicit rule files redact generated packet strings;
- invalid default and explicit rule files fail closed before output;
- errors do not echo rule file paths, match strings, replacement strings, or
  file contents;
- redaction entries identify generic fields and safe replacement text;
- rule application does not mutate protocol fields or enum values;
- generated packets remain schema-valid `review-request/0.1`;
- `handoff review-request` and `save review-request` inherit the generator
  behavior;
- installed package smoke proves the CLI can use a private rule file without
  leaking the configured match string;
- `npm run check`, `npm run smoke:pack`, and `git diff --check` pass.

## Review Focus

Ask reviewers to check:

- Is repo-local ignored JSON the right first private-rule storage boundary?
- Should v1 stay literal-only, or is regex needed before npm publish?
- Is fail-closed behavior correct for present/explicit invalid rule files?
- Is the allowlisted field set broad enough without risking protocol mutation?
- Do redaction records provide enough evidence without leaking private terms?
