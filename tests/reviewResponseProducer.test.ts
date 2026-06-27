import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { ReviewRequestPacket } from "../src/reviewRequest";
import type { ReviewResponsePacket } from "../src/reviewResponse";
import {
  buildReviewResponsePacket,
  validateReviewResponseDraftKeys,
  type ReviewResponseDraft
} from "../src/reviewResponseProducer";
import { validatePacket } from "../src/schema";

test("builds a valid review-response packet from a request and draft", () => {
  const packet = buildReviewResponsePacket({
    request: validReviewRequestFixture(),
    draft: validDraft(),
    createdAt: "2026-06-27T00:00:00Z"
  });

  assert.equal(validatePacket(packet).valid, true);
  assert.equal(packet.packet_type, "review-response");
  assert.equal(packet.packet_version, "0.1");
  assert.equal(packet.response_to.repository, "example/open-relay");
  assert.equal(packet.response_to.diff_range, "def5678..abc1234");
});

test("derives response_to from the request without local path or remote url expansion", () => {
  const request = validReviewRequestFixture();
  const packet = buildReviewResponsePacket({
    request,
    draft: validDraft(),
    createdAt: "2026-06-27T00:00:00Z"
  });

  assert.deepEqual(packet.response_to, {
    packet_type: "review-request",
    packet_version: "0.1",
    repository: "example/open-relay",
    working_branch: "codex/open-source-hardening",
    base_commit: "def5678",
    head_commit: "abc1234",
    diff_range: "def5678..abc1234",
    pull_request_url: "https://github.com/example/open-relay/pull/2",
    source: "review-request packet"
  });
  assert.equal("local_path" in packet.response_to, false);
  assert.equal("remote_url" in packet.response_to, false);
});

test("rejects reserved draft keys before building", () => {
  assert.deepEqual(
    validateReviewResponseDraftKeys({
      ...validDraft(),
      response_to: { repository: "spoofed/repo" }
    }),
    { ok: false, reason: "reserved" }
  );
});

test("rejects unknown draft keys before building", () => {
  assert.deepEqual(
    validateReviewResponseDraftKeys({
      ...validDraft(),
      verificaton: []
    }),
    { ok: false, reason: "unknown" }
  );
});

test("defaults optional verification and redactions to empty arrays", () => {
  const draft = validDraft();
  delete draft.verification;
  delete draft.redactions;

  const packet = buildReviewResponsePacket({
    request: validReviewRequestFixture(),
    draft,
    createdAt: "2026-06-27T00:00:00Z"
  });

  assert.deepEqual(packet.verification, []);
  assert.deepEqual(packet.redactions, []);
  assert.equal(validatePacket(packet).valid, true);
});

test("schema semantics reject approved responses with blocking findings", () => {
  const packet = buildReviewResponsePacket({
    request: validReviewRequestFixture(),
    draft: {
      ...validDraft(),
      findings: [blockingFinding()]
    },
    createdAt: "2026-06-27T00:00:00Z"
  });

  const result = validatePacket(packet);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /approved outcome cannot include blocking findings/);
});

test("schema semantics require changes_requested to include a blocking finding", () => {
  const packet = buildReviewResponsePacket({
    request: validReviewRequestFixture(),
    draft: {
      ...validDraft(),
      outcome: "changes_requested"
    },
    createdAt: "2026-06-27T00:00:00Z"
  });

  const result = validatePacket(packet);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /changes_requested outcome requires at least one blocking finding/);
});

test("schema semantics require blocked responses to include a limitation", () => {
  const packet = buildReviewResponsePacket({
    request: validReviewRequestFixture(),
    draft: {
      ...validDraft(),
      outcome: "blocked"
    },
    createdAt: "2026-06-27T00:00:00Z"
  });

  const result = validatePacket(packet);
  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /blocked outcome requires at least one limitation/);
});

function validReviewRequestFixture(): ReviewRequestPacket {
  return JSON.parse(readFileSync("examples/review-request/relay.json", "utf8")) as ReviewRequestPacket;
}

function validDraft(): ReviewResponseDraft {
  return {
    reviewer: {
      name: "Claude Code",
      kind: "agent",
      tool: "Claude Code"
    },
    outcome: "approved",
    confidence: "high",
    summary: "No blocking findings.",
    findings: [],
    reviewed_scope: {
      files: [{
        path: "src/cli.ts",
        notes: "Reviewed CLI route."
      }],
      limitations: []
    },
    verification: [],
    redactions: [],
    next_action: "Merge after CI passes."
  };
}

function blockingFinding(): ReviewResponsePacket["findings"][number] {
  return {
    id: "F1",
    severity: "high",
    blocking: true,
    title: "Blocking issue",
    description: "A blocking issue exists.",
    evidence: "Observed in review.",
    recommendation: "Fix before merge."
  };
}
