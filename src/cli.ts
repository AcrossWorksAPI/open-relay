#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parseGenerateReviewRequestArgs, type GenerateReviewRequestOptions } from "./args";
import { collectGitContext } from "./git";
import { renderPacketMarkdown } from "./renderPacket";
import { buildReviewRequestPacket, type ReviewRequestPacket } from "./reviewRequest";
import { validatePacket, validatePacketFile } from "./schema";
import { saveReviewRequestBundle } from "./storage";
import { GH_FAILURE_MESSAGE, runGh } from "./transport/gh";
import {
  fetchPacketFromGithubPr,
  parseGithubPrTarget,
  sendPacketToGithubPr
} from "./transport/githubPr";

const usage = `Open Relay

Usage:
  open-relay validate <packet.json>
  open-relay generate review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--format json|markdown] [--output <path>]
  open-relay handoff review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--output <relay.md>]
  open-relay save review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--storage-dir <path>]
  open-relay render <packet.json> [--output <relay.md>]
  open-relay render review-request <packet.json> [--output <relay.md>]
  open-relay transport github-pr send <packet.json> --pr <url-or-owner/repo#number> [--dry-run] [--update] [--confirm-public]
  open-relay transport github-pr fetch --pr <url-or-owner/repo#number> --packet-type <type> --author <login> [--packet-version <version>] [--output <packet.json>]
  open-relay --help

Notes:
  handoff review-request creates local review handoff Markdown; it does not send it anywhere.
  transport github-pr uses the local gh CLI; Open Relay does not read GitHub token environment variables.
  transport github-pr fetch requires --author because packet shape is not proof of authorship.
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

  if (args[0] === "render") {
    if (args[1] === "review-request") {
      return renderPacketCommand(args.slice(2), {
        invalidMessage: "Invalid review-request packet",
        writeErrorMessage: "Could not write review-request Markdown.",
        writeSuccessMessage: "Wrote review-request Markdown.",
        renderErrorMessage: "Could not render review-request packet."
      });
    }

    return renderPacketCommand(args.slice(1), {
      invalidMessage: "Invalid packet",
      writeErrorMessage: "Could not write packet Markdown.",
      writeSuccessMessage: "Wrote packet Markdown.",
      renderErrorMessage: "Could not render packet."
    });
  }

  process.stderr.write(`Unknown command: ${args.join(" ")}\n\n${usage}`);
  return 2;
}

type RenderArgs =
  | { ok: true; packetPath: string; output?: string }
  | { ok: false; message: string };

type RenderMessages = {
  invalidMessage: string;
  writeErrorMessage: string;
  writeSuccessMessage: string;
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

    const markdown = renderPacketMarkdown(packet as Record<string, unknown>);

    if (parsed.output) {
      try {
        await writeFile(parsed.output, markdown, "utf8");
      } catch {
        process.stderr.write(`${messages.writeErrorMessage}\n`);
        return 1;
      }
      process.stdout.write(`${messages.writeSuccessMessage}\n`);
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

  if (!packetPath) {
    return { ok: false, message: "Missing packet path." };
  }

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];

    if (arg !== "--output") {
      return {
        ok: false,
        message: arg.startsWith("--") ? `Unknown flag: ${arg}` : `Unexpected argument: ${arg}`
      };
    }

    if (output) {
      return { ok: false, message: "Duplicate flag: --output" };
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      return { ok: false, message: "Missing value for --output" };
    }

    output = value;
    index += 1;
  }

  return { ok: true, packetPath, ...(output ? { output } : {}) };
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
    const built = buildValidatedReviewRequestPacket(parsed.options);

    if (!built.ok) {
      process.stderr.write("Generated review-request packet failed validation.\n");
      for (const error of built.errors) {
        process.stderr.write(`- ${error}\n`);
      }
      return 1;
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
    const built = buildValidatedReviewRequestPacket(parsed.options);

    if (!built.ok) {
      process.stderr.write("Generated review-request packet failed validation.\n");
      for (const error of built.errors) {
        process.stderr.write(`- ${error}\n`);
      }
      return 1;
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
  | { ok: false; errors: string[] };

function buildValidatedReviewRequestPacket(
  options: GenerateReviewRequestOptions
): BuiltReviewRequestPacket {
  const git = collectGitContext({
    cwd: process.cwd(),
    baseRef: options.base,
    headRef: options.head,
    includeLocalPath: options.includeLocalPath
  });
  const packet = buildReviewRequestPacket({ options, git });
  const result = validatePacket(packet);

  if (!result.valid) {
    return { ok: false, errors: result.errors };
  }

  return { ok: true, packet };
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
