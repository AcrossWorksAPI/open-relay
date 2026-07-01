#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";

import { parseGenerateReviewRequestArgs, type GenerateReviewRequestOptions } from "./args";
import { collectGitContext } from "./git";
import {
  parsePrivateRedactionRules,
  type PrivateRedactionRule
} from "./privateRedactionRules";
import { renderPacketMarkdown } from "./renderPacket";
import {
  renderPacketForTemplate,
  type PromptTemplate
} from "./renderPrompt";
import { parseGenerateResumeProjectArgs } from "./resumeProjectArgs";
import type { ResumeProjectPacket } from "./resumeProject";
import { buildResumeProjectPacket } from "./resumeProjectProducer";
import {
  parseRelayWatchArgs,
  runRelayWatchOnce,
  type RelayWatchCliOptions,
  type RelayWatchReceipt
} from "./relayWatch";
import {
  parseResponseWatchArgs,
  runResponseWatchOnce,
  type ResponseWatchCliOptions,
  type ResponseWatchReceipt
} from "./responseWatch";
import {
  buildRelayWatchNotification,
  relayWatchStatusFromReceipt,
  sendMacNotification,
  writeRelayWatchStatus
} from "./relayWatchStatus";
import {
  parseGenerateReviewResponseArgs,
  parseRespondGithubPrArgs
} from "./reviewResponseArgs";
import { buildReviewRequestPacket, type ReviewRequestPacket } from "./reviewRequest";
import type { ReviewResponsePacket } from "./reviewResponse";
import {
  buildReviewResponsePacket,
  validateReviewResponseDraftKeys,
  type ReviewResponseDraft
} from "./reviewResponseProducer";
import { validatePacket, validatePacketFile } from "./schema";
import { saveReviewRequestBundle } from "./storage";
import { GH_FAILURE_MESSAGE, runGh } from "./transport/gh";
import {
  fetchPacketFromGithubPr,
  parseGithubPrTarget,
  sendPacketToGithubPr
} from "./transport/githubPr";
import {
  parseWatcherProofArgs,
  runWatcherProof
} from "./watcherProof";

const usage = `Open Relay

Usage:
  open-relay validate <packet.json>
  open-relay generate review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--format json|markdown] [--redaction-rules <path>] [--output <path>]
  open-relay generate review-response --request <review-request.json> --review <review-response-draft.json> [--format json|markdown] [--output <path>]
  open-relay generate resume-project --response <review-response.json> [--format json|markdown] [--output <path>]
  open-relay handoff review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--redaction-rules <path>] [--output <relay.md>]
  open-relay save review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--redaction-rules <path>] [--storage-dir <path>]
  open-relay render <packet.json> [--template neutral|claude|codex] [--output <relay.md>]
  open-relay render review-request <packet.json> [--template neutral|claude|codex] [--output <relay.md>]
  open-relay respond github-pr --request <review-request.json> --review <review-response-draft.json> --pr <url-or-owner/repo#number> [--dry-run] [--update] [--confirm-public]
  open-relay transport github-pr send <packet.json> --pr <url-or-owner/repo#number> [--dry-run] [--update] [--confirm-public]
  open-relay transport github-pr fetch --pr <url-or-owner/repo#number> --packet-type <type> --author <login> [--packet-version <version>] [--output <packet.json>]
  open-relay experimental watcher-proof --relay-session-id <id> [--codex-thread-id <id>|--codex-search <text>] [--codex-url <ws-url>] [--claude-command <path>] [--claude-model <model>] [--secrets-env <path>] [--output <receipt.json>] [--dry-run|--confirm-live]
  open-relay experimental relay-watch --pr <url-or-owner/repo#number> --author <login> [--relay-session-id <id>] [--state-file <path>] [--status-file <path>] [--notify] [--claude-command <path>] [--claude-model <model>] [--secrets-env <path>] [--output <receipt.json>] [--dry-run|--confirm-live --confirm-public] [--force] [--watch] [--interval-ms <ms>] [--max-posts <n>] [--max-failures <n>] [--update]
  open-relay experimental response-watch --pr <url-or-owner/repo#number> --author <login> [--relay-session-id <id>] [--state-file <path>] [--codex-url <ws-url>] [--codex-thread-id <id>|--codex-search <text>] [--output <receipt.json>] [--dry-run|--confirm-live] [--force] [--watch] [--interval-ms <ms>] [--max-turns <n>] [--max-failures <n>]
  open-relay --help

Notes:
  handoff review-request creates local review handoff Markdown; it does not send it anywhere.
  transport github-pr uses the local gh CLI; Open Relay does not read GitHub token environment variables.
  transport github-pr fetch requires --author because packet shape is not proof of authorship.
  experimental watcher-proof triggers local Codex and Claude proof turns only with --confirm-live; use --dry-run for no-agent receipts.
  experimental relay-watch fetches review-request packets from GitHub PR comments; live mode invokes Claude and posts review-response packets only with --confirm-live and --confirm-public. In --watch mode, live posting is bounded by --max-posts, default 1, and failed iterations are bounded by --max-failures, default 1. Use --status-file for local operator status JSON and --notify for macOS desktop notifications.
  experimental response-watch fetches review-response packets from GitHub PR comments; live mode resumes a local Codex thread only with --confirm-live. In --watch mode, live Codex turns are bounded by --max-turns, default 1, and failed iterations are bounded by --max-failures, default 1.
`;

export async function run(argv: string[]): Promise<number> {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    process.stdout.write(usage);
    return 0;
  }

  if (args[0] === "validate") {
    return validateCommand(args[1]);
  }

  if (args[0] === "generate" && args[1] === "review-request") {
    return generateReviewRequestCommand(args.slice(2));
  }

  if (args[0] === "generate" && args[1] === "review-response") {
    return generateReviewResponseCommand(args.slice(2));
  }

  if (args[0] === "generate" && args[1] === "resume-project") {
    return generateResumeProjectCommand(args.slice(2));
  }

  if (args[0] === "handoff" && args[1] === "review-request") {
    return handoffReviewRequestCommand(args.slice(2));
  }

  if (args[0] === "save" && args[1] === "review-request") {
    return saveReviewRequestCommand(args.slice(2));
  }

  if (args[0] === "transport" && args[1] === "github-pr" && args[2] === "send") {
    return transportGithubPrSendCommand(args.slice(3));
  }

  if (args[0] === "transport" && args[1] === "github-pr" && args[2] === "fetch") {
    return transportGithubPrFetchCommand(args.slice(3));
  }

  if (args[0] === "respond" && args[1] === "github-pr") {
    return respondGithubPrCommand(args.slice(2));
  }

  if (args[0] === "experimental" && args[1] === "watcher-proof") {
    return experimentalWatcherProofCommand(args.slice(2));
  }

  if (args[0] === "experimental" && args[1] === "relay-watch") {
    return experimentalRelayWatchCommand(args.slice(2));
  }

  if (args[0] === "experimental" && args[1] === "response-watch") {
    return experimentalResponseWatchCommand(args.slice(2));
  }

  if (args[0] === "render") {
    if (args[1] === "review-request") {
      return renderPacketCommand(args.slice(2), {
        invalidMessage: "Invalid review-request packet",
        writeErrorMessage: "Could not write review-request Markdown.",
        writeSuccessMessage: "Wrote review-request Markdown.",
        writePromptSuccessMessage: "Wrote review-request prompt.",
        renderErrorMessage: "Could not render review-request packet."
      });
    }

    return renderPacketCommand(args.slice(1), {
      invalidMessage: "Invalid packet",
      writeErrorMessage: "Could not write packet Markdown.",
      writeSuccessMessage: "Wrote packet Markdown.",
      writePromptSuccessMessage: "Wrote packet prompt.",
      renderErrorMessage: "Could not render packet."
    });
  }

  process.stderr.write(`Unknown command: ${args.join(" ")}\n\n${usage}`);
  return 2;
}

type RenderArgs =
  | { ok: true; packetPath: string; output?: string; template: PromptTemplate }
  | { ok: false; message: string };

type RenderMessages = {
  invalidMessage: string;
  writeErrorMessage: string;
  writeSuccessMessage: string;
  writePromptSuccessMessage: string;
  renderErrorMessage: string;
};

async function renderPacketCommand(args: string[], messages: RenderMessages): Promise<number> {
  const parsed = parseRenderArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  try {
    const raw = await readFile(parsed.packetPath, "utf8");
    const packet = JSON.parse(raw) as unknown;
    const result = validatePacket(packet);

    if (!result.valid) {
      process.stderr.write(`${messages.invalidMessage}: ${parsed.packetPath}\n`);
      for (const error of result.errors) {
        process.stderr.write(`- ${error}\n`);
      }
      return 1;
    }

    const markdown = renderPacketForTemplate({
      packet: packet as Record<string, unknown>,
      template: parsed.template
    });

    if (parsed.output) {
      try {
        await writeFile(parsed.output, markdown, "utf8");
      } catch {
        process.stderr.write(`${messages.writeErrorMessage}\n`);
        return 1;
      }
      const successMessage = parsed.template === "neutral"
        ? messages.writeSuccessMessage
        : messages.writePromptSuccessMessage;
      process.stdout.write(`${successMessage}\n`);
    } else {
      process.stdout.write(markdown);
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof SyntaxError
      ? `Invalid JSON in ${parsed.packetPath}`
      : messages.renderErrorMessage;

    process.stderr.write(`${message}\n`);
    return 1;
  }
}

function parseRenderArgs(args: string[]): RenderArgs {
  const packetPath = args[0];
  let output: string | undefined;
  let templateValue: string | undefined;

  if (!packetPath) {
    return { ok: false, message: "Missing packet path." };
  }

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];

    if (arg !== "--output" && arg !== "--template") {
      return {
        ok: false,
        message: arg.startsWith("--") ? `Unknown flag: ${arg}` : `Unexpected argument: ${arg}`
      };
    }

    const isOutput = arg === "--output";
    const flag = isOutput ? "--output" : "--template";

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      return { ok: false, message: `Missing value for ${flag}` };
    }

    if (isOutput) {
      if (output) {
        return { ok: false, message: "Duplicate flag: --output" };
      }

      output = value;
    } else {
      if (templateValue) {
        return { ok: false, message: "Duplicate flag: --template" };
      }

      templateValue = value;
    }

    index += 1;
  }

  const template = parsePromptTemplate(templateValue);
  if (!template) {
    return { ok: false, message: `Invalid template: ${templateValue}` };
  }

  return { ok: true, packetPath, template, ...(output ? { output } : {}) };
}

function parsePromptTemplate(value: string | undefined): PromptTemplate | undefined {
  if (value === undefined) {
    return "neutral";
  }

  if (value === "neutral" || value === "claude" || value === "codex") {
    return value;
  }

  return undefined;
}

async function handoffReviewRequestCommand(args: string[]): Promise<number> {
  if (hasFlag(args, "--format")) {
    process.stderr.write("--format is not supported for handoff review-request; use generate review-request --format instead.\n\n");
    process.stderr.write(usage);
    return 2;
  }

  return generateReviewRequestCommand([...args, "--format", "markdown"]);
}

async function saveReviewRequestCommand(args: string[]): Promise<number> {
  if (hasFlag(args, "--format")) {
    process.stderr.write("--format is not supported for save review-request; saved bundles include JSON and Markdown.\n\n");
    process.stderr.write(usage);
    return 2;
  }

  if (hasFlag(args, "--output")) {
    process.stderr.write("--output is not supported for save review-request; use --storage-dir to choose a storage root.\n\n");
    process.stderr.write(usage);
    return 2;
  }

  const storageParse = parseStorageDir(args);
  if (!storageParse.ok) {
    process.stderr.write(`${storageParse.message}\n\n${usage}`);
    return 2;
  }

  const parsed = parseGenerateReviewRequestArgs(storageParse.generatorArgs);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  try {
    const built = await buildValidatedReviewRequestPacket(parsed.options);

    if (!built.ok) {
      process.stderr.write(`${built.message}\n`);
      for (const error of built.errors ?? []) {
        process.stderr.write(`- ${error}\n`);
      }
      return built.exitCode;
    }

    const saved = await saveReviewRequestBundle({
      storageRoot: storageParse.storageDir ?? join(process.cwd(), ".open-relay", "review-requests"),
      packet: built.packet
    });

    process.stdout.write(`Saved review-request packet: ${saved.storageId}\n`);
    return 0;
  } catch {
    process.stderr.write("Could not save review-request packet.\n");
    return 1;
  }
}

function hasFlag(args: string[], flag: string): boolean {
  return args.some((arg) => arg === flag || arg.startsWith(`${flag}=`));
}

type SaveReviewRequestArgs =
  | { ok: true; storageDir?: string; generatorArgs: string[] }
  | { ok: false; message: string };

type GithubPrSendArgs =
  | {
    ok: true;
    packetPath: string;
    pr: string;
    dryRun: boolean;
    update: boolean;
    confirmPublic: boolean;
  }
  | { ok: false; message: string };

type GithubPrFetchArgs =
  | {
    ok: true;
    pr: string;
    packetType: string;
    author: string;
    packetVersion?: string;
    output?: string;
  }
  | { ok: false; message: string };

type BuiltReviewResponsePacket =
  | { ok: true; packet: ReviewResponsePacket }
  | { ok: false; exitCode: 1 | 2; message: string; errors?: string[] };

type BuiltResumeProjectPacket =
  | { ok: true; packet: ResumeProjectPacket }
  | { ok: false; exitCode: 1 | 2; message: string; errors?: string[] };

function parseStorageDir(args: string[]): SaveReviewRequestArgs {
  const generatorArgs: string[] = [];
  let storageDir: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--storage-dir") {
      if (storageDir) {
        return { ok: false, message: "Duplicate flag: --storage-dir" };
      }
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        return { ok: false, message: "Missing value for --storage-dir" };
      }
      storageDir = value;
      index += 1;
      continue;
    }

    generatorArgs.push(arg);
  }

  return {
    ok: true,
    ...(storageDir ? { storageDir } : {}),
    generatorArgs
  };
}

function parseGithubPrSendArgs(args: string[]): GithubPrSendArgs {
  const packetPath = args[0];
  if (!packetPath) {
    return { ok: false, message: "Missing packet path." };
  }

  let pr: string | undefined;
  let dryRun = false;
  let update = false;
  let confirmPublic = false;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dry-run") {
      if (dryRun) {
        return { ok: false, message: "Duplicate flag: --dry-run" };
      }
      dryRun = true;
      continue;
    }

    if (arg === "--update") {
      if (update) {
        return { ok: false, message: "Duplicate flag: --update" };
      }
      update = true;
      continue;
    }

    if (arg === "--confirm-public") {
      if (confirmPublic) {
        return { ok: false, message: "Duplicate flag: --confirm-public" };
      }
      confirmPublic = true;
      continue;
    }

    if (arg === "--pr") {
      if (pr) {
        return { ok: false, message: "Duplicate flag: --pr" };
      }
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        return { ok: false, message: "Missing value for --pr" };
      }
      pr = value;
      index += 1;
      continue;
    }

    return {
      ok: false,
      message: arg.startsWith("--") ? `Unknown flag: ${arg}` : `Unexpected argument: ${arg}`
    };
  }

  if (!pr) {
    return { ok: false, message: "Missing required flag: --pr" };
  }
  if (!isValidGithubPrTarget(pr)) {
    return { ok: false, message: "Invalid GitHub pull request target." };
  }

  return { ok: true, packetPath, pr, dryRun, update, confirmPublic };
}

function parseGithubPrFetchArgs(args: string[]): GithubPrFetchArgs {
  let pr: string | undefined;
  let packetType: string | undefined;
  let packetVersion: string | undefined;
  let author: string | undefined;
  let output: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!["--pr", "--packet-type", "--packet-version", "--author", "--output"].includes(arg)) {
      return {
        ok: false,
        message: arg.startsWith("--") ? `Unknown flag: ${arg}` : `Unexpected argument: ${arg}`
      };
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      return { ok: false, message: `Missing value for ${arg}` };
    }

    if (arg === "--pr") {
      if (pr) {
        return { ok: false, message: "Duplicate flag: --pr" };
      }
      pr = value;
    } else if (arg === "--packet-type") {
      if (packetType) {
        return { ok: false, message: "Duplicate flag: --packet-type" };
      }
      packetType = value;
    } else if (arg === "--packet-version") {
      if (packetVersion) {
        return { ok: false, message: "Duplicate flag: --packet-version" };
      }
      packetVersion = value;
    } else if (arg === "--author") {
      if (author) {
        return { ok: false, message: "Duplicate flag: --author" };
      }
      author = value;
    } else {
      if (output) {
        return { ok: false, message: "Duplicate flag: --output" };
      }
      output = value;
    }
    index += 1;
  }

  if (!pr) {
    return { ok: false, message: "Missing required flag: --pr" };
  }
  if (!isValidGithubPrTarget(pr)) {
    return { ok: false, message: "Invalid GitHub pull request target." };
  }
  if (!packetType) {
    return { ok: false, message: "Missing required flag: --packet-type" };
  }
  if (!author) {
    return { ok: false, message: "Missing required flag: --author" };
  }

  return {
    ok: true,
    pr,
    packetType,
    author,
    ...(packetVersion ? { packetVersion } : {}),
    ...(output ? { output } : {})
  };
}

async function transportGithubPrSendCommand(args: string[]): Promise<number> {
  const parsed = parseGithubPrSendArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  try {
    const raw = await readFile(parsed.packetPath, "utf8");
    const packet = JSON.parse(raw) as Record<string, unknown>;
    const result = validatePacket(packet);
    if (!result.valid) {
      process.stderr.write("Invalid packet.\n");
      for (const error of result.errors) {
        process.stderr.write(`- ${error}\n`);
      }
      return 1;
    }

    const markdown = renderPacketMarkdown(packet);
    const sent = sendPacketToGithubPr({
      prTarget: parsed.pr,
      packet,
      markdown,
      dryRun: parsed.dryRun,
      update: parsed.update,
      confirmPublic: parsed.confirmPublic,
      runGh
    });

    if (sent.kind === "dry-run") {
      process.stdout.write(`Dry run target: ${sent.target}\n\n${sent.body}`);
    } else if (sent.kind === "updated") {
      process.stdout.write("Updated GitHub PR Open Relay packet comment.\n");
    } else {
      process.stdout.write("Posted GitHub PR Open Relay packet comment.\n");
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof SyntaxError
      ? "Invalid JSON in packet file."
      : safeTransportError(error, "Could not send GitHub PR Open Relay packet.");
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

async function transportGithubPrFetchCommand(args: string[]): Promise<number> {
  const parsed = parseGithubPrFetchArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  try {
    const found = fetchPacketFromGithubPr({
      prTarget: parsed.pr,
      packetType: parsed.packetType,
      ...(parsed.packetVersion ? { packetVersion: parsed.packetVersion } : {}),
      author: parsed.author,
      runGh
    });
    const result = validatePacket(found.packet);
    if (!result.valid) {
      process.stderr.write("Fetched Open Relay packet failed validation.\n");
      for (const error of result.errors) {
        process.stderr.write(`- ${error}\n`);
      }
      return 1;
    }

    const output = `${JSON.stringify(found.packet, null, 2)}\n`;
    if (parsed.output) {
      try {
        await writeFile(parsed.output, output, "utf8");
      } catch {
        process.stderr.write("Could not write fetched Open Relay packet.\n");
        return 1;
      }
      process.stdout.write("Wrote fetched Open Relay packet.\n");
    } else {
      process.stdout.write(output);
    }

    return 0;
  } catch (error: unknown) {
    process.stderr.write(`${safeTransportError(error, "Could not fetch GitHub PR Open Relay packet.")}\n`);
    return 1;
  }
}

async function generateReviewResponseCommand(args: string[]): Promise<number> {
  const parsed = parseGenerateReviewResponseArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  const built = await buildValidatedReviewResponseFromFiles({
    requestPath: parsed.options.request,
    reviewPath: parsed.options.review
  });

  if (!built.ok) {
    process.stderr.write(`${built.message}\n`);
    for (const error of built.errors ?? []) {
      process.stderr.write(`- ${error}\n`);
    }
    return built.exitCode;
  }

  const output = parsed.options.format === "markdown"
    ? renderPacketMarkdown(built.packet)
    : `${JSON.stringify(built.packet, null, 2)}\n`;
  const successMessage = parsed.options.format === "markdown"
    ? "Wrote review-response Markdown.\n"
    : "Wrote review-response packet.\n";
  const writeErrorMessage = parsed.options.format === "markdown"
    ? "Could not write review-response Markdown.\n"
    : "Could not write review-response packet.\n";

  if (parsed.options.output) {
    try {
      await writeFile(parsed.options.output, output, "utf8");
    } catch {
      process.stderr.write(writeErrorMessage);
      return 1;
    }
    process.stdout.write(successMessage);
  } else {
    process.stdout.write(output);
  }

  return 0;
}

async function experimentalWatcherProofCommand(args: string[]): Promise<number> {
  const parsed = parseWatcherProofArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  const result = await runWatcherProof(parsed.options);
  const output = `${JSON.stringify(result.receipt, null, 2)}\n`;

  if (parsed.options.output) {
    try {
      await writeFile(parsed.options.output, output, "utf8");
    } catch {
      process.stderr.write("Could not write watcher proof receipt.\n");
      return 1;
    }
    process.stdout.write("Wrote watcher proof receipt.\n");
  } else {
    process.stdout.write(output);
  }

  if (!result.ok) {
    process.stderr.write("Watcher proof failed.\n");
    return 1;
  }

  return 0;
}

async function experimentalRelayWatchCommand(args: string[]): Promise<number> {
  const parsed = parseRelayWatchArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  if (parsed.options.watch) {
    let iteration = 0;
    let posts = 0;
    let failures = 0;

    for (;;) {
      iteration += 1;
      const result = await runRelayWatchOnce(parsed.options);
      const written = await writeRelayWatchReceipt(parsed.options.output, result.receipt, iteration);
      if (!written) {
        return 1;
      }
      const statusWritten = await writeRelayWatchStatusForResult(parsed.options, result.receipt, iteration);
      if (!statusWritten) {
        return 1;
      }
      await notifyRelayWatchStatus(parsed.options, result.receipt, iteration);
      if (isRelayWatchPost(result.receipt)) {
        posts += 1;
        failures = 0;
        if (posts >= parsed.options.maxPosts) {
          process.stdout.write("Relay watch reached --max-posts.\n");
          return 0;
        }
      } else if (result.ok) {
        failures = 0;
      }
      if (!result.ok) {
        failures += 1;
        if (failures >= parsed.options.maxFailures) {
          process.stderr.write("Relay watch reached --max-failures.\n");
          return 1;
        }
        process.stderr.write("Relay watch iteration failed; continuing because --watch is set.\n");
      }
      await delay(parsed.options.intervalMs);
    }
  }

  const result = await runRelayWatchOnce(parsed.options);
  const written = await writeRelayWatchReceipt(parsed.options.output, result.receipt);
  if (!written) {
    return 1;
  }
  const statusWritten = await writeRelayWatchStatusForResult(parsed.options, result.receipt);
  if (!statusWritten) {
    return 1;
  }
  await notifyRelayWatchStatus(parsed.options, result.receipt);
  if (!result.ok) {
    process.stderr.write("Relay watch failed.\n");
    return 1;
  }

  return 0;
}

async function experimentalResponseWatchCommand(args: string[]): Promise<number> {
  const parsed = parseResponseWatchArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  if (parsed.options.watch) {
    let iteration = 0;
    let turns = 0;
    let failures = 0;

    for (;;) {
      iteration += 1;
      const result = await runResponseWatchOnce(parsed.options);
      const written = await writeResponseWatchReceipt(parsed.options.output, result.receipt, iteration);
      if (!written) {
        return 1;
      }
      if (isResponseWatchTurn(result.receipt)) {
        turns += 1;
        failures = 0;
        if (turns >= parsed.options.maxTurns) {
          process.stdout.write("Response watch reached --max-turns.\n");
          return 0;
        }
      } else if (result.ok) {
        failures = 0;
      }
      if (!result.ok) {
        failures += 1;
        if (failures >= parsed.options.maxFailures) {
          process.stderr.write("Response watch reached --max-failures.\n");
          return 1;
        }
        process.stderr.write("Response watch iteration failed; continuing because --watch is set.\n");
      }
      await delay(parsed.options.intervalMs);
    }
  }

  const result = await runResponseWatchOnce(parsed.options);
  const written = await writeResponseWatchReceipt(parsed.options.output, result.receipt);
  if (!written) {
    return 1;
  }
  if (!result.ok) {
    process.stderr.write("Response watch failed.\n");
    return 1;
  }

  return 0;
}

async function writeRelayWatchStatusForResult(
  options: RelayWatchCliOptions,
  receipt: RelayWatchReceipt,
  watchIteration?: number
): Promise<boolean> {
  if (!options.statusFile) {
    return true;
  }

  try {
    await writeRelayWatchStatus(
      options.statusFile,
      relayWatchStatusFromReceipt(receipt, {
        ...(watchIteration !== undefined ? { iteration: watchIteration } : {}),
        watch: options.watch
      })
    );
  } catch {
    process.stderr.write("Could not write relay watch status.\n");
    return false;
  }

  return true;
}

async function notifyRelayWatchStatus(
  options: RelayWatchCliOptions,
  receipt: RelayWatchReceipt,
  watchIteration?: number
): Promise<void> {
  if (!options.notify) {
    return;
  }

  try {
    await sendMacNotification(buildRelayWatchNotification(relayWatchStatusFromReceipt(receipt, {
      ...(watchIteration !== undefined ? { iteration: watchIteration } : {}),
      watch: options.watch
    })));
  } catch {
    process.stderr.write("Relay watch notification failed.\n");
  }
}

async function writeRelayWatchReceipt(
  outputPath: string | undefined,
  receipt: unknown,
  watchIteration?: number
): Promise<boolean> {
  const output = `${JSON.stringify(receipt, null, 2)}\n`;
  const finalOutputPath = outputPath && watchIteration !== undefined
    ? relayWatchIterationReceiptPath(outputPath, receipt, watchIteration)
    : outputPath;
  if (finalOutputPath) {
    try {
      await writeFile(finalOutputPath, output, "utf8");
    } catch {
      process.stderr.write("Could not write relay watch receipt.\n");
      return false;
    }
    process.stdout.write("Wrote relay watch receipt.\n");
  } else {
    process.stdout.write(output);
  }

  return true;
}

function relayWatchIterationReceiptPath(outputPath: string, receipt: unknown, iteration: number): string {
  const ext = extname(outputPath) || ".json";
  const stem = extname(outputPath)
    ? outputPath.slice(0, outputPath.length - ext.length)
    : outputPath;
  const status = isRecord(receipt) && typeof receipt.status === "string"
    ? receipt.status.replace(/[^A-Za-z0-9_.-]+/g, "-")
    : "receipt";
  return `${stem}.${String(iteration).padStart(6, "0")}.${status}${ext}`;
}

function isRelayWatchPost(receipt: unknown): boolean {
  return isRecord(receipt) && (receipt.status === "posted" || receipt.status === "updated");
}

async function writeResponseWatchReceipt(
  outputPath: string | undefined,
  receipt: ResponseWatchReceipt,
  watchIteration?: number
): Promise<boolean> {
  const output = `${JSON.stringify(receipt, null, 2)}\n`;
  const finalOutputPath = outputPath && watchIteration !== undefined
    ? relayWatchIterationReceiptPath(outputPath, receipt, watchIteration)
    : outputPath;
  if (finalOutputPath) {
    try {
      await writeFile(finalOutputPath, output, "utf8");
    } catch {
      process.stderr.write("Could not write response watch receipt.\n");
      return false;
    }
    process.stdout.write("Wrote response watch receipt.\n");
  } else {
    process.stdout.write(output);
  }

  return true;
}

function isResponseWatchTurn(receipt: unknown): boolean {
  return isRecord(receipt) && receipt.status === "completed";
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function generateResumeProjectCommand(args: string[]): Promise<number> {
  const parsed = parseGenerateResumeProjectArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  const built = await buildValidatedResumeProjectFromFile(parsed.options.response);
  if (!built.ok) {
    process.stderr.write(`${built.message}\n`);
    for (const error of built.errors ?? []) {
      process.stderr.write(`- ${error}\n`);
    }
    return built.exitCode;
  }

  const output = parsed.options.format === "markdown"
    ? renderPacketMarkdown(built.packet)
    : `${JSON.stringify(built.packet, null, 2)}\n`;
  const successMessage = parsed.options.format === "markdown"
    ? "Wrote resume-project Markdown.\n"
    : "Wrote resume-project packet.\n";
  const writeErrorMessage = parsed.options.format === "markdown"
    ? "Could not write resume-project Markdown.\n"
    : "Could not write resume-project packet.\n";

  if (parsed.options.output) {
    try {
      await writeFile(parsed.options.output, output, "utf8");
    } catch {
      process.stderr.write(writeErrorMessage);
      return 1;
    }
    process.stdout.write(successMessage);
  } else {
    process.stdout.write(output);
  }

  return 0;
}

async function respondGithubPrCommand(args: string[]): Promise<number> {
  const parsed = parseRespondGithubPrArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  const built = await buildValidatedReviewResponseFromFiles({
    requestPath: parsed.options.request,
    reviewPath: parsed.options.review
  });

  if (!built.ok) {
    process.stderr.write(`${built.message}\n`);
    for (const error of built.errors ?? []) {
      process.stderr.write(`- ${error}\n`);
    }
    return built.exitCode;
  }

  try {
    const markdown = renderPacketMarkdown(built.packet);
    const sent = sendPacketToGithubPr({
      prTarget: parsed.options.pr,
      packet: built.packet,
      markdown,
      dryRun: parsed.options.dryRun,
      update: parsed.options.update,
      confirmPublic: parsed.options.confirmPublic,
      runGh
    });

    if (sent.kind === "dry-run") {
      process.stdout.write(`Dry run target: ${sent.target}\n\n${sent.body}`);
    } else if (sent.kind === "updated") {
      process.stdout.write("Updated GitHub PR Open Relay packet comment.\n");
    } else {
      process.stdout.write("Posted GitHub PR Open Relay packet comment.\n");
    }

    return 0;
  } catch (error: unknown) {
    process.stderr.write(`${safeTransportError(error, "Could not send GitHub PR Open Relay packet.")}\n`);
    return 1;
  }
}

async function buildValidatedReviewResponseFromFiles(input: {
  requestPath: string;
  reviewPath: string;
}): Promise<BuiltReviewResponsePacket> {
  const requestRead = await readJsonFile(input.requestPath, {
    invalidJsonMessage: "Invalid JSON in review-request file.",
    readErrorMessage: "Could not read review-request file."
  });
  if (!requestRead.ok) {
    return {
      ok: false,
      exitCode: 1,
      message: requestRead.message
    };
  }

  const requestValidation = validatePacket(requestRead.value);
  if (!requestValidation.valid) {
    return {
      ok: false,
      exitCode: 1,
      message: "Invalid review-request packet.",
      errors: requestValidation.errors
    };
  }

  if (!isRecord(requestRead.value) || requestRead.value.packet_type !== "review-request") {
    return {
      ok: false,
      exitCode: 1,
      message: "Expected review-request packet."
    };
  }

  const reviewRead = await readJsonFile(input.reviewPath, {
    invalidJsonMessage: "Invalid JSON in review-response draft file.",
    readErrorMessage: "Could not read review-response draft file."
  });
  if (!reviewRead.ok) {
    return {
      ok: false,
      exitCode: 1,
      message: reviewRead.message
    };
  }

  const keyValidation = validateReviewResponseDraftKeys(reviewRead.value);
  if (!keyValidation.ok) {
    return {
      ok: false,
      exitCode: 1,
      message: keyValidation.reason === "reserved"
        ? "Review-response draft contains reserved Open Relay fields."
        : "Review-response draft contains unknown fields."
    };
  }

  const draft = isRecord(reviewRead.value)
    ? reviewRead.value as ReviewResponseDraft
    : {} as ReviewResponseDraft;
  const packet = buildReviewResponsePacket({
    request: requestRead.value as ReviewRequestPacket,
    draft
  });
  const responseValidation = validatePacket(packet);
  if (!responseValidation.valid) {
    return {
      ok: false,
      exitCode: 1,
      message: "Generated review-response packet failed validation.",
      errors: responseValidation.errors
    };
  }

  return { ok: true, packet };
}

async function buildValidatedResumeProjectFromFile(
  responsePath: string
): Promise<BuiltResumeProjectPacket> {
  const responseRead = await readJsonFile(responsePath, {
    invalidJsonMessage: "Invalid JSON in review-response file.",
    readErrorMessage: "Could not read review-response file."
  });
  if (!responseRead.ok) {
    return {
      ok: false,
      exitCode: 1,
      message: responseRead.message
    };
  }

  const responseValidation = validatePacket(responseRead.value);
  if (!responseValidation.valid) {
    return {
      ok: false,
      exitCode: 1,
      message: "Invalid review-response packet.",
      errors: responseValidation.errors
    };
  }

  if (!isReviewResponsePacket(responseRead.value)) {
    return {
      ok: false,
      exitCode: 1,
      message: "Resume-project generation requires a review-response packet."
    };
  }

  const packet = buildResumeProjectPacket({
    response: responseRead.value
  });
  const resumeValidation = validatePacket(packet);
  if (!resumeValidation.valid) {
    return {
      ok: false,
      exitCode: 1,
      message: "Generated resume-project packet failed validation.",
      errors: resumeValidation.errors
    };
  }

  return { ok: true, packet };
}

type JsonReadResult =
  | { ok: true; value: unknown }
  | { ok: false; message: string };

async function readJsonFile(path: string, messages: {
  invalidJsonMessage: string;
  readErrorMessage: string;
}): Promise<JsonReadResult> {
  try {
    const raw = await readFile(path, "utf8");
    return { ok: true, value: JSON.parse(raw) as unknown };
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof SyntaxError
        ? messages.invalidJsonMessage
        : messages.readErrorMessage
    };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isReviewResponsePacket(value: unknown): value is ReviewResponsePacket {
  return isRecord(value) &&
    value.packet_type === "review-response" &&
    value.packet_version === "0.1";
}

function safeTransportError(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) {
    return fallback;
  }

  const allowedMessages = [
    "Invalid GitHub pull request target.",
    "No matching Open Relay packet comment found.",
    "Public GitHub repository requires --confirm-public.",
    GH_FAILURE_MESSAGE
  ];

  return allowedMessages.includes(error.message) ? error.message : fallback;
}

function isValidGithubPrTarget(value: string): boolean {
  try {
    parseGithubPrTarget(value);
    return true;
  } catch {
    return false;
  }
}

async function generateReviewRequestCommand(args: string[]): Promise<number> {
  const parsed = parseGenerateReviewRequestArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  try {
    const built = await buildValidatedReviewRequestPacket(parsed.options);

    if (!built.ok) {
      process.stderr.write(`${built.message}\n`);
      for (const error of built.errors ?? []) {
        process.stderr.write(`- ${error}\n`);
      }
      return built.exitCode;
    }

    const packet = built.packet;
    const output = parsed.options.format === "markdown"
      ? renderPacketMarkdown(packet)
      : `${JSON.stringify(packet, null, 2)}\n`;
    const successMessage = parsed.options.format === "markdown"
      ? "Wrote review-request Markdown.\n"
      : "Wrote review-request packet.\n";
    const writeErrorMessage = parsed.options.format === "markdown"
      ? "Could not write review-request Markdown.\n"
      : "Could not write review-request packet.\n";

    if (parsed.options.output) {
      try {
        await writeFile(parsed.options.output, output, "utf8");
      } catch {
        process.stderr.write(writeErrorMessage);
        return 1;
      }
      process.stdout.write(successMessage);
    } else {
      process.stdout.write(output);
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Could not generate review-request packet: ${message}\n`);
    return 1;
  }
}

type BuiltReviewRequestPacket =
  | { ok: true; packet: ReviewRequestPacket }
  | { ok: false; exitCode: 1; message: string; errors?: string[] };

async function buildValidatedReviewRequestPacket(
  options: GenerateReviewRequestOptions
): Promise<BuiltReviewRequestPacket> {
  const rules = await loadPrivateRedactionRules(options);
  if (!rules.ok) {
    return { ok: false, exitCode: 1, message: rules.message };
  }

  const git = collectGitContext({
    cwd: process.cwd(),
    baseRef: options.base,
    headRef: options.head,
    includeLocalPath: options.includeLocalPath
  });
  const packet = buildReviewRequestPacket({
    options,
    git,
    privateRedactionRules: rules.rules
  });
  const result = validatePacket(packet);

  if (!result.valid) {
    return {
      ok: false,
      exitCode: 1,
      message: "Generated review-request packet failed validation.",
      errors: result.errors
    };
  }

  return { ok: true, packet };
}

type PrivateRulesLoadResult =
  | { ok: true; rules: PrivateRedactionRule[] }
  | { ok: false; message: string };

async function loadPrivateRedactionRules(
  options: GenerateReviewRequestOptions
): Promise<PrivateRulesLoadResult> {
  const path = options.redactionRules ?? join(process.cwd(), ".open-relay", "redaction-rules.json");
  const explicit = Boolean(options.redactionRules);

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error: unknown) {
    if (!explicit && isNodeErrorCode(error, "ENOENT")) {
      return { ok: true, rules: [] };
    }
    return { ok: false, message: "Could not read redaction rules." };
  }

  try {
    const parsed = parsePrivateRedactionRules(JSON.parse(raw) as unknown);
    return parsed.ok
      ? { ok: true, rules: parsed.rules }
      : { ok: false, message: "Invalid redaction rules." };
  } catch {
    return { ok: false, message: "Invalid redaction rules." };
  }
}

function isNodeErrorCode(error: unknown, code: string): boolean {
  return error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === code;
}

async function validateCommand(path: string | undefined): Promise<number> {
  if (!path) {
    process.stderr.write(`Missing packet path.\n\n${usage}`);
    return 2;
  }

  try {
    const result = await validatePacketFile(path);

    if (result.valid) {
      process.stdout.write(`${path} is a valid packet.\n`);
      return 0;
    }

    process.stderr.write(`Invalid packet: ${path}\n`);
    for (const error of result.errors) {
      process.stderr.write(`- ${error}\n`);
    }
    return 1;
  } catch (error: unknown) {
    const message = error instanceof SyntaxError
      ? `Invalid JSON in ${path}`
      : `Could not validate ${path}: ${error instanceof Error ? error.message : String(error)}`;

    process.stderr.write(`${message}\n`);
    return 1;
  }
}

if (require.main === module) {
  run(process.argv)
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`open-relay failed: ${message}\n`);
      process.exitCode = 1;
    });
}
