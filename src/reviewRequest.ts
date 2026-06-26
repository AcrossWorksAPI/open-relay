import type {
  GenerateReviewRequestOptions,
  RiskInput,
  VerificationInput
} from "./args";
import type { ChangedFile, GitContext } from "./git";
import { sanitizeRemoteUrl, type Redaction } from "./redaction";

export type ReviewRequestPacket = {
  packet_version: "0.1";
  packet_type: "review-request";
  created_at: string;
  goal: string;
  requested_review: {
    audience: string;
    focus: string[];
    requested_output: string;
  };
  repository: {
    name: string;
    remote_url?: string;
    local_path?: string;
    base_branch: string;
    working_branch: string;
    base_commit: string;
    head_commit: string;
    diff_range: string;
    pull_request_url?: string;
    reviewer_access: string;
  };
  change_summary: {
    summary: string;
    behavioral_intent: string;
    excluded_scope: string[];
    total_files_changed: number;
  };
  changed_files: ChangedFile[];
  verification: VerificationInput[];
  risks: RiskInput[];
  provenance: Provenance[];
  redactions: Redaction[];
  sensitive_data: {
    excluded: true;
    notes: string;
  };
  next_action: string;
};

export type Provenance = {
  type: "pull_request" | "ci_run" | "commit" | "issue" | "user_note" | "external_url";
  reference: string;
  supports: string;
};

export type BuildReviewRequestPacketInput = {
  options: GenerateReviewRequestOptions;
  git: GitContext;
  createdAt?: string;
};

export function buildReviewRequestPacket(
  input: BuildReviewRequestPacketInput
): ReviewRequestPacket {
  const remote = sanitizeRemoteUrl(input.git.remoteUrl);
  const redactions: Redaction[] = [];

  if (remote.redaction) {
    redactions.push(remote.redaction);
  }

  if (!input.options.includeLocalPath) {
    redactions.push({
      field: "repository.local_path",
      reason: "Local filesystem paths are excluded by default."
    });
  }

  redactions.push({
    field: "diff_content",
    reason: "Diff content is not embedded in review-request packets."
  });
  redactions.push({
    field: "command_output",
    reason: "Command output is summarized by caller-provided verification evidence instead of embedded."
  });

  const provenance: Provenance[] = [
    {
      type: "commit",
      reference: input.git.baseCommit,
      supports: "Base commit for the generated review range."
    },
    {
      type: "commit",
      reference: input.git.headCommit,
      supports: "Head commit for the generated review range."
    }
  ];

  if (input.options.pullRequestUrl) {
    provenance.push({
      type: "pull_request",
      reference: input.options.pullRequestUrl,
      supports: "Pull request under review."
    });
  }

  return {
    packet_version: "0.1",
    packet_type: "review-request",
    created_at: input.createdAt ?? new Date().toISOString(),
    goal: input.options.goal,
    requested_review: {
      audience: input.options.audience,
      focus: input.options.focus,
      requested_output: input.options.requestedOutput
    },
    repository: {
      name: input.git.repositoryName,
      ...(remote.value ? { remote_url: remote.value } : {}),
      ...(input.git.localPath ? { local_path: input.git.localPath } : {}),
      base_branch: input.git.baseBranch,
      working_branch: input.git.workingBranch,
      base_commit: input.git.baseCommit,
      head_commit: input.git.headCommit,
      diff_range: input.git.diffRange,
      ...(input.options.pullRequestUrl ? { pull_request_url: input.options.pullRequestUrl } : {}),
      reviewer_access: input.options.reviewerAccess
    },
    change_summary: {
      summary: input.options.summary,
      behavioral_intent: input.options.behavioralIntent,
      excluded_scope: input.options.excludedScope,
      total_files_changed: input.git.changedFiles.length
    },
    changed_files: input.git.changedFiles,
    verification: input.options.verification,
    risks: input.options.risks.length > 0 ? input.options.risks : [{
      severity: "info",
      description: "Generated packet should be reviewed before sharing.",
      handling: "Validate the packet and inspect redactions before sending to another reviewer."
    }],
    provenance,
    redactions,
    sensitive_data: {
      excluded: true,
      notes: "Diff content, command output, environment variables, and local paths are excluded unless explicitly opted in."
    },
    next_action: "Review the packet, inspect the referenced diff range, and return findings first."
  };
}
