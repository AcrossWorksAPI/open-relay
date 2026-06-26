import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
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
  writeFileSync(packetPath, "{ not json and this content should not echo }", "utf8");

  const result = spawnSync(process.execPath, [cliPath, "validate", packetPath], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid JSON/);
  assert.doesNotMatch(result.stderr, /this content should not echo/);
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
