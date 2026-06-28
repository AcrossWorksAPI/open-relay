import assert from "node:assert/strict";
import { test } from "node:test";

import { buildReviewRequestPacket } from "../src/reviewRequest";
import { validatePacket } from "../src/schema";

test("builds a schema-valid review-request packet", () => {
  const packet = buildReviewRequestPacket({
    options: {
      base: "main",
      head: "HEAD",
      goal: "Add generator",
      summary: "Generate review-request packets.",
      behavioralIntent: "Reduce handoff copy and paste.",
      format: "json",
      audience: "Claude Code",
      focus: ["Correctness"],
      requestedOutput: "Findings first.",
      reviewerAccess: "Reviewer can access the repository.",
      verification: [{
        kind: "command",
        command: "npm run check",
        result: "passed",
        evidence: "8 tests passing"
      }],
      risks: [],
      excludedScope: ["Markdown rendering deferred."],
      includeLocalPath: false
    },
    git: {
      repositoryName: "AcrossWorksAPI/open-relay",
      remoteUrl: "https://github.com/AcrossWorksAPI/open-relay.git",
      baseBranch: "main",
      workingBranch: "codex/generator",
      baseCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      headCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      diffRange: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa..bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      changedFiles: [{
        path: "src/cli.ts",
        status: "modified",
        role: "Modified file in review range.",
        review_priority: "high"
      }]
    },
    createdAt: "2026-06-26T00:00:00Z"
  });

  assert.equal(validatePacket(packet).valid, true);
  assert.equal(packet.repository.local_path, undefined);
  assert.equal(packet.change_summary.total_files_changed, 1);
  assert.equal(packet.sensitive_data.excluded, true);
  assert.equal(packet.redactions.some((entry) => entry.field === "repository.local_path"), true);
});

test("adds PR provenance when a pull request URL is supplied", () => {
  const packet = buildReviewRequestPacket({
    options: {
      base: "main",
      head: "HEAD",
      goal: "Add generator",
      summary: "Generate review-request packets.",
      behavioralIntent: "Reduce handoff copy and paste.",
      format: "json",
      audience: "Claude Code",
      focus: ["Correctness"],
      requestedOutput: "Findings first.",
      reviewerAccess: "Reviewer can access the repository.",
      pullRequestUrl: "https://github.com/AcrossWorksAPI/open-relay/pull/13",
      verification: [],
      risks: [],
      excludedScope: ["Markdown rendering deferred."],
      includeLocalPath: false
    },
    git: {
      repositoryName: "AcrossWorksAPI/open-relay",
      baseBranch: "main",
      workingBranch: "codex/generator",
      baseCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      headCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      diffRange: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa..bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      changedFiles: [{
        path: "README.md",
        status: "modified",
        role: "Modified file in review range.",
        review_priority: "medium"
      }]
    },
    createdAt: "2026-06-26T00:00:00Z"
  });

  assert.equal(
    packet.repository.pull_request_url,
    "https://github.com/AcrossWorksAPI/open-relay/pull/13"
  );
  assert.equal(packet.provenance.some((entry) => entry.type === "pull_request"), true);
});

test("applies private redactions after built-in redactions", () => {
  const packet = buildReviewRequestPacket({
    options: {
      base: "main",
      head: "HEAD",
      goal: "Review PrivateCustomerName changes.",
      summary: "Generate review-request packets.",
      behavioralIntent: "Reduce handoff copy and paste.",
      format: "json",
      audience: "Claude Code",
      focus: ["Correctness"],
      requestedOutput: "Findings first.",
      reviewerAccess: "Reviewer can access the repository.",
      verification: [],
      risks: [],
      excludedScope: ["Markdown rendering deferred."],
      includeLocalPath: false
    },
    git: {
      repositoryName: "PrivateCustomerName/open-relay",
      remoteUrl: "https://github.com/AcrossWorksAPI/open-relay.git",
      baseBranch: "main",
      workingBranch: "codex/private-redaction-rules",
      baseCommit: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      headCommit: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      diffRange: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa..bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
      changedFiles: [{
        path: "README.md",
        status: "modified",
        role: "Modified file in review range.",
        review_priority: "medium"
      }]
    },
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
