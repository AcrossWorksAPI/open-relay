import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir as fsMkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { renderPacketMarkdown } from "./renderPacket";
import { renderPacketForTemplate } from "./renderPrompt";
import type { ReviewRequestPacket } from "./reviewRequest";
import type { ReviewResponsePacket } from "./reviewResponse";
import {
  buildReviewResponsePacket,
  validateReviewResponseDraftKeys,
  type ReviewResponseDraft
} from "./reviewResponseProducer";
import { validatePacket } from "./schema";
import { runGh as defaultRunGh } from "./transport/gh";
import {
  fetchPacketFromGithubPr,
  parseGithubPrTarget,
  sendPacketToGithubPr,
  type RunGh
} from "./transport/githubPr";
import {
  defaultSecretsEnvPath,
  loadSecretsEnvFile
} from "./watcherProof";

const DEFAULT_CLAUDE_COMMAND = "claude";
const DEFAULT_CLAUDE_MODEL = "haiku";
const DEFAULT_CLAUDE_BUDGET_USD = "0.50";
const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_INTERVAL_MS = 30000;
const DEFAULT_MAX_POSTS = 1;
const MIN_INTERVAL_MS = 5000;

export type RelayWatchOptions = {
  pr: string;
  author: string;
  relaySessionId?: string;
  cwd: string;
  stateFile: string;
  claudeCommand: string;
  claudeModel: string;
  claudeMaxBudgetUsd: string;
  secretsEnv: string;
  timeoutMs: number;
  intervalMs: number;
  maxPosts: number;
  watch: boolean;
  dryRun: boolean;
  confirmLive: boolean;
  confirmPublic: boolean;
  force: boolean;
  update: boolean;
};

export type RelayWatchCliOptions = RelayWatchOptions & {
  output?: string;
};

export type RelayWatchParseResult =
  | { ok: true; options: RelayWatchCliOptions }
  | { ok: false; message: string };

export type RelayWatchReceipt = {
  relay_session_id?: string;
  created_at: string;
  pr: string;
  packet_author: string;
  mode: "dry-run" | "live";
  status: "dry-run" | "skipped" | "posted" | "updated" | "failed";
  state_file: string;
  request?: {
    comment_id: number;
    head_commit: string;
    repository: string;
    working_branch: string;
  };
  claude?: {
    command: string;
    model: string;
    session_id?: string;
    prompt_sha256?: string;
    prompt_preview?: string;
    warnings?: string[];
  };
  response?: {
    packet_type: "review-response";
    packet_version: "0.1";
    outcome: ReviewResponsePacket["outcome"];
    findings: number;
  };
  reason?: string;
  error?: string;
};

export type RelayWatchRunResult = {
  ok: boolean;
  receipt: RelayWatchReceipt;
};

type RelayWatchDeps = {
  now?: () => Date;
  runGh?: RunGh;
  spawnProcess?: typeof spawn;
  readSecretsFile?: (path: string) => Promise<string>;
  statSecretsFile?: (path: string) => Promise<{ mode: number }>;
  readStateFile?: (path: string) => Promise<string>;
  writeStateFile?: (path: string, value: string) => Promise<void>;
  mkdir?: (path: string) => Promise<void>;
  env?: NodeJS.ProcessEnv;
};

type RelayWatchState = {
  last_handled_request?: {
    comment_id: number;
    head_commit: string;
    response_status: "posted" | "updated";
    response_outcome: ReviewResponsePacket["outcome"];
    handled_at: string;
  };
};

type ClaudeReviewResult = {
  exitCode: number | null;
  finalText: string;
  sessionId?: string;
  warnings: string[];
  isError: boolean;
};

export function parseRelayWatchArgs(
  args: string[],
  defaults: {
    cwd?: string;
    secretsEnv?: string;
  } = {}
): RelayWatchParseResult {
  let pr: string | undefined;
  let author: string | undefined;
  let relaySessionId: string | undefined;
  let cwd = defaults.cwd ?? process.cwd();
  let stateFile: string | undefined;
  let claudeCommand = DEFAULT_CLAUDE_COMMAND;
  let claudeModel = DEFAULT_CLAUDE_MODEL;
  let claudeMaxBudgetUsd = DEFAULT_CLAUDE_BUDGET_USD;
  let secretsEnv = defaults.secretsEnv ?? defaultSecretsEnvPath();
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let intervalMs = DEFAULT_INTERVAL_MS;
  let maxPosts = DEFAULT_MAX_POSTS;
  let output: string | undefined;
  let watch = false;
  let dryRun = false;
  let confirmLive = false;
  let confirmPublic = false;
  let force = false;
  let update = false;

  const seen = new Set<string>();
  const valueFlags = new Set([
    "--pr",
    "--author",
    "--relay-session-id",
    "--cwd",
    "--state-file",
    "--claude-command",
    "--claude-model",
    "--claude-max-budget-usd",
    "--secrets-env",
    "--timeout-ms",
    "--interval-ms",
    "--max-posts",
    "--output"
  ]);
  const booleanFlags = new Set([
    "--watch",
    "--dry-run",
    "--confirm-live",
    "--confirm-public",
    "--force",
    "--update",
    "--no-update"
  ]);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (booleanFlags.has(arg)) {
      if (seen.has(arg)) {
        return { ok: false, message: `Duplicate flag: ${arg}` };
      }
      seen.add(arg);

      if (arg === "--watch") {
        watch = true;
      } else if (arg === "--dry-run") {
        dryRun = true;
      } else if (arg === "--confirm-live") {
        confirmLive = true;
      } else if (arg === "--confirm-public") {
        confirmPublic = true;
      } else if (arg === "--force") {
        force = true;
      } else if (arg === "--update") {
        update = true;
      } else {
        update = false;
      }
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

    if (arg === "--pr") {
      pr = value;
    } else if (arg === "--author") {
      author = value;
    } else if (arg === "--relay-session-id") {
      relaySessionId = value;
    } else if (arg === "--cwd") {
      cwd = value;
    } else if (arg === "--state-file") {
      stateFile = value;
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
    } else if (arg === "--interval-ms") {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < MIN_INTERVAL_MS) {
        return { ok: false, message: `Invalid interval: expected an integer of at least ${MIN_INTERVAL_MS}.` };
      }
      intervalMs = parsed;
    } else if (arg === "--max-posts") {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return { ok: false, message: "Invalid max posts: expected a positive integer." };
      }
      maxPosts = parsed;
    } else {
      output = value;
    }

    index += 1;
  }

  if (!pr) {
    return { ok: false, message: "Missing required flag: --pr" };
  }
  if (!author) {
    return { ok: false, message: "Missing required flag: --author" };
  }
  if (dryRun && (confirmLive || confirmPublic)) {
    return { ok: false, message: "Cannot combine --dry-run and live confirmation flags." };
  }
  if (seen.has("--update") && seen.has("--no-update")) {
    return { ok: false, message: "Cannot combine --update and --no-update." };
  }
  if (!isPositiveNumberString(claudeMaxBudgetUsd)) {
    return { ok: false, message: "Invalid Claude budget: expected a positive number." };
  }

  let defaultStateFile: string;
  try {
    defaultStateFile = defaultRelayWatchStateFile(cwd, pr);
  } catch {
    return { ok: false, message: "Invalid GitHub pull request target." };
  }

  return {
    ok: true,
    options: {
      pr,
      author,
      ...(relaySessionId ? { relaySessionId } : {}),
      cwd,
      stateFile: stateFile ?? defaultStateFile,
      claudeCommand,
      claudeModel,
      claudeMaxBudgetUsd,
      secretsEnv,
      timeoutMs,
      intervalMs,
      maxPosts,
      watch,
      dryRun,
      confirmLive,
      confirmPublic,
      force,
      update,
      ...(output ? { output } : {})
    }
  };
}

export async function runRelayWatchOnce(
  options: RelayWatchOptions,
  deps: RelayWatchDeps = {}
): Promise<RelayWatchRunResult> {
  const now = deps.now ?? (() => new Date());
  const createdAt = now().toISOString();
  const receipt: RelayWatchReceipt = {
    ...(options.relaySessionId ? { relay_session_id: options.relaySessionId } : {}),
    created_at: createdAt,
    pr: options.pr,
    packet_author: options.author,
    mode: options.dryRun ? "dry-run" : "live",
    status: "failed",
    state_file: options.stateFile
  };

  try {
    const found = fetchPacketFromGithubPr({
      prTarget: options.pr,
      packetType: "review-request",
      packetVersion: "0.1",
      author: options.author,
      runGh: deps.runGh ?? defaultRunGh
    });
    const requestValidation = validatePacket(found.packet);
    if (!requestValidation.valid || found.packet.packet_type !== "review-request") {
      return failed(receipt, "Fetched Open Relay review-request failed validation.");
    }

    const request = found.packet as unknown as ReviewRequestPacket;
    const requestIdentity = {
      comment_id: found.comment.id,
      head_commit: request.repository.head_commit,
      repository: request.repository.name,
      working_branch: request.repository.working_branch
    };
    receipt.request = requestIdentity;

    const state = await readRelayWatchState(options.stateFile, deps);
    if (!options.force && state.last_handled_request?.comment_id === requestIdentity.comment_id
      && state.last_handled_request.head_commit === requestIdentity.head_commit) {
      return {
        ok: true,
        receipt: {
          ...receipt,
          status: "skipped",
          reason: "Review request already handled."
        }
      };
    }

    const prompt = buildRelayWatchClaudePrompt({
      request,
      relaySessionId: options.relaySessionId
    });
    const promptInfo = {
      command: options.claudeCommand,
      model: options.claudeModel,
      prompt_sha256: sha256(prompt),
      prompt_preview: prompt.slice(0, 1000)
    };
    receipt.claude = promptInfo;

    if (options.dryRun) {
      return {
        ok: true,
        receipt: {
          ...receipt,
          status: "dry-run"
        }
      };
    }

    if (!options.confirmLive) {
      return failed(receipt, "Relay watch live mode requires --confirm-live before invoking Claude.");
    }
    if (!options.confirmPublic) {
      return failed(receipt, "Relay watch posting requires --confirm-public before writing to GitHub.");
    }

    const claude = await runClaudeReview({
      prompt,
      options,
      deps
    });
    receipt.claude = {
      ...promptInfo,
      ...(claude.sessionId ? { session_id: claude.sessionId } : {}),
      ...(claude.warnings.length > 0 ? { warnings: claude.warnings } : {})
    };
    if (claude.exitCode !== 0 || claude.isError) {
      return failed(receipt, "Claude review command failed.");
    }

    const draft = parseClaudeReviewDraft(claude.finalText);
    const response = buildReviewResponsePacket({
      request,
      draft,
      createdAt
    });
    const responseValidation = validatePacket(response);
    if (!responseValidation.valid) {
      return failed(receipt, "Generated review-response packet failed validation.");
    }

    const sent = sendPacketToGithubPr({
      prTarget: options.pr,
      packet: response as unknown as Record<string, unknown>,
      markdown: renderPacketMarkdown(response as unknown as Record<string, unknown>),
      dryRun: false,
      update: options.update,
      confirmPublic: options.confirmPublic,
      runGh: deps.runGh ?? defaultRunGh
    });
    const status = sent.kind === "updated" ? "updated" : "posted";

    await writeRelayWatchState(options.stateFile, {
      last_handled_request: {
        comment_id: requestIdentity.comment_id,
        head_commit: requestIdentity.head_commit,
        response_status: status,
        response_outcome: response.outcome,
        handled_at: createdAt
      }
    }, deps);

    return {
      ok: true,
      receipt: {
        ...receipt,
        status,
        response: {
          packet_type: "review-response",
          packet_version: "0.1",
          outcome: response.outcome,
          findings: response.findings.length
        }
      }
    };
  } catch (error: unknown) {
    return failed(receipt, safeErrorMessage(error, "Relay watch failed."));
  }
}

export function defaultRelayWatchStateFile(cwd: string, pr: string): string {
  const target = parseGithubPrTarget(pr);
  return join(
    cwd,
    ".open-relay",
    "relay-watch",
    `${safeSegment(target.owner)}-${safeSegment(target.repo)}-${target.pullNumber}.json`
  );
}

export function buildRelayWatchClaudePrompt(input: {
  request: ReviewRequestPacket;
  relaySessionId?: string;
}): string {
  const rendered = renderPacketForTemplate({
    packet: input.request as unknown as Record<string, unknown>,
    template: "claude"
  });
  const sessionLine = input.relaySessionId
    ? `Relay Session ID: ${input.relaySessionId}.`
    : "Relay Session ID: Unknown; no relay session id was provided.";

  return [
    sessionLine,
    "You are running under Open Relay local relay-watch.",
    "Return exactly one JSON object for an Open Relay review-response draft.",
    "Do not wrap the JSON in Markdown fences.",
    "Do not include Open Relay-owned fields: packet_type, packet_version, created_at, or response_to.",
    "Allowed top-level keys: reviewer, outcome, confidence, summary, findings, reviewed_scope, verification, provenance, redactions, sensitive_data, next_action.",
    "Use reviewer.name \"Claude\", reviewer.kind \"agent\", and reviewer.tool \"Open Relay local relay-watch\" unless the packet requires a more specific reviewer label.",
    "",
    rendered
  ].join("\n");
}

function parseClaudeReviewDraft(text: string): ReviewResponseDraft {
  const candidate = extractJsonObjectText(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("Claude review draft was not valid JSON.");
  }

  if (!isRecord(parsed)) {
    throw new Error("Claude review draft was not a JSON object.");
  }

  const keyValidation = validateReviewResponseDraftKeys(parsed);
  if (!keyValidation.ok) {
    throw new Error(keyValidation.reason === "reserved"
      ? "Claude review draft included reserved Open Relay fields."
      : "Claude review draft included unknown fields.");
  }

  return parsed as ReviewResponseDraft;
}

function extractJsonObjectText(text: string): string {
  const trimmed = text.trim();
  const fence = /```(?:json)?\s*([\s\S]*?)\s*```/.exec(trimmed);
  if (fence) {
    return fence[1].trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Claude review draft was not valid JSON.");
  }
  return trimmed.slice(start, end + 1);
}

async function runClaudeReview(input: {
  prompt: string;
  options: RelayWatchOptions;
  deps: RelayWatchDeps;
}): Promise<ClaudeReviewResult> {
  const secrets = await loadSecretsEnvFile(
    input.options.secretsEnv,
    input.deps.readSecretsFile ?? ((filePath) => readFile(filePath, "utf8")),
    input.deps.statSecretsFile ?? ((filePath) => stat(filePath))
  );

  const result = await runClaudeCommand({
    command: input.options.claudeCommand,
    args: [
      "-p",
      input.prompt,
      "--model",
      input.options.claudeModel,
      "--output-format",
      "stream-json",
      "--verbose",
      "--max-budget-usd",
      input.options.claudeMaxBudgetUsd
    ],
    cwd: input.options.cwd,
    timeoutMs: input.options.timeoutMs,
    env: {
      ...(input.deps.env ?? process.env),
      ...secrets.values
    },
    spawnProcess: input.deps.spawnProcess ?? spawn
  });

  return {
    ...result,
    warnings: secrets.warnings
  };
}

function runClaudeCommand(input: {
  command: string;
  args: string[];
  cwd: string;
  timeoutMs: number;
  env: NodeJS.ProcessEnv;
  spawnProcess: typeof spawn;
}): Promise<ClaudeReviewResult> {
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
      reject(new Error("Claude review command timed out."));
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
        const event = parseClaudeEvent(line);
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
    });

    child.on("close", (exitCode) => {
      clearTimeout(timer);
      const event = parseClaudeEvent(stdoutBuffer);
      if (event.finalText !== undefined) {
        finalText = event.finalText;
      }
      if (event.sessionId) {
        sessionId = event.sessionId;
      }
      if (event.isError) {
        isError = true;
      }
      resolve({
        exitCode,
        finalText,
        ...(sessionId ? { sessionId } : {}),
        warnings: [],
        isError
      });
    });
  });
}

function parseClaudeEvent(line: string): {
  finalText?: string;
  sessionId?: string;
  isError: boolean;
} {
  const trimmed = line.trim();
  if (!trimmed) {
    return { isError: false };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { isError: false };
  }

  if (!isRecord(parsed)) {
    return { isError: false };
  }

  const sessionId = typeof parsed.session_id === "string" ? parsed.session_id : undefined;
  const isError = parsed.is_error === true || parsed.error === "authentication_failed";
  if (parsed.type === "result" && typeof parsed.result === "string") {
    return {
      finalText: parsed.result,
      ...(sessionId ? { sessionId } : {}),
      isError
    };
  }

  return {
    ...(sessionId ? { sessionId } : {}),
    isError
  };
}

async function readRelayWatchState(path: string, deps: RelayWatchDeps): Promise<RelayWatchState> {
  const readStateFile = deps.readStateFile ?? ((filePath) => readFile(filePath, "utf8"));
  try {
    const raw = await readStateFile(path);
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }
    return parsed as RelayWatchState;
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return {};
    }
    if (error instanceof SyntaxError) {
      throw new Error("Relay watch state file was not valid JSON.");
    }
    throw error;
  }
}

async function writeRelayWatchState(
  path: string,
  state: RelayWatchState,
  deps: RelayWatchDeps
): Promise<void> {
  const mkdir = deps.mkdir ?? ((dirPath) => fsMkdir(dirPath, { recursive: true }).then(() => undefined));
  const writeStateFile = deps.writeStateFile ?? ((filePath, value) => writeFile(filePath, value, "utf8"));
  await mkdir(dirname(path));
  await writeStateFile(path, `${JSON.stringify(state, null, 2)}\n`);
}

function failed(receipt: RelayWatchReceipt, error: string): RelayWatchRunResult {
  return {
    ok: false,
    receipt: {
      ...receipt,
      status: "failed",
      error
    }
  };
}

function safeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]+/g, "-");
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
