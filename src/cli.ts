#!/usr/bin/env node

import { writeFile } from "node:fs/promises";

import { parseGenerateReviewRequestArgs } from "./args";
import { collectGitContext } from "./git";
import { buildReviewRequestPacket } from "./reviewRequest";
import { validatePacket, validatePacketFile } from "./schema";

const usage = `Open Relay

Usage:
  open-relay validate <packet.json>
  open-relay generate review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--output <packet.json>]
  open-relay --help
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

  process.stderr.write(`Unknown command: ${args.join(" ")}\n\n${usage}`);
  return 2;
}

async function generateReviewRequestCommand(args: string[]): Promise<number> {
  const parsed = parseGenerateReviewRequestArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  try {
    const git = collectGitContext({
      cwd: process.cwd(),
      baseRef: parsed.options.base,
      headRef: parsed.options.head,
      includeLocalPath: parsed.options.includeLocalPath
    });
    const packet = buildReviewRequestPacket({ options: parsed.options, git });
    const result = validatePacket(packet);

    if (!result.valid) {
      process.stderr.write("Generated review-request packet failed validation.\n");
      for (const error of result.errors) {
        process.stderr.write(`- ${error}\n`);
      }
      return 1;
    }

    const json = `${JSON.stringify(packet, null, 2)}\n`;

    if (parsed.options.output) {
      try {
        await writeFile(parsed.options.output, json, "utf8");
      } catch {
        process.stderr.write("Could not write review-request packet.\n");
        return 1;
      }
      process.stdout.write(`Wrote review-request packet to ${parsed.options.output}\n`);
    } else {
      process.stdout.write(json);
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`Could not generate review-request packet: ${message}\n`);
    return 1;
  }
}

async function validateCommand(path: string | undefined): Promise<number> {
  if (!path) {
    process.stderr.write(`Missing packet path.\n\n${usage}`);
    return 2;
  }

  try {
    const result = await validatePacketFile(path);

    if (result.valid) {
      process.stdout.write(`${path} is a valid review-request packet.\n`);
      return 0;
    }

    process.stderr.write(`Invalid review-request packet: ${path}\n`);
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
