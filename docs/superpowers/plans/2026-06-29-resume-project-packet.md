# Resume Project Packet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `resume-project/0.1` packet and local producer command that turns a validated `review-response` into a Codex-ready continuation packet without applying fixes or invoking agents.

**Architecture:** Reuse the existing protocol envelope, schema registry, generic renderer, prompt renderer, strict CLI parser style, and package smoke. The producer reads one explicit `review-response` file, derives a validated `resume-project` packet, and emits JSON or Markdown through the existing renderer path.

**Tech Stack:** TypeScript, Node.js built-in test runner, JSON Schema draft-07 through existing Ajv registry, npm scripts, no new dependencies.

---

## File Structure

- Create `schemas/resume-project.schema.json`
  - Formal schema for `resume-project/0.1`.
- Create `src/resumeProject.ts`
  - TypeScript packet types, `ResumeProjectPacket`, `ResumeProjectStatus`,
    and shared aliases.
- Create `src/resumeProjectProducer.ts`
  - Pure builder from `ReviewResponsePacket` to `ResumeProjectPacket`.
- Create `src/resumeProjectArgs.ts`
  - Strict parser for `generate resume-project`.
- Create `src/renderResumeProject.ts`
  - Pure Markdown renderer for `resume-project`.
- Create `tests/resumeProjectProducer.test.ts`
  - Builder and semantic mapping tests.
- Create `tests/resumeProjectArgs.test.ts`
  - Parser tests.
- Create `tests/renderResumeProject.test.ts`
  - Renderer order, escaping, task-block, and snapshot tests.
- Create `examples/resume-project/relay.json`
  - Synthetic resume packet derived from `examples/review-response/relay.json`.
- Create `examples/resume-project/relay.md`
  - Snapshot-bound Markdown render.
- Create `docs/protocol/resume-project-packet.md`
  - Public protocol doc.
- Modify `src/schemaRegistry.ts`
  - Register schema and semantic checks.
- Modify `src/renderPacket.ts`
  - Register resume-project renderer.
- Modify `src/cli.ts`
  - Add `generate resume-project`.
- Modify `src/index.ts`
  - Export resume-project builder/types and renderer if consistent with existing exports.
- Modify `tests/schema.test.ts`
  - Validate example and semantic rules.
- Modify `tests/renderPacket.test.ts`
  - Dispatch resume-project rendering.
- Modify `tests/cli.test.ts`
  - CLI producer behavior, sanitization, JSON/Markdown output.
- Modify `scripts/smoke-pack.js`
  - Installed CLI smoke for `generate resume-project` and `render --template codex`.
- Modify `README.md`
  - Add a short resume-project workflow section.
- Modify `AGENTS.md`, `master_build.md`, `docs/STATUS.md`,
  `docs/planning/ROADMAP.md`, `docs/planning/ACTIVE_WORK.md`,
  `docs/planning/PLAN_REGISTRY.md`,
  `docs/planning/VERSION_LEDGER.md`, and
  `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`
  - Governance closeout.

---

## Task 1: Schema, Type, And Registry TDD

**Files:**
- Create: `schemas/resume-project.schema.json`
- Create: `src/resumeProject.ts`
- Modify: `src/schemaRegistry.ts`
- Modify: `tests/schema.test.ts`

- [ ] **Step 1: Write failing schema tests**

Add tests to `tests/schema.test.ts`:

```ts
test("validates the synthetic resume-project example", () => {
  const packet = readJson("examples/resume-project/relay.json");
  const result = validatePacket(packet);

  assert.equal(result.valid, true, result.errors.join("\n"));
});

test("rejects contradictory resume-project status", () => {
  const packet = {
    ...readJson("examples/resume-project/relay.json"),
    resume_status: "owner_decision",
    tasks: [
      {
        source_finding_id: "F1",
        severity: "high",
        blocking: true,
        title: "Blocking finding",
        description: "A blocking finding must not appear on owner_decision.",
        evidence: "Synthetic evidence.",
        recommendation: "Synthetic recommendation."
      }
    ]
  };

  const result = validatePacket(packet);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /owner_decision status cannot include blocking tasks/);
});

test("requires blocked resume-project packets to carry a limitation", () => {
  const packet = {
    ...readJson("examples/resume-project/relay.json"),
    resume_status: "blocked",
    reviewed_scope: {
      files: [],
      limitations: []
    }
  };

  const result = validatePacket(packet);

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /blocked status requires at least one limitation/);
});
```

Use the existing local helper style in `tests/schema.test.ts`; if the file uses
a different `readJson` helper name, extend that helper instead of duplicating
file-read code.

- [ ] **Step 2: Run the targeted test and confirm it fails**

Run:

```bash
npm test -- --test-name-pattern "resume-project"
```

Expected: fail because `examples/resume-project/relay.json` and the schema
registry entry do not exist yet.

- [ ] **Step 3: Add the resume-project schema**

Create `schemas/resume-project.schema.json`:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "$id": "https://open-relay.local/schemas/resume-project.schema.json",
  "title": "Open Relay Resume Project Packet",
  "type": "object",
  "additionalProperties": false,
  "required": [
    "packet_version",
    "packet_type",
    "created_at",
    "resume_from",
    "target",
    "resume_status",
    "confidence",
    "summary",
    "tasks",
    "reviewed_scope",
    "prior_verification",
    "safety_gates",
    "redactions",
    "next_action"
  ],
  "properties": {
    "packet_version": { "type": "string", "const": "0.1" },
    "packet_type": { "type": "string", "const": "resume-project" },
    "created_at": {
      "type": "string",
      "pattern": "^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d{3})?Z$"
    },
    "resume_from": { "$ref": "#/definitions/resumeFrom" },
    "target": { "$ref": "#/definitions/target" },
    "resume_status": {
      "type": "string",
      "enum": [
        "address_findings",
        "owner_decision",
        "continue_with_context",
        "blocked"
      ]
    },
    "confidence": {
      "type": "string",
      "enum": ["high", "medium", "low"]
    },
    "summary": { "type": "string", "minLength": 1 },
    "tasks": {
      "type": "array",
      "items": { "$ref": "#/definitions/task" }
    },
    "reviewed_scope": { "$ref": "#/definitions/reviewedScope" },
    "prior_verification": {
      "type": "array",
      "items": { "$ref": "#/definitions/verification" }
    },
    "safety_gates": { "$ref": "#/definitions/safetyGates" },
    "provenance": {
      "type": "array",
      "items": { "$ref": "#/definitions/provenance" }
    },
    "redactions": {
      "type": "array",
      "items": { "$ref": "#/definitions/redaction" }
    },
    "sensitive_data": { "$ref": "#/definitions/sensitiveData" },
    "next_action": { "type": "string", "minLength": 1 }
  },
  "definitions": {
    "resumeFrom": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "packet_type",
        "packet_version",
        "created_at",
        "reviewer_name",
        "reviewer_kind",
        "outcome",
        "source"
      ],
      "properties": {
        "packet_type": { "type": "string", "const": "review-response" },
        "packet_version": { "type": "string", "minLength": 1 },
        "created_at": { "type": "string", "minLength": 1 },
        "reviewer_name": { "type": "string", "minLength": 1 },
        "reviewer_kind": {
          "type": "string",
          "enum": ["agent", "human", "unknown"]
        },
        "outcome": {
          "type": "string",
          "enum": ["approved", "changes_requested", "commentary", "blocked"]
        },
        "source": { "type": "string", "minLength": 1 }
      }
    },
    "target": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "repository",
        "working_branch",
        "base_commit",
        "head_commit",
        "diff_range"
      ],
      "properties": {
        "repository": { "type": "string", "minLength": 1 },
        "working_branch": { "type": "string", "minLength": 1 },
        "base_commit": { "type": "string", "minLength": 1 },
        "head_commit": { "type": "string", "minLength": 1 },
        "diff_range": { "type": "string", "minLength": 1 },
        "pull_request_url": { "type": "string", "minLength": 1 },
        "storage_id": { "type": "string", "minLength": 1 }
      }
    },
    "task": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "source_finding_id",
        "severity",
        "blocking",
        "title",
        "description",
        "evidence",
        "recommendation"
      ],
      "properties": {
        "source_finding_id": { "type": "string", "minLength": 1 },
        "severity": {
          "type": "string",
          "enum": ["high", "medium", "low", "info"]
        },
        "blocking": { "type": "boolean" },
        "title": { "type": "string", "minLength": 1 },
        "description": { "type": "string", "minLength": 1 },
        "evidence": { "type": "string", "minLength": 1 },
        "recommendation": { "type": "string", "minLength": 1 },
        "location": { "$ref": "#/definitions/location" }
      }
    },
    "location": {
      "type": "object",
      "additionalProperties": false,
      "required": ["path"],
      "properties": {
        "path": { "type": "string", "minLength": 1 },
        "line": { "type": "integer", "minimum": 1 },
        "symbol": { "type": "string", "minLength": 1 }
      }
    },
    "reviewedScope": {
      "type": "object",
      "additionalProperties": false,
      "required": ["files", "limitations"],
      "properties": {
        "files": {
          "type": "array",
          "items": { "$ref": "#/definitions/reviewedFile" }
        },
        "limitations": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 }
        }
      }
    },
    "reviewedFile": {
      "type": "object",
      "additionalProperties": false,
      "required": ["path"],
      "properties": {
        "path": { "type": "string", "minLength": 1 },
        "notes": { "type": "string", "minLength": 1 }
      }
    },
    "verification": {
      "type": "object",
      "additionalProperties": false,
      "required": ["kind", "command", "result", "evidence"],
      "properties": {
        "kind": {
          "type": "string",
          "enum": ["command", "ci", "manual", "external"]
        },
        "command": { "type": "string", "minLength": 1 },
        "result": {
          "type": "string",
          "enum": ["passed", "failed", "not_run", "unknown"]
        },
        "evidence": { "type": "string", "minLength": 1 }
      }
    },
    "safetyGates": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "preserve_unrelated_changes",
        "requires_human_approval_for_merge",
        "requires_human_approval_for_publish",
        "requires_human_approval_for_destructive_commands"
      ],
      "properties": {
        "preserve_unrelated_changes": { "type": "boolean", "const": true },
        "requires_human_approval_for_merge": { "type": "boolean", "const": true },
        "requires_human_approval_for_publish": { "type": "boolean", "const": true },
        "requires_human_approval_for_destructive_commands": { "type": "boolean", "const": true }
      }
    },
    "provenance": {
      "type": "object",
      "additionalProperties": false,
      "required": ["type", "reference"],
      "properties": {
        "type": {
          "type": "string",
          "enum": ["github_pr", "ci_run", "external_url", "manual_note"]
        },
        "reference": { "type": "string", "minLength": 1 }
      }
    },
    "redaction": {
      "type": "object",
      "additionalProperties": false,
      "required": ["field", "reason", "replacement"],
      "properties": {
        "field": { "type": "string", "minLength": 1 },
        "reason": { "type": "string", "minLength": 1 },
        "replacement": { "type": "string", "minLength": 1 }
      }
    },
    "sensitiveData": {
      "type": "object",
      "additionalProperties": false,
      "required": ["excluded", "notes"],
      "properties": {
        "excluded": { "type": "boolean" },
        "notes": { "type": "string", "minLength": 1 }
      }
    }
  }
}
```

- [ ] **Step 4: Add TypeScript packet types**

Create `src/resumeProject.ts`:

```ts
import type { ReviewResponsePacket } from "./reviewResponse";

export type ResumeProjectStatus =
  | "address_findings"
  | "owner_decision"
  | "continue_with_context"
  | "blocked";

export type ResumeProjectTask = {
  source_finding_id: string;
  severity: ReviewResponsePacket["findings"][number]["severity"];
  blocking: boolean;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  location?: ReviewResponsePacket["findings"][number]["location"];
};

export type ResumeProjectPacket = {
  packet_version: "0.1";
  packet_type: "resume-project";
  created_at: string;
  resume_from: {
    packet_type: "review-response";
    packet_version: string;
    created_at: string;
    reviewer_name: string;
    reviewer_kind: ReviewResponsePacket["reviewer"]["kind"];
    outcome: ReviewResponsePacket["outcome"];
    source: string;
  };
  target: {
    repository: string;
    working_branch: string;
    base_commit: string;
    head_commit: string;
    diff_range: string;
    pull_request_url?: string;
    storage_id?: string;
  };
  resume_status: ResumeProjectStatus;
  confidence: ReviewResponsePacket["confidence"];
  summary: string;
  tasks: ResumeProjectTask[];
  reviewed_scope: ReviewResponsePacket["reviewed_scope"];
  prior_verification: ReviewResponsePacket["verification"];
  safety_gates: {
    preserve_unrelated_changes: true;
    requires_human_approval_for_merge: true;
    requires_human_approval_for_publish: true;
    requires_human_approval_for_destructive_commands: true;
  };
  provenance?: ReviewResponsePacket["provenance"];
  redactions: ReviewResponsePacket["redactions"];
  sensitive_data?: ReviewResponsePacket["sensitive_data"];
  next_action: string;
};
```

- [ ] **Step 5: Register the schema and semantic checks**

Modify `src/schemaRegistry.ts`:

```ts
import resumeProjectSchema from "../schemas/resume-project.schema.json";
```

Add the registry entry:

```ts
"resume-project": {
  "0.1": {
    validate: ajv.compile(resumeProjectSchema),
    semantics: validateResumeProjectSemantics
  }
}
```

Add the semantic function:

```ts
function validateResumeProjectSemantics(packet: Record<string, unknown>): string[] {
  const status = packet.resume_status;
  const tasks = Array.isArray(packet.tasks) ? packet.tasks : [];
  const reviewedScope = packet.reviewed_scope;
  const limitations = isRecord(reviewedScope) && Array.isArray(reviewedScope.limitations)
    ? reviewedScope.limitations
    : [];
  const hasBlockingTask = tasks.some((task) =>
    isRecord(task) && task.blocking === true
  );

  if (status === "address_findings" && !hasBlockingTask) {
    return ["/tasks address_findings status requires at least one blocking task"];
  }

  if (status === "owner_decision" && hasBlockingTask) {
    return ["/tasks owner_decision status cannot include blocking tasks"];
  }

  if (status === "continue_with_context" && hasBlockingTask) {
    return ["/tasks continue_with_context status cannot include blocking tasks"];
  }

  if (status === "blocked" && limitations.length === 0) {
    return ["/reviewed_scope/limitations blocked status requires at least one limitation"];
  }

  return [];
}
```

- [ ] **Step 6: Add a minimal example fixture**

Create `examples/resume-project/relay.json` with a schema-valid synthetic
packet. Use stable timestamps and SHAs from the existing examples:

```json
{
  "packet_version": "0.1",
  "packet_type": "resume-project",
  "created_at": "2026-06-28T00:00:00Z",
  "resume_from": {
    "packet_type": "review-response",
    "packet_version": "0.1",
    "created_at": "2026-06-28T00:00:00Z",
    "reviewer_name": "Claude Code",
    "reviewer_kind": "agent",
    "outcome": "changes_requested",
    "source": "review-response packet"
  },
  "target": {
    "repository": "AcrossWorksAPI/open-relay",
    "working_branch": "codex/example-branch",
    "base_commit": "1111111111111111111111111111111111111111",
    "head_commit": "2222222222222222222222222222222222222222",
    "diff_range": "1111111111111111111111111111111111111111..2222222222222222222222222222222222222222",
    "pull_request_url": "https://github.com/AcrossWorksAPI/open-relay/pull/123"
  },
  "resume_status": "address_findings",
  "confidence": "high",
  "summary": "Address the blocking review finding before requesting another review.",
  "tasks": [
    {
      "source_finding_id": "F1",
      "severity": "medium",
      "blocking": true,
      "title": "Missing regression coverage",
      "description": "The implementation changed CLI behavior without a focused regression test.",
      "evidence": "The review inspected tests/cli.test.ts and did not find coverage for the new flag.",
      "recommendation": "Add a CLI regression test before merging.",
      "location": {
        "path": "src/cli.ts",
        "symbol": "run"
      }
    }
  ],
  "reviewed_scope": {
    "files": [
      {
        "path": "src/cli.ts",
        "notes": "Reviewed command routing."
      }
    ],
    "limitations": []
  },
  "prior_verification": [
    {
      "kind": "command",
      "command": "npm run check",
      "result": "passed",
      "evidence": "Reviewer reported the command passed locally."
    }
  ],
  "safety_gates": {
    "preserve_unrelated_changes": true,
    "requires_human_approval_for_merge": true,
    "requires_human_approval_for_publish": true,
    "requires_human_approval_for_destructive_commands": true
  },
  "redactions": [],
  "next_action": "Fix the blocking finding, run verification, and request another review."
}
```

- [ ] **Step 7: Run targeted schema tests**

Run:

```bash
npm test -- --test-name-pattern "resume-project"
```

Expected: schema and semantic tests pass, renderer tests still fail until later
tasks add the renderer snapshot.

- [ ] **Step 8: Commit schema and registry work**

```bash
git add schemas/resume-project.schema.json src/resumeProject.ts src/schemaRegistry.ts tests/schema.test.ts examples/resume-project/relay.json
git commit -m "feat: add resume-project schema"
```

---

## Task 2: Pure Producer From Review Response

**Files:**
- Create: `src/resumeProjectProducer.ts`
- Create: `tests/resumeProjectProducer.test.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Write failing producer tests**

Create `tests/resumeProjectProducer.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildResumeProjectPacket } from "../src/resumeProjectProducer";
import { validatePacket } from "../src/schema";
import type { ReviewResponsePacket } from "../src/reviewResponse";

function reviewResponseFixture(overrides: Partial<ReviewResponsePacket> = {}): ReviewResponsePacket {
  const packet = JSON.parse(readFileSync("examples/review-response/relay.json", "utf8")) as ReviewResponsePacket;
  return {
    ...packet,
    ...overrides
  };
}

test("builds a schema-valid resume-project packet from a review response", () => {
  const packet = buildResumeProjectPacket({
    response: reviewResponseFixture(),
    createdAt: "2026-06-29T00:00:00Z"
  });

  const result = validatePacket(packet);

  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.equal(packet.packet_type, "resume-project");
  assert.equal(packet.resume_from.packet_type, "review-response");
  assert.equal(packet.resume_from.source, "review-response packet");
  assert.equal(packet.safety_gates.preserve_unrelated_changes, true);
  assert.equal(packet.safety_gates.requires_human_approval_for_merge, true);
  assert.equal(packet.safety_gates.requires_human_approval_for_publish, true);
  assert.equal(packet.safety_gates.requires_human_approval_for_destructive_commands, true);
});

test("maps review outcomes to resume statuses", () => {
  assert.equal(buildResumeProjectPacket({
    response: reviewResponseFixture({ outcome: "approved", findings: [] }),
    createdAt: "2026-06-29T00:00:00Z"
  }).resume_status, "owner_decision");

  assert.equal(buildResumeProjectPacket({
    response: reviewResponseFixture({
      outcome: "changes_requested",
      findings: [
        {
          id: "F1",
          severity: "medium",
          blocking: true,
          title: "Fix required",
          description: "A blocking issue exists.",
          evidence: "Synthetic evidence.",
          recommendation: "Fix it."
        }
      ]
    }),
    createdAt: "2026-06-29T00:00:00Z"
  }).resume_status, "address_findings");

  assert.equal(buildResumeProjectPacket({
    response: reviewResponseFixture({ outcome: "commentary", findings: [] }),
    createdAt: "2026-06-29T00:00:00Z"
  }).resume_status, "continue_with_context");

  assert.equal(buildResumeProjectPacket({
    response: reviewResponseFixture({
      outcome: "blocked",
      findings: [],
      reviewed_scope: {
        files: [],
        limitations: ["Reviewer could not inspect the target repository."]
      }
    }),
    createdAt: "2026-06-29T00:00:00Z"
  }).resume_status, "blocked");
});

test("derives tasks from findings without inventing implementation text", () => {
  const packet = buildResumeProjectPacket({
    response: reviewResponseFixture({
      outcome: "changes_requested",
      findings: [
        {
          id: "F7",
          severity: "high",
          blocking: true,
          title: "Exact reviewer title",
          description: "Exact reviewer description.",
          evidence: "Exact reviewer evidence.",
          recommendation: "Exact reviewer recommendation.",
          location: {
            path: "src/example.ts",
            line: 12
          }
        }
      ]
    }),
    createdAt: "2026-06-29T00:00:00Z"
  });

  assert.deepEqual(packet.tasks[0], {
    source_finding_id: "F7",
    severity: "high",
    blocking: true,
    title: "Exact reviewer title",
    description: "Exact reviewer description.",
    evidence: "Exact reviewer evidence.",
    recommendation: "Exact reviewer recommendation.",
    location: {
      path: "src/example.ts",
      line: 12
    }
  });
});

test("does not copy unsupported request metadata into target", () => {
  const packet = buildResumeProjectPacket({
    response: reviewResponseFixture(),
    createdAt: "2026-06-29T00:00:00Z"
  });

  assert.equal("local_path" in packet.target, false);
  assert.equal("remote_url" in packet.target, false);
});
```

- [ ] **Step 2: Run the producer tests and confirm they fail**

Run:

```bash
npm test -- --test-name-pattern "resume-project packet"
```

Expected: fail because `src/resumeProjectProducer.ts` does not exist.

- [ ] **Step 3: Implement the producer**

Create `src/resumeProjectProducer.ts`:

```ts
import type { ResumeProjectPacket, ResumeProjectStatus } from "./resumeProject";
import type { ReviewResponsePacket } from "./reviewResponse";

export function buildResumeProjectPacket(input: {
  response: ReviewResponsePacket;
  createdAt?: string;
}): ResumeProjectPacket {
  return {
    packet_version: "0.1",
    packet_type: "resume-project",
    created_at: input.createdAt ?? new Date().toISOString(),
    resume_from: {
      packet_type: "review-response",
      packet_version: input.response.packet_version,
      created_at: input.response.created_at,
      reviewer_name: input.response.reviewer.name,
      reviewer_kind: input.response.reviewer.kind,
      outcome: input.response.outcome,
      source: "review-response packet"
    },
    target: {
      repository: input.response.response_to.repository,
      working_branch: input.response.response_to.working_branch,
      base_commit: input.response.response_to.base_commit,
      head_commit: input.response.response_to.head_commit,
      diff_range: input.response.response_to.diff_range,
      ...(input.response.response_to.pull_request_url ? {
        pull_request_url: input.response.response_to.pull_request_url
      } : {}),
      ...(input.response.response_to.storage_id ? {
        storage_id: input.response.response_to.storage_id
      } : {})
    },
    resume_status: statusFromOutcome(input.response.outcome),
    confidence: input.response.confidence,
    summary: input.response.summary,
    tasks: input.response.findings.map((finding) => ({
      source_finding_id: finding.id,
      severity: finding.severity,
      blocking: finding.blocking,
      title: finding.title,
      description: finding.description,
      evidence: finding.evidence,
      recommendation: finding.recommendation,
      ...(finding.location ? { location: finding.location } : {})
    })),
    reviewed_scope: input.response.reviewed_scope,
    prior_verification: input.response.verification,
    safety_gates: {
      preserve_unrelated_changes: true,
      requires_human_approval_for_merge: true,
      requires_human_approval_for_publish: true,
      requires_human_approval_for_destructive_commands: true
    },
    ...(input.response.provenance ? { provenance: input.response.provenance } : {}),
    redactions: input.response.redactions,
    ...(input.response.sensitive_data ? { sensitive_data: input.response.sensitive_data } : {}),
    next_action: input.response.next_action
  };
}

function statusFromOutcome(outcome: ReviewResponsePacket["outcome"]): ResumeProjectStatus {
  if (outcome === "changes_requested") {
    return "address_findings";
  }

  if (outcome === "approved") {
    return "owner_decision";
  }

  if (outcome === "blocked") {
    return "blocked";
  }

  return "continue_with_context";
}
```

- [ ] **Step 4: Export producer and types**

Modify `src/index.ts`:

```ts
export { buildResumeProjectPacket } from "./resumeProjectProducer";
export type {
  ResumeProjectPacket,
  ResumeProjectStatus,
  ResumeProjectTask
} from "./resumeProject";
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm test -- --test-name-pattern "resume-project"
```

Expected: producer and schema tests pass; renderer tests may still be absent.

- [ ] **Step 6: Commit producer work**

```bash
git add src/resumeProject.ts src/resumeProjectProducer.ts src/index.ts tests/resumeProjectProducer.test.ts
git commit -m "feat: build resume-project packets"
```

---

## Task 3: Markdown Renderer And Generic Dispatch

**Files:**
- Create: `src/renderResumeProject.ts`
- Create: `tests/renderResumeProject.test.ts`
- Create: `examples/resume-project/relay.md`
- Modify: `src/renderPacket.ts`
- Modify: `tests/renderPacket.test.ts`

- [ ] **Step 1: Write failing renderer tests**

Create `tests/renderResumeProject.test.ts`:

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { renderResumeProjectMarkdown } from "../src/renderResumeProject";
import type { ResumeProjectPacket } from "../src/resumeProject";

function fixture(overrides: Partial<ResumeProjectPacket> = {}): ResumeProjectPacket {
  const packet = JSON.parse(readFileSync("examples/resume-project/relay.json", "utf8")) as ResumeProjectPacket;
  return {
    ...packet,
    ...overrides
  };
}

test("renders the committed resume-project example markdown", () => {
  const packet = fixture();
  const expected = readFileSync("examples/resume-project/relay.md", "utf8");

  assert.equal(renderResumeProjectMarkdown(packet), expected);
});

test("renders resume-project markdown in protocol order", () => {
  const markdown = renderResumeProjectMarkdown(fixture());
  const headings = [
    "# Resume Project Relay Packet",
    "## Resume From",
    "## Target",
    "## Status",
    "## Summary",
    "## Tasks",
    "## Reviewed Scope",
    "## Prior Verification",
    "## Safety Gates",
    "## Provenance",
    "## Redactions",
    "## Sensitive Data",
    "## Next Action"
  ];

  let previous = -1;
  for (const heading of headings) {
    const current = markdown.indexOf(heading);
    assert.notEqual(current, -1, heading);
    assert.ok(current > previous, heading);
    previous = current;
  }
});

test("renders tasks as readable blocks", () => {
  const markdown = renderResumeProjectMarkdown(fixture());

  assert.match(markdown, /### F1: Missing regression coverage/);
  assert.match(markdown, /\*\*Blocking:\*\* Yes/);
  assert.match(markdown, /\*\*Recommendation:\*\* Add a CLI regression test before merging\./);
});

test("renders neutral empty states", () => {
  const markdown = renderResumeProjectMarkdown(fixture({
    resume_status: "owner_decision",
    tasks: [],
    prior_verification: [],
    provenance: undefined,
    redactions: [],
    sensitive_data: undefined
  }));

  assert.match(markdown, /No continuation tasks listed\./);
  assert.match(markdown, /No prior verification evidence listed\./);
  assert.match(markdown, /No provenance listed\./);
  assert.match(markdown, /No redactions listed\./);
  assert.match(markdown, /No sensitive-data note listed\./);
});

test("escapes resume-project table cells and code spans", () => {
  const markdown = renderResumeProjectMarkdown(fixture({
    target: {
      repository: "AcrossWorksAPI/open-relay",
      working_branch: "fix-`branch`",
      base_commit: "1111111111111111111111111111111111111111",
      head_commit: "2222222222222222222222222222222222222222",
      diff_range: "1111111111111111111111111111111111111111..2222222222222222222222222222222222222222"
    },
    tasks: [
      {
        source_finding_id: "F|2",
        severity: "low",
        blocking: false,
        title: "Pipe | title",
        description: "Line one\n## injected",
        evidence: "Evidence with | pipe",
        recommendation: "Do this\n- not a list"
      }
    ]
  }));

  assert.match(markdown, /`fix-branch`/);
  assert.match(markdown, /F\\\|2: Pipe \| title/);
  assert.doesNotMatch(markdown, /^## injected/m);
  assert.doesNotMatch(markdown, /^- not a list/m);
});
```

- [ ] **Step 2: Run renderer tests and confirm they fail**

Run:

```bash
npm test -- --test-name-pattern "resume-project markdown"
```

Expected: fail because renderer and example Markdown do not exist.

- [ ] **Step 3: Implement the renderer**

Create `src/renderResumeProject.ts`. Reuse helper names from
`src/renderReviewResponse.ts`; if helper names differ, adapt imports to the
actual file.

```ts
import {
  codeSpanText,
  escapeTableCell,
  inlineText,
  labelFor
} from "./renderMarkdown";
import type { ResumeProjectPacket } from "./resumeProject";

export function renderResumeProjectMarkdown(packet: ResumeProjectPacket): string {
  return [
    "# Resume Project Relay Packet",
    "",
    "## Resume From",
    "",
    table([
      ["Field", "Value"],
      ["Packet", `\`${codeSpanText(`${packet.resume_from.packet_type}/${packet.resume_from.packet_version}`)}\``],
      ["Created", `\`${codeSpanText(packet.resume_from.created_at)}\``],
      ["Reviewer", inlineText(packet.resume_from.reviewer_name)],
      ["Reviewer kind", `\`${codeSpanText(packet.resume_from.reviewer_kind)}\``],
      ["Outcome", `\`${codeSpanText(packet.resume_from.outcome)}\``],
      ["Source", inlineText(packet.resume_from.source)]
    ]),
    "",
    "## Target",
    "",
    table([
      ["Field", "Value"],
      ["Repository", inlineText(packet.target.repository)],
      ["Working branch", `\`${codeSpanText(packet.target.working_branch)}\``],
      ["Base commit", `\`${codeSpanText(packet.target.base_commit)}\``],
      ["Head commit", `\`${codeSpanText(packet.target.head_commit)}\``],
      ["Diff range", `\`${codeSpanText(packet.target.diff_range)}\``],
      ...(packet.target.pull_request_url ? [["Pull request", inlineText(packet.target.pull_request_url)]] : []),
      ...(packet.target.storage_id ? [["Storage id", `\`${codeSpanText(packet.target.storage_id)}\``]] : [])
    ]),
    "",
    "## Status",
    "",
    table([
      ["Field", "Value"],
      ["Resume status", `\`${codeSpanText(packet.resume_status)}\``],
      ["Confidence", `\`${codeSpanText(packet.confidence)}\``]
    ]),
    "",
    "## Summary",
    "",
    packet.summary,
    "",
    "## Tasks",
    "",
    renderTasks(packet),
    "",
    "## Reviewed Scope",
    "",
    renderReviewedScope(packet),
    "",
    "## Prior Verification",
    "",
    renderVerification(packet),
    "",
    "## Safety Gates",
    "",
    table([
      ["Gate", "Value"],
      ["Preserve unrelated changes", yesNo(packet.safety_gates.preserve_unrelated_changes)],
      ["Human approval for merge", yesNo(packet.safety_gates.requires_human_approval_for_merge)],
      ["Human approval for publish", yesNo(packet.safety_gates.requires_human_approval_for_publish)],
      ["Human approval for destructive commands", yesNo(packet.safety_gates.requires_human_approval_for_destructive_commands)]
    ]),
    "",
    "## Provenance",
    "",
    renderProvenance(packet),
    "",
    "## Redactions",
    "",
    renderRedactions(packet),
    "",
    "## Sensitive Data",
    "",
    packet.sensitive_data
      ? `Excluded: ${yesNo(packet.sensitive_data.excluded)}\n\n${packet.sensitive_data.notes}`
      : "No sensitive-data note listed.",
    "",
    "## Next Action",
    "",
    packet.next_action,
    ""
  ].join("\n");
}
```

Add local helper functions below it:

```ts
function renderTasks(packet: ResumeProjectPacket): string {
  if (packet.tasks.length === 0) {
    return "No continuation tasks listed.";
  }

  return packet.tasks.map((task) => [
    `### ${inlineText(task.source_finding_id)}: ${inlineText(task.title)}`,
    "",
    `**Severity:** \`${codeSpanText(task.severity)}\``,
    "",
    `**Blocking:** ${yesNo(task.blocking)}`,
    "",
    task.location ? `**Location:** ${renderLocation(task.location)}` : "**Location:** Not specified.",
    "",
    `**Description:** ${inlineText(task.description)}`,
    "",
    `**Evidence:** ${inlineText(task.evidence)}`,
    "",
    `**Recommendation:** ${inlineText(task.recommendation)}`
  ].join("\n")).join("\n\n");
}

function renderReviewedScope(packet: ResumeProjectPacket): string {
  const files = packet.reviewed_scope.files.length === 0
    ? "No reviewed files listed."
    : packet.reviewed_scope.files
      .map((file) => `- \`${codeSpanText(file.path)}\`${file.notes ? ` - ${inlineText(file.notes)}` : ""}`)
      .join("\n");
  const limitations = packet.reviewed_scope.limitations.length === 0
    ? "No limitations listed."
    : packet.reviewed_scope.limitations.map((item) => `- ${inlineText(item)}`).join("\n");

  return [
    "### Files",
    "",
    files,
    "",
    "### Limitations",
    "",
    limitations
  ].join("\n");
}

function renderVerification(packet: ResumeProjectPacket): string {
  if (packet.prior_verification.length === 0) {
    return "No prior verification evidence listed.";
  }

  return table([
    ["Kind", "Command", "Result", "Evidence"],
    ...packet.prior_verification.map((item) => [
      `\`${codeSpanText(item.kind)}\``,
      `\`${codeSpanText(item.command)}\``,
      `\`${codeSpanText(item.result)}\``,
      inlineText(item.evidence)
    ])
  ]);
}

function renderProvenance(packet: ResumeProjectPacket): string {
  if (!packet.provenance || packet.provenance.length === 0) {
    return "No provenance listed.";
  }

  return table([
    ["Type", "Reference"],
    ...packet.provenance.map((item) => [
      labelFor(item.type),
      `\`${codeSpanText(item.reference)}\``
    ])
  ]);
}

function renderRedactions(packet: ResumeProjectPacket): string {
  if (packet.redactions.length === 0) {
    return "No redactions listed.";
  }

  return table([
    ["Field", "Reason", "Replacement"],
    ...packet.redactions.map((item) => [
      `\`${codeSpanText(item.field)}\``,
      inlineText(item.reason),
      `\`${codeSpanText(item.replacement)}\``
    ])
  ]);
}

function renderLocation(location: NonNullable<ResumeProjectPacket["tasks"][number]["location"]>): string {
  const parts = [`\`${codeSpanText(location.path)}\``];
  if (location.line) {
    parts.push(`line ${location.line}`);
  }
  if (location.symbol) {
    parts.push(`\`${codeSpanText(location.symbol)}\``);
  }
  return parts.join(" ");
}

function table(rows: string[][]): string {
  const [header, ...body] = rows;
  return [
    `| ${header.map(escapeTableCell).join(" | ")} |`,
    `| ${header.map(() => "---").join(" | ")} |`,
    ...body.map((row) => `| ${row.map(escapeTableCell).join(" | ")} |`)
  ].join("\n");
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}
```

- [ ] **Step 4: Register the renderer**

Modify `src/renderPacket.ts`:

```ts
import { renderResumeProjectMarkdown } from "./renderResumeProject";
```

Add the renderer entry:

```ts
"resume-project": {
  "0.1": (packet) => renderResumeProjectMarkdown(packet as ResumeProjectPacket)
}
```

Use the actual registry shape in `src/renderPacket.ts`.

- [ ] **Step 5: Add generic dispatch test**

Modify `tests/renderPacket.test.ts`:

```ts
test("dispatches resume-project markdown rendering", () => {
  const packet = JSON.parse(readFileSync("examples/resume-project/relay.json", "utf8"));
  const markdown = renderPacketMarkdown(packet);

  assert.match(markdown, /^# Resume Project Relay Packet/);
  assert.match(markdown, /## Tasks/);
});
```

- [ ] **Step 6: Generate example Markdown**

After implementing the renderer, run:

```bash
npm run build
node dist/src/cli.js render examples/resume-project/relay.json --output examples/resume-project/relay.md
```

Expected:

```text
Wrote packet Markdown.
```

- [ ] **Step 7: Run renderer tests**

Run:

```bash
npm test -- --test-name-pattern "resume-project"
```

Expected: schema, producer, dispatch, and renderer tests pass.

- [ ] **Step 8: Commit renderer work**

```bash
git add src/renderResumeProject.ts src/renderPacket.ts tests/renderResumeProject.test.ts tests/renderPacket.test.ts examples/resume-project/relay.md
git commit -m "feat: render resume-project packets"
```

---

## Task 4: CLI Producer Command

**Files:**
- Create: `src/resumeProjectArgs.ts`
- Create: `tests/resumeProjectArgs.test.ts`
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Write parser tests**

Create `tests/resumeProjectArgs.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";

import { parseGenerateResumeProjectArgs } from "../src/resumeProjectArgs";

test("parses generate resume-project required flags and defaults", () => {
  assert.deepEqual(parseGenerateResumeProjectArgs([
    "--response",
    "review-response.json"
  ]), {
    ok: true,
    response: "review-response.json",
    format: "json"
  });
});

test("parses generate resume-project format and output", () => {
  assert.deepEqual(parseGenerateResumeProjectArgs([
    "--response",
    "review-response.json",
    "--format",
    "markdown",
    "--output",
    "resume.md"
  ]), {
    ok: true,
    response: "review-response.json",
    format: "markdown",
    output: "resume.md"
  });
});

test("rejects invalid generate resume-project arguments", () => {
  assert.deepEqual(parseGenerateResumeProjectArgs([]), {
    ok: false,
    message: "Missing required flag: --response"
  });

  assert.deepEqual(parseGenerateResumeProjectArgs([
    "--response",
    "a.json",
    "--response",
    "b.json"
  ]), {
    ok: false,
    message: "Duplicate flag: --response"
  });

  assert.deepEqual(parseGenerateResumeProjectArgs([
    "--response",
    "a.json",
    "--format",
    "yaml"
  ]), {
    ok: false,
    message: "Invalid format: yaml"
  });

  assert.deepEqual(parseGenerateResumeProjectArgs([
    "--response",
    "a.json",
    "--unknown",
    "x"
  ]), {
    ok: false,
    message: "Unknown flag: --unknown"
  });
});
```

- [ ] **Step 2: Implement strict args parser**

Create `src/resumeProjectArgs.ts`:

```ts
export type GenerateResumeProjectOptions = {
  response: string;
  format: "json" | "markdown";
  output?: string;
};

export type GenerateResumeProjectArgsResult =
  | ({ ok: true } & GenerateResumeProjectOptions)
  | { ok: false; message: string };

export function parseGenerateResumeProjectArgs(args: string[]): GenerateResumeProjectArgsResult {
  let response: string | undefined;
  let format: "json" | "markdown" = "json";
  let output: string | undefined;
  let sawFormat = false;

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag !== "--response" && flag !== "--format" && flag !== "--output") {
      return {
        ok: false,
        message: flag.startsWith("--") ? `Unknown flag: ${flag}` : `Unexpected argument: ${flag}`
      };
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      return { ok: false, message: `Missing value for ${flag}` };
    }

    if (flag === "--response") {
      if (response) {
        return { ok: false, message: "Duplicate flag: --response" };
      }
      response = value;
    }

    if (flag === "--format") {
      if (sawFormat) {
        return { ok: false, message: "Duplicate flag: --format" };
      }
      if (value !== "json" && value !== "markdown") {
        return { ok: false, message: `Invalid format: ${value}` };
      }
      format = value;
      sawFormat = true;
    }

    if (flag === "--output") {
      if (output) {
        return { ok: false, message: "Duplicate flag: --output" };
      }
      output = value;
    }

    index += 1;
  }

  if (!response) {
    return { ok: false, message: "Missing required flag: --response" };
  }

  return {
    ok: true,
    response,
    format,
    ...(output ? { output } : {})
  };
}
```

- [ ] **Step 3: Write CLI tests**

Add to `tests/cli.test.ts`:

```ts
test("generate resume-project prints valid json to stdout", async () => {
  const result = await runCli([
    "generate",
    "resume-project",
    "--response",
    "examples/review-response/relay.json"
  ]);

  assert.equal(result.code, 0, result.stderr);
  const packet = JSON.parse(result.stdout);
  assert.equal(packet.packet_type, "resume-project");
  assert.equal(validatePacket(packet).valid, true);
});

test("generate resume-project renders markdown to stdout", async () => {
  const result = await runCli([
    "generate",
    "resume-project",
    "--response",
    "examples/review-response/relay.json",
    "--format",
    "markdown"
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /^# Resume Project Relay Packet/);
  assert.match(result.stdout, /## Next Action/);
});

test("generate resume-project writes output without echoing path", async () => {
  const output = join(tmpdir(), `open-relay-resume-${randomUUID()}.md`);
  const result = await runCli([
    "generate",
    "resume-project",
    "--response",
    "examples/review-response/relay.json",
    "--format",
    "markdown",
    "--output",
    output
  ]);

  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout, "Wrote resume-project Markdown.\n");
  assert.doesNotMatch(result.stdout, new RegExp(output.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(readFileSync(output, "utf8"), /^# Resume Project Relay Packet/);
});

test("generate resume-project rejects invalid response json without leaking contents", async () => {
  const path = join(tmpdir(), `open-relay-invalid-response-${randomUUID()}.json`);
  writeFileSync(path, "{\"secret\": SECRET_SHOULD_NOT_LEAK}", "utf8");

  const result = await runCli([
    "generate",
    "resume-project",
    "--response",
    path
  ]);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Invalid JSON in/);
  assert.doesNotMatch(result.stderr, /SECRET_SHOULD_NOT_LEAK/);
});

test("generate resume-project requires a review-response packet", async () => {
  const result = await runCli([
    "generate",
    "resume-project",
    "--response",
    "examples/review-request/relay.json"
  ]);

  assert.equal(result.code, 1);
  assert.match(result.stderr, /Resume-project generation requires a review-response packet/);
});
```

Adapt helper names such as `runCli`, `tmpdir`, and `randomUUID` to the existing
`tests/cli.test.ts` conventions.

- [ ] **Step 4: Wire the CLI command**

Modify imports in `src/cli.ts`:

```ts
import { parseGenerateResumeProjectArgs } from "./resumeProjectArgs";
import { buildResumeProjectPacket } from "./resumeProjectProducer";
import type { ResumeProjectPacket } from "./resumeProject";
```

Add usage:

```text
open-relay generate resume-project --response <review-response.json> [--format json|markdown] [--output <path>]
```

Add route:

```ts
if (args[0] === "generate" && args[1] === "resume-project") {
  return generateResumeProjectCommand(args.slice(2));
}
```

Add command implementation:

```ts
async function generateResumeProjectCommand(args: string[]): Promise<number> {
  const parsed = parseGenerateResumeProjectArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  let responsePacket: unknown;
  try {
    responsePacket = JSON.parse(await readFile(parsed.response, "utf8"));
  } catch (error: unknown) {
    const message = error instanceof SyntaxError
      ? `Invalid JSON in ${parsed.response}`
      : "Could not read review-response packet.";
    process.stderr.write(`${message}\n`);
    return 1;
  }

  const responseValidation = validatePacket(responsePacket);
  if (!responseValidation.valid) {
    process.stderr.write(`Invalid packet: ${parsed.response}\n`);
    for (const error of responseValidation.errors) {
      process.stderr.write(`- ${error}\n`);
    }
    return 1;
  }

  if (!isReviewResponsePacket(responsePacket)) {
    process.stderr.write("Resume-project generation requires a review-response packet.\n");
    return 1;
  }

  const packet = buildResumeProjectPacket({
    response: responsePacket
  });
  const generatedValidation = validatePacket(packet);
  if (!generatedValidation.valid) {
    process.stderr.write("Generated resume-project packet failed validation.\n");
    for (const error of generatedValidation.errors) {
      process.stderr.write(`- ${error}\n`);
    }
    return 1;
  }

  const body = parsed.format === "markdown"
    ? renderPacketMarkdown(packet)
    : `${JSON.stringify(packet, null, 2)}\n`;

  if (parsed.output) {
    try {
      await writeFile(parsed.output, body, "utf8");
    } catch {
      process.stderr.write(parsed.format === "markdown"
        ? "Could not write resume-project Markdown.\n"
        : "Could not write resume-project packet.\n");
      return 1;
    }

    process.stdout.write(parsed.format === "markdown"
      ? "Wrote resume-project Markdown.\n"
      : "Wrote resume-project packet.\n");
    return 0;
  }

  process.stdout.write(body);
  return 0;
}

function isReviewResponsePacket(value: unknown): value is ReviewResponsePacket {
  return Boolean(
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    (value as Record<string, unknown>).packet_type === "review-response" &&
    (value as Record<string, unknown>).packet_version === "0.1"
  );
}
```

- [ ] **Step 5: Run parser and CLI tests**

Run:

```bash
npm test -- --test-name-pattern "resume-project"
```

Expected: all resume-project tests pass.

- [ ] **Step 6: Commit CLI work**

```bash
git add src/resumeProjectArgs.ts src/cli.ts tests/resumeProjectArgs.test.ts tests/cli.test.ts
git commit -m "feat: generate resume-project packets"
```

---

## Task 5: Protocol Docs, Package Smoke, README

**Files:**
- Create: `docs/protocol/resume-project-packet.md`
- Modify: `scripts/smoke-pack.js`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Add protocol doc**

Create `docs/protocol/resume-project-packet.md` by adapting the design spec
into public user-facing language. It must include:

- purpose;
- command;
- packet fields;
- object shapes for `resume_from`, `target`, `tasks`, `prior_verification`,
  and `safety_gates`;
- semantic rules;
- Markdown render order;
- non-goals.

The non-goals section must explicitly say:

```markdown
- Open Relay does not apply fixes from a resume-project packet.
- Open Relay does not run verification commands automatically.
- Open Relay does not merge, publish, rebase, reset, or delete anything.
- Open Relay does not invoke Codex, Claude, or another agent.
```

- [ ] **Step 2: Update README workflow**

Add a short section after "Render Agent Prompts":

```markdown
## Resume From A Review Response

Create a local continuation packet from a validated review response:

```bash
open-relay generate resume-project \
  --response review-response.json \
  --format markdown \
  --output resume.md

open-relay render resume-project.json --template codex \
  --output codex-resume.md
```

The resume packet maps reviewer findings into continuation tasks and preserves
safety gates. It does not apply fixes, run commands, invoke agents, merge, or
publish.
```
```

- [ ] **Step 3: Update AGENTS.md scope**

Add resume-project to the current known scope and non-goals where appropriate:

```markdown
- Resume behavior: `open-relay generate resume-project` creates a local
  continuation packet from a validated `review-response`.
```

Keep external agent invocation, automatic fixes, and automatic merge/publish in
non-goals.

- [ ] **Step 4: Extend package smoke**

Modify `scripts/smoke-pack.js` to run installed CLI checks:

```js
runInstalled([
  "generate",
  "resume-project",
  "--response",
  join(repoRoot, "examples", "review-response", "relay.json"),
  "--format",
  "markdown",
  "--output",
  resumeMarkdownPath
]);
assertFileIncludes(resumeMarkdownPath, "# Resume Project Relay Packet");
assertFileIncludes(resumeMarkdownPath, "## Next Action");

runInstalled([
  "generate",
  "resume-project",
  "--response",
  join(repoRoot, "examples", "review-response", "relay.json"),
  "--output",
  resumeJsonPath
]);
runInstalled([
  "render",
  resumeJsonPath,
  "--template",
  "codex",
  "--output",
  resumePromptPath
]);
assertFileIncludes(resumePromptPath, "# Codex Follow-Up Prompt");
assertFileIncludes(resumePromptPath, "# Resume Project Relay Packet");
```

Use the existing smoke helper names and temp path conventions in
`scripts/smoke-pack.js`.

- [ ] **Step 5: Run package smoke**

Run:

```bash
npm run smoke:pack
```

Expected: package builds, packs, installs into the temp project, and installed
CLI resume-project checks pass.

- [ ] **Step 6: Commit docs and smoke**

```bash
git add docs/protocol/resume-project-packet.md README.md AGENTS.md scripts/smoke-pack.js
git commit -m "docs: document resume-project workflow"
```

---

## Task 6: Governance Closeout

**Files:**
- Modify: `master_build.md`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

- [ ] **Step 1: Update roadmap row**

In `docs/planning/ROADMAP.md`, update:

```markdown
| v0.1.0-pre.<PR_NUMBER> | Resume-project packet type | Done | Medium | No | Review-response packet type | docs/superpowers/plans/2026-06-29-resume-project-packet.md |
```

Before the PR number exists, use `v0.1.0-pre.next`. After opening the PR, update
the same row to the actual PR-numbered label.

- [ ] **Step 2: Update status and active work**

Record:

- `resume-project` schema/producer/render/CLI are merged or in branch review;
- no agent invocation, fix application, command execution, merge, publish, or
  GitHub posting was added;
- verification evidence from this branch.

- [ ] **Step 3: Update plan registry**

Move `docs/superpowers/plans/2026-06-29-resume-project-packet.md` into the
implemented/historical table after merge, or list it as active while the PR is
open.

- [ ] **Step 4: Update version ledger**

Add a row:

```markdown
| Resume-project packet type | Done | 2026-06-29 | Merge commit `<hash>` on `main` | PR #<number>: `https://github.com/AcrossWorksAPI/open-relay/pull/<number>` | N/A, local CLI only; no agent invocation, fix application, GitHub posting, merge, publish, registry package, or live version claim | `npm run check`, `npm run smoke:pack`, `npm run release:preflight -- 0.1.0`, and `git diff --check` passed | Revert the merge commit if resume-project packet behavior or command shape is rejected; request/response packets, transport, and prompt rendering remain independent. |
```

While the PR is open, use branch evidence instead of merge evidence.

- [ ] **Step 5: Update lifecycle matrix**

Update `Relay packet`, `Review loop`, and `Render template` rows:

- resume-project packet creation: `Shipped` after merge;
- list/view through validation/render: `Shipped`;
- edit/archive/delete/storage: `Deferred`;
- notifications and external automation: `Deferred`;
- error/smoke: `Shipped` with CLI tests and package smoke.

- [ ] **Step 6: Run full verification**

Run:

```bash
npm run check
npm run smoke:pack
npm run release:preflight -- 0.1.0
git diff --check
```

Expected:

- all tests pass;
- package smoke passes;
- release preflight still passes and does not publish;
- whitespace check is clean.

- [ ] **Step 7: Commit governance closeout**

```bash
git add master_build.md docs/STATUS.md docs/planning/ROADMAP.md docs/planning/ACTIVE_WORK.md docs/planning/PLAN_REGISTRY.md docs/planning/VERSION_LEDGER.md docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md
git commit -m "docs: record resume-project closeout"
```

---

## Implementation Notes

- Do not add dependencies.
- Do not add a new packet version.
- Do not add `handoff resume-project`; this would only re-emit an existing
  packet and conflicts with the roadmap command-surface rule.
- Do not compose GitHub fetch into this command; use
  `transport github-pr fetch` separately.
- Do not run verification commands automatically.
- Do not infer tasks from `summary` or `next_action`; tasks come only from
  structured findings.
- Preserve `review-response` as the source of reviewer-authored truth.
- Keep all write-error messages sanitized and avoid echoing output paths.

## Self-Review

Spec coverage:

- Packet fields, object shapes, status derivation, semantic rules, rendering,
  CLI behavior, safety gates, lifecycle coverage, and non-goals are represented
  in tasks.
- The producer is packet-native and consumes only a validated
  `review-response`.
- `render --template codex` remains the prompt step; `resume-project` is not an
  agent invocation shortcut.

Placeholder scan:

- No placeholder markers, copy-forward shortcuts, or unspecified error handling
  remains in the implementation steps.

Type consistency:

- `ResumeProjectPacket`, `ResumeProjectStatus`, `ResumeProjectTask`,
  `buildResumeProjectPacket`, `parseGenerateResumeProjectArgs`, and
  `renderResumeProjectMarkdown` are named consistently across tests,
  implementation steps, exports, and CLI wiring.

## Execution Handoff

Plan complete and saved to
`docs/superpowers/plans/2026-06-29-resume-project-packet.md`.

Recommended execution path after review:

1. Subagent-driven implementation, one task per subagent.
2. Claude review after planning PR.
3. Implementation PR after planning PR is merged.
4. Dogfood the implementation PR by producing a real `review-response` packet
   and then a real `resume-project` packet from that response.
