import type { ReviewRequestPacket } from "./reviewRequest";

export function renderReviewRequestMarkdown(packet: ReviewRequestPacket): string {
  const sections = [
    "# Review Request Relay Packet",
    "",
    `- Packet version: \`${inlineText(packet.packet_version)}\``,
    `- Packet type: \`${inlineText(packet.packet_type)}\``,
    `- Created at: \`${inlineText(packet.created_at)}\``,
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
    `- Repository: \`${inlineText(packet.repository.name)}\``,
    ...(packet.repository.remote_url ? [`- Remote: \`${inlineText(packet.repository.remote_url)}\``] : []),
    `- Local path: ${packet.repository.local_path ? `\`${inlineText(packet.repository.local_path)}\`` : "redacted"}`,
    `- Base branch: \`${inlineText(packet.repository.base_branch)}\``,
    `- Working branch: \`${inlineText(packet.repository.working_branch)}\``,
    `- Base commit: \`${inlineText(packet.repository.base_commit)}\``,
    `- Head commit: \`${inlineText(packet.repository.head_commit)}\``,
    `- Diff range: \`${inlineText(packet.repository.diff_range)}\``,
    ...(packet.repository.pull_request_url ? [`- Pull request: \`${inlineText(packet.repository.pull_request_url)}\``] : []),
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
      `| \`${escapeTableCell(file.path)}\` | ${escapeTableCell(file.status)} | ${escapeTableCell(file.role)} | ${escapeTableCell(file.review_priority)} |`
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
      `| \`${escapeTableCell(item.command)}\` | ${escapeTableCell(item.result)} | ${escapeTableCell(item.evidence)} |`
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
    .map((item) => `- ${labelForProvenanceType(item.type)}: \`${inlineText(item.reference)}\` - ${inlineText(item.supports)}`)
    .join("\n");
}

function renderRedactions(packet: ReviewRequestPacket): string {
  if (packet.redactions.length === 0) {
    return "No redactions listed.";
  }

  return packet.redactions
    .map((item) => `- \`${inlineText(item.field)}\`: ${inlineText(item.reason)}`)
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

function formatList(values: string[], emptyText = "none"): string {
  return values.length > 0 ? values.map(inlineText).join(", ") : emptyText;
}

function escapeTableCell(value: string): string {
  return inlineText(value).replace(/\|/g, "\\|");
}

function inlineText(value: string): string {
  return value.replace(/\r?\n/g, " ");
}

function blockText(value: string): string {
  return value.trim();
}

function labelForProvenanceType(type: ReviewRequestPacket["provenance"][number]["type"]): string {
  return type
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
