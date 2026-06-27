import { parseGithubPrTarget } from "./transport/githubPr";

export type GenerateReviewResponseFormat = "json" | "markdown";

export type GenerateReviewResponseOptions = {
  request: string;
  review: string;
  format: GenerateReviewResponseFormat;
  output?: string;
};

export type RespondGithubPrOptions = {
  request: string;
  review: string;
  pr: string;
  dryRun: boolean;
  update: boolean;
  confirmPublic: boolean;
};

export type GenerateReviewResponseParseResult =
  | { ok: true; options: GenerateReviewResponseOptions }
  | { ok: false; message: string };

export type RespondGithubPrParseResult =
  | { ok: true; options: RespondGithubPrOptions }
  | { ok: false; message: string };

const generateValueFlags = new Set(["--request", "--review", "--format", "--output"]);
const respondValueFlags = new Set(["--request", "--review", "--pr"]);
const respondBooleanFlags = new Set(["--dry-run", "--update", "--confirm-public"]);

export function parseGenerateReviewResponseArgs(args: string[]): GenerateReviewResponseParseResult {
  const parsed = parseValueFlags(args, generateValueFlags);
  if (!parsed.ok) {
    return parsed;
  }

  const missing = ["--request", "--review"].filter((flag) => first(parsed.values, flag) === undefined);
  if (missing.length > 0) {
    return { ok: false, message: `Missing required flags: ${missing.join(", ")}` };
  }

  const format = parseFormat(first(parsed.values, "--format"));
  if (!format) {
    return { ok: false, message: `Invalid format: ${first(parsed.values, "--format")}` };
  }

  return {
    ok: true,
    options: {
      request: required(parsed.values, "--request"),
      review: required(parsed.values, "--review"),
      format,
      ...(first(parsed.values, "--output") ? { output: required(parsed.values, "--output") } : {})
    }
  };
}

export function parseRespondGithubPrArgs(args: string[]): RespondGithubPrParseResult {
  const values = new Map<string, string[]>();
  let dryRun = false;
  let update = false;
  let confirmPublic = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (respondBooleanFlags.has(token)) {
      if (token === "--dry-run") {
        if (dryRun) {
          return { ok: false, message: "Duplicate flag: --dry-run" };
        }
        dryRun = true;
      } else if (token === "--update") {
        if (update) {
          return { ok: false, message: "Duplicate flag: --update" };
        }
        update = true;
      } else {
        if (confirmPublic) {
          return { ok: false, message: "Duplicate flag: --confirm-public" };
        }
        confirmPublic = true;
      }
      continue;
    }

    if (!token.startsWith("--")) {
      return { ok: false, message: `Unexpected argument: ${token}` };
    }

    if (!respondValueFlags.has(token)) {
      return { ok: false, message: `Unknown flag: ${token}` };
    }

    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      return { ok: false, message: `Missing value for ${token}` };
    }

    index += 1;
    const existing = values.get(token) ?? [];
    if (existing.length > 0) {
      return { ok: false, message: `Duplicate flag: ${token}` };
    }

    existing.push(value);
    values.set(token, existing);
  }

  const missing = ["--request", "--review", "--pr"].filter((flag) => first(values, flag) === undefined);
  if (missing.length > 0) {
    return { ok: false, message: `Missing required flags: ${missing.join(", ")}` };
  }

  const pr = required(values, "--pr");
  if (!isValidGithubPrTarget(pr)) {
    return { ok: false, message: "Invalid GitHub pull request target." };
  }

  return {
    ok: true,
    options: {
      request: required(values, "--request"),
      review: required(values, "--review"),
      pr,
      dryRun,
      update,
      confirmPublic
    }
  };
}

type ParsedValueFlags =
  | { ok: true; values: Map<string, string[]> }
  | { ok: false; message: string };

function parseValueFlags(args: string[], allowedFlags: Set<string>): ParsedValueFlags {
  const values = new Map<string, string[]>();

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (!token.startsWith("--")) {
      return { ok: false, message: `Unexpected argument: ${token}` };
    }

    if (!allowedFlags.has(token)) {
      return { ok: false, message: `Unknown flag: ${token}` };
    }

    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      return { ok: false, message: `Missing value for ${token}` };
    }

    index += 1;
    const existing = values.get(token) ?? [];
    if (existing.length > 0) {
      return { ok: false, message: `Duplicate flag: ${token}` };
    }

    existing.push(value);
    values.set(token, existing);
  }

  return { ok: true, values };
}

function parseFormat(value: string | undefined): GenerateReviewResponseFormat | undefined {
  if (value === undefined) {
    return "json";
  }
  if (value === "json" || value === "markdown") {
    return value;
  }
  return undefined;
}

function first(values: Map<string, string[]>, flag: string): string | undefined {
  return values.get(flag)?.[0];
}

function required(values: Map<string, string[]>, flag: string): string {
  const value = first(values, flag);
  if (value === undefined) {
    throw new Error(`missing required value after validation: ${flag}`);
  }
  return value;
}

function isValidGithubPrTarget(value: string): boolean {
  try {
    parseGithubPrTarget(value);
    return true;
  } catch {
    return false;
  }
}
