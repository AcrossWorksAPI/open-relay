import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
  assert.match(result.stdout, /open-relay render review-request/);
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
  assert.match(result.stdout, /valid review-request packet/);
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
  assert.match(result.stderr, /Invalid review-request packet/);
  assert.match(result.stderr, /must have required property/);
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

test("rejects render review-request with missing path", () => {
  const result = spawnSync(process.execPath, [cliPath, "render", "review-request"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing packet path/);
  assert.doesNotMatch(result.stdout, /^# Review Request Relay Packet/m);
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

test("exports the validator and renderer from the package entrypoint", () => {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "const relay = require('.'); if (typeof relay.validatePacket !== 'function') process.exit(1); if (typeof relay.renderReviewRequestMarkdown !== 'function') process.exit(1);"
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
