export type VerificationInput = {
  kind: "command" | "ci" | "manual" | "external";
  command: string;
  result: "passed" | "failed" | "not_run" | "unknown";
  evidence: string;
};

export type RiskInput = {
  severity: "high" | "medium" | "low" | "info";
  description: string;
  handling: string;
};

export type GenerateReviewRequestFormat = "json" | "markdown";

export type GenerateReviewRequestOptions = {
  base: string;
  head: string;
  goal: string;
  summary: string;
  behavioralIntent: string;
  format: GenerateReviewRequestFormat;
  output?: string;
  audience: string;
  focus: string[];
  requestedOutput: string;
  reviewerAccess: string;
  pullRequestUrl?: string;
  verification: VerificationInput[];
  risks: RiskInput[];
  excludedScope: string[];
  includeLocalPath: boolean;
};

export type ParseResult =
  | { ok: true; options: GenerateReviewRequestOptions }
  | { ok: false; message: string };

const defaultFocus = [
  "Correctness and behavioral regressions",
  "Security and privacy risks",
  "Missing verification or test coverage"
];

const defaultExcludedScope = [
  "Diff content is not embedded in the packet.",
  "Markdown rendering and agent-specific prompt templates are deferred."
];

const allowedVerificationKinds = new Set(["command", "ci", "manual", "external"]);
const allowedVerificationResults = new Set([
  "passed",
  "failed",
  "not_run",
  "unknown"
]);
const allowedRiskSeverities = new Set(["high", "medium", "low", "info"]);
const allowedValueFlags = new Set([
  "--base",
  "--head",
  "--goal",
  "--summary",
  "--behavioral-intent",
  "--format",
  "--output",
  "--audience",
  "--focus",
  "--requested-output",
  "--reviewer-access",
  "--pr-url",
  "--verification",
  "--risk",
  "--excluded-scope"
]);
const repeatableValueFlags = new Set([
  "--focus",
  "--verification",
  "--risk",
  "--excluded-scope"
]);

const defaultRequestedOutput =
  "Findings first with file/line references where possible; say clearly if there are no findings.";

const defaultReviewerAccess =
  "Reviewer needs read access to the repository and diff range.";

export function parseGenerateReviewRequestArgs(args: string[]): ParseResult {
  const values = new Map<string, string[]>();
  let includeLocalPath = false;

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (token === "--include-local-path") {
      includeLocalPath = true;
      continue;
    }

    if (!token.startsWith("--")) {
      return { ok: false, message: `Unexpected argument: ${token}` };
    }

    if (!allowedValueFlags.has(token)) {
      return { ok: false, message: `Unknown flag: ${token}` };
    }

    const value = args[index + 1];
    if (value === undefined || value.startsWith("--")) {
      return { ok: false, message: `Missing value for ${token}` };
    }

    index += 1;
    const existing = values.get(token) ?? [];
    if (existing.length > 0 && !repeatableValueFlags.has(token)) {
      return { ok: false, message: `Duplicate flag: ${token}` };
    }

    existing.push(value);
    values.set(token, existing);
  }

  const missing = ["--base", "--head", "--goal", "--summary", "--behavioral-intent"]
    .filter((flag) => first(values, flag) === undefined);

  if (missing.length > 0) {
    return { ok: false, message: `Missing required flags: ${missing.join(", ")}` };
  }

  const verification = parseVerificationList(values.get("--verification") ?? []);
  if (!verification.ok) {
    return verification;
  }

  const risks = parseRiskList(values.get("--risk") ?? []);
  if (!risks.ok) {
    return risks;
  }

  const format = parseFormat(first(values, "--format"));
  if (!format) {
    return { ok: false, message: `Invalid format: ${first(values, "--format")}` };
  }

  return {
    ok: true,
    options: {
      base: required(values, "--base"),
      head: required(values, "--head"),
      goal: required(values, "--goal"),
      summary: required(values, "--summary"),
      behavioralIntent: required(values, "--behavioral-intent"),
      format,
      output: first(values, "--output"),
      audience: first(values, "--audience") ?? "Claude Code",
      focus: values.get("--focus") ?? defaultFocus,
      requestedOutput: first(values, "--requested-output") ?? defaultRequestedOutput,
      reviewerAccess: first(values, "--reviewer-access") ?? defaultReviewerAccess,
      pullRequestUrl: first(values, "--pr-url"),
      verification: verification.items,
      risks: risks.items,
      excludedScope: values.get("--excluded-scope") ?? defaultExcludedScope,
      includeLocalPath
    }
  };
}

function parseFormat(value: string | undefined): GenerateReviewRequestFormat | undefined {
  if (value === undefined) {
    return "json";
  }

  if (value === "json" || value === "markdown") {
    return value;
  }

  return undefined;
}

type VerificationParseResult =
  | { ok: true; items: VerificationInput[] }
  | { ok: false; message: string };

function parseVerificationList(entries: string[]): VerificationParseResult {
  const items: VerificationInput[] = [];

  for (const entry of entries) {
    const parts = entry.split("|");
    if (parts.length !== 4) {
      return { ok: false, message: "--verification must use kind|command|result|evidence" };
    }

    const [kind, command, result, evidence] = parts;
    if (!allowedVerificationKinds.has(kind) || !allowedVerificationResults.has(result)) {
      return { ok: false, message: `Invalid verification entry: ${entry}` };
    }

    items.push({
      kind: kind as VerificationInput["kind"],
      command,
      result: result as VerificationInput["result"],
      evidence
    });
  }

  return { ok: true, items };
}

type RiskParseResult =
  | { ok: true; items: RiskInput[] }
  | { ok: false; message: string };

function parseRiskList(entries: string[]): RiskParseResult {
  const items: RiskInput[] = [];

  for (const entry of entries) {
    const parts = entry.split("|");
    if (parts.length !== 3) {
      return { ok: false, message: "--risk must use severity|description|handling" };
    }

    const [severity, description, handling] = parts;
    if (!allowedRiskSeverities.has(severity)) {
      return { ok: false, message: `Invalid risk entry: ${entry}` };
    }

    items.push({
      severity: severity as RiskInput["severity"],
      description,
      handling
    });
  }

  return { ok: true, items };
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
