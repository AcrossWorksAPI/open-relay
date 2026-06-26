import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import { validatePacket } from "../src/schema";

test("validates the synthetic review-request example", async () => {
  const raw = await readFile("examples/review-request/relay.json", "utf8");
  const packet = JSON.parse(raw);
  const result = validatePacket(packet);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("rejects a packet with missing required fields", () => {
  const result = validatePacket({
    packet_version: "0.1",
    packet_type: "review-request"
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.join("\n"), /must have required property/);
});

test("rejects mismatched changed file count", async () => {
  const raw = await readFile("examples/review-request/relay.json", "utf8");
  const packet = JSON.parse(raw);
  packet.change_summary.total_files_changed = 999;

  const result = validatePacket(packet);

  assert.equal(result.valid, false);
  assert.match(
    result.errors.join("\n"),
    /total_files_changed must equal changed_files length/
  );
});
