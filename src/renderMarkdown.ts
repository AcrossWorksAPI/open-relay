export type ProvenanceType =
  | "pull_request"
  | "ci_run"
  | "commit"
  | "issue"
  | "user_note"
  | "external_url";

export function formatList(values: string[], emptyText = "none"): string {
  return values.length > 0 ? values.map(inlineText).join(", ") : emptyText;
}

export function escapeTableCell(value: string): string {
  return inlineText(value).replace(/\|/g, "\\|");
}

export function escapeCodeSpanTableCell(value: string): string {
  return codeSpanText(value).replace(/\|/g, "\\|");
}

export function inlineText(value: string): string {
  return value.replace(/\r?\n/g, " ");
}

export function codeSpanText(value: string): string {
  return inlineText(value).replace(/`/g, "");
}

export function blockText(value: string): string {
  return value.trim();
}

export function labelForProvenanceType(type: ProvenanceType): string {
  const labels: Record<ProvenanceType, string> = {
    pull_request: "Pull Request",
    ci_run: "CI Run",
    commit: "Commit",
    issue: "Issue",
    user_note: "User Note",
    external_url: "External URL"
  };

  return labels[type];
}
