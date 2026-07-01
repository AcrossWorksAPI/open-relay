import { spawn } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

import {
  startCodexTurn,
  type WebSocketFactory
} from "./codexApp";

export const CODEX_WATCHER_PROOF_TEXT = "OPEN_RELAY_CODEX_WATCHER_PROOF_OK";
export const CLAUDE_WATCHER_PROOF_TEXT = "OPEN_RELAY_CLAUDE_WATCHER_PROOF_OK";

const DEFAULT_CODEX_URL = "ws://127.0.0.1:43210";
const DEFAULT_CLAUDE_COMMAND = "claude";
const DEFAULT_CLAUDE_MODEL = "haiku";
const DEFAULT_CLAUDE_BUDGET_USD = "0.50";
const DEFAULT_TIMEOUT_MS = 120000;
const ALLOWED_SECRET_KEYS = new Set([
  "ANTHROPIC_API_KEY",
  "CLAUDE_CODE_OAUTH_TOKEN"
]);

export type WatcherProofOptions = {
  relaySessionId: string;
  cwd: string;
  codexUrl: string;
  codexThreadId?: string;
  codexSearch: string;
  claudeCommand: string;
  claudeModel: string;
  claudeMaxBudgetUsd: string;
  secretsEnv: string;
  timeoutMs: number;
  dryRun: boolean;
  confirmLive: boolean;
};

export type WatcherProofCliOptions = WatcherProofOptions & {
  output?: string;
};

export type WatcherProofParseResult =
  | { ok: true; options: WatcherProofCliOptions }
  | { ok: false; message: string };

export type WatcherProofReceipt = {
  relay_session_id: string;
  created_at: string;
  cwd: string;
  mode: "dry-run" | "live";
  status: "dry-run" | "passed" | "failed";
  warnings?: string[];
  codex: CodexProofReceipt;
  claude: ClaudeProofReceipt;
};

export type CodexProofReceipt = {
  status: "dry-run" | "passed" | "failed";
  url: string;
  thread_id?: string;
  thread_search?: string;
  turn_id?: string;
  expected_text: string;
  final_text?: string;
  error?: string;
};

export type ClaudeProofReceipt = {
  status: "dry-run" | "passed" | "failed";
  command: string;
  model: string;
  session_id?: string;
  expected_text: string;
  final_text?: string;
  warnings?: string[];
  error?: string;
};

export type WatcherProofRunResult = {
  ok: boolean;
  receipt: WatcherProofReceipt;
};

type WatcherProofDeps = {
  now?: () => Date;
  webSocketFactory?: WebSocketFactory;
  spawnProcess?: typeof spawn;
  readSecretsFile?: (path: string) => Promise<string>;
  statSecretsFile?: (path: string) => Promise<{ mode: number }>;
  env?: NodeJS.ProcessEnv;
};

type SecretsEnvLoadResult = {
  values: Record<string, string>;
  warnings: string[];
};

export function defaultSecretsEnvPath(): string {
  return join(homedir(), ".config", "open-relay", "secrets.env");
}

export function parseWatcherProofArgs(
  args: string[],
  defaults: {
    cwd?: string;
    secretsEnv?: string;
  } = {}
): WatcherProofParseResult {
  let relaySessionId: string | undefined;
  let cwd = defaults.cwd ?? process.cwd();
  let codexUrl = DEFAULT_CODEX_URL;
  let codexThreadId: string | undefined;
  let codexSearch: string | undefined;
  let claudeCommand = DEFAULT_CLAUDE_COMMAND;
  let claudeModel = DEFAULT_CLAUDE_MODEL;
  let claudeMaxBudgetUsd = DEFAULT_CLAUDE_BUDGET_USD;
  let secretsEnv = defaults.secretsEnv ?? defaultSecretsEnvPath();
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let output: string | undefined;
  let dryRun = false;
  let confirmLive = false;

  const seen = new Set<string>();
  const valueFlags = new Set([
    "--relay-session-id",
    "--cwd",
    "--codex-url",
    "--codex-thread-id",
    "--codex-search",
    "--claude-command",
    "--claude-model",
    "--claude-max-budget-usd",
    "--secrets-env",
    "--timeout-ms",
    "--output"
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--confirm-live") {
      if (confirmLive) {
        return { ok: false, message: "Duplicate flag: --confirm-live" };
      }
      confirmLive = true;
      continue;
    }

    if (arg === "--dry-run") {
      if (dryRun) {
        return { ok: false, message: "Duplicate flag: --dry-run" };
      }
      dryRun = true;
      continue;
    }

    if (!valueFlags.has(arg)) {
      return {
        ok: false,
        message: arg.startsWith("--") ? `Unknown flag: ${arg}` : `Unexpected argument: ${arg}`
      };
    }

    if (seen.has(arg)) {
      return { ok: false, message: `Duplicate flag: ${arg}` };
    }
    seen.add(arg);

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      return { ok: false, message: `Missing value for ${arg}` };
    }

    if (arg === "--relay-session-id") {
      relaySessionId = value;
    } else if (arg === "--cwd") {
      cwd = value;
    } else if (arg === "--codex-url") {
      codexUrl = value;
    } else if (arg === "--codex-thread-id") {
      codexThreadId = value;
    } else if (arg === "--codex-search") {
      codexSearch = value;
    } else if (arg === "--claude-command") {
      claudeCommand = value;
    } else if (arg === "--claude-model") {
      claudeModel = value;
    } else if (arg === "--claude-max-budget-usd") {
      claudeMaxBudgetUsd = value;
    } else if (arg === "--secrets-env") {
      secretsEnv = value;
    } else if (arg === "--timeout-ms") {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return { ok: false, message: "Invalid timeout: expected a positive integer." };
      }
      timeoutMs = parsed;
    } else {
      output = value;
    }

    index += 1;
  }

  if (!relaySessionId) {
    return { ok: false, message: "Missing required flag: --relay-session-id" };
  }

  if (dryRun && confirmLive) {
    return { ok: false, message: "Cannot combine --dry-run and --confirm-live." };
  }

  if (!isPositiveNumberString(claudeMaxBudgetUsd)) {
    return { ok: false, message: "Invalid Claude budget: expected a positive number." };
  }

  return {
    ok: true,
    options: {
      relaySessionId,
      cwd,
      codexUrl,
      ...(codexThreadId ? { codexThreadId } : {}),
      codexSearch: codexSearch ?? relaySessionId,
      claudeCommand,
      claudeModel,
      claudeMaxBudgetUsd,
      secretsEnv,
      timeoutMs,
      dryRun,
      confirmLive,
      ...(output ? { output } : {})
    }
  };
}

export async function runWatcherProof(
  options: WatcherProofOptions,
  deps: WatcherProofDeps = {}
): Promise<WatcherProofRunResult> {
  const createdAt = (deps.now ?? (() => new Date()))().toISOString();
  const receipt: WatcherProofReceipt = {
    relay_session_id: options.relaySessionId,
    created_at: createdAt,
    cwd: options.cwd,
    mode: options.dryRun ? "dry-run" : "live",
    status: options.dryRun ? "dry-run" : "failed",
    codex: {
      status: "dry-run",
      url: options.codexUrl,
      ...(options.codexThreadId ? { thread_id: options.codexThreadId } : {}),
      ...(options.codexThreadId ? {} : { thread_search: options.codexSearch }),
      expected_text: CODEX_WATCHER_PROOF_TEXT
    },
    claude: {
      status: "dry-run",
      command: options.claudeCommand,
      model: options.claudeModel,
      expected_text: CLAUDE_WATCHER_PROOF_TEXT
    }
  };

  if (options.dryRun) {
    return { ok: true, receipt };
  }

  if (!options.confirmLive) {
    return {
      ok: false,
      receipt: {
        ...receipt,
        status: "failed",
        warnings: [
          "Live watcher proof requires --confirm-live; use --dry-run for a no-agent receipt."
        ],
        codex: {
          status: "failed",
          url: options.codexUrl,
          ...(options.codexThreadId ? { thread_id: options.codexThreadId } : {}),
          ...(options.codexThreadId ? {} : { thread_search: options.codexSearch }),
          expected_text: CODEX_WATCHER_PROOF_TEXT,
          error: "Live watcher proof was not confirmed."
        },
        claude: {
          status: "failed",
          command: options.claudeCommand,
          model: options.claudeModel,
          expected_text: CLAUDE_WATCHER_PROOF_TEXT,
          error: "Live watcher proof was not confirmed."
        }
      }
    };
  }

  const codex = await runCodexProof(options, deps).catch((error: unknown): CodexProofReceipt => ({
    status: "failed",
    url: options.codexUrl,
    ...(options.codexThreadId ? { thread_id: options.codexThreadId } : {}),
    ...(options.codexThreadId ? {} : { thread_search: options.codexSearch }),
    expected_text: CODEX_WATCHER_PROOF_TEXT,
    error: safeErrorMessage(error, "Codex watcher proof failed.")
  }));
  receipt.codex = codex;

  const claude = await runClaudeProof(options, deps).catch((error: unknown): ClaudeProofReceipt => ({
    status: "failed",
    command: options.claudeCommand,
    model: options.claudeModel,
    expected_text: CLAUDE_WATCHER_PROOF_TEXT,
    error: safeErrorMessage(error, "Claude watcher proof failed.")
  }));
  receipt.claude = claude;
  receipt.status = receipt.codex.status === "passed" && receipt.claude.status === "passed"
    ? "passed"
    : "failed";

  return {
    ok: receipt.status === "passed",
    receipt
  };
}

export async function loadSecretsEnvFile(
  path: string,
  readSecretsFile: (path: string) => Promise<string> = (filePath) => readFile(filePath, "utf8"),
  statSecretsFile: (path: string) => Promise<{ mode: number }> = (filePath) => stat(filePath)
): Promise<SecretsEnvLoadResult> {
  const warnings: string[] = [];
  try {
    const stats = await statSecretsFile(path);
    if ((stats.mode & 0o077) !== 0) {
      warnings.push("Secrets env file is group/world-readable; use chmod 600.");
    }
    return {
      values: parseSecretsEnvText(await readSecretsFile(path)),
      warnings
    };
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return { values: {}, warnings: [] };
    }
    throw error;
  }
}

export function parseSecretsEnvText(raw: string): Record<string, string> {
  const parsed: Record<string, string> = {};
  const lines = raw.split(/\r?\n/);

  for (const [lineIndex, originalLine] of lines.entries()) {
    let line = originalLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }
    if (line.startsWith("export ")) {
      line = line.slice("export ".length).trim();
    }

    const separator = line.indexOf("=");
    if (separator <= 0) {
      throw new Error(`Invalid secrets env line ${lineIndex + 1}.`);
    }

    const key = line.slice(0, separator).trim();
    if (!/^[A-Z_][A-Z0-9_]*$/.test(key)) {
      throw new Error(`Invalid secrets env key on line ${lineIndex + 1}.`);
    }

    if (!ALLOWED_SECRET_KEYS.has(key)) {
      continue;
    }

    parsed[key] = stripMatchingQuotes(line.slice(separator + 1).trim());
  }

  return parsed;
}

function stripMatchingQuotes(value: string): string {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === "\"" && last === "\"") || (first === "'" && last === "'")) {
      return value.slice(1, -1);
    }
  }
  return value;
}

async function runCodexProof(
  options: WatcherProofOptions,
  deps: WatcherProofDeps
): Promise<CodexProofReceipt> {
  const prompt = `Relay Session ID: ${options.relaySessionId}. Open Relay Codex watcher proof. Reply exactly: ${CODEX_WATCHER_PROOF_TEXT}`;
  const turn = await startCodexTurn({
    url: options.codexUrl,
    timeoutMs: options.timeoutMs,
    cwd: options.cwd,
    prompt,
    clientName: "open-relay-watcher-proof",
    ...(options.codexThreadId ? { threadId: options.codexThreadId } : { threadSearch: options.codexSearch }),
    ...(deps.webSocketFactory ? { webSocketFactory: deps.webSocketFactory } : {})
  });
  const finalText = turn.finalText.trim();

  if (turn.status !== "completed" || finalText !== CODEX_WATCHER_PROOF_TEXT) {
    return {
      status: "failed",
      url: options.codexUrl,
      thread_id: turn.threadId,
      turn_id: turn.turnId,
      expected_text: CODEX_WATCHER_PROOF_TEXT,
      final_text: finalText,
      error: "Codex watcher proof did not return the expected text."
    };
  }

  return {
    status: "passed",
    url: options.codexUrl,
    thread_id: turn.threadId,
    turn_id: turn.turnId,
    expected_text: CODEX_WATCHER_PROOF_TEXT,
    final_text: finalText
  };
}

async function runClaudeProof(
  options: WatcherProofOptions,
  deps: WatcherProofDeps
): Promise<ClaudeProofReceipt> {
  const prompt = `Relay Session ID: ${options.relaySessionId}. Headless Claude watcher proof. Reply exactly: ${CLAUDE_WATCHER_PROOF_TEXT}`;
  const secrets = await loadSecretsEnvFile(
    options.secretsEnv,
    deps.readSecretsFile ?? ((filePath) => readFile(filePath, "utf8")),
    deps.statSecretsFile ?? ((filePath) => stat(filePath))
  );
  const args = buildClaudeProofArgs({
    prompt,
    model: options.claudeModel,
    maxBudgetUsd: options.claudeMaxBudgetUsd
  });
  const result = await runClaudeCommand({
    command: options.claudeCommand,
    args,
    cwd: options.cwd,
    timeoutMs: options.timeoutMs,
    env: {
      ...(deps.env ?? process.env),
      ...secrets.values
    },
    spawnProcess: deps.spawnProcess ?? spawn
  });

  const finalText = result.finalText.trim();
  if (result.exitCode !== 0 || result.isError) {
    return {
      status: "failed",
      command: options.claudeCommand,
      model: options.claudeModel,
      ...(result.sessionId ? { session_id: result.sessionId } : {}),
      expected_text: CLAUDE_WATCHER_PROOF_TEXT,
      ...(finalText ? { final_text: finalText } : {}),
      ...(secrets.warnings.length > 0 ? { warnings: secrets.warnings } : {}),
      error: "Claude command failed."
    };
  }

  if (finalText !== CLAUDE_WATCHER_PROOF_TEXT) {
    return {
      status: "failed",
      command: options.claudeCommand,
      model: options.claudeModel,
      ...(result.sessionId ? { session_id: result.sessionId } : {}),
      expected_text: CLAUDE_WATCHER_PROOF_TEXT,
      final_text: finalText,
      ...(secrets.warnings.length > 0 ? { warnings: secrets.warnings } : {}),
      error: "Claude watcher proof did not return the expected text."
    };
  }

  return {
    status: "passed",
    command: options.claudeCommand,
    model: options.claudeModel,
    ...(result.sessionId ? { session_id: result.sessionId } : {}),
    expected_text: CLAUDE_WATCHER_PROOF_TEXT,
    final_text: finalText,
    ...(secrets.warnings.length > 0 ? { warnings: secrets.warnings } : {})
  };
}

export function buildClaudeProofArgs(input: {
  prompt: string;
  model: string;
  maxBudgetUsd: string;
}): string[] {
  return [
    "-p",
    input.prompt,
    "--model",
    input.model,
    "--output-format",
    "stream-json",
    "--verbose",
    "--max-budget-usd",
    input.maxBudgetUsd
  ];
}

type ClaudeCommandResult = {
  exitCode: number | null;
  finalText: string;
  sessionId?: string;
  isError: boolean;
};

function runClaudeCommand(input: {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  env: NodeJS.ProcessEnv;
  spawnProcess: typeof spawn;
}): Promise<ClaudeCommandResult> {
  return new Promise((resolve, reject) => {
    const child = input.spawnProcess(input.command, input.args, {
      cwd: input.cwd,
      env: input.env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdoutBuffer = "";
    let finalText = "";
    let sessionId: string | undefined;
    let isError = false;

    const timer = setTimeout(() => {
      child.kill();
      reject(new Error("Claude command timed out."));
    }, input.timeoutMs);

    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.stderr?.on("data", () => {
      // Drain stderr so a verbose CLI cannot block on a full pipe.
    });

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString("utf8");
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() ?? "";
      for (const line of lines) {
        const parsed = parseJsonLine(line);
        if (parsed) {
          const event = parseClaudeEvent(parsed);
          if (event.finalText !== undefined) {
            finalText = event.finalText;
          }
          if (event.sessionId) {
            sessionId = event.sessionId;
          }
          if (event.isError) {
            isError = true;
          }
        }
      }
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      const parsed = parseJsonLine(stdoutBuffer);
      if (parsed) {
        const event = parseClaudeEvent(parsed);
        if (event.finalText !== undefined) {
          finalText = event.finalText;
        }
        if (event.sessionId) {
          sessionId = event.sessionId;
        }
        if (event.isError) {
          isError = true;
        }
      }

      resolve({
        exitCode,
        finalText,
        ...(sessionId ? { sessionId } : {}),
        isError
      });
    });
  });
}

function parseClaudeEvent(value: unknown): {
  finalText?: string;
  sessionId?: string;
  isError: boolean;
} {
  if (!isRecord(value)) {
    return { isError: false };
  }

  const sessionId = typeof value.session_id === "string" ? value.session_id : undefined;
  const isError = value.is_error === true || value.error === "authentication_failed";
  if (value.type === "result" && typeof value.result === "string") {
    return {
      finalText: value.result,
      ...(sessionId ? { sessionId } : {}),
      isError
    };
  }

  return {
    ...(sessionId ? { sessionId } : {}),
    isError
  };
}

function parseJsonLine(line: string): unknown | undefined {
  const trimmed = line.trim();
  if (!trimmed) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return undefined;
  }
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPositiveNumberString(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function safeErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }
  return error.message || fallback;
}

function isErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}
