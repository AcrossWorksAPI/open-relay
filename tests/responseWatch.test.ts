import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { ReviewResponsePacket } from "../src/reviewResponse";
import {
  buildResponseWatchCodexPrompt,
  parseResponseWatchArgs,
  runResponseWatchOnce
} from "../src/responseWatch";
import { buildOpenRelayPacketCommentBody } from "../src/transport/githubPr";

test("parses response watch defaults", () => {
  assert.deepEqual(parseResponseWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#61",
    "--author", "AcrossWorksAPI",
    "--relay-session-id", "R7M4Q9K2"
  ], {
    cwd: "/repo"
  }), {
    ok: true,
    options: {
      pr: "AcrossWorksAPI/open-relay#61",
      author: "AcrossWorksAPI",
      relaySessionId: "R7M4Q9K2",
      cwd: "/repo",
      stateFile: join("/repo", ".open-relay", "response-watch", "AcrossWorksAPI-open-relay-61.json"),
      codexUrl: "ws://127.0.0.1:43210",
      codexSearch: "R7M4Q9K2",
      timeoutMs: 120000,
      intervalMs: 30000,
      maxTurns: 1,
      maxFailures: 1,
      watch: false,
      dryRun: false,
      confirmLive: false,
      force: false
    }
  });
});

test("parses response watch explicit flags", () => {
  assert.deepEqual(parseResponseWatchArgs([
    "--pr", "https://github.com/AcrossWorksAPI/open-relay/pull/61",
    "--author", "AcrossWorksAPI",
    "--relay-session-id", "R7M4Q9K2",
    "--cwd", "/work",
    "--state-file", "/tmp/state.json",
    "--codex-url", "ws://127.0.0.1:43211",
    "--codex-thread-id", "thread-1",
    "--codex-search", "R7M4Q9K2-OR-CX",
    "--timeout-ms", "1000",
    "--interval-ms", "5000",
    "--max-turns", "3",
    "--max-failures", "2",
    "--watch",
    "--confirm-live",
    "--force"
  ]), {
    ok: true,
    options: {
      pr: "https://github.com/AcrossWorksAPI/open-relay/pull/61",
      author: "AcrossWorksAPI",
      relaySessionId: "R7M4Q9K2",
      cwd: "/work",
      stateFile: "/tmp/state.json",
      codexUrl: "ws://127.0.0.1:43211",
      codexThreadId: "thread-1",
      codexSearch: "R7M4Q9K2-OR-CX",
      timeoutMs: 1000,
      intervalMs: 5000,
      maxTurns: 3,
      maxFailures: 2,
      watch: true,
      dryRun: false,
      confirmLive: true,
      force: true
    }
  });
});

test("rejects invalid response watch arguments", () => {
  assert.deepEqual(parseResponseWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#61"
  ]), {
    ok: false,
    message: "Missing required flag: --author"
  });
  assert.deepEqual(parseResponseWatchArgs([
    "--pr", "not-a-pr",
    "--author", "AcrossWorksAPI"
  ]), {
    ok: false,
    message: "Invalid GitHub pull request target."
  });
  assert.deepEqual(parseResponseWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#61",
    "--author", "AcrossWorksAPI",
    "--dry-run",
    "--confirm-live"
  ]), {
    ok: false,
    message: "Cannot combine --dry-run and --confirm-live."
  });
  assert.deepEqual(parseResponseWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#61",
    "--author", "AcrossWorksAPI",
    "--interval-ms", "4999"
  ]), {
    ok: false,
    message: "Invalid interval: expected an integer of at least 5000."
  });
  assert.deepEqual(parseResponseWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#61",
    "--author", "AcrossWorksAPI",
    "--max-turns", "0"
  ]), {
    ok: false,
    message: "Invalid max turns: expected a positive integer."
  });
  assert.deepEqual(parseResponseWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#61",
    "--author", "AcrossWorksAPI",
    "--max-failures", "0"
  ]), {
    ok: false,
    message: "Invalid max failures: expected a positive integer."
  });
});

test("builds Codex prompt from a response-derived resume packet", () => {
  const prompt = buildResponseWatchCodexPrompt({
    response: responseFixture(),
    relaySessionId: "R7M4Q9K2"
  });

  assert.match(prompt, /Relay Session ID: R7M4Q9K2/);
  assert.match(prompt, /# Codex Follow-Up Prompt/);
  assert.match(prompt, /# Resume Project Relay Packet/);
  assert.match(prompt, /Evaluate each continuation task/);
});

test("dry-run fetches response and derives resume without waking Codex", async () => {
  const gh = makeGh([responseComment()]);
  let codexCalls = 0;

  const result = await runResponseWatchOnce({
    ...baseOptions(),
    dryRun: true
  }, {
    runGh: gh.runGh,
    startCodexTurn: async () => {
      codexCalls += 1;
      throw new Error("Codex should not be contacted in dry-run.");
    },
    readStateFile: async () => missingFile(),
    now: () => new Date("2026-07-01T00:00:00.000Z")
  });

  assert.equal(result.ok, true);
  assert.equal(result.receipt.status, "dry-run");
  assert.equal(result.receipt.response?.comment_id, 200);
  assert.equal(result.receipt.response?.head_commit, "head-1");
  assert.equal(result.receipt.resume?.resume_status, "owner_decision");
  assert.equal(result.receipt.resume?.tasks, 1);
  assert.match(result.receipt.codex?.prompt_preview ?? "", /# Codex Follow-Up Prompt/);
  assert.equal(codexCalls, 0);
});

test("skips an already handled response from state", async () => {
  const gh = makeGh([responseComment()]);
  const result = await runResponseWatchOnce(baseOptions(), {
    runGh: gh.runGh,
    readStateFile: async () => JSON.stringify({
      last_handled_response: {
        comment_id: 200,
        head_commit: "head-1",
        response_created_at: "2026-06-27T00:00:00.000Z"
      }
    }),
    startCodexTurn: async () => {
      throw new Error("Codex should not be contacted for handled state.");
    }
  });

  assert.equal(result.ok, true);
  assert.equal(result.receipt.status, "skipped");
  assert.equal(result.receipt.reason, "Review response already handled.");
});

test("live response watch requires confirmation before waking Codex", async () => {
  const gh = makeGh([responseComment()]);
  const result = await runResponseWatchOnce(baseOptions(), {
    runGh: gh.runGh,
    readStateFile: async () => missingFile(),
    startCodexTurn: async () => {
      throw new Error("Codex should not be contacted without confirmation.");
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.receipt.status, "failed");
  assert.equal(result.receipt.error, "Response watch live mode requires --confirm-live before waking Codex.");
});

test("confirmed live response watch wakes Codex and writes state", async () => {
  const gh = makeGh([responseComment()]);
  const codexCalls: unknown[] = [];
  const stateWrites: string[] = [];

  const result = await runResponseWatchOnce({
    ...baseOptions(),
    confirmLive: true
  }, {
    runGh: gh.runGh,
    readStateFile: async () => missingFile(),
    writeStateFile: async (_path: string, value: string) => {
      stateWrites.push(value);
    },
    mkdir: async () => undefined,
    startCodexTurn: async (input: { threadId?: string; prompt: string }) => {
      codexCalls.push(input);
      return {
        status: "completed",
        threadId: input.threadId ?? "thread-1",
        turnId: "turn-1",
        finalText: "Codex received the resume packet."
      };
    },
    now: () => new Date("2026-07-01T00:00:00.000Z")
  });

  assert.equal(result.ok, true);
  assert.equal(result.receipt.status, "completed");
  assert.equal(result.receipt.codex?.thread_id, "codex-thread");
  assert.equal(result.receipt.codex?.turn_id, "turn-1");
  assert.equal(codexCalls.length, 1);
  assert.match((codexCalls[0] as { prompt: string }).prompt, /# Resume Project Relay Packet/);
  assert.equal(stateWrites.length, 1);
  assert.deepEqual(JSON.parse(stateWrites[0]).last_handled_response, {
    comment_id: 200,
    head_commit: "head-1",
    response_created_at: "2026-06-27T00:00:00.000Z",
    codex_status: "completed",
    handled_at: "2026-07-01T00:00:00.000Z"
  });
});

test("failed Codex wake does not write handled state", async () => {
  const gh = makeGh([responseComment()]);
  const stateWrites: string[] = [];

  const result = await runResponseWatchOnce({
    ...baseOptions(),
    confirmLive: true
  }, {
    runGh: gh.runGh,
    readStateFile: async () => missingFile(),
    writeStateFile: async (_path: string, value: string) => {
      stateWrites.push(value);
    },
    mkdir: async () => undefined,
    startCodexTurn: async () => {
      throw new Error("Codex app-server refused the turn.");
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.receipt.status, "failed");
  assert.equal(result.receipt.error, "Codex app-server refused the turn.");
  assert.equal(stateWrites.length, 0);
});

function responseComment() {
  const packet = responseFixture();
  packet.response_to.repository = "AcrossWorksAPI/open-relay";
  packet.response_to.working_branch = "codex/local-response-watch";
  packet.response_to.base_commit = "base-1";
  packet.response_to.head_commit = "head-1";
  packet.response_to.diff_range = "base-1..head-1";
  packet.response_to.pull_request_url = "https://github.com/AcrossWorksAPI/open-relay/pull/61";
  return {
    id: 200,
    created_at: "2026-07-01T00:00:00Z",
    user: { login: "AcrossWorksAPI" },
    body: buildOpenRelayPacketCommentBody({
      packet: packet as unknown as Record<string, unknown>,
      markdown: "# Review Response Relay Packet\n"
    })
  };
}

function responseFixture(): ReviewResponsePacket {
  return JSON.parse(readFileSync("examples/review-response/relay.json", "utf8")) as ReviewResponsePacket;
}

function makeGh(comments: unknown[]) {
  const runGh = (args: string[]) => {
    const key = args.join(" ");
    if (args[0] === "api" && args[1] === "repos/AcrossWorksAPI/open-relay/issues/61/comments?per_page=100") {
      return JSON.stringify([comments]);
    }
    throw new Error(`Unexpected gh call: ${key}`);
  };

  return { runGh };
}

function baseOptions() {
  return {
    pr: "AcrossWorksAPI/open-relay#61",
    author: "AcrossWorksAPI",
    relaySessionId: "R7M4Q9K2",
    cwd: "/repo",
    stateFile: "/tmp/response-watch-state.json",
    codexUrl: "ws://127.0.0.1:43210",
    codexThreadId: "codex-thread",
    codexSearch: "R7M4Q9K2",
    timeoutMs: 120000,
    intervalMs: 30000,
    maxTurns: 1,
    maxFailures: 1,
    watch: false,
    dryRun: false,
    confirmLive: false,
    force: false
  };
}

function missingFile(): never {
  const error = new Error("missing") as NodeJS.ErrnoException;
  error.code = "ENOENT";
  throw error;
}
