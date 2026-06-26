import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { renderReviewRequestMarkdown } from "../src/renderReviewRequest";
import type { ReviewRequestPacket } from "../src/reviewRequest";

const examplePacket = JSON.parse(
  readFileSync("examples/review-request/relay.json", "utf8")
) as ReviewRequestPacket;
const exampleMarkdown = readFileSync("examples/review-request/relay.md", "utf8");

test("renders the committed example markdown", () => {
  assert.equal(renderReviewRequestMarkdown(examplePacket), exampleMarkdown);
});

test("renders review-request markdown in protocol order", () => {
  const markdown = renderReviewRequestMarkdown(examplePacket);
  const headings = [
    "## Review Request",
    "## Goal",
    "## Repository Context",
    "## Change Summary",
    "## Changed Files",
    "## Verification",
    "## Risks And Assumptions",
    "## Provenance",
    "## Redactions",
    "## Sensitive Data",
    "## Next Action"
  ];

  let previousIndex = -1;
  for (const heading of headings) {
    const index = markdown.indexOf(heading);
    assert.notEqual(index, -1, `${heading} missing`);
    assert.ok(index > previousIndex, `${heading} is out of order`);
    previousIndex = index;
  }

  assert.match(markdown, /^# Review Request Relay Packet/);
  assert.match(markdown, /- Packet version: `0\.1`/);
  assert.match(markdown, /- Audience: Claude Code/);
  assert.match(markdown, /- Behavioral intent: Improve open-source readiness without changing product behavior\./);
  assert.match(markdown, /\| `SECURITY\.md` \| added \| Vulnerability reporting and security policy \| high \|/);
  assert.match(markdown, /Review whether this packet provides enough context/);
  assert.ok(markdown.endsWith("\n"));
});

test("escapes markdown table cells", () => {
  const packet: ReviewRequestPacket = {
    ...examplePacket,
    changed_files: [{
      path: "docs/a|b.md",
      status: "modified",
      role: "Line one\nLine two",
      review_priority: "high"
    }],
    verification: [{
      kind: "command",
      command: "npm | test",
      result: "passed",
      evidence: "Line one\nLine two"
    }]
  };

  const markdown = renderReviewRequestMarkdown(packet);

  assert.match(markdown, /\| `docs\/a\\\|b\.md` \| modified \| Line one Line two \| high \|/);
  assert.match(markdown, /\| `npm \\\| test` \| passed \| Line one Line two \|/);
});

test("normalizes inline and bullet-list line breaks", () => {
  const packet: ReviewRequestPacket = {
    ...examplePacket,
    repository: {
      ...examplePacket.repository,
      reviewer_access: "Reviewer has access.\n- Injected bullet"
    },
    provenance: [{
      type: "user_note",
      reference: "owner-note",
      supports: "Line one\n## Injected heading"
    }],
    redactions: [{
      field: "repository.local_path",
      reason: "Line one\n- Injected bullet"
    }]
  };

  const markdown = renderReviewRequestMarkdown(packet);

  assert.match(markdown, /Reviewer access: Reviewer has access\. - Injected bullet/);
  assert.doesNotMatch(markdown, /^## Injected heading/m);
  assert.doesNotMatch(markdown, /^- Injected bullet/m);
});

test("renders neutral empty states", () => {
  const packet: ReviewRequestPacket = {
    ...examplePacket,
    change_summary: {
      ...examplePacket.change_summary,
      excluded_scope: []
    },
    verification: [],
    risks: [],
    provenance: [],
    redactions: []
  };

  const markdown = renderReviewRequestMarkdown(packet);

  assert.match(markdown, /- Excluded scope: none listed/);
  assert.match(markdown, /No verification evidence listed\./);
  assert.match(markdown, /No risks listed\./);
  assert.match(markdown, /No provenance listed\./);
  assert.match(markdown, /No redactions listed\./);
});
