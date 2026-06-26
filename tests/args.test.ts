import assert from "node:assert/strict";
import { test } from "node:test";

import { parseGenerateReviewRequestArgs } from "../src/args";

test("parses required generator flags and defaults", () => {
  const result = parseGenerateReviewRequestArgs([
    "--base", "origin/main",
    "--head", "HEAD",
    "--goal", "Add generator",
    "--summary", "Generate review-request packets.",
    "--behavioral-intent", "Reduce handoff copy and paste."
  ]);

  if (!result.ok) {
    assert.fail(result.message);
  }

  assert.equal(result.options.base, "origin/main");
  assert.equal(result.options.head, "HEAD");
  assert.equal(result.options.goal, "Add generator");
  assert.equal(result.options.summary, "Generate review-request packets.");
  assert.equal(result.options.behavioralIntent, "Reduce handoff copy and paste.");
  assert.equal(result.options.audience, "Claude Code");
  assert.deepEqual(result.options.focus, [
    "Correctness and behavioral regressions",
    "Security and privacy risks",
    "Missing verification or test coverage"
  ]);
  assert.equal(result.options.output, undefined);
});

test("parses repeated focus, verification, risk, excluded scope, and flags", () => {
  const result = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "feature",
    "--goal", "Review feature",
    "--summary", "Adds feature.",
    "--behavioral-intent", "Change runtime behavior.",
    "--focus", "Schema parity",
    "--focus", "CLI behavior",
    "--verification", "command|npm run check|passed|8 tests passing",
    "--risk", "low|Package not published|Keep private true",
    "--excluded-scope", "No Markdown renderer",
    "--include-local-path",
    "--output", "relay.json",
    "--pr-url", "https://github.com/AcrossWorksAPI/open-relay/pull/12"
  ]);

  if (!result.ok) {
    assert.fail(result.message);
  }

  assert.deepEqual(result.options.focus, ["Schema parity", "CLI behavior"]);
  assert.deepEqual(result.options.verification, [{
    kind: "command",
    command: "npm run check",
    result: "passed",
    evidence: "8 tests passing"
  }]);
  assert.deepEqual(result.options.risks, [{
    severity: "low",
    description: "Package not published",
    handling: "Keep private true"
  }]);
  assert.deepEqual(result.options.excludedScope, ["No Markdown renderer"]);
  assert.equal(result.options.includeLocalPath, true);
  assert.equal(result.options.output, "relay.json");
  assert.equal(
    result.options.pullRequestUrl,
    "https://github.com/AcrossWorksAPI/open-relay/pull/12"
  );
});

test("rejects missing required generator flags", () => {
  const result = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD"
  ]);

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected parse failure");
  }

  assert.match(result.message, /Missing required flags/);
  assert.match(result.message, /--goal/);
  assert.match(result.message, /--summary/);
  assert.match(result.message, /--behavioral-intent/);
});

test("rejects unknown generator flags", () => {
  const result = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD",
    "--goal", "Goal",
    "--summary", "Summary",
    "--behavioral-intent", "Intent",
    "--behavioural-intent", "Typo"
  ]);

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected parse failure");
  }

  assert.match(result.message, /Unknown flag/);
  assert.match(result.message, /--behavioural-intent/);
});

test("rejects duplicate singleton generator flags", () => {
  const result = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD",
    "--goal", "First goal",
    "--goal", "Second goal",
    "--summary", "Summary",
    "--behavioral-intent", "Intent"
  ]);

  assert.equal(result.ok, false);
  if (result.ok) {
    throw new Error("expected parse failure");
  }

  assert.match(result.message, /Duplicate flag/);
  assert.match(result.message, /--goal/);
});

test("rejects malformed verification and risk entries", () => {
  const malformedVerification = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD",
    "--goal", "Goal",
    "--summary", "Summary",
    "--behavioral-intent", "Intent",
    "--verification", "command|npm run check"
  ]);
  assert.equal(malformedVerification.ok, false);

  const malformedRisk = parseGenerateReviewRequestArgs([
    "--base", "main",
    "--head", "HEAD",
    "--goal", "Goal",
    "--summary", "Summary",
    "--behavioral-intent", "Intent",
    "--risk", "low|Only two parts"
  ]);
  assert.equal(malformedRisk.ok, false);
});
