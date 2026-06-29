import type { ResumeProjectPacket, ResumeProjectStatus } from "./resumeProject";
import type { ReviewResponsePacket } from "./reviewResponse";

export function buildResumeProjectPacket(input: {
  response: ReviewResponsePacket;
  createdAt?: string;
}): ResumeProjectPacket {
  return {
    packet_version: "0.1",
    packet_type: "resume-project",
    created_at: input.createdAt ?? new Date().toISOString(),
    resume_from: {
      packet_type: "review-response",
      packet_version: input.response.packet_version,
      created_at: input.response.created_at,
      reviewer_name: input.response.reviewer.name,
      reviewer_kind: input.response.reviewer.kind,
      outcome: input.response.outcome,
      source: "review-response packet"
    },
    target: {
      repository: input.response.response_to.repository,
      working_branch: input.response.response_to.working_branch,
      base_commit: input.response.response_to.base_commit,
      head_commit: input.response.response_to.head_commit,
      diff_range: input.response.response_to.diff_range,
      ...(input.response.response_to.pull_request_url ? {
        pull_request_url: input.response.response_to.pull_request_url
      } : {}),
      ...(input.response.response_to.storage_id ? {
        storage_id: input.response.response_to.storage_id
      } : {})
    },
    resume_status: statusFromOutcome(input.response.outcome),
    confidence: input.response.confidence,
    summary: input.response.summary,
    tasks: input.response.findings.map((finding) => ({
      source_finding_id: finding.id,
      severity: finding.severity,
      blocking: finding.blocking,
      title: finding.title,
      description: finding.description,
      evidence: finding.evidence,
      recommendation: finding.recommendation,
      ...(finding.location ? { location: finding.location } : {})
    })),
    reviewed_scope: input.response.reviewed_scope,
    prior_verification: input.response.verification,
    safety_gates: {
      preserve_unrelated_changes: true,
      requires_human_approval_for_merge: true,
      requires_human_approval_for_publish: true,
      requires_human_approval_for_destructive_commands: true
    },
    ...(input.response.provenance ? { provenance: input.response.provenance } : {}),
    redactions: input.response.redactions,
    ...(input.response.sensitive_data ? { sensitive_data: input.response.sensitive_data } : {}),
    next_action: input.response.next_action
  };
}

function statusFromOutcome(outcome: ReviewResponsePacket["outcome"]): ResumeProjectStatus {
  if (outcome === "changes_requested") {
    return "address_findings";
  }
  if (outcome === "approved") {
    return "owner_decision";
  }
  if (outcome === "blocked") {
    return "blocked";
  }
  return "continue_with_context";
}
