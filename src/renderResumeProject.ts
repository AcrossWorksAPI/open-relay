import {
  blockText,
  codeSpanText,
  escapeCodeSpanTableCell,
  escapeTableCell,
  inlineText,
  labelForProvenanceType
} from "./renderMarkdown";
import type { ResumeProjectPacket } from "./resumeProject";

export function renderResumeProjectMarkdown(packet: ResumeProjectPacket): string {
  return [
    "# Resume Project Relay Packet",
    "",
    `- Packet version: \`${codeSpanText(packet.packet_version)}\``,
    `- Packet type: \`${codeSpanText(packet.packet_type)}\``,
    `- Created at: \`${codeSpanText(packet.created_at)}\``,
    "",
    "## Resume From",
    "",
    `- Packet type: \`${codeSpanText(packet.resume_from.packet_type)}\``,
    `- Packet version: \`${codeSpanText(packet.resume_from.packet_version)}\``,
    `- Created at: \`${codeSpanText(packet.resume_from.created_at)}\``,
    `- Reviewer: ${inlineText(packet.resume_from.reviewer_name)}`,
    `- Reviewer kind: \`${codeSpanText(packet.resume_from.reviewer_kind)}\``,
    `- Outcome: \`${codeSpanText(packet.resume_from.outcome)}\``,
    `- Source: ${inlineText(packet.resume_from.source)}`,
    "",
    "## Target",
    "",
    `- Repository: \`${codeSpanText(packet.target.repository)}\``,
    `- Working branch: \`${codeSpanText(packet.target.working_branch)}\``,
    `- Base commit: \`${codeSpanText(packet.target.base_commit)}\``,
    `- Head commit: \`${codeSpanText(packet.target.head_commit)}\``,
    `- Diff range: \`${codeSpanText(packet.target.diff_range)}\``,
    ...(packet.target.pull_request_url ? [`- Pull request: \`${codeSpanText(packet.target.pull_request_url)}\``] : []),
    ...(packet.target.storage_id ? [`- Storage id: \`${codeSpanText(packet.target.storage_id)}\``] : []),
    "",
    "## Status And Confidence",
    "",
    `- Resume status: \`${codeSpanText(packet.resume_status)}\``,
    `- Confidence: \`${codeSpanText(packet.confidence)}\``,
    "",
    "## Summary",
    "",
    blockText(packet.summary),
    "",
    "## Tasks",
    "",
    renderTasks(packet),
    "",
    "## Reviewed Scope",
    "",
    renderReviewedScope(packet),
    "",
    "## Prior Verification",
    "",
    renderPriorVerification(packet),
    "",
    "## Safety Gates",
    "",
    renderSafetyGates(packet),
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
  ].join("\n");
}

function renderTasks(packet: ResumeProjectPacket): string {
  if (packet.tasks.length === 0) {
    return "No continuation tasks listed.";
  }

  return packet.tasks.map(renderTask).join("\n\n");
}

function renderTask(task: ResumeProjectPacket["tasks"][number]): string {
  const blockingLabel = task.blocking ? "blocking" : "non-blocking";

  return [
    `### ${inlineText(task.source_finding_id)} - ${inlineText(task.severity)} - ${blockingLabel}`,
    "",
    `- Title: ${inlineText(task.title)}`,
    `- Location: ${formatLocation(task.location)}`,
    "",
    "**Detail**",
    "",
    quoteBlock(task.description),
    "",
    "**Evidence**",
    "",
    quoteBlock(task.evidence),
    "",
    "**Recommendation**",
    "",
    quoteBlock(task.recommendation)
  ].join("\n");
}

function renderReviewedScope(packet: ResumeProjectPacket): string {
  const files = packet.reviewed_scope.files.length === 0
    ? "No reviewed files listed."
    : [
        "| File | Notes |",
        "| --- | --- |",
        ...packet.reviewed_scope.files.map((file) =>
          `| \`${escapeCodeSpanTableCell(file.path)}\` | ${escapeTableCell(file.notes ?? "")} |`
        )
      ].join("\n");
  const limitations = packet.reviewed_scope.limitations.length === 0
    ? "No resume limitations listed."
    : packet.reviewed_scope.limitations.map((item) => `- ${inlineText(item)}`).join("\n");

  return [
    "### Files",
    "",
    files,
    "",
    "### Limitations",
    "",
    limitations
  ].join("\n");
}

function renderPriorVerification(packet: ResumeProjectPacket): string {
  if (packet.prior_verification.length === 0) {
    return "No prior verification evidence listed.";
  }

  return [
    "| Command or evidence | Kind | Result | Evidence |",
    "| --- | --- | --- | --- |",
    ...packet.prior_verification.map((item) =>
      `| \`${escapeCodeSpanTableCell(item.command)}\` | ${escapeTableCell(item.kind)} | ${escapeTableCell(item.result)} | ${escapeTableCell(item.evidence)} |`
    )
  ].join("\n");
}

function renderSafetyGates(packet: ResumeProjectPacket): string {
  return [
    "| Gate | Value |",
    "| --- | --- |",
    `| Preserve unrelated changes | ${yesNo(packet.safety_gates.preserve_unrelated_changes)} |`,
    `| Human approval for merge | ${yesNo(packet.safety_gates.requires_human_approval_for_merge)} |`,
    `| Human approval for publish | ${yesNo(packet.safety_gates.requires_human_approval_for_publish)} |`,
    `| Human approval for destructive commands | ${yesNo(packet.safety_gates.requires_human_approval_for_destructive_commands)} |`
  ].join("\n");
}

function renderProvenance(packet: ResumeProjectPacket): string {
  if (!packet.provenance || packet.provenance.length === 0) {
    return "No provenance listed.";
  }

  return packet.provenance
    .map((item) => `- ${labelForProvenanceType(item.type)}: \`${codeSpanText(item.reference)}\` - ${inlineText(item.supports)}`)
    .join("\n");
}

function renderRedactions(packet: ResumeProjectPacket): string {
  if (packet.redactions.length === 0) {
    return "No redactions listed.";
  }

  return packet.redactions
    .map((item) => `- \`${codeSpanText(item.field)}\`: ${inlineText(item.reason)}`)
    .join("\n");
}

function renderSensitiveData(packet: ResumeProjectPacket): string {
  if (!packet.sensitive_data) {
    return "No sensitive-data note provided.";
  }

  return packet.sensitive_data.excluded
    ? blockText(packet.sensitive_data.notes)
    : `Sensitive-data exclusion not asserted. ${inlineText(packet.sensitive_data.notes)}`;
}

function formatLocation(location: ResumeProjectPacket["tasks"][number]["location"]): string {
  if (!location) {
    return "none";
  }

  const line = location.line ? `:${location.line}` : "";
  const symbol = location.symbol ? ` (${location.symbol})` : "";
  return `\`${codeSpanText(`${location.path}${line}${symbol}`)}\``;
}

function quoteBlock(value: string): string {
  return blockText(value)
    .split(/\r?\n/)
    .map((line) => (line.length > 0 ? `> ${line}` : ">"))
    .join("\n");
}

function yesNo(value: boolean): string {
  return value ? "Yes" : "No";
}
