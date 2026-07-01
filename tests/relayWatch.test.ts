import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type { ReviewRequestPacket } from "../src/reviewRequest";
import {
  parseRelayWatchArgs,
  runRelayWatchOnce
} from "../src/relayWatch";
import { buildOpenRelayPacketCommentBody } from "../src/transport/githubPr";

test("parses relay watch defaults", () => {
  assert.deepEqual(parseRelayWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#59",
    "--author", "AcrossWorksAPI",
    "--relay-session-id", "R7M4Q9K2"
  ], {
    cwd: "/repo",
    secretsEnv: "/secrets.env"
  }), {
    ok: true,
    options: {
      pr: "AcrossWorksAPI/open-relay#59",
      author: "AcrossWorksAPI",
      relaySessionId: "R7M4Q9K2",
      cwd: "/repo",
      stateFile: join("/repo", ".open-relay", "relay-watch", "AcrossWorksAPI-open-relay-59.json"),
      claudeCommand: "claude",
      claudeModel: "haiku",
      claudeMaxBudgetUsd: "0.50",
      secretsEnv: "/secrets.env",
      timeoutMs: 120000,
      intervalMs: 30000,
      maxPosts: 1,
      maxFailures: 1,
      watch: false,
      dryRun: false,
      confirmLive: false,
      confirmPublic: false,
      force: false,
      update: false
    }
  });
});

test("parses relay watch explicit flags", () => {
  assert.deepEqual(parseRelayWatchArgs([
    "--pr", "https://github.com/AcrossWorksAPI/open-relay/pull/59",
    "--author", "AcrossWorksAPI",
    "--relay-session-id", "R7M4Q9K2",
    "--cwd", "/work",
    "--state-file", "/tmp/state.json",
    "--claude-command", "/usr/local/bin/claude",
    "--claude-model", "sonnet",
    "--claude-max-budget-usd", "1.25",
    "--secrets-env", "/tmp/secrets.env",
    "--timeout-ms", "1000",
    "--interval-ms", "5000",
    "--max-posts", "3",
    "--max-failures", "2",
    "--watch",
    "--confirm-live",
    "--confirm-public",
    "--force",
    "--update"
  ]), {
    ok: true,
    options: {
      pr: "https://github.com/AcrossWorksAPI/open-relay/pull/59",
      author: "AcrossWorksAPI",
      relaySessionId: "R7M4Q9K2",
      cwd: "/work",
      stateFile: "/tmp/state.json",
      claudeCommand: "/usr/local/bin/claude",
      claudeModel: "sonnet",
      claudeMaxBudgetUsd: "1.25",
      secretsEnv: "/tmp/secrets.env",
      timeoutMs: 1000,
      intervalMs: 5000,
      maxPosts: 3,
      maxFailures: 2,
      watch: true,
      dryRun: false,
      confirmLive: true,
      confirmPublic: true,
      force: true,
      update: true
    }
  });
});

test("rejects invalid relay watch arguments", () => {
  assert.deepEqual(parseRelayWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#59"
  ]), {
    ok: false,
    message: "Missing required flag: --author"
  });
  assert.deepEqual(parseRelayWatchArgs([
    "--pr", "not-a-pr",
    "--author", "AcrossWorksAPI"
  ]), {
    ok: false,
    message: "Invalid GitHub pull request target."
  });
  assert.deepEqual(parseRelayWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#59",
    "--author", "AcrossWorksAPI",
    "--dry-run",
    "--confirm-live"
  ]), {
    ok: false,
    message: "Cannot combine --dry-run and live confirmation flags."
  });
  assert.deepEqual(parseRelayWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#59",
    "--author", "AcrossWorksAPI",
    "--interval-ms", "4999"
  ]), {
    ok: false,
    message: "Invalid interval: expected an integer of at least 5000."
  });
  assert.deepEqual(parseRelayWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#59",
    "--author", "AcrossWorksAPI",
    "--max-posts", "0"
  ]), {
    ok: false,
    message: "Invalid max posts: expected a positive integer."
  });
  assert.deepEqual(parseRelayWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#59",
    "--author", "AcrossWorksAPI",
    "--max-failures", "0"
  ]), {
    ok: false,
    message: "Invalid max failures: expected a positive integer."
  });
  assert.deepEqual(parseRelayWatchArgs([
    "--pr", "AcrossWorksAPI/open-relay#59",
    "--author", "AcrossWorksAPI",
    "--update",
    "--no-update"
  ]), {
    ok: false,
    message: "Cannot combine --update and --no-update."
  });
});

test("dry-run fetches and renders request without invoking Claude or posting", async () => {
  const gh = makeGh([requestComment()]);
  let spawned = false;
  const result = await runRelayWatchOnce({
    ...baseOptions(),
    dryRun: true
  }, {
    runGh: gh.runGh,
    spawnProcess: (() => {
      spawned = true;
      throw new Error("Claude should not be spawned in dry-run.");
    }) as unknown as typeof spawn,
    readStateFile: async () => missingFile(),
    now: () => new Date("2026-06-30T00:00:00.000Z")
  });

  assert.equal(result.ok, true);
  assert.equal(result.receipt.status, "dry-run");
  assert.ok(result.receipt.request);
  assert.ok(result.receipt.claude);
  assert.equal(result.receipt.request.head_commit, "head-1");
  assert.match(result.receipt.claude.prompt_preview ?? "", /Claude Review Prompt/);
  assert.equal(spawned, false);
  assert.equal(gh.posted.length, 0);
});

test("skips already handled review request from state file", async () => {
  const gh = makeGh([requestComment()]);
  const result = await runRelayWatchOnce(baseOptions(), {
    runGh: gh.runGh,
    readStateFile: async () => JSON.stringify({
      last_handled_request: {
        comment_id: 100,
        head_commit: "head-1"
      }
    }),
    spawnProcess: (() => {
      throw new Error("Claude should not be spawned for handled state.");
    }) as unknown as typeof spawn
  });

  assert.equal(result.ok, true);
  assert.equal(result.receipt.status, "skipped");
  assert.equal(result.receipt.reason, "Review request already handled.");
  assert.equal(gh.posted.length, 0);
});

test("confirmed live watch posts Claude review-response and writes state", async () => {
  const gh = makeGh([requestComment()]);
  const stateWrites: string[] = [];
  const claude = makeClaudeSpawn(reviewDraft({
    outcome: "approved",
    findings: [],
    next_action: "Merge after CI passes."
  }));

  const result = await runRelayWatchOnce({
    ...baseOptions(),
    confirmLive: true,
    confirmPublic: true
  }, {
    runGh: gh.runGh,
    spawnProcess: claude.spawnProcess,
    readSecretsFile: async () => "CLAUDE_CODE_OAUTH_TOKEN=secret\nIGNORED=value\n",
    statSecretsFile: async () => ({ mode: 0o600 }),
    readStateFile: async () => missingFile(),
    writeStateFile: async (_path: string, value: string) => {
      stateWrites.push(value);
    },
    mkdir: async () => undefined,
    env: { PATH: "/usr/bin" },
    now: () => new Date("2026-06-30T00:00:00.000Z")
  });

  assert.equal(result.ok, true);
  assert.equal(result.receipt.status, "posted");
  assert.equal(result.receipt.response?.outcome, "approved");
  assert.equal(result.receipt.response?.findings, 0);
  assert.equal(claude.calls[0].env.CLAUDE_CODE_OAUTH_TOKEN, "secret");
  assert.equal(claude.calls[0].env.IGNORED, undefined);
  assert.equal(gh.posted.length, 1);
  assert.match(gh.posted[0], /packet_type: review-response/);
  assert.match(gh.posted[0], /# Review Response Relay Packet/);
  assert.equal(stateWrites.length, 1);
  assert.deepEqual(JSON.parse(stateWrites[0]).last_handled_request, {
    comment_id: 100,
    head_commit: "head-1",
    response_status: "posted",
    response_outcome: "approved",
    handled_at: "2026-06-30T00:00:00.000Z"
  });
});

test("live watch fails closed on malformed Claude draft output", async () => {
  const gh = makeGh([requestComment()]);
  const claude = makeClaudeSpawn("not json");

  const result = await runRelayWatchOnce({
    ...baseOptions(),
    confirmLive: true,
    confirmPublic: true
  }, {
    runGh: gh.runGh,
    spawnProcess: claude.spawnProcess,
    readSecretsFile: async () => "",
    statSecretsFile: async () => ({ mode: 0o600 }),
    readStateFile: async () => missingFile(),
    writeStateFile: async () => {
      throw new Error("State should not be written after failed Claude output.");
    }
  });

  assert.equal(result.ok, false);
  assert.equal(result.receipt.status, "failed");
  assert.match(result.receipt.error ?? "", /Claude review draft was not valid JSON/);
  assert.equal(gh.posted.length, 0);
});

test("live watch requires confirmation before Claude spend or public post", async () => {
  const gh = makeGh([requestComment()]);
  const result = await runRelayWatchOnce(baseOptions(), {
    runGh: gh.runGh,
    readStateFile: async () => missingFile(),
    spawnProcess: (() => {
      throw new Error("Claude should not be spawned without confirmation.");
    }) as unknown as typeof spawn
  });

  assert.equal(result.ok, false);
  assert.equal(result.receipt.status, "failed");
  assert.match(result.receipt.error ?? "", /requires --confirm-live/);
  assert.equal(gh.posted.length, 0);
});

function baseOptions() {
  return {
    pr: "AcrossWorksAPI/open-relay#59",
    author: "AcrossWorksAPI",
    relaySessionId: "R7M4Q9K2",
    cwd: "/repo",
    stateFile: "/repo/.open-relay/relay-watch/AcrossWorksAPI-open-relay-59.json",
    claudeCommand: "claude",
    claudeModel: "haiku",
    claudeMaxBudgetUsd: "0.50",
    secretsEnv: "/secrets.env",
    timeoutMs: 120000,
    intervalMs: 30000,
    maxPosts: 1,
    maxFailures: 1,
    watch: false,
    dryRun: false,
    confirmLive: false,
    confirmPublic: false,
    force: false,
    update: false
  };
}

function requestComment() {
  const packet = reviewRequestFixture();
  packet.repository.name = "AcrossWorksAPI/open-relay";
  packet.repository.working_branch = "codex/local-relay-watch";
  packet.repository.base_commit = "base-1";
  packet.repository.head_commit = "head-1";
  packet.repository.diff_range = "base-1..head-1";
  packet.repository.pull_request_url = "https://github.com/AcrossWorksAPI/open-relay/pull/59";
  return {
    id: 100,
    created_at: "2026-06-30T00:00:00Z",
    user: { login: "AcrossWorksAPI" },
    body: buildOpenRelayPacketCommentBody({
      packet: packet as unknown as Record<string, unknown>,
      markdown: "# Review Request Relay Packet\n"
    })
  };
}

function reviewRequestFixture(): ReviewRequestPacket {
  return JSON.parse(readFileSync("examples/review-request/relay.json", "utf8")) as ReviewRequestPacket;
}

function reviewDraft(overrides: {
  outcome: "approved" | "changes_requested" | "commentary" | "blocked";
  findings: unknown[];
  next_action: string;
}): string {
  return JSON.stringify({
    reviewer: {
      name: "Claude",
      kind: "agent",
      tool: "Open Relay local relay-watch"
    },
    outcome: overrides.outcome,
    confidence: "high",
    summary: "No blocking findings.",
    findings: overrides.findings,
    reviewed_scope: {
      files: [{
        path: "src/relayWatch.ts",
        notes: "Reviewed relay watch implementation."
      }],
      limitations: []
    },
    verification: [],
    redactions: [],
    sensitive_data: {
      excluded: true,
      notes: "No secrets included."
    },
    next_action: overrides.next_action
  });
}

function makeGh(comments: unknown[]) {
  const posted: string[] = [];
  const edited: string[] = [];
  const runGh = (args: string[]) => {
    const key = args.join(" ");
    if (key === "repo view AcrossWorksAPI/open-relay --json visibility") {
      return JSON.stringify({ visibility: "PUBLIC" });
    }
    if (key === "api user --jq .login") {
      return "AcrossWorksAPI\n";
    }
    if (args[0] === "api" && args[1] === "repos/AcrossWorksAPI/open-relay/issues/59/comments?per_page=100") {
      return JSON.stringify([comments]);
    }
    if (args[0] === "api" && args[1] === "repos/AcrossWorksAPI/open-relay/issues/59/comments") {
      const body = args.find((arg) => arg.startsWith("body="))?.slice("body=".length) ?? "";
      posted.push(body);
      return "{}";
    }
    if (args[0] === "api" && args[1]?.startsWith("repos/AcrossWorksAPI/open-relay/issues/comments/")) {
      const body = args.find((arg) => arg.startsWith("body="))?.slice("body=".length) ?? "";
      edited.push(body);
      return "{}";
    }
    throw new Error(`Unexpected gh call: ${key}`);
  };

  return { runGh, posted, edited };
}

function makeClaudeSpawn(finalText: string) {
  const calls: Array<{ command: string; args: string[]; env: NodeJS.ProcessEnv; killed: boolean }> = [];
  const spawnProcess = ((command: string, args: string[], options: { env?: NodeJS.ProcessEnv }) => {
    const call = {
      command,
      args,
      env: options.env ?? {},
      killed: false
    };
    calls.push(call);

    const child = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill(): void;
    };
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => {
      call.killed = true;
    };

    queueMicrotask(() => {
      child.stdout.emit("data", Buffer.from(`${JSON.stringify({
        type: "result",
        session_id: "claude-session",
        result: finalText
      })}\n`));
      child.emit("close", 0);
    });

    return child;
  }) as unknown as typeof spawn;

  return { calls, spawnProcess };
}

function missingFile(): never {
  const error = new Error("missing") as NodeJS.ErrnoException;
  error.code = "ENOENT";
  throw error;
}
