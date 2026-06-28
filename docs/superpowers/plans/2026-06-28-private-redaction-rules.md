# Private Redaction Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add optional repo-local private redaction rules so generated `review-request/0.1` packets can scrub repository-specific private terms before output without changing packet schema.

**Architecture:** Reuse the existing generator pipeline and `redactions[]` packet field. Parse a strict case-insensitive literal-only JSON rule file, apply rules through an allowlisted packet-field walker after built-in redactions and before validation, and fail closed for present or explicitly supplied invalid rule files.

**Tech Stack:** TypeScript, Node.js 22, existing CLI argument parser, existing review-request builder, existing JSON Schema validation through Ajv, Node's built-in test runner, and the existing `npm run check`, `npm run smoke:pack`, and `git diff --check` verification commands.

---

## Context

The current generator already protects high-risk data by default:

- `src/redaction.ts` sanitizes `repository.remote_url`.
- `src/reviewRequest.ts` omits `repository.local_path` unless
  `--include-local-path` is supplied and records built-in redactions.
- `src/git.ts` collects git metadata and changed-file evidence without raw diff
  hunks or file contents.
- `src/cli.ts` routes `generate review-request`, `handoff review-request`, and
  `save review-request` through the same validated generator path.

The missing piece is private repository-specific terms in otherwise-safe packet
metadata. Examples include internal project codenames in branch names, customer
names in file paths, or private account labels in user-authored summaries.

This slice uses the existing `redactions[]` packet field. It does not add a new
packet version, regex syntax, global config, remote rule loading, raw-diff
inspection, or environment variable reads.

## Command Contract

Add one singleton flag to the review-request generator:

```text
--redaction-rules <path>
```

The flag is accepted by:

```text
open-relay generate review-request ...
open-relay handoff review-request ...
open-relay save review-request ...
```

`handoff` and `save` need no special implementation beyond forwarding the
generator args they already accept.

Default behavior:

- if `.open-relay/redaction-rules.json` does not exist, generation proceeds;
- if `.open-relay/redaction-rules.json` exists and is invalid, generation fails
  before output;
- if `--redaction-rules <path>` is supplied and invalid or unreadable,
  generation fails before output;
- no CLI error may echo the rule path, rule content, match string, replacement
  string, or generated packet JSON.

## Rule File Contract

Use strict JSON:

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

Validation:

- top-level keys are exactly `version` and `rules`;
- `version` is `1`;
- `rules` is a non-empty array;
- rule keys are exactly `name`, `match`, `replacement`, and `reason`;
- each rule field is a non-empty string;
- trimmed `match` length is at least three;
- `replacement` does not contain `match`, case-insensitively;
- `reason` does not contain `match`, case-insensitively;
- rule names are unique;
- match strings are unique case-insensitively;
- no replacement or reason contains any configured match string
  case-insensitively.

Rules perform case-insensitive literal substring replacement across an
allowlisted set of packet string fields. Implementations must escape the literal
before building any `RegExp`; rule authors do not get regex semantics.

## Files

| Path | Action | Responsibility |
| --- | --- | --- |
| `src/args.ts` | Modify | Parse `--redaction-rules` as a singleton optional value. |
| `src/privateRedactionRules.ts` | Create | Read, validate, and apply literal private redaction rules. |
| `src/reviewRequest.ts` | Modify | Accept optional private redaction rules and apply them before returning the packet. |
| `src/cli.ts` | Modify | Load default or explicit rule file before building/validating request packets. |
| `src/index.ts` | Modify | Export private rule types/helpers only if useful for tests or library consumers. |
| `tests/args.test.ts` | Modify | Cover parser acceptance/rejection for `--redaction-rules`. |
| `tests/privateRedactionRules.test.ts` | Create | Unit-test strict validation and packet transformation. |
| `tests/reviewRequest.test.ts` | Modify | Prove builder output remains schema-valid after private redactions. |
| `tests/cli.test.ts` | Modify | Prove CLI default/explicit rule file behavior and sanitized failures. |
| `scripts/smoke-pack.js` | Modify | Prove installed CLI applies an explicit private rule file. |
| `README.md` | Modify | Document safe local usage and failure behavior. |
| `docs/protocol/review-request-packet.md` | Modify | Document private redaction rules and `redactions[]` records. |
| `docs/planning/*`, `docs/STATUS.md`, `master_build.md` | Modify | Record active implementation evidence and roadmap status. |

## Implementation Tasks

### Task 1: Parser Contract

**Files:**
- Modify: `src/args.ts`
- Modify: `tests/args.test.ts`

- [ ] Add `redactionRules?: string` to `GenerateReviewRequestOptions`.

```ts
export type GenerateReviewRequestOptions = {
  base: string;
  head: string;
  goal: string;
  summary: string;
  behavioralIntent: string;
  format: GenerateReviewRequestFormat;
  output?: string;
  redactionRules?: string;
  audience: string;
  focus: string[];
  requestedOutput: string;
  reviewerAccess: string;
  pullRequestUrl?: string;
  verification: VerificationInput[];
  risks: RiskInput[];
  excludedScope: string[];
  includeLocalPath: boolean;
};
```

- [ ] Add `"--redaction-rules"` to `allowedValueFlags`, not to
  `repeatableValueFlags`.

```ts
const allowedValueFlags = new Set([
  "--base",
  "--head",
  "--goal",
  "--summary",
  "--behavioral-intent",
  "--format",
  "--output",
  "--redaction-rules",
  "--audience",
  "--focus",
  "--requested-output",
  "--reviewer-access",
  "--pr-url",
  "--verification",
  "--risk",
  "--excluded-scope"
]);
```

- [ ] Set the parsed option in the success result.

```ts
redactionRules: first(values, "--redaction-rules"),
```

- [ ] Add parser tests.

```ts
test("parses redaction-rules path", () => {
  const result = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD",
    "--goal", "Review",
    "--summary", "Summary",
    "--behavioral-intent", "Intent",
    "--redaction-rules", ".open-relay/redaction-rules.json"
  ]);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.options.redactionRules, ".open-relay/redaction-rules.json");
  }
});

test("rejects duplicate redaction-rules flag", () => {
  const result = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD",
    "--goal", "Review",
    "--summary", "Summary",
    "--behavioral-intent", "Intent",
    "--redaction-rules", "one.json",
    "--redaction-rules", "two.json"
  ]);

  assert.deepEqual(result, { ok: false, message: "Duplicate flag: --redaction-rules" });
});
```

- [ ] Run parser tests.

```bash
npm run build
node --test dist/tests/args.test.js
```

Expected: parser tests pass after implementation.

### Task 2: Strict Rule File Types And Validation

**Files:**
- Create: `src/privateRedactionRules.ts`
- Create: `tests/privateRedactionRules.test.ts`

- [ ] Create public types and a validation result.

```ts
import type { Redaction } from "./redaction";
import type { ReviewRequestPacket } from "./reviewRequest";

export type PrivateRedactionRule = {
  name: string;
  match: string;
  replacement: string;
  reason: string;
};

export type PrivateRedactionRulesFile = {
  version: 1;
  rules: PrivateRedactionRule[];
};

export type PrivateRedactionRulesValidation =
  | { ok: true; rules: PrivateRedactionRule[] }
  | { ok: false };
```

- [ ] Add `parsePrivateRedactionRules(value: unknown)`.

```ts
export function parsePrivateRedactionRules(value: unknown): PrivateRedactionRulesValidation {
  if (!isRecord(value) || !hasExactKeys(value, ["version", "rules"])) {
    return { ok: false };
  }
  if (value.version !== 1 || !Array.isArray(value.rules) || value.rules.length === 0) {
    return { ok: false };
  }

  const names = new Set<string>();
  const normalizedMatches = new Set<string>();
  const rules: PrivateRedactionRule[] = [];

  for (const candidate of value.rules) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ["name", "match", "replacement", "reason"])) {
      return { ok: false };
    }

    const { name, match, replacement, reason } = candidate;
    if (
      !isNonEmptyString(name) ||
      !isNonEmptyString(match) ||
      !isNonEmptyString(replacement) ||
      !isNonEmptyString(reason) ||
      match.trim().length < 3 ||
      names.has(name) ||
      normalizedMatches.has(normalizeLiteral(match))
    ) {
      return { ok: false };
    }

    names.add(name);
    normalizedMatches.add(normalizeLiteral(match));
    rules.push({ name, match, replacement, reason });
  }

  for (const rule of rules) {
    if (
      rules.some((candidate) =>
        containsIgnoreCase(rule.replacement, candidate.match) ||
        containsIgnoreCase(rule.reason, candidate.match)
      )
    ) {
      return { ok: false };
    }
  }

  return { ok: true, rules };
}
```

- [ ] Add private helpers.

```ts
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && expected.every((key, index) => keys[index] === key);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeLiteral(value: string): string {
  return value.toLowerCase();
}

function containsIgnoreCase(value: string, literal: string): boolean {
  return normalizeLiteral(value).includes(normalizeLiteral(literal));
}
```

- [ ] Add validation tests for accepted and rejected files.

```ts
test("accepts strict literal private redaction rules", () => {
  const result = parsePrivateRedactionRules({
    version: 1,
    rules: [{
      name: "customer",
      match: "PrivateCustomerName",
      replacement: "[private-customer]",
      reason: "Private customer name."
    }]
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.rules[0]?.match, "PrivateCustomerName");
  }
});

test("rejects unknown keys and unsafe reasons", () => {
  assert.equal(parsePrivateRedactionRules({
    version: 1,
    rules: [{
      name: "customer",
      match: "PrivateCustomerName",
      replacement: "[private-customer]",
      reason: "PrivateCustomerName appears here."
    }]
  }).ok, false);

  assert.equal(parsePrivateRedactionRules({
    version: 1,
    rules: [{
      name: "customer",
      match: "PrivateCustomerName",
      replacement: "[private-customer]",
      reason: "Private customer name.",
      regex: false
    }]
  }).ok, false);
});
```

- [ ] Run the new tests.

```bash
npm run build
node --test dist/tests/privateRedactionRules.test.js
```

Expected: validation tests pass.

### Task 3: Allowlisted Packet Redaction Walker

**Files:**
- Modify: `src/privateRedactionRules.ts`
- Modify: `tests/privateRedactionRules.test.ts`

- [ ] Add `applyPrivateRedactionRules`.

```ts
export function applyPrivateRedactionRules(
  packet: ReviewRequestPacket,
  rules: PrivateRedactionRule[]
): ReviewRequestPacket {
  const redactions = new Map<string, Redaction>();
  const copy: ReviewRequestPacket = structuredClone(packet) as ReviewRequestPacket;

  redactStringField(copy, "goal", rules, redactions);
  redactObjectStringFields(copy.requested_review, "requested_review", ["audience", "requested_output"], rules, redactions);
  redactStringArray(copy.requested_review.focus, "requested_review.focus[]", rules, redactions);
  redactObjectStringFields(copy.repository, "repository", [
    "name",
    "remote_url",
    "local_path",
    "base_branch",
    "working_branch",
    "pull_request_url",
    "reviewer_access"
  ], rules, redactions);
  redactObjectStringFields(copy.change_summary, "change_summary", ["summary", "behavioral_intent"], rules, redactions);
  redactStringArray(copy.change_summary.excluded_scope, "change_summary.excluded_scope[]", rules, redactions);

  for (const file of copy.changed_files) {
    redactObjectStringFields(file, "changed_files[]", ["path", "role", "evidence"], rules, redactions);
  }
  for (const item of copy.verification) {
    redactObjectStringFields(item, "verification[]", ["command", "evidence"], rules, redactions);
  }
  for (const risk of copy.risks) {
    redactObjectStringFields(risk, "risks[]", ["description", "handling"], rules, redactions);
  }
  for (const item of copy.provenance) {
    redactObjectStringFields(item, "provenance[]", ["reference", "supports"], rules, redactions);
  }
  if (copy.sensitive_data) {
    redactObjectStringFields(copy.sensitive_data, "sensitive_data", ["notes"], rules, redactions);
  }
  redactStringField(copy, "next_action", rules, redactions);

  return {
    ...copy,
    redactions: [...copy.redactions, ...redactions.values()]
  };
}
```

- [ ] Add helper functions for literal replacement and redaction record
  de-duplication.

```ts
function redactObjectStringFields(
  value: Record<string, unknown>,
  prefix: string,
  keys: string[],
  rules: PrivateRedactionRule[],
  redactions: Map<string, Redaction>
): void {
  for (const key of keys) {
    const current = value[key];
    if (typeof current !== "string") {
      continue;
    }
    value[key] = redactString(current, `${prefix}.${key}`, rules, redactions);
  }
}

function redactStringField(
  value: Record<string, unknown>,
  key: string,
  rules: PrivateRedactionRule[],
  redactions: Map<string, Redaction>
): void {
  const current = value[key];
  if (typeof current === "string") {
    value[key] = redactString(current, key, rules, redactions);
  }
}

function redactStringArray(
  values: string[],
  field: string,
  rules: PrivateRedactionRule[],
  redactions: Map<string, Redaction>
): void {
  for (let index = 0; index < values.length; index += 1) {
    values[index] = redactString(values[index], field, rules, redactions);
  }
}

function redactString(
  value: string,
  field: string,
  rules: PrivateRedactionRule[],
  redactions: Map<string, Redaction>
): string {
  let next = value;
  for (const rule of rules) {
    const result = replaceLiteralIgnoreCase(next, rule.match, rule.replacement);
    if (!result.changed) {
      continue;
    }
    next = result.value;
    const key = `${field}\0${rule.name}\0${rule.replacement}`;
    redactions.set(key, {
      field,
      reason: `Private redaction rule: ${rule.name}.`,
      replacement: rule.replacement
    });
  }
  return next;
}

function replaceLiteralIgnoreCase(
  value: string,
  match: string,
  replacement: string
): { value: string; changed: boolean } {
  let changed = false;
  const pattern = new RegExp(escapeRegExp(match), "gi");
  const next = value.replace(pattern, () => {
    changed = true;
    return replacement;
  });
  return { value: next, changed };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] Add transformation tests.

```ts
test("applies private rules only to allowlisted packet fields", () => {
  const packet = reviewRequestFixture({
    goal: "Review privatecustomername and PRIVATECUSTOMERNAME changes.",
    repositoryName: "PrivateCustomerName/open-relay",
    changedPath: "src/PrivateCustomerName.ts"
  });

  const redacted = applyPrivateRedactionRules(packet, [{
    name: "customer",
    match: "PrivateCustomerName",
    replacement: "[private-customer]",
    reason: "Private customer name."
  }]);

  assert.equal(redacted.goal, "Review [private-customer] and [private-customer] changes.");
  assert.equal(redacted.repository.name, "[private-customer]/open-relay");
  assert.equal(redacted.changed_files[0]?.path, "src/[private-customer].ts");
  assert.equal(redacted.packet_type, "review-request");
  assert.equal(redacted.packet_version, "0.1");
  assert.equal(redacted.redactions.some((item) => item.field === "changed_files[].path"), true);
  assert.equal(JSON.stringify(redacted).includes("PrivateCustomerName"), false);
});
```

- [ ] Export private-redaction string-field coverage constants and add a test
  that couples the allowlist to the current packet shape.

```ts
export const PRIVATE_REDACTION_STRING_FIELDS = [
  "goal",
  "requested_review.audience",
  "requested_review.focus[]",
  "requested_review.requested_output",
  "repository.name",
  "repository.remote_url",
  "repository.local_path",
  "repository.base_branch",
  "repository.working_branch",
  "repository.pull_request_url",
  "repository.reviewer_access",
  "change_summary.summary",
  "change_summary.behavioral_intent",
  "change_summary.excluded_scope[]",
  "changed_files[].path",
  "changed_files[].role",
  "changed_files[].evidence",
  "verification[].command",
  "verification[].evidence",
  "risks[].description",
  "risks[].handling",
  "provenance[].reference",
  "provenance[].supports",
  "sensitive_data.notes",
  "next_action"
] as const;

// Excluded fields are protocol identity, dispatch, enum, checksum/range, or
// existing audit-output strings. They are intentionally not private free text.
export const PRIVATE_REDACTION_EXCLUDED_STRING_FIELDS = [
  "packet_type",
  "packet_version",
  "created_at",
  "repository.base_commit",
  "repository.head_commit",
  "repository.diff_range",
  "changed_files[].status",
  "changed_files[].review_priority",
  "verification[].kind",
  "verification[].result",
  "risks[].severity",
  "provenance[].type",
  "redactions[].field",
  "redactions[].reason",
  "redactions[].replacement"
] as const;
```

```ts
test("private redaction allowlist accounts for every review-request string field", () => {
  const packet = reviewRequestFixtureWithAllStringFields();

  const packetStringPaths = [...new Set(collectStringPaths(packet))].sort();
  const accountedStringPaths = [
    ...PRIVATE_REDACTION_STRING_FIELDS,
    ...PRIVATE_REDACTION_EXCLUDED_STRING_FIELDS
  ].sort();

  assert.deepEqual(packetStringPaths, accountedStringPaths);
});

function collectStringPaths(value: unknown, prefix = ""): string[] {
  if (typeof value === "string") {
    return [prefix];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectStringPaths(item, `${prefix}[]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      collectStringPaths(child, prefix ? `${prefix}.${key}` : key)
    );
  }
  return [];
}
```

This test is intentionally coupled to `review-request/0.1`: when the packet
schema grows, it must fail until the new string field is either redacted or
explicitly excluded.

`reviewRequestFixtureWithAllStringFields()` must include every optional object,
optional string, and at least one item in each string-bearing array, including
`redactions[]`, so the coverage check cannot pass by omitting part of the
packet shape.

- [ ] Add a test that validates the final packet.

```ts
test("private-redacted packets remain schema valid", () => {
  const packet = applyPrivateRedactionRules(reviewRequestFixture({
    goal: "Review PrivateCustomerName changes.",
    repositoryName: "PrivateCustomerName/open-relay",
    changedPath: "docs/PrivateCustomerName.md"
  }), [{
    name: "customer",
    match: "PrivateCustomerName",
    replacement: "[private-customer]",
    reason: "Private customer name."
  }]);

  assert.equal(validatePacket(packet).valid, true);
});
```

- [ ] Run the targeted tests.

```bash
npm run build
node --test dist/tests/privateRedactionRules.test.js dist/tests/schema.test.js
```

Expected: packet transformation and schema validation pass.

### Task 4: Build Pipeline Integration

**Files:**
- Modify: `src/reviewRequest.ts`
- Modify: `tests/reviewRequest.test.ts`

- [ ] Extend `BuildReviewRequestPacketInput`.

```ts
import {
  applyPrivateRedactionRules,
  type PrivateRedactionRule
} from "./privateRedactionRules";

export type BuildReviewRequestPacketInput = {
  options: GenerateReviewRequestOptions;
  git: GitContext;
  createdAt?: string;
  privateRedactionRules?: PrivateRedactionRule[];
};
```

- [ ] Build the existing packet, then apply private rules if present.

```ts
const packet: ReviewRequestPacket = {
  packet_version: "0.1",
  packet_type: "review-request",
  created_at: input.createdAt ?? new Date().toISOString(),
  ...
};

return input.privateRedactionRules && input.privateRedactionRules.length > 0
  ? applyPrivateRedactionRules(packet, input.privateRedactionRules)
  : packet;
```

- [ ] Add a builder test proving built-in redactions and private redactions
  coexist.

```ts
test("applies private redactions after built-in redactions", () => {
  const packet = buildReviewRequestPacket({
    options: validOptions(),
    git: validGit({ repositoryName: "PrivateCustomerName/open-relay" }),
    createdAt: "2026-06-26T00:00:00Z",
    privateRedactionRules: [{
      name: "customer",
      match: "PrivateCustomerName",
      replacement: "[private-customer]",
      reason: "Private customer name."
    }]
  });

  assert.equal(packet.repository.name, "[private-customer]/open-relay");
  assert.equal(packet.redactions.some((entry) => entry.field === "repository.local_path"), true);
  assert.equal(packet.redactions.some((entry) => entry.field === "repository.name"), true);
  assert.equal(validatePacket(packet).valid, true);
});
```

- [ ] Run review-request builder tests.

```bash
npm run build
node --test dist/tests/reviewRequest.test.js
```

Expected: builder tests pass.

### Task 5: CLI Rule File Loading

**Files:**
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`

- [ ] Add sanitized load helpers in `src/cli.ts`.

```ts
import { access, readFile } from "node:fs/promises";

import {
  parsePrivateRedactionRules,
  type PrivateRedactionRule
} from "./privateRedactionRules";

type PrivateRulesLoadResult =
  | { ok: true; rules: PrivateRedactionRule[] }
  | { ok: false; message: string };

async function loadPrivateRedactionRules(options: GenerateReviewRequestOptions): Promise<PrivateRulesLoadResult> {
  const path = options.redactionRules ?? join(process.cwd(), ".open-relay", "redaction-rules.json");
  const explicit = Boolean(options.redactionRules);

  try {
    if (!explicit) {
      try {
        await access(path);
      } catch {
        return { ok: true, rules: [] };
      }
    }

    const raw = await readFile(path, "utf8");
    const parsed = parsePrivateRedactionRules(JSON.parse(raw) as unknown);
    return parsed.ok
      ? { ok: true, rules: parsed.rules }
      : { ok: false, message: "Invalid redaction rules." };
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof SyntaxError
        ? "Invalid redaction rules."
        : "Could not read redaction rules."
    };
  }
}
```

- [ ] Change `buildValidatedReviewRequestPacket` to become async and load
  rules before calling `buildReviewRequestPacket`.

```ts
async function buildValidatedReviewRequestPacket(
  options: GenerateReviewRequestOptions
): Promise<BuiltReviewRequestPacket> {
  const rules = await loadPrivateRedactionRules(options);
  if (!rules.ok) {
    return { ok: false, exitCode: 1, errors: [rules.message] };
  }

  const git = collectGitContext({
    cwd: process.cwd(),
    baseRef: options.base,
    headRef: options.head,
    includeLocalPath: options.includeLocalPath
  });
  const packet = buildReviewRequestPacket({
    options,
    git,
    privateRedactionRules: rules.rules
  });
  ...
}
```

- [ ] Update callers to `await buildValidatedReviewRequestPacket(...)` in
  `generateReviewRequestCommand` and `saveReviewRequestCommand`.

- [ ] Add CLI tests:

```ts
test("generate review-request applies explicit redaction rules without leaking match text", () => {
  const repo = createGitRepo();
  const rulesPath = join(repo, "private-rules.json");
  writeFileSync(rulesPath, JSON.stringify({
    version: 1,
    rules: [{
      name: "customer",
      match: "PrivateCustomerName",
      replacement: "[private-customer]",
      reason: "Private customer name."
    }]
  }), "utf8");

  const result = spawnSync(process.execPath, [
    cliPath,
    "generate",
    "review-request",
    "--base", base,
    "--head", head,
    "--goal", "Review PrivateCustomerName changes",
    "--summary", "PrivateCustomerName summary",
    "--behavioral-intent", "PrivateCustomerName intent",
    "--redaction-rules", rulesPath
  ], { cwd: repo, encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.doesNotMatch(result.stdout, /PrivateCustomerName/);
  const packet = JSON.parse(result.stdout);
  assert.equal(packet.goal, "Review [private-customer] changes");
  assert.equal(packet.redactions.some((entry) => entry.field === "goal"), true);
});
```

```ts
test("generate review-request rejects invalid explicit redaction rules without echoing path or contents", () => {
  const repo = createGitRepo();
  const rulesPath = join(repo, "SECRET_RULE_PATH.json");
  writeFileSync(rulesPath, "{\"match\":\"SECRET_SHOULD_NOT_APPEAR\"}", "utf8");

  const result = spawnSync(process.execPath, [
    cliPath,
    "generate",
    "review-request",
    "--base", base,
    "--head", head,
    "--goal", "Review",
    "--summary", "Summary",
    "--behavioral-intent", "Intent",
    "--redaction-rules", rulesPath
  ], { cwd: repo, encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid redaction rules/);
  assert.doesNotMatch(result.stderr, /SECRET_RULE_PATH|SECRET_SHOULD_NOT_APPEAR/);
  assert.equal(result.stdout, "");
});
```

- [ ] Add default-file tests:

```ts
test("generate review-request ignores a missing default redaction file", () => {
  const repo = createGitRepo();
  const result = generateReviewRequest(repo, base, head, []);
  assert.equal(result.status, 0, result.stderr);
});

test("generate review-request fails closed for an invalid default redaction file", () => {
  const repo = createGitRepo();
  mkdirSync(join(repo, ".open-relay"), { recursive: true });
  writeFileSync(join(repo, ".open-relay", "redaction-rules.json"), "{\"version\":1,\"rules\":[]}", "utf8");

  const result = generateReviewRequest(repo, base, head, []);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid redaction rules/);
});
```

- [ ] Run CLI tests.

```bash
npm run build
node --test dist/tests/cli.test.js
```

Expected: CLI tests pass and no error output leaks rule path or content.

### Task 6: Handoff, Save, And Package Smoke

**Files:**
- Modify: `tests/cli.test.ts`
- Modify: `scripts/smoke-pack.js`

- [ ] Add a handoff parity assertion that explicit rules affect Markdown.

```ts
test("handoff review-request applies explicit redaction rules", () => {
  const repo = createGitRepo();
  const rulesPath = writePrivateRules(repo);
  const result = spawnSync(process.execPath, [
    cliPath,
    "handoff",
    "review-request",
    "--base", base,
    "--head", head,
    "--goal", "Review PrivateCustomerName changes",
    "--summary", "PrivateCustomerName summary",
    "--behavioral-intent", "PrivateCustomerName intent",
    "--redaction-rules", rulesPath
  ], { cwd: repo, encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\[private-customer\]/);
  assert.doesNotMatch(result.stdout, /PrivateCustomerName/);
});
```

- [ ] Add a save assertion that saved JSON and Markdown are redacted.

```ts
test("save review-request applies explicit redaction rules to saved bundle", () => {
  const repo = createGitRepo();
  const rulesPath = writePrivateRules(repo);
  const result = spawnSync(process.execPath, [
    cliPath,
    "save",
    "review-request",
    "--base", base,
    "--head", head,
    "--goal", "Review PrivateCustomerName changes",
    "--summary", "PrivateCustomerName summary",
    "--behavioral-intent", "PrivateCustomerName intent",
    "--redaction-rules", rulesPath
  ], { cwd: repo, encoding: "utf8" });

  assert.equal(result.status, 0, result.stderr);
  const saved = readSavedBundle(repo);
  assert.doesNotMatch(saved.json, /PrivateCustomerName/);
  assert.doesNotMatch(saved.markdown, /PrivateCustomerName/);
  assert.match(saved.markdown, /\[private-customer\]/);
});
```

- [ ] Extend `scripts/smoke-pack.js` after the generated packet smoke:

```js
const rulesPath = join(workspace, "redaction-rules.json");
writeFileSync(rulesPath, JSON.stringify({
  version: 1,
  rules: [{
    name: "customer",
    match: "PrivateCustomerName",
    replacement: "[private-customer]",
    reason: "Private customer name."
  }]
}, null, 2), "utf8");

const redactedPacket = join(workspace, "generated-redacted.json");
runCli(cli, [
  "generate",
  "review-request",
  "--base", base,
  "--head", head,
  "--goal", "Smoke PrivateCustomerName package install",
  "--summary", "PrivateCustomerName verifies installed CLI private redaction.",
  "--behavioral-intent", "PrivateCustomerName proves package tarball redacts private terms.",
  "--redaction-rules", rulesPath,
  "--output", redactedPacket
], {
  cwd: gitRepo,
  contains: "Wrote review-request packet."
});

const redactedJson = readFileSync(redactedPacket, "utf8");
assert.doesNotMatch(redactedJson, /PrivateCustomerName/);
assert.match(redactedJson, /\[private-customer\]/);
```

- [ ] Run CLI tests and package smoke.

```bash
npm run check
npm run smoke:pack
```

Expected: full tests and package smoke pass.

### Task 7: Docs And Protocol Updates

**Files:**
- Modify: `README.md`
- Modify: `docs/protocol/review-request-packet.md`

- [ ] Document the user-facing CLI flag in `README.md`.

```md
Private redaction rules can be provided with `--redaction-rules <path>`.
When no explicit path is supplied, Open Relay looks for
`.open-relay/redaction-rules.json` in the current repository. Missing default
rules are ignored; invalid present or explicit rules fail closed before packet
output. Rule files are case-insensitive literal-only JSON and should stay
private. Formatting variants still need their own rules, and redacting file
paths can make those paths less useful for direct review navigation.
```

- [ ] Document the rule file shape and security posture in
  `docs/protocol/review-request-packet.md`.

```md
Generators may apply private redaction rules before output. A redaction rule
file must not be embedded in the packet; only the resulting `redactions[]`
records should appear. Matching is case-insensitive and literal-only. Redaction
records should name generic fields such as `changed_files[].path` and must not
reveal the matched private value.
```

- [ ] Confirm docs do not claim global profiles, regex support, registry
  publishing, live deployment, or automated secret scanning.

```bash
rg -n "regex|global profile|publish|live|secret scanning" README.md docs/protocol/review-request-packet.md
```

Expected: any hits are explicit deferrals or existing unrelated roadmap text.

### Task 8: Governance And Closeout For Implementation PR

**Files:**
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`
- Modify: `master_build.md`

- [ ] Update `docs/STATUS.md` with implementation evidence: test count,
  package smoke, and private-rule behavior.
- [ ] Move `Private redaction rules` from `In progress` to `Done` only after
  the implementation PR merges.
- [ ] Update `docs/planning/ACTIVE_WORK.md` to remove "private redaction rule
  files undefined" from current gaps after merge.
- [ ] Update `PLAN_REGISTRY.md` with this plan as active during implementation
  and historical after merge closeout.
- [ ] Add `VERSION_LEDGER.md` evidence for the implementation PR and rollback
  note.
- [ ] Update lifecycle/scope matrix for the new local config surface:

```md
| Private redaction rules | Shipped | N/A | Shipped | N/A | N/A | N/A | Shipped | Shipped | Shipped | N/A | N/A | Shipped | Repo-local ignored JSON rule files are validated fail-closed before generated packet output; global profiles and regex rules are deferred. |
```

- [ ] Record that no packet version bump, regex support, global config,
  environment reads, raw-diff scanning, or remote rule loading were added.

## Verification Commands

Run before requesting review:

```bash
npm run check
npm run smoke:pack
git diff --check
```

Manual smoke after `npm run build`:

```bash
mkdir -p /private/tmp/open-relay-redaction-smoke
cat > /private/tmp/open-relay-redaction-smoke/rules.json <<'JSON'
{
  "version": 1,
  "rules": [
    {
      "name": "customer",
      "match": "PrivateCustomerName",
      "replacement": "[private-customer]",
      "reason": "Private customer name."
    }
  ]
}
JSON

node dist/src/cli.js generate review-request \
  --base main \
  --head HEAD \
  --goal "Review PrivateCustomerName redaction smoke." \
  --summary "PrivateCustomerName should be redacted from generated packet fields." \
  --behavioral-intent "Prove private redaction rules run before output." \
  --redaction-rules /private/tmp/open-relay-redaction-smoke/rules.json \
  --output /private/tmp/open-relay-redaction-smoke/relay.json

node dist/src/cli.js validate /private/tmp/open-relay-redaction-smoke/relay.json
node dist/src/cli.js render /private/tmp/open-relay-redaction-smoke/relay.json \
  --output /private/tmp/open-relay-redaction-smoke/relay.md
```

Inspect generated files for:

- `[private-customer]` appears;
- `PrivateCustomerName` does not appear;
- `redactions[]` includes private-rule entries;
- packet validates as `review-request/0.1`;
- no raw rule file content appears in CLI errors.

## Review Focus

Ask reviewers to check:

- Is `.open-relay/redaction-rules.json` the right first storage boundary?
- Is case-insensitive literal-only matching enough for the first npm-ready
  security posture?
- Does invalid present or explicit config fail closed without leaking contents?
- Does the field allowlist cover useful packet metadata without mutating
  protocol fields or enums?
- Does the allowlist coverage test protect future string fields from silent
  bypass?
- Do `redactions[]` records provide enough audit evidence without revealing the
  matched private term?
