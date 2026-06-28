import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const cliPath = "dist/src/cli.js";

test("prints help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay validate <packet\.json>/);
  assert.equal(result.stderr, "");
});

test("prints generate review-request in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay generate review-request/);
});

test("prints render review-request in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay render <packet\.json>/);
  assert.match(result.stdout, /open-relay render review-request/);
});

test("prints handoff review-request in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay handoff review-request/);
  assert.match(result.stdout, /creates local review handoff Markdown; it does not send it anywhere/i);
});

test("prints save review-request in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay save review-request/);
});

test("prints github pr transport commands in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay transport github-pr send <packet\.json>/);
  assert.match(result.stdout, /open-relay transport github-pr fetch/);
  assert.match(result.stdout, /uses the local gh CLI/);
});

test("prints review-response producer commands in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay generate review-response/);
  assert.match(result.stdout, /open-relay respond github-pr/);
});

test("validates the example packet", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "validate", "examples/review-request/relay.json"],
    {
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /valid packet/);
  assert.doesNotMatch(result.stdout, /valid review-request packet/);
  assert.equal(result.stderr, "");
});

test("validates the review-response example packet", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "validate", "examples/review-response/relay.json"],
    {
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /valid packet/);
  assert.doesNotMatch(result.stdout, /valid review-request packet/);
  assert.equal(result.stderr, "");
});

test("rejects invalid JSON without printing file contents", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-"));
  const packetPath = join(directory, "bad.json");
  writeFileSync(packetPath, "{\"token\": SECRET_TOKEN_SHOULD_NOT_APPEAR}", "utf8");

  const result = spawnSync(process.execPath, [cliPath, "validate", packetPath], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid JSON/);
  assert.doesNotMatch(result.stderr, /SECRET/);
});

test("rejects schema-invalid packets", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-"));
  const packetPath = join(directory, "packet.json");
  writeFileSync(packetPath, JSON.stringify({ packet_version: "0.1" }), "utf8");

  const result = spawnSync(process.execPath, [cliPath, "validate", packetPath], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid packet/);
  assert.doesNotMatch(result.stderr, /Invalid review-request packet/);
  assert.match(result.stderr, /must have required property/);
});

test("transport github-pr send dry-run prints exact comment body without gh", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "send",
    "examples/review-request/relay.json",
    "--pr",
    "AcrossWorksAPI/open-relay#34",
    "--dry-run"
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Dry run target: AcrossWorksAPI\/open-relay#34/);
  assert.match(result.stdout, /<!-- open-relay-packet/);
  assert.match(result.stdout, /payload_base64:/);
  assert.match(result.stdout, /# Review Request Relay Packet/);
  assert.equal(result.stderr, "");
});

test("transport github-pr send rejects missing pr flag", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "send",
    "examples/review-request/relay.json"
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing required flag: --pr/);
});

test("transport github-pr send rejects malformed pr targets as parser errors", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "send",
    "examples/review-request/relay.json",
    "--pr",
    "https://example.com/acme/repo/pull/SECRET_REF_SHOULD_NOT_APPEAR",
    "--dry-run"
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Invalid GitHub pull request target/);
  assert.doesNotMatch(result.stderr, /SECRET_REF_SHOULD_NOT_APPEAR/);
});

test("transport github-pr send rejects invalid packet without publishing", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-transport-"));
  const packetPath = join(directory, "packet.json");
  writeFileSync(packetPath, JSON.stringify({ packet_type: "review-request", packet_version: "0.1" }), "utf8");

  try {
    const result = spawnSync(process.execPath, [
      cliPath,
      "transport",
      "github-pr",
      "send",
      packetPath,
      "--pr",
      "AcrossWorksAPI/open-relay#34",
      "--dry-run"
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid packet/);
    assert.doesNotMatch(result.stdout, /open-relay-packet/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("transport github-pr fetch requires author", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "fetch",
    "--pr",
    "AcrossWorksAPI/open-relay#34",
    "--packet-type",
    "review-response"
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing required flag: --author/);
});

test("transport github-pr fetch writes packet from fake gh without echoing output path", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-transport-"));
  const binDir = join(directory, "bin");
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR.json");

  try {
    const packet = JSON.parse(readFileSync("examples/review-response/relay.json", "utf8"));
    const payload = Buffer.from(`${JSON.stringify(packet, null, 2)}\n`, "utf8").toString("base64");
    const body = [
      "<!-- open-relay-packet",
      "packet_type: review-response",
      "packet_version: 0.1",
      `payload_base64: ${payload}`,
      "-->",
      "# Open Relay Packet: review-response/0.1",
      "",
      "# Review Response Relay Packet",
      ""
    ].join("\n");
    const comments = JSON.stringify([[
      { id: 99, body, created_at: "2026-06-27T00:00:00Z", user: { login: "claude" } }
    ]]);

    writeFakeGh(binDir, comments);

    const result = spawnSync(process.execPath, [
      cliPath,
      "transport",
      "github-pr",
      "fetch",
      "--pr",
      "AcrossWorksAPI/open-relay#34",
      "--packet-type",
      "review-response",
      "--packet-version",
      "0.1",
      "--author",
      "claude",
      "--output",
      outputPath
    ], {
      encoding: "utf8",
      env: {
        ...process.env,
        PATH: `${binDir}:${process.env.PATH ?? ""}`
      }
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Wrote fetched Open Relay packet/);
    assert.doesNotMatch(result.stdout, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.equal(result.stderr, "");

    const fetched = JSON.parse(readFileSync(outputPath, "utf8"));
    assert.equal(fetched.packet_type, "review-response");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generate review-response prints valid json to stdout", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-response-"));
  const draftPath = join(directory, "draft.json");
  writeReviewResponseDraft(draftPath);

  try {
    const result = spawnSync(process.execPath, [
      cliPath,
      "generate",
      "review-response",
      "--request",
      "examples/review-request/relay.json",
      "--review",
      draftPath
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
    const packet = JSON.parse(result.stdout);
    assert.equal(packet.packet_type, "review-response");
    assert.equal(packet.response_to.repository, "example/open-relay");
    assert.equal(packet.response_to.diff_range, "def5678..abc1234");
    assert.equal(packet.response_to.local_path, undefined);
    assert.equal(result.stderr, "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generate review-response renders markdown to stdout", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-response-"));
  const draftPath = join(directory, "draft.json");
  writeReviewResponseDraft(draftPath);

  try {
    const result = spawnSync(process.execPath, [
      cliPath,
      "generate",
      "review-response",
      "--request",
      "examples/review-request/relay.json",
      "--review",
      draftPath,
      "--format",
      "markdown"
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /^# Review Response Relay Packet/);
    assert.match(result.stdout, /## Next Action/);
    assert.equal(result.stderr, "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generate review-response writes output without echoing path", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-response-"));
  const draftPath = join(directory, "draft.json");
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR.json");
  writeReviewResponseDraft(draftPath);

  try {
    const result = spawnSync(process.execPath, [
      cliPath,
      "generate",
      "review-response",
      "--request",
      "examples/review-request/relay.json",
      "--review",
      draftPath,
      "--output",
      outputPath
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Wrote review-response packet/);
    assert.doesNotMatch(result.stdout, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.equal(JSON.parse(readFileSync(outputPath, "utf8")).packet_type, "review-response");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generate review-response rejects invalid request json without leaking contents", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-response-"));
  const requestPath = join(directory, "request.json");
  const draftPath = join(directory, "draft.json");
  writeFileSync(requestPath, "{\"token\": SECRET_TOKEN_SHOULD_NOT_APPEAR}", "utf8");
  writeReviewResponseDraft(draftPath);

  try {
    const result = spawnSync(process.execPath, [
      cliPath,
      "generate",
      "review-response",
      "--request",
      requestPath,
      "--review",
      draftPath
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid JSON in review-request file/);
    assert.doesNotMatch(result.stderr, /SECRET_TOKEN_SHOULD_NOT_APPEAR/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generate review-response rejects invalid draft json without leaking contents", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-response-"));
  const draftPath = join(directory, "draft.json");
  writeFileSync(draftPath, "{\"token\": SECRET_TOKEN_SHOULD_NOT_APPEAR}", "utf8");

  try {
    const result = spawnSync(process.execPath, [
      cliPath,
      "generate",
      "review-response",
      "--request",
      "examples/review-request/relay.json",
      "--review",
      draftPath
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Invalid JSON in review-response draft file/);
    assert.doesNotMatch(result.stderr, /SECRET_TOKEN_SHOULD_NOT_APPEAR/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generate review-response rejects reserved and unknown draft fields", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-response-"));
  const reservedDraft = join(directory, "reserved.json");
  const unknownDraft = join(directory, "unknown.json");
  writeReviewResponseDraft(reservedDraft, { response_to: { repository: "SECRET_REPO_SHOULD_NOT_APPEAR" } });
  writeReviewResponseDraft(unknownDraft, { verificaton: [] });

  try {
    const reservedResult = spawnSync(process.execPath, [
      cliPath,
      "generate",
      "review-response",
      "--request",
      "examples/review-request/relay.json",
      "--review",
      reservedDraft
    ], {
      encoding: "utf8"
    });
    assert.equal(reservedResult.status, 1);
    assert.match(reservedResult.stderr, /reserved Open Relay fields/);
    assert.doesNotMatch(reservedResult.stderr, /SECRET_REPO_SHOULD_NOT_APPEAR/);

    const unknownResult = spawnSync(process.execPath, [
      cliPath,
      "generate",
      "review-response",
      "--request",
      "examples/review-request/relay.json",
      "--review",
      unknownDraft
    ], {
      encoding: "utf8"
    });
    assert.equal(unknownResult.status, 1);
    assert.match(unknownResult.stderr, /unknown fields/);
    assert.doesNotMatch(unknownResult.stderr, /verificaton/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generate review-response rejects semantic validation failures", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-response-"));
  const draftPath = join(directory, "draft.json");
  writeReviewResponseDraft(draftPath, { outcome: "changes_requested" });

  try {
    const result = spawnSync(process.execPath, [
      cliPath,
      "generate",
      "review-response",
      "--request",
      "examples/review-request/relay.json",
      "--review",
      draftPath
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Generated review-response packet failed validation/);
    assert.match(result.stderr, /changes_requested outcome requires at least one blocking finding/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("respond github-pr dry-run prints exact review-response comment body without gh", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-response-"));
  const draftPath = join(directory, "draft.json");
  writeReviewResponseDraft(draftPath);

  try {
    const result = spawnSync(process.execPath, [
      cliPath,
      "respond",
      "github-pr",
      "--request",
      "examples/review-request/relay.json",
      "--review",
      draftPath,
      "--pr",
      "AcrossWorksAPI/open-relay#38",
      "--dry-run"
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Dry run target: AcrossWorksAPI\/open-relay#38/);
    assert.match(result.stdout, /<!-- open-relay-packet/);
    assert.match(result.stdout, /packet_type: review-response/);
    assert.match(result.stdout, /payload_base64:/);
    assert.match(result.stdout, /# Review Response Relay Packet/);
    assert.equal(result.stderr, "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("respond github-pr rejects unsupported flags and malformed targets", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-response-"));
  const draftPath = join(directory, "draft.json");
  writeReviewResponseDraft(draftPath);

  try {
    const missingPr = spawnSync(process.execPath, [
      cliPath,
      "respond",
      "github-pr",
      "--request",
      "examples/review-request/relay.json",
      "--review",
      draftPath
    ], {
      encoding: "utf8"
    });
    assert.equal(missingPr.status, 2);
    assert.match(missingPr.stderr, /Missing required flags: --pr/);

    const outputFlag = spawnSync(process.execPath, [
      cliPath,
      "respond",
      "github-pr",
      "--request",
      "examples/review-request/relay.json",
      "--review",
      draftPath,
      "--pr",
      "AcrossWorksAPI/open-relay#38",
      "--output",
      "response.json"
    ], {
      encoding: "utf8"
    });
    assert.equal(outputFlag.status, 2);
    assert.match(outputFlag.stderr, /Unknown flag: --output/);

    const formatFlag = spawnSync(process.execPath, [
      cliPath,
      "respond",
      "github-pr",
      "--request",
      "examples/review-request/relay.json",
      "--review",
      draftPath,
      "--pr",
      "AcrossWorksAPI/open-relay#38",
      "--format",
      "markdown"
    ], {
      encoding: "utf8"
    });
    assert.equal(formatFlag.status, 2);
    assert.match(formatFlag.stderr, /Unknown flag: --format/);

    const badTarget = spawnSync(process.execPath, [
      cliPath,
      "respond",
      "github-pr",
      "--request",
      "examples/review-request/relay.json",
      "--review",
      draftPath,
      "--pr",
      "https://example.com/acme/repo/pull/SECRET_REF_SHOULD_NOT_APPEAR",
      "--dry-run"
    ], {
      encoding: "utf8"
    });
    assert.equal(badTarget.status, 2);
    assert.match(badTarget.stderr, /Invalid GitHub pull request target/);
    assert.doesNotMatch(badTarget.stderr, /SECRET_REF_SHOULD_NOT_APPEAR/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects generate review-request with missing flags", () => {
  const result = spawnSync(process.execPath, [cliPath, "generate", "review-request"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing required flags/);
  assert.doesNotMatch(result.stderr, /\{.*packet_version/s);
});

test("rejects generate review-request with unknown flags", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "generate",
    "review-request",
    "--base", "origin/main",
    "--head", "HEAD",
    "--goal", "Generate packet",
    "--summary", "Creates a packet from git state.",
    "--behavioral-intent", "Reduce manual handoff assembly.",
    "--behavioural-intent", "Typo"
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown flag: --behavioural-intent/);
  assert.doesNotMatch(result.stdout, /\{.*packet_version/s);
});

test("rejects generate review-request with duplicate singleton flags", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "generate",
    "review-request",
    "--base", "origin/main",
    "--head", "HEAD",
    "--goal", "First goal",
    "--goal", "Second goal",
    "--summary", "Creates a packet from git state.",
    "--behavioral-intent", "Reduce manual handoff assembly."
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Duplicate flag: --goal/);
  assert.doesNotMatch(result.stdout, /\{.*packet_version/s);
});

test("rejects invalid git refs without echoing ref values", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const sensitiveRef = "SECRET_REF_SHOULD_NOT_APPEAR";

  try {
    runGit(directory, "init", "--initial-branch", "main");
    runGit(directory, "config", "user.email", "test@example.com");
    runGit(directory, "config", "user.name", "Open Relay Test");
    writeFileSync(join(directory, "README.md"), "# Repo\n", "utf8");
    runGit(directory, "add", "README.md");
    runGit(directory, "commit", "-m", "initial");
    const head = runGit(directory, "rev-parse", "HEAD").trim();

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      "--base", sensitiveRef,
      "--head", head,
      "--goal", "Generate packet",
      "--summary", "Creates a packet from git state.",
      "--behavioral-intent", "Reduce manual handoff assembly."
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Could not generate review-request packet/);
    assert.doesNotMatch(result.stderr, /SECRET_REF_SHOULD_NOT_APPEAR/);
    assert.doesNotMatch(result.stdout, /\{.*packet_version/s);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects unwritable output paths without echoing path values", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR", "relay.json");

  try {
    runGit(directory, "init", "--initial-branch", "main");
    runGit(directory, "config", "user.email", "test@example.com");
    runGit(directory, "config", "user.name", "Open Relay Test");
    writeFileSync(join(directory, "README.md"), "# Repo\n", "utf8");
    runGit(directory, "add", "README.md");
    runGit(directory, "commit", "-m", "initial");
    const base = runGit(directory, "rev-parse", "HEAD").trim();
    writeFileSync(join(directory, "README.md"), "# Repo\n\nChanged.\n", "utf8");
    runGit(directory, "add", "README.md");
    runGit(directory, "commit", "-m", "change readme");
    const head = runGit(directory, "rev-parse", "HEAD").trim();

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Generate packet",
      "--summary", "Creates a packet from git state.",
      "--behavioral-intent", "Reduce manual handoff assembly.",
      "--output", outputPath
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Could not write review-request packet/);
    assert.doesNotMatch(result.stderr, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.doesNotMatch(result.stdout, /\{.*packet_version/s);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generates a schema-valid review-request packet to a file", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR.json");

  try {
    runGit(directory, "init", "--initial-branch", "main");
    runGit(directory, "config", "user.email", "test@example.com");
    runGit(directory, "config", "user.name", "Open Relay Test");
    runGit(directory, "remote", "add", "origin", "https://github.com/AcrossWorksAPI/open-relay.git");
    writeFileSync(join(directory, "README.md"), "# Repo\n", "utf8");
    runGit(directory, "add", "README.md");
    runGit(directory, "commit", "-m", "initial");
    const base = runGit(directory, "rev-parse", "HEAD").trim();
    writeFileSync(join(directory, "README.md"), "# Repo\n\nChanged.\n", "utf8");
    runGit(directory, "add", "README.md");
    runGit(directory, "commit", "-m", "change readme");
    const head = runGit(directory, "rev-parse", "HEAD").trim();

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Generate packet",
      "--summary", "Creates a packet from git state.",
      "--behavioral-intent", "Reduce manual handoff assembly.",
      "--output", outputPath
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Wrote review-request packet/);
    assert.doesNotMatch(result.stdout, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.equal(result.stderr, "");

    const validateResult = spawnSync(process.execPath, [
      absoluteCliPath,
      "validate",
      outputPath
    ], {
      encoding: "utf8"
    });

    assert.equal(validateResult.status, 0);
    const packet = JSON.parse(readFileSync(outputPath, "utf8"));
    assert.equal(packet.verification.length, 0);
    assert.match(packet.changed_files[0]?.evidence ?? "", /^Diff stats: \+\d+ -\d+\.$/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generates explicit json format to stdout", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Generate JSON packet",
      "--summary", "Creates JSON from git state.",
      "--behavioral-intent", "Keep current generator behavior explicit.",
      "--format", "json"
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    const packet = JSON.parse(result.stdout);
    assert.equal(packet.packet_type, "review-request");
    assert.equal(result.stderr, "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generates review-request markdown to stdout", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Generate Markdown packet",
      "--summary", "Creates rendered Markdown from git state.",
      "--behavioral-intent", "Reduce the two-step review handoff.",
      "--format", "markdown"
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /^# Review Request Relay Packet/);
    assert.match(result.stdout, /## Next Action/);
    assert.match(result.stdout, /Diff stats: \+\d+ -\d+\./);
    assert.doesNotMatch(result.stdout, /^\{/);
    assert.equal(result.stderr, "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("generates review-request markdown to a file", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR.md");

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Generate Markdown packet",
      "--summary", "Creates rendered Markdown from git state.",
      "--behavioral-intent", "Reduce the two-step review handoff.",
      "--format", "markdown",
      "--output", outputPath
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Wrote review-request Markdown/);
    assert.doesNotMatch(result.stdout, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.equal(result.stderr, "");
    assert.match(readFileSync(outputPath, "utf8"), /^# Review Request Relay Packet/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("handoff review-request writes markdown to stdout", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "handoff",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Create handoff packet",
      "--summary", "Creates a Markdown handoff from git state.",
      "--behavioral-intent", "Make the review handoff command obvious."
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /^# Review Request Relay Packet/);
    assert.match(result.stdout, /## Next Action/);
    assert.doesNotMatch(result.stdout, /^\{/);
    assert.equal(result.stderr, "");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("handoff review-request writes markdown to a file", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR.md");

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "handoff",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Create handoff packet",
      "--summary", "Creates a Markdown handoff from git state.",
      "--behavioral-intent", "Make the review handoff command obvious.",
      "--output", outputPath
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Wrote review-request Markdown/);
    assert.doesNotMatch(result.stdout, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.equal(result.stderr, "");
    assert.match(readFileSync(outputPath, "utf8"), /^# Review Request Relay Packet/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("handoff review-request rejects explicit format", () => {
  for (const formatFlag of [["--format", "json"], ["--format=markdown"]]) {
    const result = spawnSync(process.execPath, [
      cliPath,
      "handoff",
      "review-request",
      "--base", "origin/main",
      "--head", "HEAD",
      "--goal", "Create handoff packet",
      "--summary", "Creates a Markdown handoff from git state.",
      "--behavioral-intent", "Make the review handoff command obvious.",
      ...formatFlag
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 2);
    assert.match(result.stderr, /--format is not supported for handoff review-request/);
    assert.doesNotMatch(result.stdout, /^# Review Request Relay Packet/m);
  }
});

test("handoff review-request rejects unwritable output paths without echoing path values", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR", "relay.md");

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "handoff",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Create handoff packet",
      "--summary", "Creates a Markdown handoff from git state.",
      "--behavioral-intent", "Make the review handoff command obvious.",
      "--output", outputPath
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Could not write review-request Markdown/);
    assert.doesNotMatch(result.stderr, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.doesNotMatch(result.stdout, /^# Review Request Relay Packet/m);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("handoff review-request matches direct markdown generation", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);

  try {
    const { base, head } = createChangedGitRepo(directory);
    const commonArgs = [
      "--base", base,
      "--head", head,
      "--goal", "Create handoff packet",
      "--summary", "Creates a Markdown handoff from git state.",
      "--behavioral-intent", "Make the review handoff command obvious."
    ];

    const handoff = spawnSync(process.execPath, [
      absoluteCliPath,
      "handoff",
      "review-request",
      ...commonArgs
    ], {
      cwd: directory,
      encoding: "utf8"
    });
    const generated = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      ...commonArgs,
      "--format", "markdown"
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(handoff.status, 0);
    assert.equal(generated.status, 0);
    assert.equal(stripCreatedAt(handoff.stdout), stripCreatedAt(generated.stdout));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("saves review-request bundle to repo-local storage", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "save",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Save handoff packet",
      "--summary", "Saves JSON and Markdown to repo-local storage.",
      "--behavioral-intent", "Make packets durable without external services."
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Saved review-request packet: /);
    assert.doesNotMatch(result.stdout, /open-relay-cli-git/);
    assert.equal(result.stderr, "");

    const storageId = result.stdout.trim().replace("Saved review-request packet: ", "");
    const bundleDir = join(directory, ".open-relay", "review-requests", storageId);
    assert.match(readFileSync(join(bundleDir, "relay.md"), "utf8"), /^# Review Request Relay Packet/);
    assert.equal(JSON.parse(readFileSync(join(bundleDir, "relay.json"), "utf8")).packet_type, "review-request");
    assert.equal(JSON.parse(readFileSync(join(bundleDir, "manifest.json"), "utf8")).storage_id, storageId);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("save review-request rejects format and output flags", () => {
  for (const args of [
    ["--format", "markdown"],
    ["--format=json"],
    ["--output", "relay.json"]
  ]) {
    const result = spawnSync(process.execPath, [
      cliPath,
      "save",
      "review-request",
      "--base", "origin/main",
      "--head", "HEAD",
      "--goal", "Save packet",
      "--summary", "Saves a packet.",
      "--behavioral-intent", "Make packets durable.",
      ...args
    ], {
      encoding: "utf8"
    });

    assert.equal(result.status, 2);
    assert.doesNotMatch(result.stdout, /Saved review-request packet/);
  }
});

test("save review-request rejects unwritable storage without echoing path values", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const storageDir = join(directory, "SECRET_STORAGE_SHOULD_NOT_APPEAR", "review-requests");

  try {
    const { base, head } = createChangedGitRepo(directory);
    writeFileSync(join(directory, "SECRET_STORAGE_SHOULD_NOT_APPEAR"), "not a directory", "utf8");

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "save",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Save packet",
      "--summary", "Saves a packet.",
      "--behavioral-intent", "Make packets durable.",
      "--storage-dir", storageDir
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Could not save review-request packet/);
    assert.doesNotMatch(result.stderr, /SECRET_STORAGE_SHOULD_NOT_APPEAR/);
    assert.doesNotMatch(result.stdout, /SECRET_STORAGE_SHOULD_NOT_APPEAR/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects generate review-request with invalid format", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "generate",
    "review-request",
    "--base", "origin/main",
    "--head", "HEAD",
    "--goal", "Generate packet",
    "--summary", "Creates a packet from git state.",
    "--behavioral-intent", "Reduce manual handoff assembly.",
    "--format", "html"
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Invalid format: html/);
  assert.doesNotMatch(result.stdout, /^# Review Request Relay Packet/m);
});

test("rejects unwritable markdown output paths without echoing path values", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-cli-git-"));
  const absoluteCliPath = join(process.cwd(), cliPath);
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR", "relay.md");

  try {
    const { base, head } = createChangedGitRepo(directory);

    const result = spawnSync(process.execPath, [
      absoluteCliPath,
      "generate",
      "review-request",
      "--base", base,
      "--head", head,
      "--goal", "Generate Markdown packet",
      "--summary", "Creates rendered Markdown from git state.",
      "--behavioral-intent", "Reduce the two-step review handoff.",
      "--format", "markdown",
      "--output", outputPath
    ], {
      cwd: directory,
      encoding: "utf8"
    });

    assert.equal(result.status, 1);
    assert.match(result.stderr, /Could not write review-request Markdown/);
    assert.doesNotMatch(result.stderr, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.doesNotMatch(result.stdout, /^# Review Request Relay Packet/m);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("renders a review-request packet to stdout", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "render", "review-request", "examples/review-request/relay.json"],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^# Review Request Relay Packet/);
  assert.match(result.stdout, /## Next Action/);
  assert.equal(result.stderr, "");
});

test("renders a review-response packet through generic render", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "render", "examples/review-response/relay.json"],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^# Review Response Relay Packet/);
  assert.match(result.stdout, /## Outcome And Confidence/);
  assert.equal(result.stderr, "");
});

test("renders a review-request packet through generic render", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "render", "examples/review-request/relay.json"],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^# Review Request Relay Packet/);
  assert.match(result.stdout, /## Next Action/);
  assert.equal(result.stderr, "");
});

test("renders a review-request packet to a file", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-render-"));
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR.md");

  try {
    const result = spawnSync(
      process.execPath,
      [cliPath, "render", "review-request", "examples/review-request/relay.json", "--output", outputPath],
      { encoding: "utf8" }
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Wrote review-request Markdown/);
    assert.doesNotMatch(result.stdout, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.equal(result.stderr, "");
    assert.match(readFileSync(outputPath, "utf8"), /^# Review Request Relay Packet/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("renders a review-response packet to a file through generic render", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-render-"));
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR.md");

  try {
    const result = spawnSync(
      process.execPath,
      [cliPath, "render", "examples/review-response/relay.json", "--output", outputPath],
      { encoding: "utf8" }
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Wrote packet Markdown/);
    assert.doesNotMatch(result.stdout, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.equal(result.stderr, "");
    assert.match(readFileSync(outputPath, "utf8"), /^# Review Response Relay Packet/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects render review-request with missing path", () => {
  const result = spawnSync(process.execPath, [cliPath, "render", "review-request"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing packet path/);
  assert.doesNotMatch(result.stdout, /^# Review Request Relay Packet/m);
});

test("rejects generic render with missing path", () => {
  const result = spawnSync(process.execPath, [cliPath, "render"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing packet path/);
});

test("does not add a render review-response subcommand", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "render", "review-response", "examples/review-response/relay.json"],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unexpected argument: examples\/review-response\/relay\.json/);
  assert.doesNotMatch(result.stdout, /^# Review Response Relay Packet/m);
});

test("rejects render review-request with unknown flags", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "render", "review-request", "examples/review-request/relay.json", "--template", "claude"],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unknown flag: --template/);
  assert.doesNotMatch(result.stdout, /^# Review Request Relay Packet/m);
});

test("rejects render review-request with duplicate output flags", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "render",
      "review-request",
      "examples/review-request/relay.json",
      "--output", "first.md",
      "--output", "second.md"
    ],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Duplicate flag: --output/);
  assert.doesNotMatch(result.stdout, /^# Review Request Relay Packet/m);
});

test("rejects generic render with duplicate output flags", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "render",
      "examples/review-response/relay.json",
      "--output", "first.md",
      "--output", "second.md"
    ],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Duplicate flag: --output/);
  assert.doesNotMatch(result.stdout, /^# Review Response Relay Packet/m);
});

test("rejects render review-request with extra positional arguments", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "render", "review-request", "examples/review-request/relay.json", "extra"],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Unexpected argument: extra/);
  assert.doesNotMatch(result.stdout, /^# Review Request Relay Packet/m);
});

test("rejects invalid render JSON without printing file contents", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-render-"));
  const packetPath = join(directory, "bad.json");
  writeFileSync(packetPath, "{\"token\": SECRET_TOKEN_SHOULD_NOT_APPEAR}", "utf8");

  const result = spawnSync(process.execPath, [cliPath, "render", "review-request", packetPath], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid JSON/);
  assert.doesNotMatch(result.stderr, /SECRET/);
});

test("rejects invalid generic render JSON without printing file contents", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-render-"));
  const packetPath = join(directory, "bad.json");
  writeFileSync(packetPath, "{\"token\": SECRET_TOKEN_SHOULD_NOT_APPEAR}", "utf8");

  const result = spawnSync(process.execPath, [cliPath, "render", packetPath], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid JSON/);
  assert.doesNotMatch(result.stderr, /SECRET/);
});

test("rejects schema-invalid render packets", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-render-"));
  const packetPath = join(directory, "packet.json");
  writeFileSync(packetPath, JSON.stringify({ packet_version: "0.1" }), "utf8");

  const result = spawnSync(process.execPath, [cliPath, "render", "review-request", packetPath], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid review-request packet/);
  assert.match(result.stderr, /must have required property/);
});

test("rejects schema-invalid generic render packets", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-render-"));
  const packetPath = join(directory, "packet.json");
  writeFileSync(packetPath, JSON.stringify({ packet_version: "0.1" }), "utf8");

  const result = spawnSync(process.execPath, [cliPath, "render", packetPath], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid packet/);
  assert.doesNotMatch(result.stderr, /Invalid review-request packet/);
  assert.match(result.stderr, /must have required property/);
});

test("rejects unwritable render output paths without echoing path values", () => {
  const outputPath = join(tmpdir(), "SECRET_OUTPUT_SHOULD_NOT_APPEAR", "relay.md");

  const result = spawnSync(
    process.execPath,
    [cliPath, "render", "review-request", "examples/review-request/relay.json", "--output", outputPath],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Could not write review-request Markdown/);
  assert.doesNotMatch(result.stderr, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
});

test("rejects unwritable generic render output paths without echoing path values", () => {
  const outputPath = join(tmpdir(), "SECRET_OUTPUT_SHOULD_NOT_APPEAR", "relay.md");

  const result = spawnSync(
    process.execPath,
    [cliPath, "render", "examples/review-response/relay.json", "--output", outputPath],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Could not write packet Markdown/);
  assert.doesNotMatch(result.stderr, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
});

test("exports the validator and renderer from the package entrypoint", () => {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "const relay = require('.'); if (typeof relay.validatePacket !== 'function') process.exit(1); if (typeof relay.renderPacketMarkdown !== 'function') process.exit(1); if (typeof relay.renderReviewRequestMarkdown !== 'function') process.exit(1); if (typeof relay.renderReviewResponseMarkdown !== 'function') process.exit(1);"
    ],
    {
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
});

function createChangedGitRepo(directory: string): { base: string; head: string } {
  runGit(directory, "init", "--initial-branch", "main");
  runGit(directory, "config", "user.email", "test@example.com");
  runGit(directory, "config", "user.name", "Open Relay Test");
  writeFileSync(join(directory, "README.md"), "# Repo\n", "utf8");
  runGit(directory, "add", "README.md");
  runGit(directory, "commit", "-m", "initial");
  const base = runGit(directory, "rev-parse", "HEAD").trim();
  writeFileSync(join(directory, "README.md"), "# Repo\n\nChanged.\n", "utf8");
  runGit(directory, "add", "README.md");
  runGit(directory, "commit", "-m", "change readme");
  const head = runGit(directory, "rev-parse", "HEAD").trim();
  return { base, head };
}

function stripCreatedAt(markdown: string): string {
  return markdown.replace(/- Created at: `[^`]+`/, "- Created at: `<timestamp>`");
}

function writeFakeGh(binDir: string, output: string): void {
  mkdirSync(binDir, { recursive: true });
  const ghPath = join(binDir, "gh");
  writeFileSync(ghPath, `#!/bin/sh\ncat <<'JSON'\n${output}\nJSON\n`, "utf8");
  chmodSync(ghPath, 0o755);
}

function writeReviewResponseDraft(path: string, overrides: Record<string, unknown> = {}): void {
  writeFileSync(path, JSON.stringify({
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
    next_action: "Merge after CI passes.",
    ...overrides
  }, null, 2), "utf8");
}

function runGit(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1"
    }
  });
}
