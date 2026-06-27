import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildOpenRelayPacketCommentBody,
  extractOpenRelayPacketComments,
  fetchPacketFromGithubPr,
  findLatestMatchingOpenRelayPacketComment,
  findLatestPacketCommentForUpdate,
  parseGithubPrTarget,
  sendPacketToGithubPr,
  type RunGh
} from "../src/transport/githubPr";
import { GH_FAILURE_MESSAGE, GhError, runGh } from "../src/transport/gh";

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

test("extracts packets from CRLF marker comments", () => {
  const body = buildOpenRelayPacketCommentBody({
    packet: responsePacket,
    markdown: "# Review Response Relay Packet\n"
  }).replaceAll("\n", "\r\n");

  const [found] = extractOpenRelayPacketComments([
    {
      id: 43,
      body,
      created_at: "2026-06-27T00:02:00Z",
      user: { login: "claude" }
    }
  ]);

  assert.equal(found.packet.packet_type, "review-response");
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

test("finds newest update candidate by type version and author", () => {
  const body = buildOpenRelayPacketCommentBody({
    packet: requestPacket,
    markdown: "# Request\n"
  });

  const found = findLatestPacketCommentForUpdate([
    { id: 1, body, created_at: "2026-06-27T00:00:00Z", user: { login: "codex" } },
    { id: 2, body, created_at: "2026-06-27T00:05:00Z", user: { login: "other" } }
  ], {
    packetType: "review-request",
    packetVersion: "0.1",
    author: "codex"
  });

  assert.equal(found?.comment.id, 1);
});

test("dry-run send returns the exact comment body without calling gh", () => {
  const calls: string[][] = [];
  const result = sendPacketToGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packet: requestPacket,
    markdown: "# Review Request Relay Packet\n",
    dryRun: true,
    update: false,
    confirmPublic: false,
    runGh: (args) => {
      calls.push(args);
      return "{}";
    }
  });

  assert.equal(calls.length, 0);
  assert.equal(result.kind, "dry-run");
  assert.match(result.body, /open-relay-packet/);
  assert.equal(result.target, "AcrossWorksAPI/open-relay#34");
});

test("send checks repository visibility before posting", () => {
  const calls: string[][] = [];
  const runGh: RunGh = (args) => {
    calls.push(args);
    if (args[0] === "repo") {
      return JSON.stringify({ visibility: "PRIVATE" });
    }
    return JSON.stringify({ id: 123 });
  };

  const result = sendPacketToGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packet: requestPacket,
    markdown: "# Review Request Relay Packet\n",
    dryRun: false,
    update: false,
    confirmPublic: false,
    runGh
  });

  assert.equal(result.kind, "posted");
  assert.deepEqual(calls[0], ["repo", "view", "AcrossWorksAPI/open-relay", "--json", "visibility"]);
  assert.deepEqual(calls[1].slice(0, 4), [
    "api",
    "repos/AcrossWorksAPI/open-relay/issues/34/comments",
    "--method",
    "POST"
  ]);
});

test("send rejects public repositories without confirmation", () => {
  const runGh: RunGh = (args) => {
    if (args[0] === "repo") {
      return JSON.stringify({ visibility: "PUBLIC" });
    }
    return "{}";
  };

  assert.throws(
    () => sendPacketToGithubPr({
      prTarget: "AcrossWorksAPI/open-relay#34",
      packet: requestPacket,
      markdown: "# Review Request Relay Packet\n",
      dryRun: false,
      update: false,
      confirmPublic: false,
      runGh
    }),
    /^Error: Public GitHub repository requires --confirm-public\.$/
  );
});

test("send with confirmation posts to public repositories", () => {
  const calls: string[][] = [];
  const runGh: RunGh = (args) => {
    calls.push(args);
    if (args[0] === "repo") {
      return JSON.stringify({ visibility: "PUBLIC" });
    }
    return JSON.stringify({ id: 456 });
  };

  const result = sendPacketToGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packet: requestPacket,
    markdown: "# Review Request Relay Packet\n",
    dryRun: false,
    update: false,
    confirmPublic: true,
    runGh
  });

  assert.equal(result.kind, "posted");
  assert.equal(calls.length, 2);
});

test("update edits latest matching packet comment or posts when none exists", () => {
  const existingBody = buildOpenRelayPacketCommentBody({
    packet: requestPacket,
    markdown: "# Existing\n"
  });
  const calls: string[][] = [];
  const runGh: RunGh = (args) => {
    calls.push(args);
    if (args[0] === "repo") {
      return JSON.stringify({ visibility: "PRIVATE" });
    }
    if (args[0] === "api" && args[1] === "user") {
      return "codex\n";
    }
    if (args[1] === "repos/AcrossWorksAPI/open-relay/issues/34/comments?per_page=100") {
      return JSON.stringify([[
        { id: 7, body: existingBody, created_at: "2026-06-27T00:00:00Z", user: { login: "codex" } }
      ]]);
    }
    return JSON.stringify({ id: 7 });
  };

  const result = sendPacketToGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packet: requestPacket,
    markdown: "# Updated\n",
    dryRun: false,
    update: true,
    confirmPublic: false,
    runGh
  });

  assert.equal(result.kind, "updated");
  assert.deepEqual(calls.at(-1)?.slice(0, 4), [
    "api",
    "repos/AcrossWorksAPI/open-relay/issues/comments/7",
    "--method",
    "PATCH"
  ]);
});

test("update posts instead of editing another author's matching packet comment", () => {
  const otherAuthorBody = buildOpenRelayPacketCommentBody({
    packet: requestPacket,
    markdown: "# Existing\n"
  });
  const calls: string[][] = [];
  const runGh: RunGh = (args) => {
    calls.push(args);
    if (args[0] === "repo") {
      return JSON.stringify({ visibility: "PRIVATE" });
    }
    if (args[0] === "api" && args[1] === "user") {
      return "codex\n";
    }
    if (args[1] === "repos/AcrossWorksAPI/open-relay/issues/34/comments?per_page=100") {
      return JSON.stringify([[
        { id: 7, body: otherAuthorBody, created_at: "2026-06-27T00:00:00Z", user: { login: "other" } }
      ]]);
    }
    return JSON.stringify({ id: 8 });
  };

  const result = sendPacketToGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packet: requestPacket,
    markdown: "# Posted\n",
    dryRun: false,
    update: true,
    confirmPublic: false,
    runGh
  });

  assert.equal(result.kind, "posted");
  assert.equal(calls.some((args) => args.includes("--method") && args.includes("PATCH")), false);
  assert.deepEqual(calls.at(-1)?.slice(0, 4), [
    "api",
    "repos/AcrossWorksAPI/open-relay/issues/34/comments",
    "--method",
    "POST"
  ]);
});

test("fetch reads newest matching packet from required author", () => {
  const matchingBody = buildOpenRelayPacketCommentBody({
    packet: responsePacket,
    markdown: "# Review Response Relay Packet\n"
  });
  const otherBody = buildOpenRelayPacketCommentBody({
    packet: { ...responsePacket, created_at: "2026-06-27T00:03:00.000Z" },
    markdown: "# Other\n"
  });
  const runGh: RunGh = () => JSON.stringify([[
    { id: 1, body: matchingBody, created_at: "2026-06-27T00:01:00Z", user: { login: "claude" } },
    { id: 2, body: otherBody, created_at: "2026-06-27T00:03:00Z", user: { login: "other" } }
  ]]);

  const found = fetchPacketFromGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packetType: "review-response",
    packetVersion: "0.1",
    author: "claude",
    runGh
  });

  assert.equal(found.packet.packet_type, "review-response");
  assert.equal(found.author, "claude");
});

test("fetch reports no matching packet without echoing author or target", () => {
  const runGh: RunGh = () => JSON.stringify([]);

  assert.throws(
    () => fetchPacketFromGithubPr({
      prTarget: "AcrossWorksAPI/open-relay#34",
      packetType: "review-response",
      author: "SECRET_AUTHOR_SHOULD_NOT_APPEAR",
      runGh
    }),
    /^Error: No matching Open Relay packet comment found\.$/
  );
});

test("gh failures include a safe first-run troubleshooting hint", () => {
  assert.throws(
    () => runGh(["__open_relay_missing_command__"]),
    (error: unknown) => error instanceof GhError
      && error.message === GH_FAILURE_MESSAGE
  );
});
