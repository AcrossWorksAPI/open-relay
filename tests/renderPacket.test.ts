import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { PACKET_RENDERERS, renderPacketMarkdown } from "../src/renderPacket";
import { renderReviewRequestMarkdown } from "../src/renderReviewRequest";
import type { ReviewRequestPacket } from "../src/reviewRequest";

const packet = JSON.parse(
  readFileSync("examples/review-request/relay.json", "utf8")
) as ReviewRequestPacket;

test("dispatches review-request markdown rendering", () => {
  assert.equal(renderPacketMarkdown(packet), renderReviewRequestMarkdown(packet));
});

test("rejects packets without a registered renderer", () => {
  assert.throws(
    () => renderPacketMarkdown({ packet_type: "unknown", packet_version: "0.1" }),
    /No renderer registered for packet_type: unknown/
  );
});

test("renders a test-only packet type through the renderer registry", () => {
  PACKET_RENDERERS["test-packet"] = (testPacket) => `# ${String(testPacket.message)}\n`;

  try {
    assert.equal(
      renderPacketMarkdown({
        packet_type: "test-packet",
        packet_version: "0.1",
        message: "hello"
      }),
      "# hello\n"
    );
  } finally {
    delete PACKET_RENDERERS["test-packet"];
  }
});
