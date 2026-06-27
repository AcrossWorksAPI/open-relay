import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { PACKET_RENDERERS, renderPacketMarkdown } from "../src/renderPacket";
import { renderReviewRequestMarkdown } from "../src/renderReviewRequest";
import { renderReviewResponseMarkdown } from "../src/renderReviewResponse";
import type { ReviewRequestPacket } from "../src/reviewRequest";
import type { ReviewResponsePacket } from "../src/reviewResponse";

const packet = JSON.parse(
  readFileSync("examples/review-request/relay.json", "utf8")
) as ReviewRequestPacket;
const reviewResponsePacket = JSON.parse(
  readFileSync("examples/review-response/relay.json", "utf8")
) as ReviewResponsePacket;

test("dispatches review-request markdown rendering", () => {
  assert.equal(renderPacketMarkdown(packet), renderReviewRequestMarkdown(packet));
});

test("dispatches review-response markdown rendering", () => {
  assert.equal(renderPacketMarkdown(reviewResponsePacket), renderReviewResponseMarkdown(reviewResponsePacket));
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
