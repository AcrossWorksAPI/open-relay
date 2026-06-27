import { GH_FAILURE_MESSAGE } from "./gh";

export type GithubPrTarget = {
  owner: string;
  repo: string;
  pullNumber: number;
  display: string;
  repository: string;
};

export type GithubIssueComment = {
  id: number;
  body: string;
  created_at: string;
  user?: {
    login?: string;
  };
};

export type OpenRelayPacketComment = {
  comment: GithubIssueComment;
  packet: Record<string, unknown>;
  packetType: string;
  packetVersion: string;
  author: string;
};

export type PacketMatch = {
  packetType: string;
  packetVersion?: string;
  author: string;
};

export type UpdatePacketMatch = {
  packetType: string;
  packetVersion: string;
  author: string;
};

export type RunGh = (args: string[]) => string;

export type SendPacketInput = {
  prTarget: string;
  packet: Record<string, unknown>;
  markdown: string;
  dryRun: boolean;
  update: boolean;
  confirmPublic: boolean;
  runGh: RunGh;
};

export type SendPacketResult =
  | { kind: "dry-run"; body: string; target: string }
  | { kind: "posted" }
  | { kind: "updated" };

export type FetchPacketInput = {
  prTarget: string;
  packetType: string;
  packetVersion?: string;
  author: string;
  runGh: RunGh;
};

const markerPattern = /<!-- open-relay-packet\r?\npacket_type: ([^\r\n]+)\r?\npacket_version: ([^\r\n]+)\r?\npayload_base64: ([A-Za-z0-9+/=]+)\r?\n-->/;

export function parseGithubPrTarget(value: string): GithubPrTarget {
  const shorthand = /^([^/\s]+)\/([^#\s]+)#([1-9][0-9]*)$/.exec(value);
  if (shorthand) {
    return buildTarget(shorthand[1], shorthand[2], shorthand[3]);
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid GitHub pull request target.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (url.protocol !== "https:" || url.hostname !== "github.com" || segments.length !== 4 || segments[2] !== "pull") {
    throw new Error("Invalid GitHub pull request target.");
  }

  return buildTarget(segments[0], segments[1], segments[3]);
}

export function buildOpenRelayPacketCommentBody(input: {
  packet: Record<string, unknown>;
  markdown: string;
}): string {
  const packetType = String(input.packet.packet_type ?? "");
  const packetVersion = String(input.packet.packet_version ?? "");
  const payload = Buffer.from(`${JSON.stringify(input.packet, null, 2)}\n`, "utf8").toString("base64");

  return [
    "<!-- open-relay-packet",
    `packet_type: ${packetType}`,
    `packet_version: ${packetVersion}`,
    `payload_base64: ${payload}`,
    "-->",
    `# Open Relay Packet: ${packetType}/${packetVersion}`,
    "",
    input.markdown.trimEnd(),
    ""
  ].join("\n");
}

export function extractOpenRelayPacketComments(comments: GithubIssueComment[]): OpenRelayPacketComment[] {
  return comments.flatMap((comment) => {
    const marker = markerPattern.exec(comment.body);
    if (!marker) {
      return [];
    }

    const [, packetType, packetVersion, payload] = marker;
    const author = comment.user?.login;
    if (!author) {
      return [];
    }

    try {
      const json = Buffer.from(payload, "base64").toString("utf8");
      const packet = JSON.parse(json) as Record<string, unknown>;
      if (packet.packet_type !== packetType || packet.packet_version !== packetVersion) {
        return [];
      }
      return [{ comment, packet, packetType, packetVersion, author }];
    } catch {
      return [];
    }
  });
}

export function findLatestMatchingOpenRelayPacketComment(
  comments: GithubIssueComment[],
  match: PacketMatch
): OpenRelayPacketComment | undefined {
  return newestFirst(extractOpenRelayPacketComments(comments)
    .filter((comment) => comment.packetType === match.packetType)
    .filter((comment) => !match.packetVersion || comment.packetVersion === match.packetVersion)
    .filter((comment) => comment.author === match.author))[0];
}

export function findLatestPacketCommentForUpdate(
  comments: GithubIssueComment[],
  match: UpdatePacketMatch
): OpenRelayPacketComment | undefined {
  return newestFirst(extractOpenRelayPacketComments(comments)
    .filter((comment) => comment.packetType === match.packetType)
    .filter((comment) => comment.packetVersion === match.packetVersion)
    .filter((comment) => comment.author === match.author))[0];
}

export function sendPacketToGithubPr(input: SendPacketInput): SendPacketResult {
  const target = parseGithubPrTarget(input.prTarget);
  const packetType = String(input.packet.packet_type ?? "");
  const packetVersion = String(input.packet.packet_version ?? "");
  const body = buildOpenRelayPacketCommentBody({
    packet: input.packet,
    markdown: input.markdown
  });

  if (input.dryRun) {
    return { kind: "dry-run", body, target: target.display };
  }

  assertPublicConfirmation(target, input.confirmPublic, input.runGh);

  if (input.update) {
    const author = getAuthenticatedGithubLogin(input.runGh);
    const comments = listIssueComments(target, input.runGh);
    const existing = findLatestPacketCommentForUpdate(comments, { packetType, packetVersion, author });
    if (existing) {
      input.runGh([
        "api",
        `repos/${target.owner}/${target.repo}/issues/comments/${existing.comment.id}`,
        "--method",
        "PATCH",
        "--raw-field",
        `body=${body}`
      ]);
      return { kind: "updated" };
    }
  }

  input.runGh([
    "api",
    `repos/${target.owner}/${target.repo}/issues/${target.pullNumber}/comments`,
    "--method",
    "POST",
    "--raw-field",
    `body=${body}`
  ]);

  return { kind: "posted" };
}

export function fetchPacketFromGithubPr(input: FetchPacketInput): OpenRelayPacketComment {
  const target = parseGithubPrTarget(input.prTarget);
  const comments = listIssueComments(target, input.runGh);
  const found = findLatestMatchingOpenRelayPacketComment(comments, {
    packetType: input.packetType,
    ...(input.packetVersion ? { packetVersion: input.packetVersion } : {}),
    author: input.author
  });

  if (!found) {
    throw new Error("No matching Open Relay packet comment found.");
  }

  return found;
}

function newestFirst(comments: OpenRelayPacketComment[]): OpenRelayPacketComment[] {
  return [...comments].sort((left, right) => {
    const created = right.comment.created_at.localeCompare(left.comment.created_at);
    return created === 0 ? right.comment.id - left.comment.id : created;
  });
}

function assertPublicConfirmation(target: GithubPrTarget, confirmPublic: boolean, runGh: RunGh): void {
  const raw = runGh(["repo", "view", target.repository, "--json", "visibility"]);
  const parsed = JSON.parse(raw) as { visibility?: string };
  if (String(parsed.visibility ?? "").toLowerCase() === "public" && !confirmPublic) {
    throw new Error("Public GitHub repository requires --confirm-public.");
  }
}

function getAuthenticatedGithubLogin(runGh: RunGh): string {
  const login = runGh(["api", "user", "--jq", ".login"]).trim();
  if (!login) {
    throw new Error(GH_FAILURE_MESSAGE);
  }
  return login;
}

function listIssueComments(target: GithubPrTarget, runGh: RunGh): GithubIssueComment[] {
  const raw = runGh([
    "api",
    `repos/${target.owner}/${target.repo}/issues/${target.pullNumber}/comments?per_page=100`,
    "--paginate",
    "--slurp"
  ]);
  const parsed = JSON.parse(raw) as unknown;
  if (Array.isArray(parsed) && parsed.every(Array.isArray)) {
    return parsed.flat() as GithubIssueComment[];
  }
  if (Array.isArray(parsed)) {
    return parsed as GithubIssueComment[];
  }
  return [];
}

function buildTarget(owner: string, repo: string, pullNumberText: string): GithubPrTarget {
  const pullNumber = Number.parseInt(pullNumberText, 10);
  if (!Number.isInteger(pullNumber) || pullNumber <= 0 || `${pullNumber}` !== pullNumberText) {
    throw new Error("Invalid GitHub pull request target.");
  }

  return {
    owner,
    repo,
    pullNumber,
    repository: `${owner}/${repo}`,
    display: `${owner}/${repo}#${pullNumber}`
  };
}
