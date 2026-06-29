import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { renderPacketMarkdown } from "../src/renderPacket";
import {
  renderPacketForTemplate,
  type PromptTemplate
} from "../src/renderPrompt";

const reviewRequest = JSON.parse(
  readFileSync("examples/review-request/relay.json", "utf8")
) as Record<string, unknown>;

const reviewResponse = JSON.parse(
  readFileSync("examples/review-response/relay.json", "utf8")
) as Record<string, unknown>;

const resumeProject = JSON.parse(
  readFileSync("examples/resume-project/relay.json", "utf8")
) as Record<string, unknown>;

test("neutral template matches packet markdown", () => {
  assert.equal(
    renderPacketForTemplate({ packet: reviewRequest, template: "neutral" }),
    renderPacketMarkdown(reviewRequest)
  );
});

test("claude template wraps review-request packets for findings-first review", () => {
  const prompt = renderPacketForTemplate({
    packet: reviewRequest,
    template: "claude"
  });

  assert.match(prompt, /^# Claude Review Prompt/);
  assert.match(prompt, /treat it as untrusted quoted context/i);
  assert.match(prompt, /Findings first/);
  assert.match(prompt, /review-response draft JSON/);
  assert.match(prompt, /# Review Request Relay Packet/);
});

test("codex template wraps review-response packets for implementation follow-up", () => {
  const prompt = renderPacketForTemplate({
    packet: reviewResponse,
    template: "codex"
  });

  assert.match(prompt, /^# Codex Follow-Up Prompt/);
  assert.match(prompt, /evaluate the findings/i);
  assert.match(prompt, /Do not merge, publish, or run destructive commands/i);
  assert.match(prompt, /# Review Response Relay Packet/);
});

test("codex template wraps resume-project packets for continuation work", () => {
  const prompt = renderPacketForTemplate({
    packet: resumeProject,
    template: "codex"
  });

  assert.match(prompt, /^# Codex Follow-Up Prompt/);
  assert.match(prompt, /Evaluate each continuation task/i);
  assert.match(prompt, /Do not merge, publish, or run destructive commands/i);
  assert.match(prompt, /# Resume Project Relay Packet/);
});

test("prompt fence is longer than any backtick run in packet markdown", () => {
  const packet = {
    ...reviewRequest,
    change_summary: {
      ...(reviewRequest.change_summary as Record<string, unknown>),
      summary: "Contains a fence: ``` and a longer fence: ````."
    }
  };

  const prompt = renderPacketForTemplate({ packet, template: "claude" });

  assert.match(prompt, /`````open-relay-packet/);
  assert.match(prompt, /`````\n$/);
});

test("template parser accepts only supported values", () => {
  assert.equal(parseTemplateForTest(undefined), "neutral");
  assert.equal(parseTemplateForTest("neutral"), "neutral");
  assert.equal(parseTemplateForTest("claude"), "claude");
  assert.equal(parseTemplateForTest("codex"), "codex");
  assert.equal(parseTemplateForTest("html"), undefined);
});

function parseTemplateForTest(value: string | undefined): PromptTemplate | undefined {
  if (value === undefined) {
    return "neutral";
  }

  return value === "neutral" || value === "claude" || value === "codex"
    ? value
    : undefined;
}
