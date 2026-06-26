# Runtime Schema CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first Open Relay runtime slice: a TypeScript CLI that validates `review-request` JSON packets against a formal schema.

**Architecture:** Keep the first code surface small: package configuration, a JSON Schema, a reusable schema validator, a CLI entrypoint, tests, and CI. Packet generation from git state, render templates, MCP support, and package publishing are deferred until validation is proven.

**Tech Stack:** TypeScript on Node.js, npm, JSON Schema, Ajv, Node's built-in test runner, GitHub Actions.

---

## Files

- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `schemas/review-request.schema.json`
- Create: `src/index.ts`
- Create: `src/schema.ts`
- Create: `src/cli.ts`
- Create: `tests/schema.test.ts`
- Create: `tests/cli.test.ts`
- Modify: `.github/workflows/ci.yml`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `master_build.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

## Dependency Decision

Use npm and commit the generated lockfile. Add one runtime dependency, `ajv`,
because Node does not validate JSON Schema natively. Add TypeScript and
Node typings as development dependencies. Do not add a CLI framework until
argument parsing outgrows `process.argv`.

## Lifecycle Coverage

| Lens | Plan handling |
| --- | --- |
| Create/invite/attach | This slice validates existing packet files; packet creation from git state is deferred. |
| List/search/view | The CLI reads one explicit path passed by the local user. |
| Edit/update | The CLI does not mutate packets. |
| Activate/deactivate/archive | Not applicable to validation-only behavior. |
| Remove/delete/offboard | The CLI does not remove files. |
| Transfer/reassignment/ownership | Not applicable to local packet validation. |
| Internal notes/support metadata | No support metadata is stored. |
| Permissions/roles/scope | The user can only validate files their local process can read. |
| Audit/events | Git history, terminal output, and CI checks are the audit trail for this slice. |
| Notifications | Not applicable. |
| Billing/quota impact | Not applicable. |
| Error/empty/recovery/smoke states | Tests cover missing arguments, invalid JSON, schema errors, and the valid example packet. |

## Acceptance Criteria

- [x] `npm ci` installs from `package-lock.json`.
- [x] `npm run build` compiles TypeScript into `dist/`.
- [x] `npm test` runs schema and CLI tests through Node's built-in test runner.
- [x] `npm run check` runs build and test checks.
- [x] `schemas/review-request.schema.json` validates `examples/review-request/relay.json`.
- [x] An invalid packet returns actionable schema errors.
- [x] `node dist/src/cli.js validate examples/review-request/relay.json` exits `0`.
- [x] `node dist/src/cli.js validate <invalid-json-file>` exits non-zero without echoing full file contents.
- [x] CI runs governance checks plus the TypeScript runtime check.
- [x] Roadmap/status docs record TypeScript CLI as the selected first runtime.

## Task 1: Runtime Scaffold And Help Command

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `tsconfig.json`
- Create: `src/index.ts`
- Create: `src/cli.ts`
- Create: `tests/cli.test.ts`

- [x] **Step 1: Create npm package metadata**

Run:

```bash
npm init -y
npm pkg set name=@acrossworks/open-relay
npm pkg set version=0.0.0
npm pkg set private=true --json
npm pkg set description="Local-first AI handoff and review protocol CLI"
npm pkg set license=MIT
npm pkg set bin.open-relay=./dist/src/cli.js
npm pkg set scripts.build="tsc -p tsconfig.json"
npm pkg set scripts.test="npm run build && node --test \"dist/tests/**/*.test.js\""
npm pkg set scripts.check="npm test"
npm install ajv
npm install --save-dev typescript @types/node
```

Expected:

```text
package.json and package-lock.json exist, and package.json contains build, test, and check scripts.
```

- [x] **Step 2: Add TypeScript configuration**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "strict": true,
    "rootDir": ".",
    "outDir": "dist",
    "declaration": true,
    "sourceMap": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true
  },
  "include": [
    "src/**/*.ts",
    "tests/**/*.ts",
    "schemas/**/*.json"
  ]
}
```

- [x] **Step 3: Write the failing CLI help test**

Create `tests/cli.test.ts`:

```typescript
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";

const cliPath = "dist/src/cli.js";

test("prints help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay validate <packet\.json>/);
  assert.equal(result.stderr, "");
});
```

- [x] **Step 4: Run the failing check**

Run:

```bash
npm run check
```

Expected:

```text
FAIL because src/cli.ts does not exist yet.
```

- [x] **Step 5: Add the minimal CLI entrypoint**

Create `src/index.ts`:

```typescript
export const version = "0.0.0";
```

Create `src/cli.ts`:

```typescript
#!/usr/bin/env node

const usage = `Open Relay

Usage:
  open-relay validate <packet.json>
  open-relay --help
`;

export async function run(argv: string[]): Promise<number> {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    process.stdout.write(usage);
    return 0;
  }

  process.stderr.write(`Unknown command: ${args[0]}\n\n${usage}`);
  return 2;
}

if (require.main === module) {
  run(process.argv)
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`open-relay failed: ${message}\n`);
      process.exitCode = 1;
    });
}
```

- [x] **Step 6: Verify the scaffold passes**

Run:

```bash
npm run check
```

Expected:

```text
TypeScript compiles and the CLI help test passes.
```

- [x] **Step 7: Commit the scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json src/index.ts src/cli.ts tests/cli.test.ts
git commit -m "feat: add TypeScript CLI scaffold"
```

## Task 2: Review-Request JSON Schema

**Files:**
- Create: `schemas/review-request.schema.json`
- Create: `src/schema.ts`
- Create: `tests/schema.test.ts`

- [x] **Step 1: Write schema validation tests**

Create `tests/schema.test.ts`:

```typescript
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";

import { validatePacket } from "../src/schema";

test("validates the synthetic review-request example", async () => {
  const raw = await readFile("examples/review-request/relay.json", "utf8");
  const packet = JSON.parse(raw);
  const result = validatePacket(packet);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("rejects a packet with missing required fields", () => {
  const result = validatePacket({
    packet_version: "0.1",
    packet_type: "review-request"
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /must have required property/);
});

test("rejects mismatched changed file count", async () => {
  const raw = await readFile("examples/review-request/relay.json", "utf8");
  const packet = JSON.parse(raw);
  packet.change_summary.total_files_changed = 999;

  const result = validatePacket(packet);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /total_files_changed must equal changed_files length/);
});
```

- [x] **Step 2: Run the failing schema tests**

Run:

```bash
npm run check
```

Expected:

```text
FAIL because src/schema.ts does not exist yet.
```

- [x] **Step 3: Add the formal schema**

Create `schemas/review-request.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://open-relay.local/schemas/review-request.schema.json",
  "title": "Open Relay Review Request Packet",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "packet_version",
    "packet_type",
    "created_at",
    "goal",
    "requested_review",
    "repository",
    "change_summary",
    "changed_files",
    "verification",
    "risks",
    "redactions",
    "next_action"
  ],
  "properties": {
    "packet_version": {
      "type": "string",
      "const": "0.1"
    },
    "packet_type": {
      "type": "string",
      "const": "review-request"
    },
    "created_at": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$"
    },
    "goal": {
      "type": "string",
      "minLength": 1
    },
    "requested_review": {
      "$ref": "#/definitions/requestedReview"
    },
    "repository": {
      "$ref": "#/definitions/repository"
    },
    "change_summary": {
      "$ref": "#/definitions/changeSummary"
    },
    "changed_files": {
      "type": "array",
      "minItems": 0,
      "items": {
        "$ref": "#/definitions/changedFile"
      }
    },
    "verification": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/verification"
      }
    },
    "risks": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/risk"
      }
    },
    "provenance": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/provenance"
      }
    },
    "redactions": {
      "type": "array",
      "items": {
        "$ref": "#/definitions/redaction"
      }
    },
    "sensitive_data": {
      "$ref": "#/definitions/sensitiveData"
    },
    "next_action": {
      "type": "string",
      "minLength": 1
    }
  },
  "definitions": {
    "requestedReview": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "audience",
        "focus",
        "requested_output"
      ],
      "properties": {
        "audience": {
          "type": "string",
          "minLength": 1
        },
        "focus": {
          "type": "array",
          "minItems": 1,
          "items": {
            "type": "string",
            "minLength": 1
          }
        },
        "requested_output": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "repository": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "name",
        "base_branch",
        "working_branch",
        "base_commit",
        "head_commit",
        "diff_range",
        "reviewer_access"
      ],
      "properties": {
        "name": {
          "type": "string",
          "minLength": 1
        },
        "remote_url": {
          "type": "string",
          "minLength": 1
        },
        "local_path": {
          "type": "string",
          "minLength": 1
        },
        "base_branch": {
          "type": "string",
          "minLength": 1
        },
        "working_branch": {
          "type": "string",
          "minLength": 1
        },
        "base_commit": {
          "type": "string",
          "minLength": 1
        },
        "head_commit": {
          "type": "string",
          "minLength": 1
        },
        "diff_range": {
          "type": "string",
          "minLength": 1
        },
        "pull_request_url": {
          "type": "string",
          "minLength": 1
        },
        "reviewer_access": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "changeSummary": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "summary",
        "behavioral_intent",
        "excluded_scope",
        "total_files_changed"
      ],
      "properties": {
        "summary": {
          "type": "string",
          "minLength": 1
        },
        "behavioral_intent": {
          "type": "string",
          "minLength": 1
        },
        "excluded_scope": {
          "type": "array",
          "items": {
            "type": "string",
            "minLength": 1
          }
        },
        "total_files_changed": {
          "type": "integer",
          "minimum": 0
        }
      }
    },
    "changedFile": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "path",
        "status",
        "role",
        "review_priority"
      ],
      "properties": {
        "path": {
          "type": "string",
          "minLength": 1
        },
        "status": {
          "type": "string",
          "enum": [
            "added",
            "modified",
            "deleted",
            "renamed",
            "unknown"
          ]
        },
        "role": {
          "type": "string",
          "minLength": 1
        },
        "review_priority": {
          "type": "string",
          "enum": [
            "high",
            "medium",
            "low"
          ]
        },
        "evidence": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "verification": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "kind",
        "command",
        "result",
        "evidence"
      ],
      "properties": {
        "kind": {
          "type": "string",
          "enum": [
            "command",
            "ci",
            "manual",
            "external"
          ]
        },
        "command": {
          "type": "string",
          "minLength": 1
        },
        "result": {
          "type": "string",
          "enum": [
            "passed",
            "failed",
            "not_run",
            "unknown"
          ]
        },
        "evidence": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "risk": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "severity",
        "description",
        "handling"
      ],
      "properties": {
        "severity": {
          "type": "string",
          "enum": [
            "high",
            "medium",
            "low",
            "info"
          ]
        },
        "description": {
          "type": "string",
          "minLength": 1
        },
        "handling": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "provenance": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "type",
        "reference",
        "supports"
      ],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "pull_request",
            "ci_run",
            "commit",
            "issue",
            "user_note",
            "external_url"
          ]
        },
        "reference": {
          "type": "string",
          "minLength": 1
        },
        "supports": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "redaction": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "field",
        "reason"
      ],
      "properties": {
        "field": {
          "type": "string",
          "minLength": 1
        },
        "reason": {
          "type": "string",
          "minLength": 1
        },
        "replacement": {
          "type": "string",
          "minLength": 1
        }
      }
    },
    "sensitiveData": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "excluded",
        "notes"
      ],
      "properties": {
        "excluded": {
          "type": "boolean"
        },
        "notes": {
          "type": "string",
          "minLength": 1
        }
      }
    }
  }
}
```

- [x] **Step 4: Add the validation module**

Create `src/schema.ts`:

```typescript
import { readFile } from "node:fs/promises";
import Ajv, { type ErrorObject } from "ajv";

import schema from "../schemas/review-request.schema.json";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

const ajv = new Ajv({
  allErrors: true,
  strict: true
});

const validateReviewRequest = ajv.compile(schema);

export function validatePacket(packet: unknown): ValidationResult {
  const valid = validateReviewRequest(packet);
  const schemaErrors = valid ? [] : formatErrors(validateReviewRequest.errors ?? []);
  const semanticErrors = valid ? validateSemantics(packet) : [];
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

function validateSemantics(packet: unknown): string[] {
  if (!isRecord(packet)) {
    return [];
  }

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

Update `src/index.ts`:

```typescript
export { validatePacket, validatePacketFile, type ValidationResult } from "./schema";

export const version = "0.0.0";
```

- [x] **Step 5: Run the schema checks**

Run:

```bash
npm run check
```

Expected:

```text
Schema tests pass for the valid example and fail-case packet.
```

- [x] **Step 6: Commit schema validation**

Run:

```bash
git add schemas/review-request.schema.json src/schema.ts src/index.ts tests/schema.test.ts
git commit -m "feat: add review-request schema validation"
```

## Task 3: Validate Command Behavior

**Files:**
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`

- [x] **Step 1: Extend CLI tests for validate behavior**

Replace `tests/cli.test.ts` with:

```typescript
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const cliPath = "dist/src/cli.js";

test("prints help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay validate <packet\.json>/);
  assert.equal(result.stderr, "");
});

test("validates the example packet", () => {
  const result = spawnSync(process.execPath, [cliPath, "validate", "examples/review-request/relay.json"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /valid review-request packet/);
  assert.equal(result.stderr, "");
});

test("rejects invalid JSON without printing file contents", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-"));
  const packetPath = join(directory, "bad.json");
  writeFileSync(packetPath, "{ not json and this content should not echo }", "utf8");

  const result = spawnSync(process.execPath, [cliPath, "validate", packetPath], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid JSON/);
  assert.doesNotMatch(result.stderr, /this content should not echo/);
});

test("rejects schema-invalid packets", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-"));
  const packetPath = join(directory, "packet.json");
  writeFileSync(packetPath, JSON.stringify({ packet_version: "0.1" }), "utf8");

  const result = spawnSync(process.execPath, [cliPath, "validate", packetPath], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid review-request packet/);
  assert.match(result.stderr, /must have required property/);
});
```

- [x] **Step 2: Run the failing CLI behavior tests**

Run:

```bash
npm run check
```

Expected:

```text
FAIL because the validate command has not been implemented.
```

- [x] **Step 3: Implement validate command**

Replace `src/cli.ts` with:

```typescript
#!/usr/bin/env node

import { validatePacketFile } from "./schema";

const usage = `Open Relay

Usage:
  open-relay validate <packet.json>
  open-relay --help
`;

export async function run(argv: string[]): Promise<number> {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    process.stdout.write(usage);
    return 0;
  }

  if (args[0] === "validate") {
    return validateCommand(args[1]);
  }

  process.stderr.write(`Unknown command: ${args[0]}\n\n${usage}`);
  return 2;
}

async function validateCommand(path: string | undefined): Promise<number> {
  if (!path) {
    process.stderr.write(`Missing packet path.\n\n${usage}`);
    return 2;
  }

  try {
    const result = await validatePacketFile(path);

    if (result.valid) {
      process.stdout.write(`${path} is a valid review-request packet.\n`);
      return 0;
    }

    process.stderr.write(`Invalid review-request packet: ${path}\n`);
    for (const error of result.errors) {
      process.stderr.write(`- ${error}\n`);
    }
    return 1;
  } catch (error: unknown) {
    const message = error instanceof SyntaxError
      ? `Invalid JSON in ${path}: ${error.message}`
      : `Could not validate ${path}: ${error instanceof Error ? error.message : String(error)}`;
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

if (require.main === module) {
  run(process.argv)
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`open-relay failed: ${message}\n`);
      process.exitCode = 1;
    });
}
```

- [x] **Step 4: Verify validate command behavior**

Run:

```bash
npm run check
node dist/src/cli.js validate examples/review-request/relay.json
```

Expected:

```text
npm run check passes.
The validate command prints that examples/review-request/relay.json is valid.
```

- [x] **Step 5: Commit validate command**

Run:

```bash
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: add packet validation command"
```

## Task 4: Runtime CI

**Files:**
- Modify: `.github/workflows/ci.yml`

- [x] **Step 1: Add runtime checks to CI**

In `.github/workflows/ci.yml`, add these steps after the required project files
check and before the roadmap parser check:

```yaml
      - name: Set up Node.js
        uses: actions/setup-node@v6
        with:
          node-version: "lts/*"
          cache: npm

      - name: Install runtime dependencies
        run: npm ci

      - name: Run runtime checks
        run: npm run check
```

- [x] **Step 2: Run local checks**

Run:

```bash
npm ci
npm run check
git diff --check
```

Expected:

```text
All commands pass.
```

- [x] **Step 3: Commit CI update**

Run:

```bash
git add .github/workflows/ci.yml
git commit -m "ci: run TypeScript runtime checks"
```

## Task 5: Documentation And Roadmap Closeout

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `master_build.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

- [x] **Step 1: Update public usage docs**

Add a short CLI section to `README.md`:

````markdown
## CLI

Open Relay starts as a local TypeScript CLI.

```bash
npm ci
npm run check
node dist/src/cli.js validate examples/review-request/relay.json
```

The validate command checks a `review-request` JSON packet against
`schemas/review-request.schema.json`. Packet generation from live git state is
planned after schema validation is stable.
````

- [x] **Step 2: Update repository instructions**

In `AGENTS.md`, replace the runtime unknowns with:

```markdown
- Runtime target: TypeScript on Node.js for the first CLI implementation.
- Package manager: npm.
- Deployment target: Local CLI, no hosted MVP.
- Test stack: TypeScript compiler plus Node's built-in test runner.
- Non-goals for the current runtime slice: MCP server support, package
  publishing, hosted deployment, and automatic packet generation from live git
  state.
```

Update the discovered verification commands:

```markdown
- `git diff --check`
- `npm ci`
- `npm run build`
- `npm test`
- `npm run check`
- GitHub Actions: `Open Relay CI / Governance Checks`
```

- [x] **Step 3: Update planning docs**

Make these status changes:

- `docs/planning/ROADMAP.md`: mark `Runtime and verification selection` as
  `Done`, add this plan path to that row, and mark `Review-request packet CLI
  MVP` as `Planned`.
- `docs/planning/ROADMAP.md`: mark `Formal JSON Schema for reviewed packet` as
  `Planned`.
- `docs/planning/ACTIVE_WORK.md`: replace runtime-unknown risk with the
  remaining risk that runtime exists but generator behavior is not built.
- `docs/planning/PLAN_REGISTRY.md`: keep this plan in progress until the
  runtime PR merges, then move it from active to implemented.
- `docs/planning/VERSION_LEDGER.md`: add branch and local smoke evidence for
  the runtime/schema CLI slice; add merge and PR evidence after the PR lands.
- `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: mark `Relay packet schema`
  validation cells as shipped where schema and CLI validation now exist.

- [x] **Step 4: Run final local verification**

Run:

```bash
npm ci
npm run check
git diff --check
```

Expected:

```text
All commands pass.
```

- [x] **Step 5: Commit documentation closeout**

Run:

```bash
git add README.md AGENTS.md master_build.md docs/STATUS.md docs/planning/ROADMAP.md docs/planning/ACTIVE_WORK.md docs/planning/PLAN_REGISTRY.md docs/planning/VERSION_LEDGER.md docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md
git commit -m "docs: close runtime schema cli slice"
```

## PR And Review Flow

- [x] Open PR #11 with `Relates to #8` in the body because issue #8 was already closed by the planning PR.
- [x] Wait for `Open Relay CI / Governance Checks`.
- [x] Ask Claude to review after CI passes, focusing on:
  - schema parity with `docs/protocol/review-request-packet.md`
  - CLI error behavior
  - dependency minimality
  - lifecycle and roadmap closeout accuracy
- [x] Address Claude review findings F1-F4:
  - invalid JSON parser-message leakage
  - premature `Shipped` lifecycle matrix cells
  - package `main`/`types` entrypoints
  - Node typings aligned to Node 22
- [x] Merge only after CI passes and review findings are resolved.
- [x] Pull and prune local `main` after merge.

## Self-Review Notes

- The plan covers the approved TypeScript CLI-first direction.
- The first code slice intentionally validates packets before generating them.
- MCP server support, package publishing, and hosted deployment are deferred by
  design.
- Lifecycle, security, verification, and roadmap closeout steps are explicit.
- `packet_version` is pinned to `0.1` for the first validator; a future `0.2`
  packet requires version-aware validation instead of widening this schema in
  place.
