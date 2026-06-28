import type { Redaction } from "./redaction";
import type { ReviewRequestPacket } from "./reviewRequest";

export type PrivateRedactionRule = {
  name: string;
  match: string;
  replacement: string;
  reason: string;
};

export type PrivateRedactionRulesFile = {
  version: 1;
  rules: PrivateRedactionRule[];
};

export type PrivateRedactionRulesValidation =
  | { ok: true; rules: PrivateRedactionRule[] }
  | { ok: false };

export const PRIVATE_REDACTION_STRING_FIELDS = [
  "goal",
  "requested_review.audience",
  "requested_review.focus[]",
  "requested_review.requested_output",
  "repository.name",
  "repository.remote_url",
  "repository.local_path",
  "repository.base_branch",
  "repository.working_branch",
  "repository.pull_request_url",
  "repository.reviewer_access",
  "change_summary.summary",
  "change_summary.behavioral_intent",
  "change_summary.excluded_scope[]",
  "changed_files[].path",
  "changed_files[].role",
  "changed_files[].evidence",
  "verification[].command",
  "verification[].evidence",
  "risks[].description",
  "risks[].handling",
  "provenance[].reference",
  "provenance[].supports",
  "sensitive_data.notes",
  "next_action"
] as const;

// Excluded fields are protocol identity, dispatch, enum, checksum/range, or
// existing audit-output strings. They are intentionally not private free text.
export const PRIVATE_REDACTION_EXCLUDED_STRING_FIELDS = [
  "packet_type",
  "packet_version",
  "created_at",
  "repository.base_commit",
  "repository.head_commit",
  "repository.diff_range",
  "changed_files[].status",
  "changed_files[].review_priority",
  "verification[].kind",
  "verification[].result",
  "risks[].severity",
  "provenance[].type",
  "redactions[].field",
  "redactions[].reason",
  "redactions[].replacement"
] as const;

export function parsePrivateRedactionRules(value: unknown): PrivateRedactionRulesValidation {
  if (!isRecord(value) || !hasExactKeys(value, ["version", "rules"])) {
    return { ok: false };
  }
  if (value.version !== 1 || !Array.isArray(value.rules) || value.rules.length === 0) {
    return { ok: false };
  }

  const names = new Set<string>();
  const normalizedMatches = new Set<string>();
  const rules: PrivateRedactionRule[] = [];

  for (const candidate of value.rules) {
    if (!isRecord(candidate) || !hasExactKeys(candidate, ["name", "match", "replacement", "reason"])) {
      return { ok: false };
    }

    const { name, match, replacement, reason } = candidate;
    if (
      !isNonEmptyString(name) ||
      !isNonEmptyString(match) ||
      !isNonEmptyString(replacement) ||
      !isNonEmptyString(reason) ||
      match.trim().length < 3 ||
      names.has(name) ||
      normalizedMatches.has(normalizeLiteral(match))
    ) {
      return { ok: false };
    }

    names.add(name);
    normalizedMatches.add(normalizeLiteral(match));
    rules.push({ name, match, replacement, reason });
  }

  for (const rule of rules) {
    if (
      rules.some((candidate) =>
        containsIgnoreCase(rule.replacement, candidate.match) ||
        containsIgnoreCase(rule.reason, candidate.match)
      )
    ) {
      return { ok: false };
    }
  }

  return { ok: true, rules };
}

export function applyPrivateRedactionRules(
  packet: ReviewRequestPacket,
  rules: PrivateRedactionRule[]
): ReviewRequestPacket {
  const redactions = new Map<string, Redaction>();
  const copy: ReviewRequestPacket = structuredClone(packet) as ReviewRequestPacket;

  redactStringField(copy, "goal", rules, redactions);
  redactObjectStringFields(copy.requested_review, "requested_review", ["audience", "requested_output"], rules, redactions);
  redactStringArray(copy.requested_review.focus, "requested_review.focus[]", rules, redactions);
  redactObjectStringFields(copy.repository, "repository", [
    "name",
    "remote_url",
    "local_path",
    "base_branch",
    "working_branch",
    "pull_request_url",
    "reviewer_access"
  ], rules, redactions);
  redactObjectStringFields(copy.change_summary, "change_summary", ["summary", "behavioral_intent"], rules, redactions);
  redactStringArray(copy.change_summary.excluded_scope, "change_summary.excluded_scope[]", rules, redactions);

  for (const file of copy.changed_files) {
    redactObjectStringFields(file, "changed_files[]", ["path", "role", "evidence"], rules, redactions);
  }
  for (const item of copy.verification) {
    redactObjectStringFields(item, "verification[]", ["command", "evidence"], rules, redactions);
  }
  for (const risk of copy.risks) {
    redactObjectStringFields(risk, "risks[]", ["description", "handling"], rules, redactions);
  }
  for (const item of copy.provenance) {
    redactObjectStringFields(item, "provenance[]", ["reference", "supports"], rules, redactions);
  }
  redactObjectStringFields(copy.sensitive_data, "sensitive_data", ["notes"], rules, redactions);
  redactStringField(copy, "next_action", rules, redactions);

  return {
    ...copy,
    redactions: [...copy.redactions, ...redactions.values()]
  };
}

function redactObjectStringFields(
  value: Record<string, unknown>,
  prefix: string,
  keys: string[],
  rules: PrivateRedactionRule[],
  redactions: Map<string, Redaction>
): void {
  for (const key of keys) {
    const current = value[key];
    if (typeof current !== "string") {
      continue;
    }
    value[key] = redactString(current, `${prefix}.${key}`, rules, redactions);
  }
}

function redactStringField(
  value: Record<string, unknown>,
  key: string,
  rules: PrivateRedactionRule[],
  redactions: Map<string, Redaction>
): void {
  const current = value[key];
  if (typeof current === "string") {
    value[key] = redactString(current, key, rules, redactions);
  }
}

function redactStringArray(
  values: string[],
  field: string,
  rules: PrivateRedactionRule[],
  redactions: Map<string, Redaction>
): void {
  for (let index = 0; index < values.length; index += 1) {
    values[index] = redactString(values[index], field, rules, redactions);
  }
}

function redactString(
  value: string,
  field: string,
  rules: PrivateRedactionRule[],
  redactions: Map<string, Redaction>
): string {
  let next = value;
  for (const rule of rules) {
    const result = replaceLiteralIgnoreCase(next, rule.match, rule.replacement);
    if (!result.changed) {
      continue;
    }
    next = result.value;
    const key = `${field}\0${rule.name}\0${rule.replacement}`;
    redactions.set(key, {
      field,
      reason: `Private redaction rule: ${rule.name}.`,
      replacement: rule.replacement
    });
  }
  return next;
}

function replaceLiteralIgnoreCase(
  value: string,
  match: string,
  replacement: string
): { value: string; changed: boolean } {
  let changed = false;
  const pattern = new RegExp(escapeRegExp(match), "gi");
  const next = value.replace(pattern, () => {
    changed = true;
    return replacement;
  });
  return { value: next, changed };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, expected: string[]): boolean {
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return keys.length === sortedExpected.length &&
    sortedExpected.every((key, index) => keys[index] === key);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeLiteral(value: string): string {
  return value.toLowerCase();
}

function containsIgnoreCase(value: string, literal: string): boolean {
  return normalizeLiteral(value).includes(normalizeLiteral(literal));
}
