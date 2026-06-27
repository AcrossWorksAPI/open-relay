import Ajv, { type ValidateFunction } from "ajv";

import reviewRequestSchema from "../schemas/review-request.schema.json";

export type SemanticCheck = (packet: Record<string, unknown>) => string[];

export type RegistryEntry = {
  validate: ValidateFunction;
  semantics?: SemanticCheck;
};

const ajv = new Ajv({
  allErrors: true,
  strict: true
});

export const SCHEMA_REGISTRY: Record<string, Record<string, RegistryEntry>> = {
  "review-request": {
    "0.1": {
      validate: ajv.compile(reviewRequestSchema),
      semantics: validateReviewRequestSemantics
    }
  }
};

export function lookupPacketSchema(type: string, version: string): RegistryEntry | undefined {
  return SCHEMA_REGISTRY[type]?.[version];
}

export function supportedPacketSummary(): string {
  return Object.entries(SCHEMA_REGISTRY)
    .flatMap(([type, versions]) => Object.keys(versions).map((version) => `${type}/${version}`))
    .join(", ");
}

function validateReviewRequestSemantics(packet: Record<string, unknown>): string[] {
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
