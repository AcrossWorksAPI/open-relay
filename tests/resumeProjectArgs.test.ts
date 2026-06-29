import assert from "node:assert/strict";
import test from "node:test";

import { parseGenerateResumeProjectArgs } from "../src/resumeProjectArgs";

test("parses generate resume-project required flags and defaults", () => {
  assert.deepEqual(parseGenerateResumeProjectArgs([
    "--response",
    "review-response.json"
  ]), {
    ok: true,
    options: {
      response: "review-response.json",
      format: "json"
    }
  });
});

test("parses generate resume-project format and output", () => {
  assert.deepEqual(parseGenerateResumeProjectArgs([
    "--response",
    "review-response.json",
    "--format",
    "markdown",
    "--output",
    "resume.md"
  ]), {
    ok: true,
    options: {
      response: "review-response.json",
      format: "markdown",
      output: "resume.md"
    }
  });
});

test("rejects invalid generate resume-project arguments", () => {
  assert.deepEqual(parseGenerateResumeProjectArgs([]), {
    ok: false,
    message: "Missing required flag: --response"
  });

  assert.deepEqual(parseGenerateResumeProjectArgs([
    "--response",
    "a.json",
    "--response",
    "b.json"
  ]), {
    ok: false,
    message: "Duplicate flag: --response"
  });

  assert.deepEqual(parseGenerateResumeProjectArgs([
    "--response",
    "a.json",
    "--format",
    "yaml"
  ]), {
    ok: false,
    message: "Invalid format: yaml"
  });

  assert.deepEqual(parseGenerateResumeProjectArgs([
    "--response",
    "a.json",
    "--unknown",
    "x"
  ]), {
    ok: false,
    message: "Unknown flag: --unknown"
  });
});
