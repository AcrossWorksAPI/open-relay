import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildResumeProjectPacket } from "../src/resumeProjectProducer";
import type { ReviewResponsePacket } from "../src/reviewResponse";
import { validatePacket } from "../src/schema";

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
