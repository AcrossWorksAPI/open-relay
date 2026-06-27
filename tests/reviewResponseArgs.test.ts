import assert from "node:assert/strict";
import { test } from "node:test";

import {
  parseGenerateReviewResponseArgs,
  parseRespondGithubPrArgs
} from "../src/reviewResponseArgs";

test("parses generate review-response required flags and defaults", () => {
  assert.deepEqual(parseGenerateReviewResponseArgs([
    "--request", "request.json",
    "--review", "draft.json"
  ]), {
    ok: true,
    options: {
      request: "request.json",
      review: "draft.json",
      format: "json"
    }
  });
});

test("parses generate review-response format and output", () => {
  assert.deepEqual(parseGenerateReviewResponseArgs([
    "--request", "request.json",
    "--review", "draft.json",
    "--format", "markdown",
    "--output", "response.md"
  ]), {
    ok: true,
    options: {
      request: "request.json",
      review: "draft.json",
      format: "markdown",
      output: "response.md"
    }
  });
});

test("rejects invalid generate review-response arguments", () => {
  assert.deepEqual(parseGenerateReviewResponseArgs([]), {
    ok: false,
    message: "Missing required flags: --request, --review"
  });
  assert.deepEqual(parseGenerateReviewResponseArgs(["--request", "request.json"]), {
    ok: false,
    message: "Missing required flags: --review"
  });
  assert.deepEqual(parseGenerateReviewResponseArgs(["--request"]), {
    ok: false,
    message: "Missing value for --request"
  });
  assert.deepEqual(parseGenerateReviewResponseArgs(["--request", "a", "--request", "b", "--review", "draft.json"]), {
    ok: false,
    message: "Duplicate flag: --request"
  });
  assert.deepEqual(parseGenerateReviewResponseArgs(["--request", "request.json", "--review", "draft.json", "--format", "yaml"]), {
    ok: false,
    message: "Invalid format: yaml"
  });
  assert.deepEqual(parseGenerateReviewResponseArgs(["--request", "request.json", "--review", "draft.json", "--bogus", "x"]), {
    ok: false,
    message: "Unknown flag: --bogus"
  });
  assert.deepEqual(parseGenerateReviewResponseArgs(["request.json", "--review", "draft.json"]), {
    ok: false,
    message: "Unexpected argument: request.json"
  });
});

test("parses respond github-pr flags", () => {
  assert.deepEqual(parseRespondGithubPrArgs([
    "--request", "request.json",
    "--review", "draft.json",
    "--pr", "AcrossWorksAPI/open-relay#38",
    "--dry-run",
    "--update",
    "--confirm-public"
  ]), {
    ok: true,
    options: {
      request: "request.json",
      review: "draft.json",
      pr: "AcrossWorksAPI/open-relay#38",
      dryRun: true,
      update: true,
      confirmPublic: true
    }
  });
});

test("rejects invalid respond github-pr arguments", () => {
  assert.deepEqual(parseRespondGithubPrArgs([]), {
    ok: false,
    message: "Missing required flags: --request, --review, --pr"
  });
  assert.deepEqual(parseRespondGithubPrArgs(["--request", "request.json", "--review", "draft.json"]), {
    ok: false,
    message: "Missing required flags: --pr"
  });
  assert.deepEqual(parseRespondGithubPrArgs(["--request"]), {
    ok: false,
    message: "Missing value for --request"
  });
  assert.deepEqual(parseRespondGithubPrArgs([
    "--request", "a",
    "--request", "b",
    "--review", "draft.json",
    "--pr", "AcrossWorksAPI/open-relay#38"
  ]), {
    ok: false,
    message: "Duplicate flag: --request"
  });
  assert.deepEqual(parseRespondGithubPrArgs([
    "--request", "request.json",
    "--review", "draft.json",
    "--pr", "AcrossWorksAPI/open-relay#38",
    "--dry-run",
    "--dry-run"
  ]), {
    ok: false,
    message: "Duplicate flag: --dry-run"
  });
  assert.deepEqual(parseRespondGithubPrArgs([
    "--request", "request.json",
    "--review", "draft.json",
    "--pr", "https://example.com/acme/repo/pull/SECRET_REF_SHOULD_NOT_APPEAR"
  ]), {
    ok: false,
    message: "Invalid GitHub pull request target."
  });
  assert.deepEqual(parseRespondGithubPrArgs([
    "--request", "request.json",
    "--review", "draft.json",
    "--pr", "AcrossWorksAPI/open-relay#38",
    "--format", "markdown"
  ]), {
    ok: false,
    message: "Unknown flag: --format"
  });
  assert.deepEqual(parseRespondGithubPrArgs([
    "--request", "request.json",
    "--review", "draft.json",
    "--pr", "AcrossWorksAPI/open-relay#38",
    "--output", "response.json"
  ]), {
    ok: false,
    message: "Unknown flag: --output"
  });
});
