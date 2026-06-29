import type { ReviewResponsePacket } from "./reviewResponse";

export type ResumeProjectStatus =
  | "address_findings"
  | "owner_decision"
  | "continue_with_context"
  | "blocked";

export type ResumeProjectTask = {
  source_finding_id: string;
  severity: ReviewResponsePacket["findings"][number]["severity"];
  blocking: boolean;
  title: string;
  description: string;
  evidence: string;
  recommendation: string;
  location?: ReviewResponsePacket["findings"][number]["location"];
};

export type ResumeProjectPacket = {
  packet_version: "0.1";
  packet_type: "resume-project";
  created_at: string;
  resume_from: {
    packet_type: "review-response";
    packet_version: string;
    created_at: string;
    reviewer_name: string;
    reviewer_kind: ReviewResponsePacket["reviewer"]["kind"];
    outcome: ReviewResponsePacket["outcome"];
    source: string;
  };
  target: {
    repository: string;
    working_branch: string;
    base_commit: string;
    head_commit: string;
    diff_range: string;
    pull_request_url?: string;
    storage_id?: string;
  };
  resume_status: ResumeProjectStatus;
  confidence: ReviewResponsePacket["confidence"];
  summary: string;
  tasks: ResumeProjectTask[];
  reviewed_scope: ReviewResponsePacket["reviewed_scope"];
  prior_verification: ReviewResponsePacket["verification"];
  safety_gates: {
    preserve_unrelated_changes: true;
    requires_human_approval_for_merge: true;
    requires_human_approval_for_publish: true;
    requires_human_approval_for_destructive_commands: true;
  };
  provenance?: ReviewResponsePacket["provenance"];
  redactions: ReviewResponsePacket["redactions"];
  sensitive_data?: ReviewResponsePacket["sensitive_data"];
  next_action: string;
};
