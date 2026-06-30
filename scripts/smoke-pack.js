#!/usr/bin/env node

const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} = require("node:fs");
const { tmpdir } = require("node:os");
const { basename, isAbsolute, join } = require("node:path");

const root = process.cwd();
const workspace = mkdtempSync(join(tmpdir(), "open-relay-pack-smoke-"));

try {
  const packDir = join(workspace, "pack");
  const installDir = join(workspace, "install");
  const fixtureDir = join(workspace, "fixtures");
  const gitRepo = join(workspace, "repo");

  mkdirp(packDir);
  execFileSync("npm", ["run", "build"], { cwd: root, stdio: "inherit" });

  const packOutput = execFileSync("npm", ["pack", "--json", "--pack-destination", packDir], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"]
  });
  const [packManifest] = JSON.parse(packOutput);
  assertPackageContents(packManifest);

  const tarballPath = resolveTarballPath(packDir, packManifest.filename);
  assert.ok(existsSync(tarballPath), "npm pack did not create a tarball");

  mkdirp(installDir);
  mkdirp(fixtureDir);
  cpSync(join(root, "examples"), join(fixtureDir, "examples"), { recursive: true });

  execFileSync("npm", ["init", "-y"], { cwd: installDir, stdio: "ignore" });
  execFileSync("npm", ["install", tarballPath], { cwd: installDir, stdio: "inherit" });

  const cli = join(
    installDir,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "open-relay.cmd" : "open-relay"
  );
  assert.ok(existsSync(cli), "installed CLI binary is missing");

  runCli(cli, ["--help"], { contains: "open-relay render <packet.json>" });
  runCli(cli, ["--help"], { contains: "open-relay render review-request" });
  runCli(cli, ["--help"], { contains: "open-relay transport github-pr send" });
  runCli(cli, ["--help"], { contains: "open-relay transport github-pr fetch" });
  runCli(cli, ["--help"], { contains: "open-relay experimental watcher-proof" });
  const watcherDryRun = runCli(cli, [
    "experimental",
    "watcher-proof",
    "--relay-session-id", "SMOKE123",
    "--codex-thread-id", "codex-thread",
    "--dry-run"
  ], {
    contains: "OPEN_RELAY_CLAUDE_WATCHER_PROOF_OK"
  });
  const watcherReceipt = JSON.parse(watcherDryRun);
  assert.equal(watcherReceipt.mode, "dry-run");
  assert.equal(watcherReceipt.status, "dry-run");
  runCli(cli, ["validate", join(fixtureDir, "examples", "review-request", "relay.json")], {
    contains: "valid packet"
  });
  runCli(cli, ["render", "review-request", join(fixtureDir, "examples", "review-request", "relay.json")], {
    contains: "# Review Request Relay Packet"
  });
  runCli(cli, ["validate", join(fixtureDir, "examples", "review-response", "relay.json")], {
    contains: "valid packet"
  });
  runCli(cli, ["render", join(fixtureDir, "examples", "review-response", "relay.json")], {
    contains: "# Review Response Relay Packet"
  });
  runCli(cli, ["validate", join(fixtureDir, "examples", "resume-project", "relay.json")], {
    contains: "valid packet"
  });
  runCli(cli, ["render", join(fixtureDir, "examples", "resume-project", "relay.json")], {
    contains: "# Resume Project Relay Packet"
  });
  const claudePromptPath = join(workspace, "claude-prompt.md");
  runCli(cli, [
    "render",
    join(fixtureDir, "examples", "review-request", "relay.json"),
    "--template", "claude",
    "--output", claudePromptPath
  ], {
    contains: "Wrote packet prompt."
  });
  assert.match(readFileSync(claudePromptPath, "utf8"), /^# Claude Review Prompt/);
  assert.match(readFileSync(claudePromptPath, "utf8"), /# Review Request Relay Packet/);

  const codexPromptPath = join(workspace, "codex-prompt.md");
  runCli(cli, [
    "render",
    join(fixtureDir, "examples", "review-response", "relay.json"),
    "--template", "codex",
    "--output", codexPromptPath
  ], {
    contains: "Wrote packet prompt."
  });
  assert.match(readFileSync(codexPromptPath, "utf8"), /^# Codex Follow-Up Prompt/);
  assert.match(readFileSync(codexPromptPath, "utf8"), /# Review Response Relay Packet/);

  const resumePromptPath = join(workspace, "resume-codex-prompt.md");
  runCli(cli, [
    "render",
    join(fixtureDir, "examples", "resume-project", "relay.json"),
    "--template", "codex",
    "--output", resumePromptPath
  ], {
    contains: "Wrote packet prompt."
  });
  assert.match(readFileSync(resumePromptPath, "utf8"), /^# Codex Follow-Up Prompt/);
  assert.match(readFileSync(resumePromptPath, "utf8"), /# Resume Project Relay Packet/);

  createGitFixture(gitRepo);
  const base = runGit(gitRepo, "rev-parse", "HEAD").trim();
  writeFileSync(join(gitRepo, "README.md"), "# Smoke\n\nChanged.\n", "utf8");
  runGit(gitRepo, "add", "README.md");
  runGit(gitRepo, "commit", "-m", "change readme");
  const head = runGit(gitRepo, "rev-parse", "HEAD").trim();
  const generatedPacket = join(workspace, "generated.json");

  runCli(cli, [
    "generate",
    "review-request",
    "--base", base,
    "--head", head,
    "--goal", "Smoke package install",
    "--summary", "Verifies installed CLI can generate a packet.",
    "--behavioral-intent", "Prove package tarball works after install.",
    "--output", generatedPacket
  ], {
    cwd: gitRepo,
    contains: "Wrote review-request packet."
  });

  runCli(cli, ["validate", generatedPacket], { contains: "valid packet" });
  const generatedJson = JSON.parse(readFileSync(generatedPacket, "utf8"));
  assert.match(generatedJson.changed_files[0].evidence, /^Diff stats: \+\d+ -\d+\.$/);
  assert.deepEqual(generatedJson.verification, []);
  runCli(cli, ["render", generatedPacket], { contains: "## Next Action" });
  runCli(cli, ["render", "review-request", generatedPacket], { contains: "## Next Action" });
  const transportDryRun = runCli(cli, [
    "transport",
    "github-pr",
    "send",
    generatedPacket,
    "--pr",
    "AcrossWorksAPI/open-relay#34",
    "--dry-run"
  ], {
    contains: "<!-- open-relay-packet"
  });
  assert.match(transportDryRun, /payload_base64:/);
  assert.match(transportDryRun, /# Review Request Relay Packet/);

  const rulesPath = join(workspace, "redaction-rules.json");
  writeFileSync(rulesPath, JSON.stringify({
    version: 1,
    rules: [{
      name: "customer",
      match: "PrivateCustomerName",
      replacement: "[private-customer]",
      reason: "Private customer name."
    }]
  }, null, 2), "utf8");

  const redactedPacket = join(workspace, "generated-redacted.json");
  runCli(cli, [
    "generate",
    "review-request",
    "--base", base,
    "--head", head,
    "--goal", "Smoke PrivateCustomerName package install",
    "--summary", "PrivateCustomerName verifies installed CLI private redaction.",
    "--behavioral-intent", "PrivateCustomerName proves package tarball redacts private terms.",
    "--redaction-rules", rulesPath,
    "--output", redactedPacket
  ], {
    cwd: gitRepo,
    contains: "Wrote review-request packet."
  });

  const redactedJson = readFileSync(redactedPacket, "utf8");
  assert.doesNotMatch(redactedJson, /PrivateCustomerName/i);
  assert.match(redactedJson, /\[private-customer\]/);

  const responseDraft = join(workspace, "review-response-draft.json");
  writeFileSync(responseDraft, JSON.stringify({
    reviewer: {
      name: "Open Relay Smoke",
      kind: "agent",
      tool: "smoke-pack"
    },
    outcome: "approved",
    confidence: "high",
    summary: "Package smoke found no blocking issues.",
    findings: [],
    reviewed_scope: {
      files: [{
        path: "README.md",
        notes: "Reviewed the generated package smoke fixture."
      }],
      limitations: []
    },
    verification: [{
      kind: "command",
      command: "npm run smoke:pack",
      result: "passed",
      evidence: "Installed CLI generated and rendered a review-response packet."
    }],
    redactions: [],
    next_action: "Merge after CI passes."
  }, null, 2), "utf8");

  const responseMarkdown = join(workspace, "review-response.md");
  runCli(cli, [
    "generate",
    "review-response",
    "--request", generatedPacket,
    "--review", responseDraft,
    "--format", "markdown",
    "--output", responseMarkdown
  ], {
    contains: "Wrote review-response Markdown."
  });

  const response = readFileSync(responseMarkdown, "utf8");
  assert.match(response, /^# Review Response Relay Packet/);
  assert.match(response, /## Outcome/);
  assert.match(response, /## Next Action/);

  const responseDryRun = runCli(cli, [
    "respond",
    "github-pr",
    "--request", generatedPacket,
    "--review", responseDraft,
    "--pr", "AcrossWorksAPI/open-relay#34",
    "--dry-run"
  ], {
    contains: "<!-- open-relay-packet"
  });
  assert.match(responseDryRun, /packet_type: review-response/);
  assert.match(responseDryRun, /payload_base64:/);
  assert.match(responseDryRun, /# Review Response Relay Packet/);

  const responsePacket = join(workspace, "review-response.json");
  const resumePacket = join(workspace, "resume-project.json");
  const resumeMarkdown = join(workspace, "resume-project.md");
  runCli(cli, [
    "generate",
    "review-response",
    "--request", generatedPacket,
    "--review", responseDraft,
    "--output", responsePacket
  ], {
    contains: "Wrote review-response packet."
  });
  runCli(cli, [
    "generate",
    "resume-project",
    "--response", responsePacket,
    "--output", resumePacket
  ], {
    contains: "Wrote resume-project packet."
  });
  const resumeJson = JSON.parse(readFileSync(resumePacket, "utf8"));
  assert.equal(resumeJson.packet_type, "resume-project");
  assert.equal(resumeJson.resume_status, "owner_decision");
  assert.equal(resumeJson.tasks.length, 0);
  runCli(cli, [
    "generate",
    "resume-project",
    "--response", responsePacket,
    "--format", "markdown",
    "--output", resumeMarkdown
  ], {
    contains: "Wrote resume-project Markdown."
  });
  assert.match(readFileSync(resumeMarkdown, "utf8"), /^# Resume Project Relay Packet/);
  assert.match(readFileSync(resumeMarkdown, "utf8"), /## Safety Gates/);

  const generatedMarkdown = join(workspace, "generated.md");
  runCli(cli, [
    "generate",
    "review-request",
    "--base", base,
    "--head", head,
    "--goal", "Smoke package install",
    "--summary", "Verifies installed CLI can generate Markdown directly.",
    "--behavioral-intent", "Prove package tarball supports direct Markdown generation.",
    "--format", "markdown",
    "--output", generatedMarkdown
  ], {
    cwd: gitRepo,
    contains: "Wrote review-request Markdown."
  });

  const markdown = readFileSync(generatedMarkdown, "utf8");
  assert.match(markdown, /^# Review Request Relay Packet/);
  assert.match(markdown, /Diff stats: \+\d+ -\d+\./);
  assert.match(markdown, /## Next Action/);

  const handoffMarkdown = join(workspace, "handoff.md");
  runCli(cli, [
    "handoff",
    "review-request",
    "--base", base,
    "--head", head,
    "--goal", "Smoke package handoff",
    "--summary", "Verifies installed CLI can create a Markdown handoff.",
    "--behavioral-intent", "Prove package tarball supports the handoff workflow.",
    "--output", handoffMarkdown
  ], {
    cwd: gitRepo,
    contains: "Wrote review-request Markdown."
  });

  const handoff = readFileSync(handoffMarkdown, "utf8");
  assert.match(handoff, /^# Review Request Relay Packet/);
  assert.match(handoff, /Diff stats: \+\d+ -\d+\./);
  assert.match(handoff, /## Next Action/);

  runCli(cli, [
    "save",
    "review-request",
    "--base", base,
    "--head", head,
    "--goal", "Smoke package save",
    "--summary", "Verifies installed CLI can save a packet bundle.",
    "--behavioral-intent", "Prove package tarball supports repo-local storage."
  ], {
    cwd: gitRepo,
    contains: "Saved review-request packet:"
  });

  const savedRoot = join(gitRepo, ".open-relay", "review-requests");
  const [savedId] = readdirSync(savedRoot);
  const savedDir = join(savedRoot, savedId);
  assert.match(readFileSync(join(savedDir, "relay.md"), "utf8"), /^# Review Request Relay Packet/);
  assert.match(readFileSync(join(savedDir, "relay.md"), "utf8"), /Diff stats: \+\d+ -\d+\./);
  const savedJson = JSON.parse(readFileSync(join(savedDir, "relay.json"), "utf8"));
  assert.equal(savedJson.packet_type, "review-request");
  assert.match(savedJson.changed_files[0].evidence, /^Diff stats: \+\d+ -\d+\.$/);
  assert.equal(JSON.parse(readFileSync(join(savedDir, "manifest.json"), "utf8")).storage_id, savedId);

  const badJson = join(workspace, "bad.json");
  writeFileSync(badJson, "{\"token\": SECRET_TOKEN_SHOULD_NOT_APPEAR}", "utf8");
  const badResult = spawnSync(cli, ["render", badJson], { encoding: "utf8" });
  assert.equal(badResult.status, 1);
  assert.match(badResult.stderr, /Invalid JSON/);
  assert.doesNotMatch(badResult.stderr, /SECRET_TOKEN_SHOULD_NOT_APPEAR/);

  console.log("Package smoke passed.");
} finally {
  rmSync(workspace, { recursive: true, force: true });
}

function mkdirp(path) {
  mkdirSync(path, { recursive: true });
}

function assertPackageContents(packManifest) {
  const paths = packManifest.files.map((file) => normalizePackPath(file.path));

  assert.ok(paths.includes("dist/src/cli.js"), "tarball is missing dist/src/cli.js");
  assert.ok(paths.includes("dist/src/index.js"), "tarball is missing dist/src/index.js");
  assert.ok(
    paths.includes("dist/schemas/review-request.schema.json"),
    "tarball is missing dist/schemas/review-request.schema.json"
  );
  assert.ok(
    paths.includes("dist/schemas/review-response.schema.json"),
    "tarball is missing dist/schemas/review-response.schema.json"
  );
  assert.ok(
    paths.includes("dist/schemas/resume-project.schema.json"),
    "tarball is missing dist/schemas/resume-project.schema.json"
  );
  assert.ok(paths.includes("schemas/review-request.schema.json"), "tarball is missing public schema");
  assert.ok(paths.includes("schemas/review-response.schema.json"), "tarball is missing public review-response schema");
  assert.ok(paths.includes("schemas/resume-project.schema.json"), "tarball is missing public resume-project schema");
  assert.ok(
    paths.includes("examples/watcher-proof/r7m4q9k2-live-receipt.sanitized.json"),
    "tarball is missing sanitized watcher proof receipt evidence"
  );
  assert.ok(paths.includes("README.md"), "tarball is missing README.md");
  assert.ok(paths.includes("LICENSE"), "tarball is missing LICENSE");

  for (const path of paths) {
    assert.ok(!path.startsWith("dist/tests/"), `tarball includes compiled tests: ${path}`);
    assert.ok(!path.startsWith("tests/"), `tarball includes source tests: ${path}`);
    assert.ok(!path.startsWith("docs/planning/"), `tarball includes planning docs: ${path}`);
    assert.ok(!path.startsWith(".github/"), `tarball includes GitHub config: ${path}`);
    assert.ok(!path.startsWith(".codex/"), `tarball includes Codex config: ${path}`);
  }
}

function normalizePackPath(path) {
  return path.replace(/\\/g, "/").replace(/^package\//, "");
}

function resolveTarballPath(packDir, filename) {
  if (isAbsolute(filename) || filename.includes("/") || filename.includes("\\")) {
    return filename;
  }

  return join(packDir, basename(filename));
}

function runCli(cli, args, options) {
  const result = spawnSync(cli, args, {
    cwd: options.cwd,
    encoding: "utf8"
  });

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, new RegExp(escapeRegExp(options.contains)));
  return result.stdout;
}

function createGitFixture(directory) {
  mkdirp(directory);
  runGit(directory, "init", "--initial-branch", "main");
  runGit(directory, "config", "user.email", "smoke@example.com");
  runGit(directory, "config", "user.name", "Open Relay Smoke");
  writeFileSync(join(directory, "README.md"), "# Smoke\n", "utf8");
  runGit(directory, "add", "README.md");
  runGit(directory, "commit", "-m", "initial");
}

function runGit(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GIT_CONFIG_NOSYSTEM: "1"
    }
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
