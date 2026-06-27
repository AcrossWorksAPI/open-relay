import { execFileSync } from "node:child_process";

export class GhError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GhError";
  }
}

export function runGh(args: string[]): string {
  try {
    return execFileSync("gh", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    throw new GhError("GitHub CLI command failed.");
  }
}
