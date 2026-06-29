# Implementation Handoff Packet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `implementation-handoff/0.1` packet and local producer command that turns an explicit draft JSON file into a validated pre-work implementation handoff without invoking agents or changing existing packet schemas.

**Architecture:** Reuse the existing protocol envelope, schema registry, generic renderer, prompt renderer, strict parser style, package smoke, and reviewer-draft fail-closed posture. The producer reads one explicit implementation-handoff draft, adds protocol-owned envelope and safety-gate fields, validates the generated packet, and emits JSON or Markdown through existing render paths.

**Tech Stack:** TypeScript, Node.js built-in test runner, JSON Schema draft-07 through the existing Ajv registry, npm scripts, no new dependencies.

---

## File Structure

- Create `schemas/implementation-handoff.schema.json`
  - Formal schema for `implementation-handoff/0.1`.
- Create `src/implementationHandoff.ts`
  - TypeScript packet and draft types.
- Create `src/implementationHandoffArgs.ts`
  - Strict parser for `generate implementation-handoff`.
- Create `src/implementationHandoffProducer.ts`
  - Pure builder from draft JSON to `ImplementationHandoffPacket`.
- Create `src/renderImplementationHandoff.ts`
  - Pure Markdown renderer for `implementation-handoff`.
- Create `tests/implementationHandoffArgs.test.ts`
  - Parser coverage for required, duplicate, unknown, and invalid flags.
- Create `tests/implementationHandoffProducer.test.ts`
  - Draft key guards, safety gates, semantic mapping, and validation tests.
- Create `tests/renderImplementationHandoff.test.ts`
  - Renderer order, escaping, block rendering, and snapshot tests.
- Create `examples/implementation-handoff/draft.json`
  - Synthetic author draft.
- Create `examples/implementation-handoff/relay.json`
  - Generated packet example.
- Create `examples/implementation-handoff/relay.md`
  - Snapshot-bound Markdown render.
- Create `docs/protocol/implementation-handoff-packet.md`
  - Public protocol doc.
- Modify `src/schemaRegistry.ts`
  - Register schema and semantic checks.
- Modify `src/renderPacket.ts`
  - Register implementation-handoff renderer.
- Modify `src/cli.ts`
  - Add `generate implementation-handoff`.
- Modify `src/index.ts`
  - Export implementation-handoff builder/types and renderer if consistent with current exports.
- Modify `tests/schema.test.ts`
  - Validate example and semantic rules.
- Modify `tests/renderPacket.test.ts`
  - Dispatch implementation-handoff rendering.
- Modify `tests/cli.test.ts`
  - CLI producer behavior, sanitization, JSON/Markdown output.
- Modify `scripts/smoke-pack.js`
  - Installed CLI smoke for `generate implementation-handoff` and `render --template codex`.
- Modify `README.md`
  - Add a short implementation-handoff workflow section.
- Modify `AGENTS.md`, `master_build.md`, `docs/STATUS.md`,
  `docs/planning/ROADMAP.md`, `docs/planning/ACTIVE_WORK.md`,
  `docs/planning/PLAN_REGISTRY.md`,
  `docs/planning/VERSION_LEDGER.md`, and
  `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`
  - Governance closeout.

---

## Task 1: Schema, Example, And Registry TDD

**Files:**
- Create: `schemas/implementation-handoff.schema.json`
- Create: `src/implementationHandoff.ts`
- Create: `examples/implementation-handoff/relay.json`
- Modify: `src/schemaRegistry.ts`
- Modify: `tests/schema.test.ts`

- [ ] **Step 1: Write failing schema tests**

Add tests to `tests/schema.test.ts` using the file's existing JSON helper style:

```ts
test("validates the synthetic implementation-handoff example", () => {
  const packet = readJson("examples/implementation-handoff/relay.json");
  const result = validatePacket(packet);

  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("rejects implementation-handoff packets with no tasks", () => {
  const packet = {
    ...readJson("examples/implementation-handoff/relay.json"),
    tasks: []
  };

  const result = validatePacket(packet);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /implementation-handoff requires at least one task/);
});

test("rejects implementation-handoff packets with duplicate task ids", () => {
  const packet = {
    ...readJson("examples/implementation-handoff/relay.json"),
    tasks: [
      {
        id: "T1",
        title: "First task",
        description: "Synthetic task one.",
        priority: "high",
        source_refs: ["docs/superpowers/plans/example.md"]
      },
      {
        id: "T1",
        title: "Duplicate task",
        description: "Synthetic task two.",
        priority: "medium",
        source_refs: ["docs/superpowers/plans/example.md"]
      }
    ]
  };

  const result = validatePacket(packet);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /implementation-handoff task ids must be unique/);
});

test("rejects implementation-handoff packets with disabled safety gates", () => {
  const packet = {
    ...readJson("examples/implementation-handoff/relay.json"),
    safety_gates: {
      preserve_unrelated_changes: true,
      requires_human_approval_for_merge: false,
      requires_human_approval_for_publish: true,
      requires_human_approval_for_destructive_commands: true,
      requires_human_approval_for_scope_expansion: true
    }
  };

  const result = validatePacket(packet);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /implementation-handoff safety gates must all be true/);
});
```

- [ ] **Step 2: Run the targeted tests and confirm they fail**

Run:

```bash
npm test -- --test-name-pattern "implementation-handoff"
```

Expected: fail because the example, schema, and registry entry do not exist yet.

- [ ] **Step 3: Add TypeScript packet types**

Create `src/implementationHandoff.ts`:

```ts
export type ImplementationHandoffActorKind = "human" | "agent" | "unknown";
export type ImplementationHandoffTaskPriority = "high" | "medium" | "low";
export type ImplementationHandoffSourceType =
  | "plan"
  | "doc"
  | "issue"
  | "pull_request"
  | "packet"
  | "user_note"
  | "external_url";
export type ImplementationHandoffConstraintType =
  | "security"
  | "scope"
  | "lifecycle"
  | "owner_decision"
  | "verification"
  | "other";
export type ImplementationHandoffVerificationKind =
  | "command"
  | "ci"
  | "manual"
  | "external";

export type ImplementationHandoffActor = {
  name: string;
  kind: ImplementationHandoffActorKind;
  source?: string;
  tool?: string;
};

export type ImplementationHandoffTarget = {
  repository: string;
  base_branch: string;
  working_branch: string;
  starting_commit?: string;
  pull_request_url?: string;
  storage_id?: string;
};

export type ImplementationHandoffSourceMaterial = {
  type: ImplementationHandoffSourceType;
  reference: string;
  summary: string;
};

export type ImplementationHandoffWorkScope = {
  included: string[];
  excluded: string[];
};

export type ImplementationHandoffTask = {
  id: string;
  title: string;
  description: string;
  priority: ImplementationHandoffTaskPriority;
  source_refs: string[];
  acceptance_refs?: string[];
};

export type ImplementationHandoffConstraint = {
  type: ImplementationHandoffConstraintType;
  description: string;
  handling: string;
};

export type ImplementationHandoffVerificationPlanItem = {
  kind: ImplementationHandoffVerificationKind;
  command: string;
  purpose: string;
  required: boolean;
};

export type ImplementationHandoffSafetyGates = {
  preserve_unrelated_changes: true;
  requires_human_approval_for_merge: true;
  requires_human_approval_for_publish: true;
  requires_human_approval_for_destructive_commands: true;
  requires_human_approval_for_scope_expansion: true;
};

export type ImplementationHandoffPacket = {
  packet_version: "0.1";
  packet_type: "implementation-handoff";
  created_at: string;
  handoff_from: ImplementationHandoffActor & { source: string };
  implementer: ImplementationHandoffActor;
  target: ImplementationHandoffTarget;
  objective: string;
  source_materials: ImplementationHandoffSourceMaterial[];
  work_scope: ImplementationHandoffWorkScope;
  tasks: ImplementationHandoffTask[];
  constraints: ImplementationHandoffConstraint[];
  acceptance_criteria: string[];
  verification_plan: ImplementationHandoffVerificationPlanItem[];
  safety_gates: ImplementationHandoffSafetyGates;
  provenance?: Array<{
    type: "pull_request" | "ci_run" | "commit" | "issue" | "user_note" | "external_url";
    reference: string;
    supports: string;
  }>;
  redactions: Array<{
    field: string;
    reason: string;
    replacement?: string;
  }>;
  sensitive_data?: {
    excluded: boolean;
    notes: string;
  };
  next_action: string;
};

export type ImplementationHandoffDraft = Omit<
  ImplementationHandoffPacket,
  "packet_version" | "packet_type" | "created_at" | "safety_gates"
>;
```

If existing provenance, redaction, or sensitive-data aliases are exported by
the time this task is implemented, reuse them instead of duplicating equivalent
inline object types.

- [ ] **Step 4: Add the schema**

Create `schemas/implementation-handoff.schema.json` with the required fields and
`additionalProperties: false`. The schema must require at least one item in
`source_materials`, `work_scope.included`, `tasks`, `acceptance_criteria`, and
`verification_plan`, and must pin:

```json
{
  "packet_version": { "type": "string", "const": "0.1" },
  "packet_type": { "type": "string", "const": "implementation-handoff" }
}
```

Each object definition must reject unknown fields. Use enum values from
`docs/superpowers/specs/2026-06-29-implementation-handoff-packet-design.md`.

- [ ] **Step 5: Add the generated example JSON**

Create `examples/implementation-handoff/relay.json`:

```json
{
  "packet_version": "0.1",
  "packet_type": "implementation-handoff",
  "created_at": "2026-06-29T00:00:00Z",
  "handoff_from": {
    "name": "Cam",
    "kind": "human",
    "source": "owner brief"
  },
  "implementer": {
    "name": "Codex",
    "kind": "agent",
    "tool": "Codex"
  },
  "target": {
    "repository": "AcrossWorksAPI/open-relay",
    "base_branch": "main",
    "working_branch": "codex/example-implementation"
  },
  "objective": "Add a small local CLI behavior using the existing Open Relay runtime patterns.",
  "source_materials": [
    {
      "type": "plan",
      "reference": "docs/superpowers/plans/example-implementation.md",
      "summary": "Defines the intended implementation tasks and verification gates."
    }
  ],
  "work_scope": {
    "included": [
      "Add the planned local CLI behavior.",
      "Update focused tests and docs for the behavior."
    ],
    "excluded": [
      "Do not publish, merge, invoke external agents, or change unrelated packet schemas."
    ]
  },
  "tasks": [
    {
      "id": "T1",
      "title": "Implement the planned CLI behavior",
      "description": "Follow the referenced implementation plan and reuse existing parser, validation, renderer, and smoke-test patterns.",
      "priority": "high",
      "source_refs": ["docs/superpowers/plans/example-implementation.md"],
      "acceptance_refs": ["CLI behavior is covered by tests"]
    }
  ],
  "constraints": [
    {
      "type": "scope",
      "description": "Keep the implementation local-first and packet-native.",
      "handling": "Do not add hosted services, external agent invocation, merge automation, or publishing behavior."
    }
  ],
  "acceptance_criteria": [
    "CLI behavior is covered by tests",
    "Docs describe the command boundary and non-goals",
    "Local verification passes before review"
  ],
  "verification_plan": [
    {
      "kind": "command",
      "command": "npm run check",
      "purpose": "Build and test the TypeScript runtime.",
      "required": true
    },
    {
      "kind": "command",
      "command": "git diff --check",
      "purpose": "Reject whitespace errors before review.",
      "required": true
    }
  ],
  "safety_gates": {
    "preserve_unrelated_changes": true,
    "requires_human_approval_for_merge": true,
    "requires_human_approval_for_publish": true,
    "requires_human_approval_for_destructive_commands": true,
    "requires_human_approval_for_scope_expansion": true
  },
  "provenance": [
    {
      "type": "user_note",
      "reference": "synthetic example",
      "supports": "Demonstrates implementation-handoff packet shape."
    }
  ],
  "redactions": [],
  "sensitive_data": {
    "excluded": true,
    "notes": "Synthetic packet excludes secrets, private logs, customer data, and local paths."
  },
  "next_action": "Implement the scoped task, run the planned verification, then generate a review-request packet."
}
```

- [ ] **Step 6: Register schema and semantic checks**

Modify `src/schemaRegistry.ts` to import the schema and register
`implementation-handoff/0.1`. Add semantic checks:

```ts
function validateImplementationHandoffSemantics(packet: unknown): string[] {
  const handoff = packet as ImplementationHandoffPacket;
  const errors: string[] = [];

  if (handoff.tasks.length === 0) {
    errors.push("implementation-handoff requires at least one task.");
  }

  const taskIds = new Set<string>();
  for (const task of handoff.tasks) {
    if (taskIds.has(task.id)) {
      errors.push("implementation-handoff task ids must be unique.");
      break;
    }
    taskIds.add(task.id);
  }

  const gates = Object.values(handoff.safety_gates);
  if (!gates.every((value) => value === true)) {
    errors.push("implementation-handoff safety gates must all be true.");
  }

  return errors;
}
```

Also rely on schema `minItems` for source materials, included scope,
acceptance criteria, and verification plan so users get path-specific schema
errors for those empty arrays.

- [ ] **Step 7: Run targeted schema tests**

Run:

```bash
npm test -- --test-name-pattern "implementation-handoff"
```

Expected: the schema tests written in Step 1 pass. Renderer, producer, and CLI
tests are still absent.

---

## Task 2: Draft Parser And Producer

**Files:**
- Create: `examples/implementation-handoff/draft.json`
- Create: `src/implementationHandoffArgs.ts`
- Create: `src/implementationHandoffProducer.ts`
- Create: `tests/implementationHandoffArgs.test.ts`
- Create: `tests/implementationHandoffProducer.test.ts`

- [ ] **Step 1: Add draft fixture**

Create `examples/implementation-handoff/draft.json` with the same
packet-authored fields as `examples/implementation-handoff/relay.json`, omitting
`packet_version`, `packet_type`, `created_at`, and `safety_gates`.

- [ ] **Step 2: Add parser tests**

Create `tests/implementationHandoffArgs.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { parseImplementationHandoffArgs } from "../src/implementationHandoffArgs.js";

test("parses implementation-handoff generator args", () => {
  const result = parseImplementationHandoffArgs([
    "--draft",
    "handoff-draft.json",
    "--format",
    "markdown",
    "--output",
    "handoff.md"
  ]);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.options.draft, "handoff-draft.json");
    assert.equal(result.options.format, "markdown");
    assert.equal(result.options.output, "handoff.md");
  }
});

test("defaults implementation-handoff output format to json", () => {
  const result = parseImplementationHandoffArgs(["--draft", "handoff-draft.json"]);

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.options.format, "json");
  }
});

test("rejects duplicate implementation-handoff flags", () => {
  const result = parseImplementationHandoffArgs([
    "--draft",
    "one.json",
    "--draft",
    "two.json"
  ]);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /Duplicate flag: --draft/);
  }
});

test("rejects unknown implementation-handoff flags", () => {
  const result = parseImplementationHandoffArgs([
    "--draft",
    "handoff-draft.json",
    "--unknown",
    "value"
  ]);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /Unknown flag: --unknown/);
  }
});

test("rejects unsupported implementation-handoff formats", () => {
  const result = parseImplementationHandoffArgs([
    "--draft",
    "handoff-draft.json",
    "--format",
    "yaml"
  ]);

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.match(result.message, /--format must be json or markdown/);
  }
});
```

- [ ] **Step 3: Add producer tests**

Create `tests/implementationHandoffProducer.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildImplementationHandoffPacket } from "../src/implementationHandoffProducer.js";
import { validatePacket } from "../src/schema.js";

function readDraft() {
  return JSON.parse(readFileSync("examples/implementation-handoff/draft.json", "utf8"));
}

test("builds a valid implementation-handoff packet from a draft", () => {
  const packet = buildImplementationHandoffPacket(readDraft(), {
    createdAt: "2026-06-29T00:00:00Z"
  });

  assert.equal(packet.packet_type, "implementation-handoff");
  assert.equal(packet.packet_version, "0.1");
  assert.equal(packet.created_at, "2026-06-29T00:00:00Z");
  assert.equal(packet.safety_gates.requires_human_approval_for_merge, true);

  const result = validatePacket(packet);
  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("rejects unknown implementation-handoff draft fields", () => {
  assert.throws(
    () =>
      buildImplementationHandoffPacket(
        {
          ...readDraft(),
          misspelled_scope: []
        },
        { createdAt: "2026-06-29T00:00:00Z" }
      ),
    /Unknown implementation-handoff draft field: misspelled_scope/
  );
});

test("rejects protocol-owned implementation-handoff draft fields", () => {
  assert.throws(
    () =>
      buildImplementationHandoffPacket(
        {
          ...readDraft(),
          packet_type: "implementation-handoff"
        },
        { createdAt: "2026-06-29T00:00:00Z" }
      ),
    /Implementation-handoff drafts cannot set protocol field: packet_type/
  );
});
```

- [ ] **Step 4: Implement strict argument parsing**

Create `src/implementationHandoffArgs.ts` using the existing parser result
shape from `reviewResponseArgs.ts` or `resumeProjectArgs.ts`. Supported flags:

- `--draft <path>` required;
- `--format json|markdown` optional, default `json`;
- `--output <path>` optional.

Reject unknown, duplicate, missing-value, and unsupported-format flags with
exit-code-2 parser results.

- [ ] **Step 5: Implement the producer**

Create `src/implementationHandoffProducer.ts`:

```ts
import type {
  ImplementationHandoffDraft,
  ImplementationHandoffPacket
} from "./implementationHandoff.js";

const ALLOWED_DRAFT_KEYS = new Set([
  "handoff_from",
  "implementer",
  "target",
  "objective",
  "source_materials",
  "work_scope",
  "tasks",
  "constraints",
  "acceptance_criteria",
  "verification_plan",
  "provenance",
  "redactions",
  "sensitive_data",
  "next_action"
]);

const RESERVED_DRAFT_KEYS = new Set([
  "packet_version",
  "packet_type",
  "created_at",
  "safety_gates"
]);

export function buildImplementationHandoffPacket(
  draft: unknown,
  options: { createdAt?: string } = {}
): ImplementationHandoffPacket {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    throw new Error("Implementation-handoff draft must be a JSON object.");
  }

  for (const key of Object.keys(draft)) {
    if (RESERVED_DRAFT_KEYS.has(key)) {
      throw new Error(`Implementation-handoff drafts cannot set protocol field: ${key}.`);
    }
    if (!ALLOWED_DRAFT_KEYS.has(key)) {
      throw new Error(`Unknown implementation-handoff draft field: ${key}.`);
    }
  }

  const allowedDraft = draft as ImplementationHandoffDraft;

  return {
    packet_version: "0.1",
    packet_type: "implementation-handoff",
    created_at: options.createdAt ?? new Date().toISOString(),
    ...allowedDraft,
    safety_gates: {
      preserve_unrelated_changes: true,
      requires_human_approval_for_merge: true,
      requires_human_approval_for_publish: true,
      requires_human_approval_for_destructive_commands: true,
      requires_human_approval_for_scope_expansion: true
    }
  };
}
```

If the existing codebase has a shared error class for sanitized CLI failures by
implementation time, reuse that shape.

- [ ] **Step 6: Run parser and producer tests**

Run:

```bash
npm test -- --test-name-pattern "implementation-handoff"
```

Expected: parser, producer, and schema tests pass.

---

## Task 3: Markdown Renderer And Generic Render Dispatch

**Files:**
- Create: `src/renderImplementationHandoff.ts`
- Create: `tests/renderImplementationHandoff.test.ts`
- Create: `examples/implementation-handoff/relay.md`
- Modify: `src/renderPacket.ts`
- Modify: `tests/renderPacket.test.ts`

- [ ] **Step 1: Write renderer tests**

Create `tests/renderImplementationHandoff.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { renderImplementationHandoffMarkdown } from "../src/renderImplementationHandoff.js";

function readExample() {
  return JSON.parse(readFileSync("examples/implementation-handoff/relay.json", "utf8"));
}

test("renders implementation-handoff sections in stable order", () => {
  const markdown = renderImplementationHandoffMarkdown(readExample());

  assert.match(markdown, /^# Implementation Handoff Relay Packet/);
  assert.ok(markdown.indexOf("## Handoff From") < markdown.indexOf("## Implementer"));
  assert.ok(markdown.indexOf("## Implementer") < markdown.indexOf("## Target"));
  assert.ok(markdown.indexOf("## Target") < markdown.indexOf("## Objective"));
  assert.ok(markdown.indexOf("## Verification Plan") < markdown.indexOf("## Safety Gates"));
  assert.ok(markdown.indexOf("## Safety Gates") < markdown.indexOf("## Next Action"));
});

test("renders implementation-handoff tasks as readable blocks", () => {
  const markdown = renderImplementationHandoffMarkdown(readExample());

  assert.match(markdown, /### T1: Implement the planned CLI behavior/);
  assert.match(markdown, /\*\*Priority:\*\* high/);
  assert.match(markdown, /\*\*Source refs:\*\* `docs\/superpowers\/plans\/example-implementation\.md`/);
});

test("matches the implementation-handoff markdown snapshot", () => {
  const markdown = renderImplementationHandoffMarkdown(readExample());
  const expected = readFileSync("examples/implementation-handoff/relay.md", "utf8");

  assert.equal(markdown, expected);
});
```

- [ ] **Step 2: Confirm renderer tests fail**

Run:

```bash
npm test -- --test-name-pattern "implementation-handoff"
```

Expected: fail because the renderer and Markdown snapshot do not exist yet.

- [ ] **Step 3: Implement the renderer**

Create `src/renderImplementationHandoff.ts`. Follow the helper style in
`renderReviewResponse.ts` and `renderResumeProject.ts`; do not hand-roll
escaping. Render in this exact section order:

1. Implementation handoff
2. Handoff from
3. Implementer
4. Target
5. Objective
6. Source materials
7. Work scope
8. Tasks
9. Constraints
10. Acceptance criteria
11. Verification plan
12. Safety gates
13. Provenance
14. Redactions
15. Sensitive data
16. Next action

Tasks and constraints should render as blocks with normalized prose fields.

- [ ] **Step 4: Register generic rendering**

Modify `src/renderPacket.ts` to dispatch `implementation-handoff/0.1` to
`renderImplementationHandoffMarkdown`.

Add a `tests/renderPacket.test.ts` assertion that rendering the example through
`renderPacketMarkdown` includes `# Implementation Handoff Relay Packet`.

- [ ] **Step 5: Create the Markdown snapshot**

Create `examples/implementation-handoff/relay.md` by rendering
`examples/implementation-handoff/relay.json` through the new renderer. Keep the
snapshot committed so renderer drift is visible in tests.

- [ ] **Step 6: Run renderer tests**

Run:

```bash
npm test -- --test-name-pattern "implementation-handoff|renderPacket"
```

Expected: implementation-handoff renderer tests and generic dispatch tests pass.

---

## Task 4: CLI Route

**Files:**
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add CLI behavior tests**

Add focused tests to `tests/cli.test.ts`:

```ts
test("generate implementation-handoff writes json to stdout", () => {
  const result = runCli([
    "generate",
    "implementation-handoff",
    "--draft",
    "examples/implementation-handoff/draft.json"
  ]);

  assert.equal(result.status, 0);
  const packet = JSON.parse(result.stdout);
  assert.equal(packet.packet_type, "implementation-handoff");
  assert.equal(packet.packet_version, "0.1");
});

test("generate implementation-handoff writes markdown to stdout", () => {
  const result = runCli([
    "generate",
    "implementation-handoff",
    "--draft",
    "examples/implementation-handoff/draft.json",
    "--format",
    "markdown"
  ]);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^# Implementation Handoff Relay Packet/);
});

test("generate implementation-handoff rejects reserved draft fields", () => {
  const draftPath = writeTempJson({
    ...readJson("examples/implementation-handoff/draft.json"),
    packet_type: "implementation-handoff"
  });

  const result = runCli([
    "generate",
    "implementation-handoff",
    "--draft",
    draftPath
  ]);

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Implementation-handoff drafts cannot set protocol field: packet_type/);
  assert.doesNotMatch(result.stderr, /objective/);
});
```

Use existing `runCli`, `writeTempJson`, or fixture helpers in `tests/cli.test.ts`
instead of adding parallel helpers.

- [ ] **Step 2: Confirm CLI tests fail**

Run:

```bash
npm test -- --test-name-pattern "generate implementation-handoff"
```

Expected: fail because the CLI route does not exist.

- [ ] **Step 3: Add the CLI route**

Modify `src/cli.ts`:

- help text includes:

```text
open-relay generate implementation-handoff --draft <draft.json> [--format json|markdown] [--output <path>]
```

- route after other `generate` subcommands:

```ts
if (args[0] === "generate" && args[1] === "implementation-handoff") {
  return generateImplementationHandoffCommand(args.slice(2));
}
```

- command flow:
  1. parse args;
  2. read draft file;
  3. parse JSON;
  4. build packet;
  5. validate generated packet;
  6. render Markdown when requested;
  7. write or print output using existing sanitized output helpers.

Use these sanitized messages:

- `Invalid JSON in <path>`;
- `Generated implementation-handoff packet failed validation.`;
- `Could not write implementation-handoff packet.`;
- `Wrote implementation-handoff packet.`;
- `Wrote implementation-handoff Markdown.`;

- [ ] **Step 4: Export public helpers**

Modify `src/index.ts` to export implementation-handoff types, producer, and
renderer using the same pattern as `resume-project`.

- [ ] **Step 5: Run CLI tests**

Run:

```bash
npm test -- --test-name-pattern "implementation-handoff"
```

Expected: all implementation-handoff tests pass.

---

## Task 5: Package Smoke, Docs, And Governance Closeout

**Files:**
- Modify: `scripts/smoke-pack.js`
- Modify: `README.md`
- Create: `docs/protocol/implementation-handoff-packet.md`
- Modify: `AGENTS.md`
- Modify: `master_build.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

- [ ] **Step 1: Add installed-package smoke**

In `scripts/smoke-pack.js`, after existing packet-generation smokes, add an
installed CLI smoke that:

1. runs `open-relay generate implementation-handoff --draft <fixture> --output <packet.json>`;
2. validates the generated packet;
3. renders `packet.json --template codex --output codex-implementation-handoff.md`;
4. asserts the prompt contains the Codex wrapper and `# Implementation Handoff Relay Packet`.

- [ ] **Step 2: Add protocol docs**

Create `docs/protocol/implementation-handoff-packet.md` from the committed
design, trimmed for public users. Include:

- purpose;
- command;
- packet fields;
- object shapes;
- semantic rules;
- Markdown rendering order;
- relationship to review-request, review-response, and resume-project;
- non-goals.

- [ ] **Step 3: Add README workflow docs**

Add a short section showing:

```bash
open-relay generate implementation-handoff \
  --draft implementation-handoff-draft.json \
  --format markdown \
  --output implementation-handoff.md

open-relay render implementation-handoff.json --template codex \
  --output codex-implementation-handoff.md
```

State that Open Relay creates and renders a local packet only; it does not
invoke agents or apply changes.

- [ ] **Step 4: Update governance docs**

Update:

- `AGENTS.md`: current known scope includes implementation-handoff packet
  implementation after merge; non-goals still include external agent
  invocation, automation, merge, publish, and schema changes outside this type.
- `master_build.md`: current baseline and near-term queue include implementation
  handoff implementation.
- `docs/STATUS.md`: active work and latest verification evidence describe the
  implementation branch checks.
- `docs/planning/ROADMAP.md`: change the implementation-handoff row to the PR
  numbered pre-release label and `Done` only after merge evidence exists.
- `docs/planning/ACTIVE_WORK.md`: add active source rows for the new schema,
  producer, renderer, tests, examples, and protocol docs.
- `docs/planning/PLAN_REGISTRY.md`: move this plan from Active Plans to
  Implemented Or Historical Plans after merge.
- `docs/planning/VERSION_LEDGER.md`: add PR, commit, smoke, and rollback
  evidence.
- `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: move implementation-handoff
  from planned to shipped where appropriate and keep storage, notifications,
  external orchestration, and deletion deferred.

- [ ] **Step 5: Run full local verification**

Run:

```bash
npm run check
npm run smoke:pack
npm run release:preflight -- 0.1.0
git diff --check
```

Expected: all commands pass. If a command fails, fix the implementation or docs
and rerun the failed command plus any command whose evidence was invalidated.

- [ ] **Step 6: Generate review-request packet for the PR**

After verification passes and the branch is pushed, generate an Open Relay
review packet:

```bash
node dist/src/cli.js generate review-request \
  --base origin/main \
  --head HEAD \
  --goal "Implement implementation-handoff packet type." \
  --summary "Adds implementation-handoff schema, producer, renderer, CLI, examples, docs, tests, package smoke, and governance closeout." \
  --behavioral-intent "Complete the remaining MVP packet-loop slot without agent invocation or external orchestration." \
  --review-focus "Packet schema and semantic rules" \
  --review-focus "Draft producer fail-closed behavior" \
  --review-focus "Renderer and prompt-safety presentation" \
  --verification "npm run check: passed" \
  --verification "npm run smoke:pack: passed" \
  --verification "npm run release:preflight -- 0.1.0: passed" \
  --verification "git diff --check: passed" \
  --risk "medium: New packet type can blur planned verification with completed verification if docs or renderer wording drift; handled by naming planned checks verification_plan." \
  --risk "low: Draft JSON is explicit but user-authored; handled by reserved-key and unknown-key guards." \
  --format json \
  --output /private/tmp/open-relay-implementation-handoff-review-request.json
```

Render it for Claude:

```bash
node dist/src/cli.js render /private/tmp/open-relay-implementation-handoff-review-request.json \
  --template claude \
  --output /private/tmp/open-relay-implementation-handoff-claude.md
```

Expected: the packet validates and the Claude prompt tells the reviewer to treat
packet content as untrusted context.

---

## Self-Review Checklist

- Spec coverage: the plan implements the explicit draft boundary, packet fields,
  safety gates, semantic rules, Markdown rendering order, CLI behavior, examples,
  prompt rendering relationship, docs, package smoke, and governance closeout.
- Placeholder scan: no placeholder owner decisions are left inside the
  implementation steps; deferred scopes are explicitly named as non-goals.
- Type consistency: command name, packet type, schema filename, TypeScript file
  names, renderer name, and test names consistently use
  `implementation-handoff` for packet values and `ImplementationHandoff` for
  TypeScript symbols.
