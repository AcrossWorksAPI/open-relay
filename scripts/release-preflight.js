#!/usr/bin/env node

const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");

const expectedVersion = process.argv[2];

try {
  run(expectedVersion);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Release preflight failed: ${message}`);
  process.exit(1);
}

function run(version) {
  assert.match(version ?? "", /^[0-9]+\.[0-9]+\.[0-9]+$/, "expected version must be X.Y.Z");

  const packageJson = readJson("package.json");
  assert.equal(packageJson.name, "@acrossworks/open-relay", "package name changed unexpectedly");
  assert.equal(packageJson.version, version, "package version must match release tag");

  const publishContext = process.env.OPEN_RELAY_PUBLISH_CONTEXT === "1";
  if (publishContext) {
    assert.notEqual(packageJson.private, true, "package must not be private inside release publish context");
  } else {
    assert.equal(packageJson.private, true, "committed package metadata must remain private outside release publish context");
  }

  assert.equal(packageJson.publishConfig?.access, "public", "publishConfig.access must be public");
  assert.equal(packageJson.bin?.["open-relay"], "./dist/src/cli.js", "CLI bin entry must stay stable");
  assert.ok(Array.isArray(packageJson.files), "package files allowlist is required");

  const packageLock = readJson("package-lock.json");
  assert.equal(packageLock.version, version, "package-lock root version must match release tag");
  assert.equal(packageLock.packages?.[""]?.version, version, "package-lock package version must match release tag");

  const changelog = readFileSync("CHANGELOG.md", "utf8");
  const changelogHeading = new RegExp(`^## ${escapeRegExp(version)} - [0-9]{4}-[0-9]{2}-[0-9]{2}$`, "m");
  assert.match(changelog, changelogHeading, "CHANGELOG.md must contain the release heading");

  execFileSync("npm", ["run", "build"], { stdio: "inherit" });
  const packOutput = execFileSync("npm", ["pack", "--dry-run", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"]
  });
  const [manifest] = JSON.parse(packOutput);
  assert.ok(manifest, "npm pack --dry-run did not return a manifest");

  const files = new Set(manifest.files.map((entry) => entry.path));
  for (const required of [
    "dist/src/cli.js",
    "dist/src/index.js",
    "dist/schemas/review-request.schema.json",
    "dist/schemas/review-response.schema.json",
    "schemas/review-request.schema.json",
    "schemas/review-response.schema.json",
    "examples/review-request/relay.json",
    "examples/review-response/relay.json",
    "README.md",
    "LICENSE",
    "SECURITY.md",
    "CONTRIBUTING.md",
    "CODE_OF_CONDUCT.md",
    "package.json"
  ]) {
    assert.ok(files.has(required), `package is missing ${required}`);
  }

  for (const file of files) {
    assert.equal(file.startsWith("dist/tests/"), false, `package includes compiled test file ${file}`);
    assert.equal(file.startsWith("tests/"), false, `package includes source test file ${file}`);
    assert.equal(file.startsWith("docs/planning/"), false, `package includes planning doc ${file}`);
    assert.equal(file.startsWith("docs/superpowers/"), false, `package includes superpowers doc ${file}`);
    assert.equal(file.startsWith(".github/"), false, `package includes GitHub config ${file}`);
    assert.equal(file.startsWith(".codex/"), false, `package includes Codex config ${file}`);
    assert.equal(file.startsWith(".open-relay/"), false, `package includes local Open Relay state ${file}`);
  }

  console.log(`Release preflight passed for ${packageJson.name}@${version}.`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
