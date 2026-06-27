#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { parseGenerateReviewRequestArgs, type GenerateReviewRequestOptions } from "./args";
import { collectGitContext } from "./git";
import { renderPacketMarkdown } from "./renderPacket";
import { buildReviewRequestPacket, type ReviewRequestPacket } from "./reviewRequest";
import { validatePacket, validatePacketFile } from "./schema";
import { saveReviewRequestBundle } from "./storage";

const usage = `Open Relay

Usage:
  open-relay validate <packet.json>
  open-relay generate review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--format json|markdown] [--output <path>]
  open-relay handoff review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--output <relay.md>]
  open-relay save review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--storage-dir <path>]
  open-relay render <packet.json> [--output <relay.md>]
  open-relay render review-request <packet.json> [--output <relay.md>]
  open-relay --help

Notes:
  handoff review-request creates local review handoff Markdown; it does not send it anywhere.
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
