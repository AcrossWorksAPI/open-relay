import Ajv, { type ValidateFunction } from "ajv";

import resumeProjectSchema from "../schemas/resume-project.schema.json";
import reviewResponseSchema from "../schemas/review-response.schema.json";
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
  },
  "review-response": {
    "0.1": {
      validate: ajv.compile(reviewResponseSchema),
      semantics: validateReviewResponseSemantics
    }
  },
  "resume-project": {
    "0.1": {
      validate: ajv.compile(resumeProjectSchema),
      semantics: validateResumeProjectSemantics
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

function validateReviewResponseSemantics(packet: Record<string, unknown>): string[] {
  const outcome = packet.outcome;
  const findings = Array.isArray(packet.findings) ? packet.findings : [];
  const reviewedScope = packet.reviewed_scope;
  const limitations = isRecord(reviewedScope) && Array.isArray(reviewedScope.limitations)
    ? reviewedScope.limitations
    : [];
  const hasBlockingFinding = findings.some((finding) =>
    isRecord(finding) && finding.blocking === true
  );

  if (outcome === "approved" && hasBlockingFinding) {
    return ["/findings approved outcome cannot include blocking findings"];
  }

  if (outcome === "commentary" && hasBlockingFinding) {
    return ["/findings commentary outcome cannot include blocking findings"];
  }

  if (outcome === "changes_requested" && !hasBlockingFinding) {
    return ["/findings changes_requested outcome requires at least one blocking finding"];
  }

  if (outcome === "blocked" && limitations.length === 0) {
    return ["/reviewed_scope/limitations blocked outcome requires at least one limitation"];
  }

  return [];
}

function validateResumeProjectSemantics(packet: Record<string, unknown>): string[] {
  const status = packet.resume_status;
  const tasks = Array.isArray(packet.tasks) ? packet.tasks : [];
  const reviewedScope = packet.reviewed_scope;
  const limitations = isRecord(reviewedScope) && Array.isArray(reviewedScope.limitations)
    ? reviewedScope.limitations
    : [];
  const hasBlockingTask = tasks.some((task) =>
    isRecord(task) && task.blocking === true
  );

  if (status === "address_findings" && !hasBlockingTask) {
    return ["/tasks address_findings status requires at least one blocking task"];
  }

  if (status === "owner_decision" && hasBlockingTask) {
    return ["/tasks owner_decision status cannot include blocking tasks"];
  }

  if (status === "continue_with_context" && hasBlockingTask) {
    return ["/tasks continue_with_context status cannot include blocking tasks"];
  }

  if (status === "blocked" && limitations.length === 0) {
    return ["/reviewed_scope/limitations blocked status requires at least one limitation"];
  }

  return [];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
