import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildOpenRelayPacketCommentBody,
  extractOpenRelayPacketComments,
  findLatestMatchingOpenRelayPacketComment,
  findLatestPacketCommentForUpdate,
  parseGithubPrTarget
} from "../src/transport/githubPr";

const requestPacket = {
  packet_type: "review-request",
  packet_version: "0.1",
  created_at: "2026-06-27T00:00:00.000Z"
};

const responsePacket = {
  packet_type: "review-response",
  packet_version: "0.1",
  created_at: "2026-06-27T00:01:00.000Z"
};

test("parses github pull request URL targets", () => {
  assert.deepEqual(
    parseGithubPrTarget("https://github.com/AcrossWorksAPI/open-relay/pull/34"),
    {
      owner: "AcrossWorksAPI",
      repo: "open-relay",
      pullNumber: 34,
      display: "AcrossWorksAPI/open-relay#34",
      repository: "AcrossWorksAPI/open-relay"
    }
  );
});

test("parses owner repo number shorthand targets", () => {
  assert.deepEqual(parseGithubPrTarget("AcrossWorksAPI/open-relay#34"), {
    owner: "AcrossWorksAPI",
    repo: "open-relay",
    pullNumber: 34,
    display: "AcrossWorksAPI/open-relay#34",
    repository: "AcrossWorksAPI/open-relay"
  });
});

test("rejects unsupported pull request targets without echoing them", () => {
  assert.throws(
    () => parseGithubPrTarget("https://example.com/acme/repo/pull/SECRET_REF_SHOULD_NOT_APPEAR"),
    /^Error: Invalid GitHub pull request target\.$/
  );
});

test("builds marked packet comments with invisible base64 payload", () => {
  const body = buildOpenRelayPacketCommentBody({
    packet: requestPacket,
    markdown: "# Review Request Relay Packet\n\n```ts\nconst value = true;\n```\n"
  });

  assert.match(body, /<!-- open-relay-packet\n/);
  assert.match(body, /packet_type: review-request\n/);
  assert.match(body, /packet_version: 0\.1\n/);
  assert.match(body, /payload_base64: [A-Za-z0-9+/=]+\n/);
  assert.match(body, /# Open Relay Packet: review-request\/0\.1/);
  assert.match(body, /```ts\nconst value = true;\n```/);
});

test("extracts packets from base64 markers without reading markdown prose", () => {
  const body = buildOpenRelayPacketCommentBody({
    packet: responsePacket,
    markdown: "# Human prose with ```json fences that should not matter\n"
  });

  const [found] = extractOpenRelayPacketComments([
    {
      id: 42,
      body,
      created_at: "2026-06-27T00:02:00Z",
      user: { login: "claude" }
    }
  ]);

  assert.equal(found.packet.packet_type, "review-response");
  assert.equal(found.packetType, "review-response");
  assert.equal(found.packetVersion, "0.1");
  assert.equal(found.author, "claude");
});

test("skips markers whose decoded packet disagrees with marker metadata", () => {
  const body = buildOpenRelayPacketCommentBody({
    packet: requestPacket,
    markdown: "# Request\n"
  }).replace("packet_type: review-request", "packet_type: review-response");

  assert.deepEqual(extractOpenRelayPacketComments([
    { id: 1, body, created_at: "2026-06-27T00:00:00Z", user: { login: "codex" } }
  ]), []);
});

test("finds newest matching packet comment by type version and author", () => {
  const older = buildOpenRelayPacketCommentBody({
    packet: { ...responsePacket, created_at: "2026-06-27T00:01:00.000Z" },
    markdown: "# Older\n"
  });
  const newer = buildOpenRelayPacketCommentBody({
    packet: { ...responsePacket, created_at: "2026-06-27T00:03:00.000Z" },
    markdown: "# Newer\n"
  });
  const wrongAuthor = buildOpenRelayPacketCommentBody({
    packet: { ...responsePacket, created_at: "2026-06-27T00:04:00.000Z" },
    markdown: "# Wrong author\n"
  });

  const found = findLatestMatchingOpenRelayPacketComment([
    { id: 1, body: older, created_at: "2026-06-27T00:01:00Z", user: { login: "claude" } },
    { id: 2, body: wrongAuthor, created_at: "2026-06-27T00:04:00Z", user: { login: "other" } },
    { id: 3, body: newer, created_at: "2026-06-27T00:03:00Z", user: { login: "claude" } }
  ], {
    packetType: "review-response",
    packetVersion: "0.1",
    author: "claude"
  });

  assert.equal(found?.comment.id, 3);
});

test("finds newest update candidate by type and version without author filtering", () => {
  const body = buildOpenRelayPacketCommentBody({
    packet: requestPacket,
    markdown: "# Request\n"
  });

  const found = findLatestPacketCommentForUpdate([
    { id: 1, body, created_at: "2026-06-27T00:00:00Z", user: { login: "codex" } },
    { id: 2, body, created_at: "2026-06-27T00:05:00Z", user: { login: "other" } }
  ], {
    packetType: "review-request",
    packetVersion: "0.1"
  });

  assert.equal(found?.comment.id, 2);
});
