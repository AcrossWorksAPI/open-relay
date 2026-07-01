import { createHash } from "node:crypto";
import { mkdir as fsMkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import {
  startCodexTurn as defaultStartCodexTurn,
  type CodexTurnResult,
  type StartCodexTurnInput
} from "./codexApp";
import { renderPacketForTemplate } from "./renderPrompt";
import type { ResumeProjectPacket, ResumeProjectStatus } from "./resumeProject";
import { buildResumeProjectPacket } from "./resumeProjectProducer";
import type { ReviewResponsePacket } from "./reviewResponse";
import { validatePacket } from "./schema";
import { runGh as defaultRunGh } from "./transport/gh";
import {
  fetchPacketFromGithubPr,
  parseGithubPrTarget,
  type RunGh
} from "./transport/githubPr";

const DEFAULT_CODEX_URL = "ws://127.0.0.1:43210";
const DEFAULT_TIMEOUT_MS = 120000;
const DEFAULT_INTERVAL_MS = 30000;
const DEFAULT_MAX_TURNS = 1;
const DEFAULT_MAX_FAILURES = 1;
const MIN_INTERVAL_MS = 5000;

export type ResponseWatchOptions = {
  pr: string;
  author: string;
  relaySessionId?: string;
  cwd: string;
  stateFile: string;
  codexUrl: string;
  codexThreadId?: string;
  codexSearch: string;
  timeoutMs: number;
  intervalMs: number;
  maxTurns: number;
  maxFailures: number;
  watch: boolean;
  dryRun: boolean;
  confirmLive: boolean;
  force: boolean;
};

export type ResponseWatchCliOptions = ResponseWatchOptions & {
  output?: string;
};

export type ResponseWatchParseResult =
  | { ok: true; options: ResponseWatchCliOptions }
  | { ok: false; message: string };

export type ResponseWatchReceipt = {
  relay_session_id?: string;
  created_at: string;
  pr: string;
  packet_author: string;
  mode: "dry-run" | "live";
  status: "dry-run" | "skipped" | "completed" | "failed";
  state_file: string;
  response?: {
    comment_id: number;
    response_created_at: string;
    head_commit: string;
    repository: string;
    working_branch: string;
    outcome: ReviewResponsePacket["outcome"];
    findings: number;
  };
  resume?: {
    packet_type: "resume-project";
    packet_version: "0.1";
    resume_status: ResumeProjectStatus;
    tasks: number;
  };
  codex?: {
    status?: string;
    url: string;
    thread_id?: string;
    thread_search?: string;
    turn_id?: string;
    prompt_sha256?: string;
    prompt_preview?: string;
    final_text?: string;
    error?: string;
  };
  reason?: string;
  error?: string;
};

export type ResponseWatchRunResult = {
  ok: boolean;
  receipt: ResponseWatchReceipt;
};

type ResponseWatchDeps = {
  now?: () => Date;
  runGh?: RunGh;
  startCodexTurn?: (input: StartCodexTurnInput) => Promise<CodexTurnResult>;
  readStateFile?: (path: string) => Promise<string>;
  writeStateFile?: (path: string, value: string) => Promise<void>;
  mkdir?: (path: string) => Promise<void>;
};

type ResponseWatchState = {
  last_handled_response?: {
    comment_id: number;
    head_commit: string;
    response_created_at: string;
    codex_status: string;
    handled_at: string;
  };
};

export function parseResponseWatchArgs(
  args: string[],
  defaults: {
    cwd?: string;
  } = {}
): ResponseWatchParseResult {
  let pr: string | undefined;
  let author: string | undefined;
  let relaySessionId: string | undefined;
  let cwd = defaults.cwd ?? process.cwd();
  let stateFile: string | undefined;
  let codexUrl = DEFAULT_CODEX_URL;
  let codexThreadId: string | undefined;
  let codexSearch: string | undefined;
  let timeoutMs = DEFAULT_TIMEOUT_MS;
  let intervalMs = DEFAULT_INTERVAL_MS;
  let maxTurns = DEFAULT_MAX_TURNS;
  let maxFailures = DEFAULT_MAX_FAILURES;
  let output: string | undefined;
  let watch = false;
  let dryRun = false;
  let confirmLive = false;
  let force = false;

  const seen = new Set<string>();
  const valueFlags = new Set([
    "--pr",
    "--author",
    "--relay-session-id",
    "--cwd",
    "--state-file",
    "--codex-url",
    "--codex-thread-id",
    "--codex-search",
    "--timeout-ms",
    "--interval-ms",
    "--max-turns",
    "--max-failures",
    "--output"
  ]);
  const booleanFlags = new Set([
    "--watch",
    "--dry-run",
    "--confirm-live",
    "--force"
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
      } else {
        force = true;
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
    } else if (arg === "--codex-url") {
      codexUrl = value;
    } else if (arg === "--codex-thread-id") {
      codexThreadId = value;
    } else if (arg === "--codex-search") {
      codexSearch = value;
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
    } else if (arg === "--max-turns") {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return { ok: false, message: "Invalid max turns: expected a positive integer." };
      }
      maxTurns = parsed;
    } else if (arg === "--max-failures") {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return { ok: false, message: "Invalid max failures: expected a positive integer." };
      }
      maxFailures = parsed;
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
  if (dryRun && confirmLive) {
    return { ok: false, message: "Cannot combine --dry-run and --confirm-live." };
  }

  let defaultStateFile: string;
  try {
    defaultStateFile = defaultResponseWatchStateFile(cwd, pr);
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
      codexUrl,
      ...(codexThreadId ? { codexThreadId } : {}),
      codexSearch: codexSearch ?? relaySessionId ?? pr,
      timeoutMs,
      intervalMs,
      maxTurns,
      maxFailures,
      watch,
      dryRun,
      confirmLive,
      force,
      ...(output ? { output } : {})
    }
  };
}

export async function runResponseWatchOnce(
  options: ResponseWatchOptions,
  deps: ResponseWatchDeps = {}
): Promise<ResponseWatchRunResult> {
  const now = deps.now ?? (() => new Date());
  const createdAt = now().toISOString();
  const receipt: ResponseWatchReceipt = {
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
      packetType: "review-response",
      packetVersion: "0.1",
      author: options.author,
      runGh: deps.runGh ?? defaultRunGh
    });
    const responseValidation = validatePacket(found.packet);
    if (!responseValidation.valid || found.packet.packet_type !== "review-response") {
      return failed(receipt, "Fetched Open Relay review-response failed validation.");
    }

    const response = found.packet as unknown as ReviewResponsePacket;
    const responseIdentity = {
      comment_id: found.comment.id,
      response_created_at: response.created_at,
      head_commit: response.response_to.head_commit,
      repository: response.response_to.repository,
      working_branch: response.response_to.working_branch,
      outcome: response.outcome,
      findings: response.findings.length
    };
    receipt.response = responseIdentity;

    const resume = buildResumeProjectPacket({
      response,
      createdAt
    });
    receipt.resume = {
      packet_type: "resume-project",
      packet_version: "0.1",
      resume_status: resume.resume_status,
      tasks: resume.tasks.length
    };

    const prompt = buildResponseWatchCodexPrompt({
      response,
      relaySessionId: options.relaySessionId,
      createdAt
    });
    receipt.codex = {
      url: options.codexUrl,
      ...(options.codexThreadId ? { thread_id: options.codexThreadId } : { thread_search: options.codexSearch }),
      prompt_sha256: sha256(prompt),
      prompt_preview: prompt.slice(0, 1000)
    };

    const state = await readResponseWatchState(options.stateFile, deps);
    if (!options.force && state.last_handled_response?.comment_id === responseIdentity.comment_id
      && state.last_handled_response.head_commit === responseIdentity.head_commit
      && state.last_handled_response.response_created_at === responseIdentity.response_created_at) {
      return {
        ok: true,
        receipt: {
          ...receipt,
          status: "skipped",
          reason: "Review response already handled."
        }
      };
    }

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
      return failed(receipt, "Response watch live mode requires --confirm-live before waking Codex.");
    }

    const codex = await (deps.startCodexTurn ?? defaultStartCodexTurn)({
      url: options.codexUrl,
      timeoutMs: options.timeoutMs,
      cwd: options.cwd,
      prompt,
      ...(options.codexThreadId ? { threadId: options.codexThreadId } : { threadSearch: options.codexSearch }),
      clientName: "open-relay-response-watch"
    });
    receipt.codex = {
      ...receipt.codex,
      status: codex.status,
      thread_id: codex.threadId,
      turn_id: codex.turnId,
      final_text: codex.finalText
    };
    if (codex.status !== "completed") {
      return failed(receipt, "Codex turn did not complete.");
    }

    await writeResponseWatchState(options.stateFile, {
      last_handled_response: {
        comment_id: responseIdentity.comment_id,
        head_commit: responseIdentity.head_commit,
        response_created_at: responseIdentity.response_created_at,
        codex_status: codex.status,
        handled_at: createdAt
      }
    }, deps);

    return {
      ok: true,
      receipt: {
        ...receipt,
        status: "completed"
      }
    };
  } catch (error: unknown) {
    return failed(receipt, safeErrorMessage(error, "Response watch failed."));
  }
}

export function defaultResponseWatchStateFile(cwd: string, pr: string): string {
  const target = parseGithubPrTarget(pr);
  return join(
    cwd,
    ".open-relay",
    "response-watch",
    `${safeSegment(target.owner)}-${safeSegment(target.repo)}-${target.pullNumber}.json`
  );
}

export function buildResponseWatchCodexPrompt(input: {
  response: ReviewResponsePacket;
  relaySessionId?: string;
  createdAt?: string;
}): string {
  const resume = buildResumeProjectPacket({
    response: input.response,
    ...(input.createdAt ? { createdAt: input.createdAt } : {})
  });
  const rendered = renderPacketForTemplate({
    packet: resume as unknown as Record<string, unknown>,
    template: "codex"
  });
  const sessionLine = input.relaySessionId
    ? `Relay Session ID: ${input.relaySessionId}.`
    : "Relay Session ID: Unknown; no relay session id was provided.";

  return [
    sessionLine,
    "You are running under Open Relay local response-watch.",
    "Use the resume-project packet as continuation context.",
    "Evaluate the response before applying any finding.",
    "",
    rendered
  ].join("\n");
}

async function readResponseWatchState(path: string, deps: ResponseWatchDeps): Promise<ResponseWatchState> {
  const readStateFile = deps.readStateFile ?? ((filePath) => readFile(filePath, "utf8"));
  try {
    const raw = await readStateFile(path);
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) {
      return {};
    }
    return parsed as ResponseWatchState;
  } catch (error: unknown) {
    if (isErrnoException(error) && error.code === "ENOENT") {
      return {};
    }
    if (error instanceof SyntaxError) {
      throw new Error("Response watch state file was not valid JSON.");
    }
    throw error;
  }
}

async function writeResponseWatchState(
  path: string,
  state: ResponseWatchState,
  deps: ResponseWatchDeps
): Promise<void> {
  const mkdir = deps.mkdir ?? ((dirPath) => fsMkdir(dirPath, { recursive: true }).then(() => undefined));
  const writeStateFile = deps.writeStateFile ?? ((filePath, value) => writeFile(filePath, value, "utf8"));
  await mkdir(dirname(path));
  await writeStateFile(path, `${JSON.stringify(state, null, 2)}\n`);
}

function failed(receipt: ResponseWatchReceipt, error: string): ResponseWatchRunResult {
  return {
    ok: false,
    receipt: {
      ...receipt,
      status: "failed",
      error
    }
  };
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function safeSegment(value: string): string {
  return value.replace(/[^A-Za-z0-9_.-]+/g, "-");
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
