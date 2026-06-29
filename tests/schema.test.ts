import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import Ajv from "ajv";

import { validatePacket } from "../src/schema";
import { SCHEMA_REGISTRY } from "../src/schemaRegistry";

async function validPacketFixture(): Promise<Record<string, unknown>> {
  const raw = await readFile("examples/review-request/relay.json", "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

async function validReviewResponseFixture(): Promise<Record<string, unknown>> {
  const raw = await readFile("examples/review-response/relay.json", "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

async function validResumeProjectFixture(): Promise<Record<string, unknown>> {
  const raw = await readFile("examples/resume-project/relay.json", "utf8");
  return JSON.parse(raw) as Record<string, unknown>;
}

test("validates the synthetic review-request example", async () => {
  const packet = await validPacketFixture();
  const result = validatePacket(packet);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validates the synthetic review-response example", async () => {
  const packet = await validReviewResponseFixture();
  const result = validatePacket(packet);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("validates the synthetic resume-project example", async () => {
  const packet = await validResumeProjectFixture();
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
  const packet = await validPacketFixture();
  const changeSummary = packet.change_summary as Record<string, unknown>;
  changeSummary.total_files_changed = 999;

  const result = validatePacket(packet);

  assert.equal(result.valid, false);
  assert.match(
    result.errors.join("\n"),
    /total_files_changed must equal changed_files length/
  );
});

test("rejects contradictory review-response outcomes", async () => {
  const approved = await validReviewResponseFixture();
  (approved.findings as Array<Record<string, unknown>>)[0].blocking = true;
  assert.match(
    validatePacket(approved).errors.join("\n"),
    /approved outcome cannot include blocking findings/
  );

  const commentary = await validReviewResponseFixture();
  commentary.outcome = "commentary";
  (commentary.findings as Array<Record<string, unknown>>)[0].blocking = true;
  assert.match(
    validatePacket(commentary).errors.join("\n"),
    /commentary outcome cannot include blocking findings/
  );

  const changesRequested = await validReviewResponseFixture();
  changesRequested.outcome = "changes_requested";
  (changesRequested.findings as Array<Record<string, unknown>>)[0].blocking = false;
  assert.match(
    validatePacket(changesRequested).errors.join("\n"),
    /changes_requested outcome requires at least one blocking finding/
  );

  const blocked = await validReviewResponseFixture();
  blocked.outcome = "blocked";
  (blocked.reviewed_scope as Record<string, unknown>).limitations = [];
  assert.match(
    validatePacket(blocked).errors.join("\n"),
    /blocked outcome requires at least one limitation/
  );
});

test("accepts review-response empty arrays and enum values", async () => {
  for (const outcome of ["approved", "commentary"] as const) {
    const packet = await validReviewResponseFixture();
    packet.outcome = outcome;
    packet.findings = [];
    packet.verification = [];
    packet.provenance = [];
    packet.redactions = [];

    const result = validatePacket(packet);

    assert.equal(result.valid, true);
  }

  const changesRequested = await validReviewResponseFixture();
  changesRequested.outcome = "changes_requested";
  (changesRequested.findings as Array<Record<string, unknown>>)[0].blocking = true;
  (changesRequested.findings as Array<Record<string, unknown>>)[0].severity = "high";
  changesRequested.confidence = "medium";
  (changesRequested.reviewer as Record<string, unknown>).kind = "human";
  (changesRequested.verification as Array<Record<string, unknown>>)[0].kind = "manual";
  (changesRequested.verification as Array<Record<string, unknown>>)[0].result = "failed";

  assert.equal(validatePacket(changesRequested).valid, true);

  const blocked = await validReviewResponseFixture();
  blocked.outcome = "blocked";
  blocked.confidence = "low";
  blocked.findings = [];
  blocked.reviewed_scope = {
    files: [],
    limitations: ["Reviewer could not access the target branch."]
  };
  blocked.verification = [
    {
      kind: "external",
      command: "GitHub PR page",
      result: "unknown",
      evidence: "Reviewer access was unavailable."
    },
    {
      kind: "command",
      command: "npm run check",
      result: "not_run",
      evidence: "Blocked before local verification."
    }
  ];

  assert.equal(validatePacket(blocked).valid, true);
});

test("rejects contradictory resume-project statuses", async () => {
  const ownerDecision = await validResumeProjectFixture();
  ownerDecision.resume_status = "owner_decision";
  ownerDecision.tasks = [
    {
      source_finding_id: "F1",
      severity: "high",
      blocking: true,
      title: "Blocking finding",
      description: "A blocking finding must not appear on owner_decision.",
      evidence: "Synthetic evidence.",
      recommendation: "Synthetic recommendation."
    }
  ];
  assert.match(
    validatePacket(ownerDecision).errors.join("\n"),
    /owner_decision status cannot include blocking tasks/
  );

  const continueWithContext = await validResumeProjectFixture();
  continueWithContext.resume_status = "continue_with_context";
  continueWithContext.tasks = [
    {
      source_finding_id: "F1",
      severity: "low",
      blocking: true,
      title: "Blocking finding",
      description: "A blocking finding must not appear on continue_with_context.",
      evidence: "Synthetic evidence.",
      recommendation: "Synthetic recommendation."
    }
  ];
  assert.match(
    validatePacket(continueWithContext).errors.join("\n"),
    /continue_with_context status cannot include blocking tasks/
  );

  const addressFindings = await validResumeProjectFixture();
  addressFindings.resume_status = "address_findings";
  addressFindings.tasks = [];
  assert.match(
    validatePacket(addressFindings).errors.join("\n"),
    /address_findings status requires at least one blocking task/
  );

  const blocked = await validResumeProjectFixture();
  blocked.resume_status = "blocked";
  blocked.reviewed_scope = {
    files: [],
    limitations: []
  };
  assert.match(
    validatePacket(blocked).errors.join("\n"),
    /blocked status requires at least one limitation/
  );
});

test("rejects unsupported packet types with supported combinations", () => {
  const packet = {
    packet_type: "SECRET_PACKET_TYPE_SHOULD_NOT_APPEAR",
    packet_version: "0.1",
    created_at: "2026-06-27T00:00:00.000Z",
    secret: "SECRET_FIELD_SHOULD_NOT_APPEAR"
  };

  const result = validatePacket(packet);
  const errors = result.errors.join("\n");

  assert.equal(result.valid, false);
  assert.match(errors, /unsupported packet_type\/packet_version/);
  assert.match(errors, /review-request\/0\.1/);
  assert.doesNotMatch(errors, /SECRET_FIELD_SHOULD_NOT_APPEAR/);
});

test("rejects unsupported review-response versions with supported combinations", async () => {
  const packet = {
    ...(await validReviewResponseFixture()),
    packet_version: "9.9",
    secret: "SECRET_FIELD_SHOULD_NOT_APPEAR"
  };

  const result = validatePacket(packet);
  const errors = result.errors.join("\n");

  assert.equal(result.valid, false);
  assert.match(errors, /unsupported packet_type\/packet_version: review-response\/9\.9/);
  assert.match(errors, /supported: .*review-request\/0\.1/);
  assert.match(errors, /review-response\/0\.1/);
  assert.doesNotMatch(errors, /SECRET_FIELD_SHOULD_NOT_APPEAR/);
});

test("rejects unsupported packet versions with supported combinations", async () => {
  const packet = {
    ...(await validPacketFixture()),
    packet_version: "9.9"
  };

  const result = validatePacket(packet);

  assert.equal(result.valid, false);
  assert.match(
    result.errors.join("\n"),
    /unsupported packet_type\/packet_version: review-request\/9\.9/
  );
  assert.match(result.errors.join("\n"), /supported: review-request\/0\.1/);
});

test("requires packet type before dispatch", () => {
  const result = validatePacket({ packet_version: "0.1" });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /must have required property 'packet_type'/);
});

test("lets review-request schema own created_at validation", async () => {
  const packet = {
    ...(await validPacketFixture()),
    created_at: undefined,
    goal: ""
  };
  delete packet.created_at;

  const result = validatePacket(packet);
  const errors = result.errors.join("\n");

  assert.equal(result.valid, false);
  assert.match(errors, /created_at/);
  assert.match(errors, /goal/);
});

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
