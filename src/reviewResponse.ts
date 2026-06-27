export type ReviewResponsePacket = {
  packet_version: "0.1";
  packet_type: "review-response";
  created_at: string;
  response_to: {
    packet_type: string;
    packet_version: string;
    repository: string;
    working_branch: string;
    base_commit: string;
    head_commit: string;
    diff_range: string;
    pull_request_url?: string;
    storage_id?: string;
    source?: string;
  };
  reviewer: {
    name: string;
    kind: "agent" | "human" | "unknown";
    tool?: string;
    requested_by?: string;
  };
  outcome: "approved" | "changes_requested" | "commentary" | "blocked";
  confidence: "high" | "medium" | "low";
  summary: string;
  findings: Array<{
    id: string;
    severity: "high" | "medium" | "low" | "info";
    blocking: boolean;
    title: string;
    description: string;
    evidence: string;
    recommendation: string;
    location?: {
      path: string;
      line?: number;
      symbol?: string;
    };
  }>;
  reviewed_scope: {
    files: Array<{
      path: string;
      notes?: string;
    }>;
    limitations: string[];
  };
  verification: Array<{
    kind: "command" | "ci" | "manual" | "external";
    command: string;
    result: "passed" | "failed" | "not_run" | "unknown";
    evidence: string;
  }>;
  provenance?: Array<{
    type: "pull_request" | "ci_run" | "commit" | "issue" | "user_note" | "external_url";
    reference: string;
    supports: string;
  }>;
  redactions: Array<{
    field: string;
    reason: string;
    replacement?: string;
  }>;
  sensitive_data?: {
    excluded: boolean;
    notes: string;
  };
  next_action: string;
};
