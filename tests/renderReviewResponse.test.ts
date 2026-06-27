import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { renderReviewResponseMarkdown } from "../src/renderReviewResponse";
import type { ReviewResponsePacket } from "../src/reviewResponse";

const examplePacket = JSON.parse(
  readFileSync("examples/review-response/relay.json", "utf8")
) as ReviewResponsePacket;
const exampleMarkdown = readFileSync("examples/review-response/relay.md", "utf8");

test("renders the committed review-response example markdown", () => {
  assert.equal(renderReviewResponseMarkdown(examplePacket), exampleMarkdown);
});

test("renders review-response markdown in protocol order", () => {
  const markdown = renderReviewResponseMarkdown(examplePacket);
  const headings = [
    "# Review Response Relay Packet",
    "## Response To",
    "## Reviewer",
    "## Outcome And Confidence",
    "## Summary",
    "## Findings",
    "## Reviewed Scope",
    "## Verification",
    "## Provenance",
    "## Redactions",
    "## Sensitive Data",
    "## Next Action"
  ];

  let previousIndex = -1;
  for (const heading of headings) {
    const index = markdown.indexOf(heading);
    assert.ok(index > previousIndex, `${heading} should render after the previous section`);
    previousIndex = index;
  }
});

test("renders outcome and confidence together", () => {
  const markdown = renderReviewResponseMarkdown(examplePacket);

  assert.match(markdown, /## Outcome And Confidence/);
  assert.match(markdown, /- Outcome: `approved`/);
  assert.match(markdown, /- Confidence: `high`/);
});

test("escapes review-response table cells and code spans", () => {
  const packet: ReviewResponsePacket = {
    ...examplePacket,
    response_to: {
      ...examplePacket.response_to,
      repository: "AcrossWorksAPI/`open|relay`"
    },
    findings: [
      {
        id: "F|1",
        severity: "low",
        blocking: false,
        title: "Pipe | in title",
        description: "## injected heading\nbody",
        evidence: "Evidence | with pipe",
        recommendation: "- injected bullet\nfix",
        location: {
          path: "src/`cli|test`.ts",
          line: 12,
          symbol: "run|command"
        }
      }
    ],
    verification: [
      {
        kind: "command",
        command: "npm `run|check`",
        result: "passed",
        evidence: "Line one\n| pipe"
      }
    ]
  };

  const markdown = renderReviewResponseMarkdown(packet);

  assert.match(markdown, /AcrossWorksAPI\/open\|relay/);
  assert.match(markdown, /F\\\|1/);
  assert.match(markdown, /Pipe \\\| in title/);
  assert.match(markdown, /src\/cli\\\|test\.ts:12/);
  assert.doesNotMatch(markdown, /^## injected heading/m);
  assert.doesNotMatch(markdown, /^- injected bullet/m);
  assert.doesNotMatch(markdown, /`npm `run/);
});

test("renders neutral review-response empty states", () => {
  const packet: ReviewResponsePacket = {
    ...examplePacket,
    findings: [],
    reviewed_scope: {
      files: [],
      limitations: []
    },
    verification: [],
    provenance: [],
    redactions: [],
    sensitive_data: undefined
  };

  const markdown = renderReviewResponseMarkdown(packet);

  assert.match(markdown, /No findings listed\./);
  assert.match(markdown, /No reviewed files listed\./);
  assert.match(markdown, /No review limitations listed\./);
  assert.match(markdown, /No verification evidence listed\./);
  assert.match(markdown, /No provenance listed\./);
  assert.match(markdown, /No redactions listed\./);
  assert.match(markdown, /No sensitive-data note provided\./);
});
