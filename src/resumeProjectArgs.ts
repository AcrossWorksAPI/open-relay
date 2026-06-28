export type GenerateResumeProjectFormat = "json" | "markdown";

export type GenerateResumeProjectOptions = {
  response: string;
  format: GenerateResumeProjectFormat;
  output?: string;
};

export type GenerateResumeProjectParseResult =
  | { ok: true; options: GenerateResumeProjectOptions }
  | { ok: false; message: string };

const valueFlags = new Set(["--response", "--format", "--output"]);

export function parseGenerateResumeProjectArgs(args: string[]): GenerateResumeProjectParseResult {
  const values = new Map<string, string[]>();

  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];

    if (!token.startsWith("--")) {
      return { ok: false, message: `Unexpected argument: ${token}` };
    }

    if (!valueFlags.has(token)) {
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

  const response = first(values, "--response");
  if (response === undefined) {
    return { ok: false, message: "Missing required flag: --response" };
  }

  const format = parseFormat(first(values, "--format"));
  if (!format) {
    return { ok: false, message: `Invalid format: ${first(values, "--format")}` };
  }

  return {
    ok: true,
    options: {
      response,
      format,
      ...(first(values, "--output") ? { output: required(values, "--output") } : {})
    }
  };
}

function parseFormat(value: string | undefined): GenerateResumeProjectFormat | undefined {
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
