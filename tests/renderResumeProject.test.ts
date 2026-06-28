import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { renderResumeProjectMarkdown } from "../src/renderResumeProject";
import type { ResumeProjectPacket } from "../src/resumeProject";

const examplePacket = JSON.parse(
  readFileSync("examples/resume-project/relay.json", "utf8")
) as ResumeProjectPacket;
const exampleMarkdown = readFileSync("examples/resume-project/relay.md", "utf8");

test("renders the committed resume-project example markdown", () => {
  assert.equal(renderResumeProjectMarkdown(examplePacket), exampleMarkdown);
});

test("renders resume-project markdown in protocol order", () => {
  const markdown = renderResumeProjectMarkdown(examplePacket);
  const headings = [
    "# Resume Project Relay Packet",
    "## Resume From",
    "## Target",
    "## Status And Confidence",
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

  let previousIndex = -1;
  for (const heading of headings) {
    const index = markdown.indexOf(heading);
    assert.ok(index > previousIndex, `${heading} should render after the previous section`);
    previousIndex = index;
  }
});

test("renders tasks as readable blocks", () => {
  const markdown = renderResumeProjectMarkdown(examplePacket);

  assert.match(markdown, /### F1 - medium - blocking/);
  assert.match(markdown, /- Title: Missing regression coverage/);
  assert.match(markdown, /\*\*Recommendation\*\*\n\n> Add a CLI regression test before merging\./);
});

test("escapes resume-project table cells and code spans", () => {
  const packet: ResumeProjectPacket = {
    ...examplePacket,
    target: {
      ...examplePacket.target,
      repository: "AcrossWorksAPI/`open|relay`",
      working_branch: "fix-`branch`"
    },
    tasks: [
      {
        source_finding_id: "F|2",
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
    prior_verification: [
      {
        kind: "command",
        command: "npm `run|check`",
        result: "passed",
        evidence: "Line one\n| pipe"
      }
    ]
  };

  const markdown = renderResumeProjectMarkdown(packet);

  assert.match(markdown, /AcrossWorksAPI\/open\|relay/);
  assert.match(markdown, /`fix-branch`/);
  assert.match(markdown, /F\|2/);
  assert.match(markdown, /Pipe \| in title/);
  assert.match(markdown, /src\/cli\|test\.ts:12/);
  assert.doesNotMatch(markdown, /^## injected heading/m);
  assert.doesNotMatch(markdown, /^- injected bullet/m);
  assert.match(markdown, /^> ## injected heading/m);
  assert.match(markdown, /^> - injected bullet/m);
  assert.doesNotMatch(markdown, /`npm `run/);
});

test("renders neutral resume-project empty states", () => {
  const packet: ResumeProjectPacket = {
    ...examplePacket,
    resume_status: "owner_decision",
    tasks: [],
    reviewed_scope: {
      files: [],
      limitations: []
    },
    prior_verification: [],
    provenance: [],
    redactions: [],
    sensitive_data: undefined
  };

  const markdown = renderResumeProjectMarkdown(packet);

  assert.match(markdown, /No continuation tasks listed\./);
  assert.match(markdown, /No reviewed files listed\./);
  assert.match(markdown, /No resume limitations listed\./);
  assert.match(markdown, /No prior verification evidence listed\./);
  assert.match(markdown, /No provenance listed\./);
  assert.match(markdown, /No redactions listed\./);
  assert.match(markdown, /No sensitive-data note provided\./);
});
