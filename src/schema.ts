import { readFile } from "node:fs/promises";
import Ajv, { type ErrorObject } from "ajv";

import schema from "../schemas/review-request.schema.json";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

const ajv = new Ajv({
  allErrors: true,
  strict: true
});

const validateReviewRequest = ajv.compile(schema);

export function validatePacket(packet: unknown): ValidationResult {
  const valid = validateReviewRequest(packet);
  const schemaErrors = valid ? [] : formatErrors(validateReviewRequest.errors ?? []);
  const semanticErrors = valid ? validateSemantics(packet) : [];
  const errors = [...schemaErrors, ...semanticErrors];

  if (errors.length === 0) {
    return {
      valid: true,
      errors: []
    };
  }

  return {
    valid: false,
    errors
  };
}

export async function validatePacketFile(path: string): Promise<ValidationResult> {
  const raw = await readFile(path, "utf8");
  const packet = JSON.parse(raw) as unknown;

  return validatePacket(packet);
}

function formatErrors(errors: ErrorObject[]): string[] {
  return errors.map((error) => {
    const location = error.instancePath === "" ? "/" : error.instancePath;
    return `${location} ${error.message ?? "is invalid"}`;
  });
}

function validateSemantics(packet: unknown): string[] {
  if (!isRecord(packet)) {
    return [];
  }

  const changeSummary = packet.change_summary;
  const changedFiles = packet.changed_files;

  if (!isRecord(changeSummary) || !Array.isArray(changedFiles)) {
    return [];
  }

  if (changeSummary.total_files_changed !== changedFiles.length) {
    return [
      "/change_summary/total_files_changed must equal changed_files length"
    ];
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
