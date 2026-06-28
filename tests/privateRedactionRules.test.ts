import assert from "node:assert/strict";
import { test } from "node:test";

import {
  applyPrivateRedactionRules,
  parsePrivateRedactionRules,
  PRIVATE_REDACTION_EXCLUDED_STRING_FIELDS,
  PRIVATE_REDACTION_STRING_FIELDS
} from "../src/privateRedactionRules";
import type { ReviewRequestPacket } from "../src/reviewRequest";
import { validatePacket } from "../src/schema";

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

test("rejects case-insensitive duplicate matches and cross-rule leaks", () => {
  assert.equal(parsePrivateRedactionRules({
    version: 1,
    rules: [
      {
        name: "customer",
        match: "PrivateCustomerName",
        replacement: "[private-customer]",
        reason: "Private customer name."
      },
      {
        name: "customer-lower",
        match: "privatecustomername",
        replacement: "[private-customer-lower]",
        reason: "Private customer lower-case variant."
      }
    ]
  }).ok, false);

  assert.equal(parsePrivateRedactionRules({
    version: 1,
    rules: [
      {
        name: "customer",
        match: "PrivateCustomerName",
        replacement: "[private-customer]",
        reason: "Private customer name."
      },
      {
        name: "placeholder-leaks-customer",
        match: "OtherPrivateName",
        replacement: "[PrivateCustomerName-placeholder]",
        reason: "Other private name."
      }
    ]
  }).ok, false);
});

test("rejects rule names that contain a private match", () => {
  assert.equal(parsePrivateRedactionRules({
    version: 1,
    rules: [{
      name: "scrub PrivateCustomerName customer",
      match: "PrivateCustomerName",
      replacement: "[private-customer]",
      reason: "Private customer name."
    }]
  }).ok, false);
});

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
  assert.equal(JSON.stringify(redacted).includes("privatecustomername"), false);
});

test("does not include private matches in redaction audit entries", () => {
  const redacted = applyPrivateRedactionRules(reviewRequestFixture({
    goal: "Review PrivateCustomerName changes."
  }), [{
    name: "customer",
    match: "PrivateCustomerName",
    replacement: "[private-customer]",
    reason: "Private customer name."
  }]);

  assert.equal(redacted.redactions.some((item) => item.field === "goal"), true);
  assert.doesNotMatch(JSON.stringify(redacted.redactions), /PrivateCustomerName/i);
});

test("treats regex syntax and replacement dollars as literals", () => {
  const packet = reviewRequestFixture({
    goal: "Review Private.Customer[Name] changes."
  });

  const redacted = applyPrivateRedactionRules(packet, [{
    name: "customer",
    match: "Private.Customer[Name]",
    replacement: "[$&-literal]",
    reason: "Private customer name."
  }]);

  assert.equal(redacted.goal, "Review [$&-literal] changes.");
});

test("redacts every allowlisted review-request string field", () => {
  const redacted = applyPrivateRedactionRules(
    reviewRequestFixtureWithPrivateTermsInAllowlistedFields(),
    [{
      name: "customer",
      match: "PrivateCustomerName",
      replacement: "[private-customer]",
      reason: "Private customer name."
    }]
  );

  assert.doesNotMatch(JSON.stringify(redacted), /PrivateCustomerName/i);
});

test("private redaction allowlist accounts for every review-request string field", () => {
  const packet = reviewRequestFixtureWithAllStringFields();

  const packetStringPaths = [...new Set(collectStringPaths(packet))].sort();
  const accountedStringPaths = [
    ...PRIVATE_REDACTION_STRING_FIELDS,
    ...PRIVATE_REDACTION_EXCLUDED_STRING_FIELDS
  ].sort();

  assert.deepEqual(packetStringPaths, accountedStringPaths);
});

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

function reviewRequestFixture(overrides: {
  goal?: string;
  repositoryName?: string;
  changedPath?: string;
} = {}): ReviewRequestPacket {
  return {
    packet_version: "0.1",
    packet_type: "review-request",
    created_at: "2026-06-28T00:00:00.000Z",
    goal: overrides.goal ?? "Review changes.",
    requested_review: {
      audience: "Claude Code",
      focus: ["Correctness"],
      requested_output: "Findings first."
    },
    repository: {
      name: overrides.repositoryName ?? "AcrossWorksAPI/open-relay",
      base_branch: "main",
      working_branch: "codex/private-redaction-rules",
      base_commit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      head_commit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      diff_range: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa..bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      reviewer_access: "Reviewer can access the repository."
    },
    change_summary: {
      summary: "Summary.",
      behavioral_intent: "Intent.",
      excluded_scope: ["No raw diff content."],
      total_files_changed: 1
    },
    changed_files: [{
      path: overrides.changedPath ?? "src/cli.ts",
      status: "modified",
      role: "Modified file in review range.",
      review_priority: "high",
      evidence: "Diff stats: +1 -0."
    }],
    verification: [{
      kind: "command",
      command: "npm run check",
      result: "passed",
      evidence: "150 tests passing."
    }],
    risks: [{
      severity: "info",
      description: "Generated packet should be reviewed before sharing.",
      handling: "Validate packet before transport."
    }],
    provenance: [{
      type: "commit",
      reference: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      supports: "Head commit for review."
    }],
    redactions: [{
      field: "repository.local_path",
      reason: "Local filesystem paths are excluded by default."
    }],
    sensitive_data: {
      excluded: true,
      notes: "Diff content, command output, environment variables, and local paths are excluded unless explicitly opted in."
    },
    next_action: "Review the packet and return findings first."
  };
}

function reviewRequestFixtureWithAllStringFields(): ReviewRequestPacket {
  return {
    ...reviewRequestFixture(),
    repository: {
      ...reviewRequestFixture().repository,
      remote_url: "https://github.com/AcrossWorksAPI/open-relay.git",
      local_path: "/workspace/open-relay",
      pull_request_url: "https://github.com/AcrossWorksAPI/open-relay/pull/45"
    },
    redactions: [{
      field: "repository.remote_url",
      reason: "Remote URL contained credentials.",
      replacement: "[redacted]"
    }]
  };
}

function reviewRequestFixtureWithPrivateTermsInAllowlistedFields(): ReviewRequestPacket {
  const packet = reviewRequestFixtureWithAllStringFields();

  packet.goal = "PrivateCustomerName goal";
  packet.requested_review = {
    audience: "PrivateCustomerName reviewer",
    focus: ["PrivateCustomerName focus"],
    requested_output: "PrivateCustomerName output"
  };
  packet.repository = {
    ...packet.repository,
    name: "PrivateCustomerName/open-relay",
    remote_url: "https://github.com/PrivateCustomerName/open-relay.git",
    local_path: "/workspace/PrivateCustomerName",
    base_branch: "PrivateCustomerName-main",
    working_branch: "codex/PrivateCustomerName",
    pull_request_url: "https://github.com/PrivateCustomerName/open-relay/pull/45",
    reviewer_access: "PrivateCustomerName reviewer access."
  };
  packet.change_summary = {
    ...packet.change_summary,
    summary: "PrivateCustomerName summary.",
    behavioral_intent: "PrivateCustomerName intent.",
    excluded_scope: ["PrivateCustomerName excluded scope."]
  };
  packet.changed_files = [{
    ...packet.changed_files[0]!,
    path: "src/PrivateCustomerName.ts",
    role: "PrivateCustomerName role.",
    evidence: "PrivateCustomerName evidence."
  }];
  packet.verification = [{
    ...packet.verification[0]!,
    command: "PrivateCustomerName command",
    evidence: "PrivateCustomerName verification evidence."
  }];
  packet.risks = [{
    ...packet.risks[0]!,
    description: "PrivateCustomerName risk.",
    handling: "PrivateCustomerName handling."
  }];
  packet.provenance = [{
    ...packet.provenance[0]!,
    reference: "PrivateCustomerName reference",
    supports: "PrivateCustomerName support."
  }];
  packet.sensitive_data.notes = "PrivateCustomerName sensitive data notes.";
  packet.next_action = "PrivateCustomerName next action.";

  return packet;
}

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
