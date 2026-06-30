import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { EventEmitter } from "node:events";
import { test } from "node:test";

import {
  CLAUDE_WATCHER_PROOF_TEXT,
  CODEX_WATCHER_PROOF_TEXT,
  buildClaudeProofArgs,
  parseSecretsEnvText,
  parseWatcherProofArgs,
  runWatcherProof
} from "../src/watcherProof";

test("parses watcher proof defaults", () => {
  assert.deepEqual(parseWatcherProofArgs([
    "--relay-session-id", "R7M4Q9K2"
  ], {
    cwd: "/repo",
    secretsEnv: "/secrets.env"
  }), {
    ok: true,
    options: {
      relaySessionId: "R7M4Q9K2",
      cwd: "/repo",
      codexUrl: "ws://127.0.0.1:43210",
      codexSearch: "R7M4Q9K2",
      claudeCommand: "claude",
      claudeModel: "haiku",
      claudeMaxBudgetUsd: "0.50",
      secretsEnv: "/secrets.env",
      timeoutMs: 120000,
      dryRun: false,
      confirmLive: false
    }
  });
});

test("parses watcher proof explicit routing flags", () => {
  assert.deepEqual(parseWatcherProofArgs([
    "--relay-session-id", "R7M4Q9K2",
    "--cwd", "/workspace",
    "--codex-url", "ws://127.0.0.1:43211",
    "--codex-thread-id", "codex-thread",
    "--claude-command", "/usr/local/bin/claude",
    "--claude-model", "sonnet",
    "--claude-max-budget-usd", "1.25",
    "--secrets-env", "/local/secrets.env",
    "--timeout-ms", "30000",
    "--output", "/tmp/receipt.json",
    "--confirm-live"
  ]), {
    ok: true,
    options: {
      relaySessionId: "R7M4Q9K2",
      cwd: "/workspace",
      codexUrl: "ws://127.0.0.1:43211",
      codexThreadId: "codex-thread",
      codexSearch: "R7M4Q9K2",
      claudeCommand: "/usr/local/bin/claude",
      claudeModel: "sonnet",
      claudeMaxBudgetUsd: "1.25",
      secretsEnv: "/local/secrets.env",
      timeoutMs: 30000,
      output: "/tmp/receipt.json",
      dryRun: false,
      confirmLive: true
    }
  });
});

test("rejects invalid watcher proof arguments", () => {
  assert.deepEqual(parseWatcherProofArgs([]), {
    ok: false,
    message: "Missing required flag: --relay-session-id"
  });
  assert.deepEqual(parseWatcherProofArgs(["--relay-session-id"]), {
    ok: false,
    message: "Missing value for --relay-session-id"
  });
  assert.deepEqual(parseWatcherProofArgs([
    "--relay-session-id", "a",
    "--relay-session-id", "b"
  ]), {
    ok: false,
    message: "Duplicate flag: --relay-session-id"
  });
  assert.deepEqual(parseWatcherProofArgs([
    "--relay-session-id", "a",
    "--claude-max-budget-usd", "0"
  ]), {
    ok: false,
    message: "Invalid Claude budget: expected a positive number."
  });
  assert.deepEqual(parseWatcherProofArgs([
    "--relay-session-id", "a",
    "--confirm-live",
    "--confirm-live"
  ]), {
    ok: false,
    message: "Duplicate flag: --confirm-live"
  });
  assert.deepEqual(parseWatcherProofArgs([
    "--relay-session-id", "a",
    "--dry-run",
    "--confirm-live"
  ]), {
    ok: false,
    message: "Cannot combine --dry-run and --confirm-live."
  });
});

test("parses only supported watcher secret keys", () => {
  assert.deepEqual(parseSecretsEnvText(`
# comment
export CLAUDE_CODE_OAUTH_TOKEN='sk-ant-oat01-secret'
ANTHROPIC_API_KEY="sk-ant-api03-secret"
UNRELATED_TOKEN=ignored
`), {
    CLAUDE_CODE_OAUTH_TOKEN: "sk-ant-oat01-secret",
    ANTHROPIC_API_KEY: "sk-ant-api03-secret"
  });
});

test("rejects malformed watcher secret lines", () => {
  assert.throws(() => parseSecretsEnvText("not an env line"), /Invalid secrets env line 1/);
});

test("builds Claude headless proof command arguments", () => {
  assert.deepEqual(buildClaudeProofArgs({
    prompt: "hello",
    model: "haiku",
    maxBudgetUsd: "0.50"
  }), [
    "-p",
    "hello",
    "--model",
    "haiku",
    "--output-format",
    "stream-json",
    "--verbose",
    "--max-budget-usd",
    "0.50"
  ]);
});

test("dry-run watcher proof returns a machine-readable receipt without external calls", async () => {
  const result = await runWatcherProof({
    ...baseLiveOptions(),
    dryRun: true,
    confirmLive: false
  }, {
    now: () => new Date("2026-06-30T00:00:00.000Z")
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.receipt, {
    relay_session_id: "R7M4Q9K2",
    created_at: "2026-06-30T00:00:00.000Z",
    cwd: "/repo",
    mode: "dry-run",
    status: "dry-run",
    codex: {
      status: "dry-run",
      url: "ws://127.0.0.1:43210",
      thread_id: "codex-thread",
      expected_text: CODEX_WATCHER_PROOF_TEXT
    },
    claude: {
      status: "dry-run",
      command: "claude",
      model: "haiku",
      expected_text: CLAUDE_WATCHER_PROOF_TEXT
    }
  });
});

test("live watcher proof requires explicit confirmation before agent triggers", async () => {
  const result = await runWatcherProof({
    ...baseLiveOptions(),
    confirmLive: false
  }, {
    webSocketFactory: () => {
      throw new Error("Codex should not be contacted without confirmation.");
    },
    spawnProcess: (() => {
      throw new Error("Claude should not be spawned without confirmation.");
    }) as unknown as typeof spawn
  });

  assert.equal(result.ok, false);
  assert.equal(result.receipt.status, "failed");
  assert.deepEqual(result.receipt.warnings, [
    "Live watcher proof requires --confirm-live; use --dry-run for a no-agent receipt."
  ]);
});

test("live watcher proof drives Codex search/resume/turn and Claude stream-json success", async () => {
  const codex = makeCodexFactory({
    threads: [{ id: "thread-1" }],
    finalText: CODEX_WATCHER_PROOF_TEXT,
    completeBeforeWait: true
  });
  const claude = makeClaudeSpawn({
    lines: [{
      type: "result",
      session_id: "claude-session-1",
      result: CLAUDE_WATCHER_PROOF_TEXT
    }]
  });

  const result = await runWatcherProof({
    ...baseLiveOptions(),
    codexThreadId: undefined,
    codexSearch: "R7M4Q9K2"
  }, {
    now: () => new Date("2026-06-30T00:00:00.000Z"),
    webSocketFactory: codex.factory,
    spawnProcess: claude.spawnProcess,
    readSecretsFile: async () => "CLAUDE_CODE_OAUTH_TOKEN='secret-token'\nUNRELATED_TOKEN=ignored\n",
    statSecretsFile: async () => ({ mode: 0o644 }),
    env: { PATH: "/usr/bin" }
  });

  assert.equal(result.ok, true);
  assert.equal(result.receipt.status, "passed");
  assert.equal(result.receipt.codex.thread_id, "thread-1");
  assert.equal(result.receipt.codex.turn_id, "turn-1");
  assert.equal(result.receipt.codex.final_text, CODEX_WATCHER_PROOF_TEXT);
  assert.equal(result.receipt.claude.session_id, "claude-session-1");
  assert.equal(result.receipt.claude.final_text, CLAUDE_WATCHER_PROOF_TEXT);
  assert.deepEqual(result.receipt.claude.warnings, [
    "Secrets env file is group/world-readable; use chmod 600."
  ]);
  assert.equal(claude.calls[0].command, "claude");
  assert.equal(claude.calls[0].env.CLAUDE_CODE_OAUTH_TOKEN, "secret-token");
  assert.equal(claude.calls[0].env.UNRELATED_TOKEN, undefined);
  assert.deepEqual(codex.sockets[0].sent.map((message) => message.method), [
    "initialize",
    "thread/list",
    "thread/resume",
    "turn/start"
  ]);
});

test("Codex thread search fails closed on zero or multiple matches", async () => {
  for (const threads of [[], [{ id: "one" }, { id: "two" }]]) {
    const codex = makeCodexFactory({
      threads,
      finalText: CODEX_WATCHER_PROOF_TEXT
    });
    const claude = makeClaudeSpawn({
      lines: [{
        type: "result",
        session_id: "claude-session",
        result: CLAUDE_WATCHER_PROOF_TEXT
      }]
    });

    const result = await runWatcherProof({
      ...baseLiveOptions(),
      codexThreadId: undefined
    }, {
      webSocketFactory: codex.factory,
      spawnProcess: claude.spawnProcess,
      readSecretsFile: async () => "",
      statSecretsFile: async () => ({ mode: 0o600 })
    });

    assert.equal(result.ok, false);
    assert.equal(result.receipt.codex.status, "failed");
    assert.match(result.receipt.codex.error ?? "", /Codex thread search/);
  }
});

test("Claude stream-json failures are reported without invoking real Claude", async () => {
  const wrongToken = await runWatcherProof(baseLiveOptions(), {
    webSocketFactory: makeCodexFactory({ finalText: CODEX_WATCHER_PROOF_TEXT }).factory,
    spawnProcess: makeClaudeSpawn({
      lines: [{
        type: "result",
        session_id: "claude-session",
        result: "WRONG"
      }]
    }).spawnProcess,
    readSecretsFile: async () => "",
    statSecretsFile: async () => ({ mode: 0o600 })
  });

  assert.equal(wrongToken.ok, false);
  assert.equal(wrongToken.receipt.claude.status, "failed");
  assert.equal(wrongToken.receipt.claude.final_text, "WRONG");

  const authError = await runWatcherProof(baseLiveOptions(), {
    webSocketFactory: makeCodexFactory({ finalText: CODEX_WATCHER_PROOF_TEXT }).factory,
    spawnProcess: makeClaudeSpawn({
      lines: [{
        type: "system",
        session_id: "claude-session",
        error: "authentication_failed"
      }, {
        type: "result",
        session_id: "claude-session",
        result: CLAUDE_WATCHER_PROOF_TEXT
      }]
    }).spawnProcess,
    readSecretsFile: async () => "",
    statSecretsFile: async () => ({ mode: 0o600 })
  });

  assert.equal(authError.ok, false);
  assert.equal(authError.receipt.claude.status, "failed");
  assert.equal(authError.receipt.claude.error, "Claude command failed.");
});

test("Claude timeout is reported and kills the child process", async () => {
  const claude = makeClaudeSpawn({
    lines: [],
    close: false
  });
  const result = await runWatcherProof({
    ...baseLiveOptions(),
    timeoutMs: 1
  }, {
    webSocketFactory: makeCodexFactory({ finalText: CODEX_WATCHER_PROOF_TEXT }).factory,
    spawnProcess: claude.spawnProcess,
    readSecretsFile: async () => "",
    statSecretsFile: async () => ({ mode: 0o600 })
  });

  assert.equal(result.ok, false);
  assert.equal(result.receipt.claude.status, "failed");
  assert.equal(result.receipt.claude.error, "Claude command timed out.");
  assert.equal(claude.calls[0].killed, true);
});

function baseLiveOptions() {
  return {
    relaySessionId: "R7M4Q9K2",
    cwd: "/repo",
    codexUrl: "ws://127.0.0.1:43210",
    codexThreadId: "codex-thread",
    codexSearch: "R7M4Q9K2",
    claudeCommand: "claude",
    claudeModel: "haiku",
    claudeMaxBudgetUsd: "0.50",
    secretsEnv: "/secrets.env",
    timeoutMs: 120000,
    dryRun: false,
    confirmLive: true
  };
}

type FakeCodexScenario = {
  threads?: Array<Record<string, unknown>>;
  finalText: string;
  completeBeforeWait?: boolean;
};

function makeCodexFactory(scenario: FakeCodexScenario) {
  const sockets: FakeCodexSocket[] = [];
  return {
    sockets,
    factory: (url: string) => {
      const socket = new FakeCodexSocket(url, scenario);
      sockets.push(socket);
      return socket;
    }
  };
}

class FakeCodexSocket {
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event: unknown) => void) | null = null;
  onclose: (() => void) | null = null;
  sent: Array<{ id: number; method: string; params: Record<string, unknown> }> = [];

  constructor(
    readonly url: string,
    private readonly scenario: FakeCodexScenario
  ) {
    queueMicrotask(() => this.onopen?.());
  }

  send(data: string): void {
    const request = JSON.parse(data) as { id: number; method: string; params: Record<string, unknown> };
    this.sent.push(request);

    if (request.method === "initialize" || request.method === "thread/resume") {
      this.respond(request.id, {});
      return;
    }

    if (request.method === "thread/list") {
      this.respond(request.id, { data: this.scenario.threads ?? [{ id: "codex-thread" }] });
      return;
    }

    if (request.method === "turn/start") {
      this.respond(request.id, { turn: { id: "turn-1" } });
      const complete = () => {
        this.notify("item/agentMessage/delta", {
          turnId: "turn-1",
          delta: this.scenario.finalText
        });
        this.notify("turn/completed", {
          turn: {
            id: "turn-1",
            status: "completed"
          }
        });
      };
      if (this.scenario.completeBeforeWait) {
        complete();
      } else {
        queueMicrotask(complete);
      }
    }
  }

  close(): void {
    this.onclose?.();
  }

  private respond(id: number, result: unknown): void {
    this.onmessage?.({ data: JSON.stringify({ id, result }) });
  }

  private notify(method: string, params: Record<string, unknown>): void {
    this.onmessage?.({ data: JSON.stringify({ method, params }) });
  }
}

type ClaudeSpawnScenario = {
  lines: Array<Record<string, unknown>>;
  close?: boolean;
};

type ClaudeSpawnCall = {
  command: string;
  args: string[];
  env: NodeJS.ProcessEnv;
  killed: boolean;
};

function makeClaudeSpawn(scenario: ClaudeSpawnScenario) {
  const calls: ClaudeSpawnCall[] = [];
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
      for (const line of scenario.lines) {
        const raw = `${JSON.stringify(line)}\n`;
        const splitAt = Math.max(1, Math.floor(raw.length / 2));
        child.stdout.emit("data", Buffer.from(raw.slice(0, splitAt)));
        child.stderr.emit("data", Buffer.from("diagnostic noise"));
        child.stdout.emit("data", Buffer.from(raw.slice(splitAt)));
      }
      if (scenario.close !== false) {
        child.emit("close", 0);
      }
    });

    return child;
  }) as unknown as typeof spawn;

  return { calls, spawnProcess };
}
