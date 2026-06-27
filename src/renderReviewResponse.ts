import {
  blockText,
  codeSpanText,
  escapeCodeSpanTableCell,
  escapeTableCell,
  inlineText,
  labelForProvenanceType
} from "./renderMarkdown";
import type { ReviewResponsePacket } from "./reviewResponse";

export function renderReviewResponseMarkdown(packet: ReviewResponsePacket): string {
  const sections = [
    "# Review Response Relay Packet",
    "",
    `- Packet version: \`${codeSpanText(packet.packet_version)}\``,
    `- Packet type: \`${codeSpanText(packet.packet_type)}\``,
    `- Created at: \`${codeSpanText(packet.created_at)}\``,
    "",
    "## Response To",
    "",
    `- Packet type: \`${codeSpanText(packet.response_to.packet_type)}\``,
    `- Packet version: \`${codeSpanText(packet.response_to.packet_version)}\``,
    `- Repository: \`${codeSpanText(packet.response_to.repository)}\``,
    `- Working branch: \`${codeSpanText(packet.response_to.working_branch)}\``,
    `- Base commit: \`${codeSpanText(packet.response_to.base_commit)}\``,
    `- Head commit: \`${codeSpanText(packet.response_to.head_commit)}\``,
    `- Diff range: \`${codeSpanText(packet.response_to.diff_range)}\``,
    ...(packet.response_to.pull_request_url ? [`- Pull request: \`${codeSpanText(packet.response_to.pull_request_url)}\``] : []),
    ...(packet.response_to.storage_id ? [`- Storage id: \`${codeSpanText(packet.response_to.storage_id)}\``] : []),
    ...(packet.response_to.source ? [`- Source: ${inlineText(packet.response_to.source)}`] : []),
    "",
    "## Reviewer",
    "",
    `- Name: ${inlineText(packet.reviewer.name)}`,
    `- Kind: \`${codeSpanText(packet.reviewer.kind)}\``,
    ...(packet.reviewer.tool ? [`- Tool: ${inlineText(packet.reviewer.tool)}`] : []),
    ...(packet.reviewer.requested_by ? [`- Requested by: ${inlineText(packet.reviewer.requested_by)}`] : []),
    "",
    "## Outcome And Confidence",
    "",
    `- Outcome: \`${codeSpanText(packet.outcome)}\``,
    `- Confidence: \`${codeSpanText(packet.confidence)}\``,
    "",
    "## Summary",
    "",
    blockText(packet.summary),
    "",
    "## Findings",
    "",
    renderFindings(packet),
    "",
    "## Reviewed Scope",
    "",
    renderReviewedScope(packet),
    "",
    "## Verification",
    "",
    renderVerification(packet),
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

function renderFindings(packet: ReviewResponsePacket): string {
  if (packet.findings.length === 0) {
    return "No findings listed.";
  }

  return packet.findings.map(renderFinding).join("\n\n");
}

function renderFinding(finding: ReviewResponsePacket["findings"][number]): string {
  const blockingLabel = finding.blocking ? "blocking" : "non-blocking";

  return [
    `### ${inlineText(finding.id)} - ${inlineText(finding.severity)} - ${blockingLabel}`,
    "",
    `- Title: ${inlineText(finding.title)}`,
    `- Location: ${formatLocation(finding.location)}`,
    "",
    "**Detail**",
    "",
    quoteBlock(finding.description),
    "",
    "**Evidence**",
    "",
    quoteBlock(finding.evidence),
    "",
    "**Recommendation**",
    "",
    quoteBlock(finding.recommendation)
  ].join("\n");
}

function renderReviewedScope(packet: ReviewResponsePacket): string {
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
    ? "No review limitations listed."
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

function renderVerification(packet: ReviewResponsePacket): string {
  if (packet.verification.length === 0) {
    return "No verification evidence listed.";
  }

  return [
    "| Command or evidence | Kind | Result | Evidence |",
    "| --- | --- | --- | --- |",
    ...packet.verification.map((item) =>
      `| \`${escapeCodeSpanTableCell(item.command)}\` | ${escapeTableCell(item.kind)} | ${escapeTableCell(item.result)} | ${escapeTableCell(item.evidence)} |`
    )
  ].join("\n");
}

function renderProvenance(packet: ReviewResponsePacket): string {
  if (!packet.provenance || packet.provenance.length === 0) {
    return "No provenance listed.";
  }

  return packet.provenance
    .map((item) => `- ${labelForProvenanceType(item.type)}: \`${codeSpanText(item.reference)}\` - ${inlineText(item.supports)}`)
    .join("\n");
}

function renderRedactions(packet: ReviewResponsePacket): string {
  if (packet.redactions.length === 0) {
    return "No redactions listed.";
  }

  return packet.redactions
    .map((item) => `- \`${codeSpanText(item.field)}\`: ${inlineText(item.reason)}`)
    .join("\n");
}

function renderSensitiveData(packet: ReviewResponsePacket): string {
  if (!packet.sensitive_data) {
    return "No sensitive-data note provided.";
  }

  return packet.sensitive_data.excluded
    ? blockText(packet.sensitive_data.notes)
    : `Sensitive-data exclusion not asserted. ${inlineText(packet.sensitive_data.notes)}`;
}

function formatLocation(location: ReviewResponsePacket["findings"][number]["location"]): string {
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
