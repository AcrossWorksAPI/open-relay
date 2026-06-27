# Relay Protocol Envelope And Multi-Type Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add packet type/version dispatch so new packet types and versions can be introduced while keeping `review-request` 0.1 validation and rendering unchanged.

**Architecture:** Add a registry keyed by `packet_type` and `packet_version`. `src/schema.ts` keeps its public API but validates a minimal dispatch header first, then routes to a compiled per-type schema and semantic checks. A new `src/renderPacket.ts` dispatches Markdown rendering by `packet_type` while preserving `renderReviewRequestMarkdown`.

**Tech Stack:** TypeScript, Ajv, Node.js built-in test runner, existing JSON Schema, existing Markdown renderer.

---

## Files

- Create `src/schemaRegistry.ts`: schema registry, semantic checks, supported-type summary.
- Modify `src/schema.ts`: dispatching validator with minimal header check.
- Create `src/renderPacket.ts`: Markdown renderer dispatcher.
- Modify `src/cli.ts`: render through dispatcher after validation.
- Modify `src/index.ts`: export dispatcher and registry helpers.
- Modify `tests/schema.test.ts`: unsupported type/version, header, and extensibility tests.
- Create `tests/renderPacket.test.ts`: renderer dispatcher tests.
- Modify closeout docs: `docs/STATUS.md`, `docs/planning/ROADMAP.md`, `docs/planning/ACTIVE_WORK.md`, `docs/planning/PLAN_REGISTRY.md`, `docs/planning/VERSION_LEDGER.md`, `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`, and `master_build.md`.

## Acceptance Criteria

- `review-request` 0.1 validates and renders identically.
- Existing example `relay.json` and `relay.md` stay unchanged.
- Header validation requires only `packet_type` and `packet_version`.
- `created_at` remains owned by the review-request schema.
- Unknown packet type/version fails closed with a supported list and no packet-content echo.
- Missing `packet_type` or `packet_version` returns a header validation error.
- A test-only second type validates and renders through dispatch without modifying review-request code.
- `npm run check`, `npm run smoke:pack`, and `git diff --check` pass.

## Task 1: Schema Registry And Dispatching Validator

**Files:**
- Create `src/schemaRegistry.ts`
- Modify `src/schema.ts`
- Modify `tests/schema.test.ts`

- [x] **Step 1: Add failing unsupported dispatch tests**

Add to `tests/schema.test.ts`:

```ts
test("rejects unsupported packet types with supported combinations", () => {
  const packet = {
    packet_type: "SECRET_PACKET_TYPE_SHOULD_NOT_APPEAR",
    packet_version: "0.1",
    created_at: "2026-06-27T00:00:00.000Z",
    secret: "SECRET_FIELD_SHOULD_NOT_APPEAR"
  };

  const result = validatePacket(packet);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /unsupported packet_type\/packet_version/);
  assert.match(result.errors.join("\n"), /review-request\/0\.1/);
  assert.doesNotMatch(result.errors.join("\n"), /SECRET_FIELD_SHOULD_NOT_APPEAR/);
});

test("rejects unsupported packet versions with supported combinations", () => {
  const packet = {
    ...validPacketFixture(),
    packet_version: "9.9"
  };

  const result = validatePacket(packet);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /unsupported packet_type\/packet_version: review-request\/9\.9/);
  assert.match(result.errors.join("\n"), /supported: review-request\/0\.1/);
});
```

- [x] **Step 2: Add failing minimal-header test**

Add to `tests/schema.test.ts`:

```ts
test("requires packet type before dispatch", () => {
  const result = validatePacket({ packet_version: "0.1" });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /must have required property 'packet_type'/);
});
```

- [x] **Step 3: Add failing no-created-at-short-circuit test**

Add to `tests/schema.test.ts`:

```ts
test("lets review-request schema own created_at validation", () => {
  const packet = {
    ...validPacketFixture(),
    created_at: undefined,
    goal: ""
  };
  delete (packet as Record<string, unknown>).created_at;

  const result = validatePacket(packet);
  const errors = result.errors.join("\n");

  assert.equal(result.valid, false);
  assert.match(errors, /created_at/);
  assert.match(errors, /goal/);
});
```

Expected: `npm run check` fails because unsupported packets currently go through the single review-request schema and no registry exists.

- [x] **Step 4: Create schema registry**

Create `src/schemaRegistry.ts`:

```ts
import Ajv, { type ValidateFunction } from "ajv";

import reviewRequestSchema from "../schemas/review-request.schema.json";

export type SemanticCheck = (packet: Record<string, unknown>) => string[];

export type RegistryEntry = {
  validate: ValidateFunction;
  semantics?: SemanticCheck;
};

const ajv = new Ajv({
  allErrors: true,
  strict: true
});

export const SCHEMA_REGISTRY: Record<string, Record<string, RegistryEntry>> = {
  "review-request": {
    "0.1": {
      validate: ajv.compile(reviewRequestSchema),
      semantics: validateReviewRequestSemantics
    }
  }
};

export function lookupPacketSchema(type: string, version: string): RegistryEntry | undefined {
  return SCHEMA_REGISTRY[type]?.[version];
}

export function supportedPacketSummary(): string {
  return Object.entries(SCHEMA_REGISTRY)
    .flatMap(([type, versions]) => Object.keys(versions).map((version) => `${type}/${version}`))
    .join(", ");
}

function validateReviewRequestSemantics(packet: Record<string, unknown>): string[] {
  const changeSummary = packet.change_summary;
  const changedFiles = packet.changed_files;

  if (!isRecord(changeSummary) || !Array.isArray(changedFiles)) {
    return [];
  }

  if (changeSummary.total_files_changed !== changedFiles.length) {
    return [
      "/change_summary/total_files_changed must equal changed_files length"
    ];
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
```

- [x] **Step 5: Refactor validator dispatch**

Update `src/schema.ts`:

```ts
import { readFile } from "node:fs/promises";
import Ajv, { type ErrorObject } from "ajv";

import {
  lookupPacketSchema,
  supportedPacketSummary
} from "./schemaRegistry";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

const ajv = new Ajv({
  allErrors: true,
  strict: true
});

const validateHeader = ajv.compile({
  type: "object",
  required: ["packet_type", "packet_version"],
  properties: {
    packet_type: { type: "string", minLength: 1 },
    packet_version: { type: "string", minLength: 1 }
  }
});

export function validatePacket(packet: unknown): ValidationResult {
  if (!validateHeader(packet)) {
    return {
      valid: false,
      errors: formatErrors(validateHeader.errors ?? [])
    };
  }

  const packetRecord = packet as Record<string, unknown>;
  const packetType = String(packetRecord.packet_type);
  const packetVersion = String(packetRecord.packet_version);
  const entry = lookupPacketSchema(packetType, packetVersion);

  if (!entry) {
    return {
      valid: false,
      errors: [
        `unsupported packet_type/packet_version: ${packetType}/${packetVersion} (supported: ${supportedPacketSummary()})`
      ]
    };
  }

  const valid = entry.validate(packet);
  const schemaErrors = valid ? [] : formatErrors(entry.validate.errors ?? []);
  const semanticErrors = valid && entry.semantics ? entry.semantics(packetRecord) : [];
  const errors = [...schemaErrors, ...semanticErrors];

  if (errors.length === 0) {
    return {
      valid: true,
      errors: []
    };
  }

  return {
    valid: false,
    errors
  };
}

export async function validatePacketFile(path: string): Promise<ValidationResult> {
  const raw = await readFile(path, "utf8");
  const packet = JSON.parse(raw) as unknown;

  return validatePacket(packet);
}

function formatErrors(errors: ErrorObject[]): string[] {
  return errors.map((error) => {
    const location = error.instancePath === "" ? "/" : error.instancePath;
    return `${location} ${error.message ?? "is invalid"}`;
  });
}
```

- [x] **Step 6: Run validator tests**

Run:

```bash
npm test -- --test-name-pattern="unsupported packet|requires packet type|created_at|synthetic review-request"
```

Expected: selected tests pass.

## Task 2: Renderer Dispatcher

**Files:**
- Create `src/renderPacket.ts`
- Create `tests/renderPacket.test.ts`
- Modify `src/cli.ts`
- Modify `src/index.ts`

- [x] **Step 1: Add failing renderer dispatcher tests**

Create `tests/renderPacket.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { renderPacketMarkdown } from "../src/renderPacket";
import { renderReviewRequestMarkdown } from "../src/renderReviewRequest";
import type { ReviewRequestPacket } from "../src/reviewRequest";

const packet = JSON.parse(
  readFileSync("examples/review-request/relay.json", "utf8")
) as ReviewRequestPacket;

test("dispatches review-request markdown rendering", () => {
  assert.equal(renderPacketMarkdown(packet), renderReviewRequestMarkdown(packet));
});

test("rejects packets without a registered renderer", () => {
  assert.throws(
    () => renderPacketMarkdown({ packet_type: "unknown", packet_version: "0.1" }),
    /No renderer registered for packet_type: unknown/
  );
});
```

Expected: `npm run check` fails because `src/renderPacket.ts` does not exist.

- [x] **Step 2: Create renderer dispatcher**

Create `src/renderPacket.ts`:

```ts
import { renderReviewRequestMarkdown } from "./renderReviewRequest";
import type { ReviewRequestPacket } from "./reviewRequest";

export type PacketRenderer = (packet: Record<string, unknown>) => string;

export const PACKET_RENDERERS: Record<string, PacketRenderer> = {
  "review-request": (packet) => renderReviewRequestMarkdown(packet as unknown as ReviewRequestPacket)
};

export function renderPacketMarkdown(packet: Record<string, unknown>): string {
  const type = String(packet.packet_type);
  const renderer = PACKET_RENDERERS[type];

  if (!renderer) {
    throw new Error(`No renderer registered for packet_type: ${type}`);
  }

  return renderer(packet);
}
```

- [x] **Step 3: Use dispatcher in CLI**

Modify `src/cli.ts`:

```ts
import { renderPacketMarkdown } from "./renderPacket";
```

Replace review-request renderer calls after validation:

```ts
const markdown = renderPacketMarkdown(packet as Record<string, unknown>);
```

and:

```ts
const output = parsed.options.format === "markdown"
  ? renderPacketMarkdown(packet as Record<string, unknown>)
  : `${JSON.stringify(packet, null, 2)}\n`;
```

- [x] **Step 4: Export dispatcher**

Modify `src/index.ts`:

```ts
export { renderPacketMarkdown } from "./renderPacket";
```

- [x] **Step 5: Run renderer tests**

Run:

```bash
npm test -- --test-name-pattern="dispatches review-request|registered renderer|renders the committed example markdown|handoff review-request matches"
```

Expected: selected tests pass and committed example Markdown remains unchanged.

## Task 3: Extensibility Proof

**Files:**
- Modify `tests/schema.test.ts`
- Modify `tests/renderPacket.test.ts`

- [x] **Step 1: Add test-only schema registry entry test**

Add to `tests/schema.test.ts`:

```ts
import Ajv from "ajv";
import { SCHEMA_REGISTRY } from "../src/schemaRegistry";
```

Then add:

```ts
test("validates a test-only packet type through the registry", () => {
  const ajv = new Ajv({ allErrors: true, strict: true });
  SCHEMA_REGISTRY["test-packet"] = {
    "0.1": {
      validate: ajv.compile({
        type: "object",
        additionalProperties: false,
        required: ["packet_type", "packet_version", "created_at", "message"],
        properties: {
          packet_type: { const: "test-packet" },
          packet_version: { const: "0.1" },
          created_at: { type: "string" },
          message: { type: "string" }
        }
      })
    }
  };

  try {
    const result = validatePacket({
      packet_type: "test-packet",
      packet_version: "0.1",
      created_at: "2026-06-27T00:00:00.000Z",
      message: "hello"
    });

    assert.equal(result.valid, true);
  } finally {
    delete SCHEMA_REGISTRY["test-packet"];
  }
});
```

- [x] **Step 2: Add test-only renderer registry entry test**

Update the existing `tests/renderPacket.test.ts` dispatcher import to also include
`PACKET_RENDERERS`:

```ts
import { PACKET_RENDERERS, renderPacketMarkdown } from "../src/renderPacket";
```

Then add:

```ts
test("renders a test-only packet type through the renderer registry", () => {
  PACKET_RENDERERS["test-packet"] = (testPacket) => `# ${String(testPacket.message)}\n`;

  try {
    assert.equal(
      renderPacketMarkdown({
        packet_type: "test-packet",
        packet_version: "0.1",
        message: "hello"
      }),
      "# hello\n"
    );
  } finally {
    delete PACKET_RENDERERS["test-packet"];
  }
});
```

- [x] **Step 3: Run extensibility tests**

Run:

```bash
npm test -- --test-name-pattern="test-only packet type"
```

Expected: selected tests pass.

## Task 4: Closeout

**Files:**
- Modify `docs/protocol/review-request-packet.md`
- Modify `docs/STATUS.md`
- Modify `docs/planning/ROADMAP.md`
- Modify `docs/planning/ACTIVE_WORK.md`
- Modify `docs/planning/PLAN_REGISTRY.md`
- Modify `docs/planning/VERSION_LEDGER.md`
- Modify `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`
- Modify `master_build.md`

- [x] **Step 1: Record versioning rule**

Add to `docs/protocol/review-request-packet.md`:

```markdown
Under the protocol envelope, `review-request` keeps `additionalProperties: false`.
Any new accepted field, including optional additions, requires a new
`packet_version` unless a future version explicitly defines an extension point.
```

- [x] **Step 2: Update roadmap/status closeout**

Record:

```markdown
| Unversioned | Relay protocol envelope and multi-type validation | In progress | High | No | Repo-local packet storage | docs/superpowers/plans/2026-06-27-relay-protocol-envelope.md |
```

After merge, update the slice to `Done` and the lifecycle matrix row toward
`Shipped`.

- [x] **Step 3: Run full verification**

Run:

```bash
npm run check
npm run smoke:pack
git diff --check
```

Expected: all pass.

- [ ] **Step 4: Open implementation PR**

Push `codex/relay-protocol-envelope-implementation` and create a PR titled:

```text
feat: dispatch packets by type and version
```

Request Claude review with focus on non-breaking review-request behavior,
dispatch safety, supported-list errors, and renderer registry extensibility.

## Self-Review Notes

- The header validates only dispatch keys, not `created_at`.
- Unsupported errors include supported combinations.
- `additionalProperties: false` versioning friction is documented.
- Review-request 0.1 remains flat and unchanged.
- No new packet type is introduced by this implementation.
- Follow-up at the second renderer: decide whether `render review-request` stays
  type-named or a generic render command is added.
