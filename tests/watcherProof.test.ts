import assert from "node:assert/strict";
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
      dryRun: false
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
    "--dry-run"
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
      dryRun: true
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
    dryRun: true
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
