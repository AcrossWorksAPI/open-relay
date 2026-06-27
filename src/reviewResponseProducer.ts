import type { ReviewRequestPacket } from "./reviewRequest";
import type { ReviewResponsePacket } from "./reviewResponse";

export type ReviewResponseDraft = {
  reviewer: ReviewResponsePacket["reviewer"];
  outcome: ReviewResponsePacket["outcome"];
  confidence: ReviewResponsePacket["confidence"];
  summary: string;
  findings: ReviewResponsePacket["findings"];
  reviewed_scope: ReviewResponsePacket["reviewed_scope"];
  verification?: ReviewResponsePacket["verification"];
  provenance?: ReviewResponsePacket["provenance"];
  redactions?: ReviewResponsePacket["redactions"];
  sensitive_data?: ReviewResponsePacket["sensitive_data"];
  next_action: string;
};

export type ReviewResponseDraftKeyValidation =
  | { ok: true }
  | { ok: false; reason: "reserved" | "unknown" };

const allowedDraftKeys = new Set([
  "reviewer",
  "outcome",
  "confidence",
  "summary",
  "findings",
  "reviewed_scope",
  "verification",
  "provenance",
  "redactions",
  "sensitive_data",
  "next_action"
]);

const reservedDraftKeys = new Set([
  "packet_type",
  "packet_version",
  "created_at",
  "response_to"
]);

export function validateReviewResponseDraftKeys(value: unknown): ReviewResponseDraftKeyValidation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: true };
  }

  for (const key of Object.keys(value)) {
    if (reservedDraftKeys.has(key)) {
      return { ok: false, reason: "reserved" };
    }
    if (!allowedDraftKeys.has(key)) {
      return { ok: false, reason: "unknown" };
    }
  }

  return { ok: true };
}

export function buildReviewResponsePacket(input: {
  request: ReviewRequestPacket;
  draft: ReviewResponseDraft;
  createdAt?: string;
}): ReviewResponsePacket {
  return {
    packet_version: "0.1",
    packet_type: "review-response",
    created_at: input.createdAt ?? new Date().toISOString(),
    response_to: {
      packet_type: input.request.packet_type,
      packet_version: input.request.packet_version,
      repository: input.request.repository.name,
      working_branch: input.request.repository.working_branch,
      base_commit: input.request.repository.base_commit,
      head_commit: input.request.repository.head_commit,
      diff_range: input.request.repository.diff_range,
      ...(input.request.repository.pull_request_url ? {
        pull_request_url: input.request.repository.pull_request_url
      } : {}),
      source: "review-request packet"
    },
    reviewer: input.draft.reviewer,
    outcome: input.draft.outcome,
    confidence: input.draft.confidence,
    summary: input.draft.summary,
    findings: input.draft.findings,
    reviewed_scope: input.draft.reviewed_scope,
    verification: input.draft.verification ?? [],
    ...(input.draft.provenance ? { provenance: input.draft.provenance } : {}),
    redactions: input.draft.redactions ?? [],
    ...(input.draft.sensitive_data ? { sensitive_data: input.draft.sensitive_data } : {}),
    next_action: input.draft.next_action
  };
}
