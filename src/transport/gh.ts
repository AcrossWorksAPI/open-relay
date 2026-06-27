import { execFileSync } from "node:child_process";

export const GH_FAILURE_MESSAGE = "GitHub CLI command failed. Check `gh auth status` and that the PR exists.";

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
    throw new GhError(GH_FAILURE_MESSAGE);
  }
}
