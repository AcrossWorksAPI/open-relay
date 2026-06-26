#!/usr/bin/env node

const assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("node:child_process");
const {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
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

  runCli(cli, ["--help"], { contains: "open-relay render review-request" });
  runCli(cli, ["validate", join(fixtureDir, "examples", "review-request", "relay.json")], {
    contains: "valid review-request packet"
  });
  runCli(cli, ["render", "review-request", join(fixtureDir, "examples", "review-request", "relay.json")], {
    contains: "# Review Request Relay Packet"
  });

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

  runCli(cli, ["validate", generatedPacket], { contains: "valid review-request packet" });
  runCli(cli, ["render", "review-request", generatedPacket], { contains: "## Next Action" });

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
  assert.match(handoff, /## Next Action/);

  const badJson = join(workspace, "bad.json");
  writeFileSync(badJson, "{\"token\": SECRET_TOKEN_SHOULD_NOT_APPEAR}", "utf8");
  const badResult = spawnSync(cli, ["render", "review-request", badJson], { encoding: "utf8" });
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
  assert.ok(paths.includes("schemas/review-request.schema.json"), "tarball is missing public schema");
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
