import type { ReviewRequestPacket } from "./reviewRequest";
import {
  blockText,
  codeSpanText,
  escapeCodeSpanTableCell,
  escapeTableCell,
  formatList,
  inlineText,
  labelForProvenanceType
} from "./renderMarkdown";

export function renderReviewRequestMarkdown(packet: ReviewRequestPacket): string {
  const sections = [
    "# Review Request Relay Packet",
    "",
    `- Packet version: \`${codeSpanText(packet.packet_version)}\``,
    `- Packet type: \`${codeSpanText(packet.packet_type)}\``,
    `- Created at: \`${codeSpanText(packet.created_at)}\``,
    "",
    "## Review Request",
    "",
    `- Audience: ${inlineText(packet.requested_review.audience)}`,
    `- Focus: ${formatList(packet.requested_review.focus)}`,
    `- Requested output: ${inlineText(packet.requested_review.requested_output)}`,
    "",
    "## Goal",
    "",
    blockText(packet.goal),
    "",
    "## Repository Context",
    "",
    `- Repository: \`${codeSpanText(packet.repository.name)}\``,
    ...(packet.repository.remote_url ? [`- Remote: \`${codeSpanText(packet.repository.remote_url)}\``] : []),
    `- Local path: ${packet.repository.local_path ? `\`${codeSpanText(packet.repository.local_path)}\`` : "redacted"}`,
    `- Base branch: \`${codeSpanText(packet.repository.base_branch)}\``,
    `- Working branch: \`${codeSpanText(packet.repository.working_branch)}\``,
    `- Base commit: \`${codeSpanText(packet.repository.base_commit)}\``,
    `- Head commit: \`${codeSpanText(packet.repository.head_commit)}\``,
    `- Diff range: \`${codeSpanText(packet.repository.diff_range)}\``,
    ...(packet.repository.pull_request_url ? [`- Pull request: \`${codeSpanText(packet.repository.pull_request_url)}\``] : []),
    `- Reviewer access: ${inlineText(packet.repository.reviewer_access)}`,
    "",
    "## Change Summary",
    "",
    blockText(packet.change_summary.summary),
    "",
    `- Behavioral intent: ${inlineText(packet.change_summary.behavioral_intent)}`,
    `- Total files changed: ${packet.change_summary.total_files_changed}`,
    `- Excluded scope: ${formatList(packet.change_summary.excluded_scope, "none listed")}`,
    "",
    "## Changed Files",
    "",
    renderChangedFiles(packet),
    "",
    "## Verification",
    "",
    renderVerification(packet),
    "",
    "## Risks And Assumptions",
    "",
    renderRisks(packet),
    "",
    "## Provenance",
    "",
    renderProvenance(packet),
    "",
    "## Redactions",
    "",
    renderRedactions(packet),
    "",
    "## Sensitive Data",
    "",
    renderSensitiveData(packet),
    "",
    "## Next Action",
    "",
    blockText(packet.next_action),
    ""
  ];

  return sections.join("\n");
}

function renderChangedFiles(packet: ReviewRequestPacket): string {
  if (packet.changed_files.length === 0) {
    return "No changed files listed.";
  }

  return [
    "| File | Status | Role | Review priority |",
    "| --- | --- | --- | --- |",
    ...packet.changed_files.map((file) =>
      `| \`${escapeCodeSpanTableCell(file.path)}\` | ${escapeTableCell(file.status)} | ${escapeTableCell(file.role)} | ${escapeTableCell(file.review_priority)} |`
    )
  ].join("\n");
}

function renderVerification(packet: ReviewRequestPacket): string {
  if (packet.verification.length === 0) {
    return "No verification evidence listed.";
  }

  return [
    "| Command or evidence | Result | Evidence |",
    "| --- | --- | --- |",
    ...packet.verification.map((item) =>
      `| \`${escapeCodeSpanTableCell(item.command)}\` | ${escapeTableCell(item.result)} | ${escapeTableCell(item.evidence)} |`
    )
  ].join("\n");
}

function renderRisks(packet: ReviewRequestPacket): string {
  if (packet.risks.length === 0) {
    return "No risks listed.";
  }

  return [
    "| Severity | Risk | Handling |",
    "| --- | --- | --- |",
    ...packet.risks.map((risk) =>
      `| ${escapeTableCell(risk.severity)} | ${escapeTableCell(risk.description)} | ${escapeTableCell(risk.handling)} |`
    )
  ].join("\n");
}

function renderProvenance(packet: ReviewRequestPacket): string {
  if (packet.provenance.length === 0) {
    return "No provenance listed.";
  }

  return packet.provenance
    .map((item) => `- ${labelForProvenanceType(item.type)}: \`${codeSpanText(item.reference)}\` - ${inlineText(item.supports)}`)
    .join("\n");
}

function renderRedactions(packet: ReviewRequestPacket): string {
  if (packet.redactions.length === 0) {
    return "No redactions listed.";
  }

  return packet.redactions
    .map((item) => `- \`${codeSpanText(item.field)}\`: ${inlineText(item.reason)}`)
    .join("\n");
}

function renderSensitiveData(packet: ReviewRequestPacket): string {
  if (!packet.sensitive_data) {
    return "No sensitive-data note provided.";
  }

  return packet.sensitive_data.excluded
    ? blockText(packet.sensitive_data.notes)
    : `Sensitive-data exclusion not asserted. ${inlineText(packet.sensitive_data.notes)}`;
}
