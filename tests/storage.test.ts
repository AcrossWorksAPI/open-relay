import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  buildStorageId,
  saveReviewRequestBundle
} from "../src/storage";
import type { ReviewRequestPacket } from "../src/reviewRequest";

test("builds a stable review-request storage id", () => {
  assert.equal(
    buildStorageId("2026-06-26T10:51:15.123Z", "c95f409bfbd65c5f4b605f4afc853cfd2d4aa3f4"),
    "20260626T105115Z-c95f409"
  );
});

function packetFixture(): ReviewRequestPacket {
  return {
    packet_version: "0.1",
    packet_type: "review-request",
    created_at: "2026-06-26T10:51:15.123Z",
    goal: "Review storage",
    requested_review: {
      audience: "reviewer",
      focus: [],
      requested_output: "Findings first."
    },
    repository: {
      name: "AcrossWorksAPI/open-relay",
      remote_url: "https://github.com/AcrossWorksAPI/open-relay.git",
      base_branch: "origin/main",
      working_branch: "HEAD",
      base_commit: "1111111111111111111111111111111111111111",
      head_commit: "c95f409bfbd65c5f4b605f4afc853cfd2d4aa3f4",
      diff_range: "1111111111111111111111111111111111111111..c95f409bfbd65c5f4b605f4afc853cfd2d4aa3f4",
      reviewer_access: "Reviewer needs read access to the repository and diff range."
    },
    change_summary: {
      summary: "Adds repo-local packet storage.",
      behavioral_intent: "Make packets durable.",
      excluded_scope: [],
      total_files_changed: 1
    },
    changed_files: [
      {
        path: "README.md",
        status: "modified",
        role: "source",
        review_priority: "medium"
      }
    ],
    verification: [],
    risks: [],
    provenance: [],
    redactions: [],
    sensitive_data: {
      excluded: true,
      notes: "No secrets included."
    },
    next_action: "Review the stored packet."
  };
}

test("saves review-request json markdown and manifest", async () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-storage-"));

  try {
    const result = await saveReviewRequestBundle({
      storageRoot: directory,
      packet: packetFixture()
    });
    const bundleDir = join(directory, result.storageId);

    const json = JSON.parse(readFileSync(join(bundleDir, "relay.json"), "utf8"));
    const markdown = readFileSync(join(bundleDir, "relay.md"), "utf8");
    const manifest = JSON.parse(readFileSync(join(bundleDir, "manifest.json"), "utf8"));

    assert.equal(json.packet_type, "review-request");
    assert.match(markdown, /^# Review Request Relay Packet/);
    assert.equal(manifest.storage_version, "0.1");
    assert.equal(manifest.storage_id, result.storageId);
    assert.deepEqual(manifest.files, {
      json: "relay.json",
      markdown: "relay.md"
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("uses a counter instead of overwriting an existing bundle", async () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-storage-"));

  try {
    const first = await saveReviewRequestBundle({
      storageRoot: directory,
      packet: packetFixture()
    });
    const second = await saveReviewRequestBundle({
      storageRoot: directory,
      packet: packetFixture()
    });

    assert.equal(first.storageId, "20260626T105115Z-c95f409");
    assert.equal(second.storageId, "20260626T105115Z-c95f409-2");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("removes a newly created bundle directory when writing fails", async () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-storage-"));
  const packet = packetFixture() as ReviewRequestPacket & { circular?: unknown };
  packet.circular = packet;

  try {
    await assert.rejects(saveReviewRequestBundle({
      storageRoot: directory,
      packet
    }));

    assert.equal(existsSync(join(directory, "20260626T105115Z-c95f409")), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
