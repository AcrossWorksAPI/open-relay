# GitHub PR Packet Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first outward Open Relay transport by sending and fetching exact, validated relay packets through GitHub pull request comments.

**Architecture:** GitHub PR comments are the first transport boundary because review already happens there and comments give a durable audit trail without a hosted service. The transport stays generic over packet type, delegates authentication to the local `gh` CLI, and carries the exact packet JSON as base64 inside an invisible marker while showing the existing rendered Markdown to humans and agents.

**Tech Stack:** TypeScript, Node.js `execFileSync` with argument arrays, GitHub CLI (`gh`), existing packet validation, existing generic packet Markdown renderer, Node's built-in test runner, existing npm package smoke.

---

## Reconciled Decisions

This plan deliberately combines the strongest parts of the independent Codex and Claude designs:

- **GitHub PR comments are the first boundary.** They remove the manual copy/paste step while staying inside the review workspace users already trust.
- **Use `gh`, not raw token handling.** Open Relay does not read `GITHUB_TOKEN`, `GH_TOKEN`, or any GitHub token environment variable. Authentication is owned by the user's existing `gh auth login` state.
- **Use generic packet transport commands.** The envelope already made packet type/version dispatch generic. Transport follows that model instead of adding one command per packet type.
- **Round-trip exact Open Relay packets.** A reviewing agent closes the loop by producing a `review-response` packet and sending it through the same transport. Importing native GitHub review states or prose into `review-response` is a later mode.
- **Use a base64 machine marker, not a Markdown code fence.** Packet-authored text can contain triple backticks, so fenced JSON is not safe as the machine carrier.
- **Require an author filter on fetch.** Schema-valid packets prove shape, not authorship. The first read surface must not trust any commenter by default.
- **Make remote publication deliberate.** `--dry-run` prints the exact comment body without calling `gh`, public repositories require `--confirm-public`, and `--update` avoids duplicate comment spam.

## Command Shape

Add:

```text
open-relay transport github-pr send <packet.json> --pr <url-or-owner/repo#number> [--dry-run] [--update] [--confirm-public]
open-relay transport github-pr fetch --pr <url-or-owner/repo#number> --packet-type <type> --author <login> [--packet-version <version>] [--output <packet.json>]
```

Behavior:

- `send` reads the packet file, parses JSON, validates with `validatePacket`, renders with `renderPacketMarkdown`, and then calls the transport.
- `send --dry-run` validates and renders, then prints the target and exact comment body. It never calls `gh`.
- Non-dry-run `send` checks visibility with `gh repo view owner/repo --json visibility`.
- Public repository sends require `--confirm-public`.
- `send --update` edits the newest existing Open Relay packet comment for the same packet type/version regardless of comment author. If no matching comment exists, it posts a new one.
- Non-update `send` always posts a new issue comment through the GitHub PR's issue-comments endpoint.
- `fetch` requires `--author` and ignores packet comments from every other login.
- `fetch` decodes only the marker payload, validates the decoded packet, filters by requested `packet_type` and optional `packet_version`, and returns the newest matching packet.
- `fetch` writes pretty JSON plus a trailing newline to stdout or `--output`.
- Non-dry-run success messages never echo the PR target, output path, comment id, raw packet, raw marker payload, or raw `gh` output.

## Comment Contract

`send` posts comments in this shape:

```markdown
<!-- open-relay-packet
packet_type: review-request
packet_version: 0.1
payload_base64: eyJwYWNrZXRfdHlwZSI6InJldmlldy1yZXF1ZXN0In0=
-->
# Open Relay Packet: review-request/0.1

<rendered packet markdown>
```

The rendered Markdown is for humans and agents. The HTML marker is the machine source of truth. `fetch` must not scrape, parse, or infer from the human prose.

## Security And Privacy Rules

- Do not read `GITHUB_TOKEN`, `GH_TOKEN`, or any token environment variable.
- Do not invoke a shell command string. Use `execFileSync("gh", args, ...)` with argument arrays.
- Do not print raw `gh` stderr/stdout on failure.
- Treat GitHub comment authorship as a filter, not cryptographic authenticity.
- Do not claim a fetched packet is trusted beyond matching the requested `--author`, packet type, packet version, and schema/semantic validation.
- Public repository posting must fail closed without `--confirm-public`.
- Dry-run output intentionally shows the exact comment body because the user asked to preview what would be published.

## Non-Goals

- Importing native GitHub review states or inline review comments.
- Mapping GitHub `APPROVED`, `CHANGES_REQUESTED`, or review prose into `review-response`.
- Requesting Claude review.
- Posting GitHub review decisions.
- Triggering Codex fixes from fetched responses.
- Auto-merging.
- Saving fetched responses into `.open-relay`.
- Supporting GitHub Enterprise, GitLab, Codeberg, or non-GitHub remotes.

## Follow-Up Slice

After exact packet transport lands, plan a separate importer:

```text
open-relay transport github-pr import-review --pr <url-or-owner/repo#number> --reviewer <login>
```

That mode can map native GitHub review state, inline comments, and review body prose into a `review-response` packet. It should not be bundled into this first transport because the exact-packet carrier is the protocol primitive.

## Files

- Create `docs/protocol/github-pr-transport.md`: command behavior, marker contract, `gh` dependency, authorship limits, public repo confirmation, and non-goals.
- Create `src/transport/gh.ts`: sanitized `gh` wrapper.
- Create `src/transport/githubPr.ts`: PR target parsing, comment building, marker extraction, matching, visibility checks, send orchestration, and fetch orchestration.
- Create `tests/githubPrTransport.test.ts`: pure helper and fake-`gh` transport tests.
- Modify `src/cli.ts`: route and parse `transport github-pr send` and `transport github-pr fetch`.
- Modify `tests/cli.test.ts`: help, parser, dry-run, sanitized error, and fetch/write behavior coverage.
- Modify `scripts/smoke-pack.js`: installed CLI help and dry-run smoke, with no network call.
- Modify `docs/STATUS.md`: record transport implementation evidence.
- Modify `docs/planning/ROADMAP.md`: mark Boundary/transport decision as `In progress` and point to this plan.
- Modify `docs/planning/ACTIVE_WORK.md`: list GitHub PR packet transport as active.
- Modify `docs/planning/PLAN_REGISTRY.md`: register this plan and protocol doc.
- Modify `docs/planning/VERSION_LEDGER.md`: add branch, smoke, and rollback evidence.
- Modify `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: mark packet transport create/read/update/error-smoke as `In progress`; native-review import, automation, response storage, and merge actions stay planned or deferred.
- Modify `master_build.md`: show GitHub PR packet transport as the current near-term slice.

## Lifecycle Coverage

| Lens | Decision |
| --- | --- |
| Create/invite/attach | `send` creates or updates a PR comment containing an exact packet marker plus rendered Markdown. |
| List/search/view | `fetch` lists PR issue comments through `gh api` and reads only Open Relay markers. |
| Edit/update | `send --update` edits the newest matching packet comment for the same packet type/version. |
| Activate/deactivate/archive | N/A for comments in this slice; GitHub owns comment lifecycle. |
| Remove/delete/offboard | Deferred; no delete command. Users can delete comments in GitHub. |
| Transfer/reassignment/ownership | GitHub comment authorship is external metadata; Open Relay filters by author but does not own identity. |
| Notes/support metadata | Marker metadata is packet type, packet version, and base64 payload only. |
| Permissions/roles/scope | GitHub permissions and local `gh` auth determine whether send/fetch succeeds. |
| Audit/events | GitHub comment history plus local command output are the audit surface. |
| Notifications | GitHub may notify PR participants; Open Relay does not send additional notifications. |
| Billing/quota | N/A beyond GitHub API limits owned by `gh`. |
| Error/empty/recovery/smoke | Missing `gh`, auth failure, public repo confirmation failure, invalid marker, no matching author, invalid packet, and write failure get sanitized tests. |

## Task 1: Pure Packet Comment Helpers

**Files:**
- Create: `src/transport/githubPr.ts`
- Create: `tests/githubPrTransport.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create `tests/githubPrTransport.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildOpenRelayPacketCommentBody,
  extractOpenRelayPacketComments,
  findLatestMatchingOpenRelayPacketComment,
  findLatestPacketCommentForUpdate,
  parseGithubPrTarget
} from "../src/transport/githubPr";

const requestPacket = {
  packet_type: "review-request",
  packet_version: "0.1",
  created_at: "2026-06-27T00:00:00.000Z"
};

const responsePacket = {
  packet_type: "review-response",
  packet_version: "0.1",
  created_at: "2026-06-27T00:01:00.000Z"
};

test("parses github pull request URL targets", () => {
  assert.deepEqual(
    parseGithubPrTarget("https://github.com/AcrossWorksAPI/open-relay/pull/34"),
    {
      owner: "AcrossWorksAPI",
      repo: "open-relay",
      pullNumber: 34,
      display: "AcrossWorksAPI/open-relay#34",
      repository: "AcrossWorksAPI/open-relay"
    }
  );
});

test("parses owner repo number shorthand targets", () => {
  assert.deepEqual(parseGithubPrTarget("AcrossWorksAPI/open-relay#34"), {
    owner: "AcrossWorksAPI",
    repo: "open-relay",
    pullNumber: 34,
    display: "AcrossWorksAPI/open-relay#34",
    repository: "AcrossWorksAPI/open-relay"
  });
});

test("rejects unsupported pull request targets without echoing them", () => {
  assert.throws(
    () => parseGithubPrTarget("https://example.com/acme/repo/pull/SECRET_REF_SHOULD_NOT_APPEAR"),
    /^Error: Invalid GitHub pull request target\.$/
  );
});

test("builds marked packet comments with invisible base64 payload", () => {
  const body = buildOpenRelayPacketCommentBody({
    packet: requestPacket,
    markdown: "# Review Request Relay Packet\n\n```ts\nconst value = true;\n```\n"
  });

  assert.match(body, /<!-- open-relay-packet\n/);
  assert.match(body, /packet_type: review-request\n/);
  assert.match(body, /packet_version: 0\.1\n/);
  assert.match(body, /payload_base64: [A-Za-z0-9+/=]+\n/);
  assert.match(body, /# Open Relay Packet: review-request\/0\.1/);
  assert.match(body, /```ts\nconst value = true;\n```/);
});

test("extracts packets from base64 markers without reading markdown prose", () => {
  const body = buildOpenRelayPacketCommentBody({
    packet: responsePacket,
    markdown: "# Human prose with ```json fences that should not matter\n"
  });

  const [found] = extractOpenRelayPacketComments([
    {
      id: 42,
      body,
      created_at: "2026-06-27T00:02:00Z",
      user: { login: "claude" }
    }
  ]);

  assert.equal(found.packet.packet_type, "review-response");
  assert.equal(found.packetType, "review-response");
  assert.equal(found.packetVersion, "0.1");
  assert.equal(found.author, "claude");
});

test("skips markers whose decoded packet disagrees with marker metadata", () => {
  const body = buildOpenRelayPacketCommentBody({
    packet: requestPacket,
    markdown: "# Request\n"
  }).replace("packet_type: review-request", "packet_type: review-response");

  assert.deepEqual(extractOpenRelayPacketComments([
    { id: 1, body, created_at: "2026-06-27T00:00:00Z", user: { login: "codex" } }
  ]), []);
});

test("finds newest matching packet comment by type version and author", () => {
  const older = buildOpenRelayPacketCommentBody({
    packet: { ...responsePacket, created_at: "2026-06-27T00:01:00.000Z" },
    markdown: "# Older\n"
  });
  const newer = buildOpenRelayPacketCommentBody({
    packet: { ...responsePacket, created_at: "2026-06-27T00:03:00.000Z" },
    markdown: "# Newer\n"
  });
  const wrongAuthor = buildOpenRelayPacketCommentBody({
    packet: { ...responsePacket, created_at: "2026-06-27T00:04:00.000Z" },
    markdown: "# Wrong author\n"
  });

  const found = findLatestMatchingOpenRelayPacketComment([
    { id: 1, body: older, created_at: "2026-06-27T00:01:00Z", user: { login: "claude" } },
    { id: 2, body: wrongAuthor, created_at: "2026-06-27T00:04:00Z", user: { login: "other" } },
    { id: 3, body: newer, created_at: "2026-06-27T00:03:00Z", user: { login: "claude" } }
  ], {
    packetType: "review-response",
    packetVersion: "0.1",
    author: "claude"
  });

  assert.equal(found?.comment.id, 3);
});

test("finds newest update candidate by type and version without author filtering", () => {
  const body = buildOpenRelayPacketCommentBody({
    packet: requestPacket,
    markdown: "# Request\n"
  });

  const found = findLatestPacketCommentForUpdate([
    { id: 1, body, created_at: "2026-06-27T00:00:00Z", user: { login: "codex" } },
    { id: 2, body, created_at: "2026-06-27T00:05:00Z", user: { login: "other" } }
  ], {
    packetType: "review-request",
    packetVersion: "0.1"
  });

  assert.equal(found?.comment.id, 2);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --test-name-pattern "github pull request|owner repo|base64 payload|newest matching|update candidate"
```

Expected: TypeScript build fails because `src/transport/githubPr.ts` does not exist.

- [ ] **Step 3: Implement pure helpers**

Create `src/transport/githubPr.ts`:

```ts
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
};

const markerPattern = /<!-- open-relay-packet\npacket_type: ([^\n]+)\npacket_version: ([^\n]+)\npayload_base64: ([A-Za-z0-9+/=]+)\n-->/;

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
    .filter((comment) => comment.packetVersion === match.packetVersion))[0];
}

function newestFirst(comments: OpenRelayPacketComment[]): OpenRelayPacketComment[] {
  return [...comments].sort((left, right) => {
    const created = right.comment.created_at.localeCompare(left.comment.created_at);
    return created === 0 ? right.comment.id - left.comment.id : created;
  });
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
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm test -- --test-name-pattern "github pull request|owner repo|base64 payload|newest matching|update candidate"
```

Expected: helper tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/transport/githubPr.ts tests/githubPrTransport.test.ts
git commit -m "feat: add github pr packet transport helpers"
```

## Task 2: Injectable `gh` Transport Operations

**Files:**
- Create: `src/transport/gh.ts`
- Modify: `src/transport/githubPr.ts`
- Modify: `tests/githubPrTransport.test.ts`

- [ ] **Step 1: Write failing transport orchestration tests**

Append to `tests/githubPrTransport.test.ts`:

```ts
import {
  fetchPacketFromGithubPr,
  sendPacketToGithubPr,
  type RunGh
} from "../src/transport/githubPr";

test("dry-run send returns the exact comment body without calling gh", () => {
  const calls: string[][] = [];
  const result = sendPacketToGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packet: requestPacket,
    markdown: "# Review Request Relay Packet\n",
    dryRun: true,
    update: false,
    confirmPublic: false,
    runGh: (args) => {
      calls.push(args);
      return "{}";
    }
  });

  assert.equal(calls.length, 0);
  assert.equal(result.kind, "dry-run");
  assert.match(result.body, /open-relay-packet/);
  assert.equal(result.target, "AcrossWorksAPI/open-relay#34");
});

test("send checks repository visibility before posting", () => {
  const calls: string[][] = [];
  const runGh: RunGh = (args) => {
    calls.push(args);
    if (args[0] === "repo") {
      return JSON.stringify({ visibility: "PRIVATE" });
    }
    return JSON.stringify({ id: 123 });
  };

  const result = sendPacketToGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packet: requestPacket,
    markdown: "# Review Request Relay Packet\n",
    dryRun: false,
    update: false,
    confirmPublic: false,
    runGh
  });

  assert.equal(result.kind, "posted");
  assert.deepEqual(calls[0], ["repo", "view", "AcrossWorksAPI/open-relay", "--json", "visibility"]);
  assert.deepEqual(calls[1].slice(0, 4), [
    "api",
    "repos/AcrossWorksAPI/open-relay/issues/34/comments",
    "--method",
    "POST"
  ]);
});

test("send rejects public repositories without confirmation", () => {
  const runGh: RunGh = (args) => {
    if (args[0] === "repo") {
      return JSON.stringify({ visibility: "PUBLIC" });
    }
    return "{}";
  };

  assert.throws(
    () => sendPacketToGithubPr({
      prTarget: "AcrossWorksAPI/open-relay#34",
      packet: requestPacket,
      markdown: "# Review Request Relay Packet\n",
      dryRun: false,
      update: false,
      confirmPublic: false,
      runGh
    }),
    /^Error: Public GitHub repository requires --confirm-public\.$/
  );
});

test("send with confirmation posts to public repositories", () => {
  const calls: string[][] = [];
  const runGh: RunGh = (args) => {
    calls.push(args);
    if (args[0] === "repo") {
      return JSON.stringify({ visibility: "PUBLIC" });
    }
    return JSON.stringify({ id: 456 });
  };

  const result = sendPacketToGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packet: requestPacket,
    markdown: "# Review Request Relay Packet\n",
    dryRun: false,
    update: false,
    confirmPublic: true,
    runGh
  });

  assert.equal(result.kind, "posted");
  assert.equal(calls.length, 2);
});

test("update edits latest matching packet comment or posts when none exists", () => {
  const existingBody = buildOpenRelayPacketCommentBody({
    packet: requestPacket,
    markdown: "# Existing\n"
  });
  const calls: string[][] = [];
  const runGh: RunGh = (args) => {
    calls.push(args);
    if (args[0] === "repo") {
      return JSON.stringify({ visibility: "PRIVATE" });
    }
    if (args[1] === "repos/AcrossWorksAPI/open-relay/issues/34/comments?per_page=100") {
      return JSON.stringify([[
        { id: 7, body: existingBody, created_at: "2026-06-27T00:00:00Z", user: { login: "codex" } }
      ]]);
    }
    return JSON.stringify({ id: 7 });
  };

  const result = sendPacketToGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packet: requestPacket,
    markdown: "# Updated\n",
    dryRun: false,
    update: true,
    confirmPublic: false,
    runGh
  });

  assert.equal(result.kind, "updated");
  assert.deepEqual(calls.at(-1)?.slice(0, 4), [
    "api",
    "repos/AcrossWorksAPI/open-relay/issues/comments/7",
    "--method",
    "PATCH"
  ]);
});

test("fetch reads newest matching packet from required author", () => {
  const matchingBody = buildOpenRelayPacketCommentBody({
    packet: responsePacket,
    markdown: "# Review Response Relay Packet\n"
  });
  const otherBody = buildOpenRelayPacketCommentBody({
    packet: { ...responsePacket, created_at: "2026-06-27T00:03:00.000Z" },
    markdown: "# Other\n"
  });
  const runGh: RunGh = () => JSON.stringify([[
    { id: 1, body: matchingBody, created_at: "2026-06-27T00:01:00Z", user: { login: "claude" } },
    { id: 2, body: otherBody, created_at: "2026-06-27T00:03:00Z", user: { login: "other" } }
  ]]);

  const found = fetchPacketFromGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packetType: "review-response",
    packetVersion: "0.1",
    author: "claude",
    runGh
  });

  assert.equal(found.packet.packet_type, "review-response");
  assert.equal(found.author, "claude");
});

test("fetch reports no matching packet without echoing author or target", () => {
  const runGh: RunGh = () => JSON.stringify([]);

  assert.throws(
    () => fetchPacketFromGithubPr({
      prTarget: "AcrossWorksAPI/open-relay#34",
      packetType: "review-response",
      author: "SECRET_AUTHOR_SHOULD_NOT_APPEAR",
      runGh
    }),
    /^Error: No matching Open Relay packet comment found\.$/
  );
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --test-name-pattern "dry-run send|repository visibility|public repositories|latest matching packet|No matching"
```

Expected: TypeScript build fails because transport orchestration exports do not exist.

- [ ] **Step 3: Add sanitized `gh` wrapper**

Create `src/transport/gh.ts`:

```ts
import { execFileSync } from "node:child_process";

export class GhError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GhError";
  }
}

export function runGh(args: string[]): string {
  try {
    return execFileSync("gh", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch {
    throw new GhError("GitHub CLI command failed.");
  }
}
```

- [ ] **Step 4: Add send and fetch orchestration**

Append to `src/transport/githubPr.ts`:

```ts
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
    const comments = listIssueComments(target, input.runGh);
    const existing = findLatestPacketCommentForUpdate(comments, { packetType, packetVersion });
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

function assertPublicConfirmation(target: GithubPrTarget, confirmPublic: boolean, runGh: RunGh): void {
  const raw = runGh(["repo", "view", target.repository, "--json", "visibility"]);
  const parsed = JSON.parse(raw) as { visibility?: string };
  if (String(parsed.visibility ?? "").toLowerCase() === "public" && !confirmPublic) {
    throw new Error("Public GitHub repository requires --confirm-public.");
  }
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
```

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- --test-name-pattern "dry-run send|repository visibility|public repositories|latest matching packet|No matching"
```

Expected: transport orchestration tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/transport/gh.ts src/transport/githubPr.ts tests/githubPrTransport.test.ts
git commit -m "feat: add gh-backed github pr packet transport"
```

## Task 3: CLI Send And Fetch Commands

**Files:**
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Write failing CLI tests**

Add focused CLI tests to `tests/cli.test.ts`:

```ts
test("prints github pr transport commands in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay transport github-pr send <packet\.json>/);
  assert.match(result.stdout, /open-relay transport github-pr fetch/);
});

test("transport github-pr send dry-run prints exact comment body without gh", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "send",
    "examples/review-request/relay.json",
    "--pr",
    "AcrossWorksAPI/open-relay#34",
    "--dry-run"
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Dry run target: AcrossWorksAPI\/open-relay#34/);
  assert.match(result.stdout, /<!-- open-relay-packet/);
  assert.match(result.stdout, /payload_base64:/);
  assert.match(result.stdout, /# Review Request Relay Packet/);
  assert.equal(result.stderr, "");
});

test("transport github-pr send rejects missing pr flag", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "send",
    "examples/review-request/relay.json"
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing required flag: --pr/);
});

test("transport github-pr send rejects invalid packet without publishing", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-transport-"));
  const packetPath = join(directory, "packet.json");
  writeFileSync(packetPath, JSON.stringify({ packet_type: "review-request", packet_version: "0.1" }), "utf8");

  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "send",
    packetPath,
    "--pr",
    "AcrossWorksAPI/open-relay#34",
    "--dry-run"
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Invalid packet/);
  assert.doesNotMatch(result.stdout, /open-relay-packet/);
});

test("transport github-pr fetch requires author", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "fetch",
    "--pr",
    "AcrossWorksAPI/open-relay#34",
    "--packet-type",
    "review-response"
  ], {
    encoding: "utf8"
  });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Missing required flag: --author/);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --test-name-pattern "github pr transport commands|send dry-run|send rejects|fetch requires author"
```

Expected: help and command tests fail because the CLI route is missing.

- [ ] **Step 3: Wire CLI imports and usage**

In `src/cli.ts`, add imports:

```ts
import { runGh } from "./transport/gh";
import {
  fetchPacketFromGithubPr,
  sendPacketToGithubPr
} from "./transport/githubPr";
```

Update usage:

```text
  open-relay transport github-pr send <packet.json> --pr <url-or-owner/repo#number> [--dry-run] [--update] [--confirm-public]
  open-relay transport github-pr fetch --pr <url-or-owner/repo#number> --packet-type <type> --author <login> [--packet-version <version>] [--output <packet.json>]
```

Add notes:

```text
  transport github-pr uses the local gh CLI; Open Relay does not read GitHub token environment variables.
  transport github-pr fetch requires --author because packet shape is not proof of authorship.
```

- [ ] **Step 4: Add route and argument parsers**

Add the route before the unknown-command branch:

```ts
if (args[0] === "transport" && args[1] === "github-pr" && args[2] === "send") {
  return transportGithubPrSendCommand(args.slice(3));
}

if (args[0] === "transport" && args[1] === "github-pr" && args[2] === "fetch") {
  return transportGithubPrFetchCommand(args.slice(3));
}
```

Add parser result types:

```ts
type GithubPrSendArgs =
  | {
    ok: true;
    packetPath: string;
    pr: string;
    dryRun: boolean;
    update: boolean;
    confirmPublic: boolean;
  }
  | { ok: false; message: string };

type GithubPrFetchArgs =
  | {
    ok: true;
    pr: string;
    packetType: string;
    author: string;
    packetVersion?: string;
    output?: string;
  }
  | { ok: false; message: string };
```

Add strict parser helpers:

```ts
function parseGithubPrSendArgs(args: string[]): GithubPrSendArgs {
  const packetPath = args[0];
  if (!packetPath) {
    return { ok: false, message: "Missing packet path." };
  }

  let pr: string | undefined;
  let dryRun = false;
  let update = false;
  let confirmPublic = false;

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--dry-run") {
      if (dryRun) return { ok: false, message: "Duplicate flag: --dry-run" };
      dryRun = true;
      continue;
    }

    if (arg === "--update") {
      if (update) return { ok: false, message: "Duplicate flag: --update" };
      update = true;
      continue;
    }

    if (arg === "--confirm-public") {
      if (confirmPublic) return { ok: false, message: "Duplicate flag: --confirm-public" };
      confirmPublic = true;
      continue;
    }

    if (arg === "--pr") {
      if (pr) return { ok: false, message: "Duplicate flag: --pr" };
      const value = args[index + 1];
      if (!value || value.startsWith("--")) {
        return { ok: false, message: "Missing value for --pr" };
      }
      pr = value;
      index += 1;
      continue;
    }

    return { ok: false, message: arg.startsWith("--") ? `Unknown flag: ${arg}` : `Unexpected argument: ${arg}` };
  }

  if (!pr) {
    return { ok: false, message: "Missing required flag: --pr" };
  }

  return { ok: true, packetPath, pr, dryRun, update, confirmPublic };
}

function parseGithubPrFetchArgs(args: string[]): GithubPrFetchArgs {
  let pr: string | undefined;
  let packetType: string | undefined;
  let packetVersion: string | undefined;
  let author: string | undefined;
  let output: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!["--pr", "--packet-type", "--packet-version", "--author", "--output"].includes(arg)) {
      return { ok: false, message: arg.startsWith("--") ? `Unknown flag: ${arg}` : `Unexpected argument: ${arg}` };
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      return { ok: false, message: `Missing value for ${arg}` };
    }

    if (arg === "--pr") {
      if (pr) return { ok: false, message: "Duplicate flag: --pr" };
      pr = value;
    } else if (arg === "--packet-type") {
      if (packetType) return { ok: false, message: "Duplicate flag: --packet-type" };
      packetType = value;
    } else if (arg === "--packet-version") {
      if (packetVersion) return { ok: false, message: "Duplicate flag: --packet-version" };
      packetVersion = value;
    } else if (arg === "--author") {
      if (author) return { ok: false, message: "Duplicate flag: --author" };
      author = value;
    } else {
      if (output) return { ok: false, message: "Duplicate flag: --output" };
      output = value;
    }
    index += 1;
  }

  if (!pr) return { ok: false, message: "Missing required flag: --pr" };
  if (!packetType) return { ok: false, message: "Missing required flag: --packet-type" };
  if (!author) return { ok: false, message: "Missing required flag: --author" };

  return {
    ok: true,
    pr,
    packetType,
    author,
    ...(packetVersion ? { packetVersion } : {}),
    ...(output ? { output } : {})
  };
}
```

- [ ] **Step 5: Add command implementations**

Add:

```ts
async function transportGithubPrSendCommand(args: string[]): Promise<number> {
  const parsed = parseGithubPrSendArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  try {
    const raw = await readFile(parsed.packetPath, "utf8");
    const packet = JSON.parse(raw) as Record<string, unknown>;
    const result = validatePacket(packet);
    if (!result.valid) {
      process.stderr.write("Invalid packet.\n");
      for (const error of result.errors) {
        process.stderr.write(`- ${error}\n`);
      }
      return 1;
    }

    const markdown = renderPacketMarkdown(packet);
    const sent = sendPacketToGithubPr({
      prTarget: parsed.pr,
      packet,
      markdown,
      dryRun: parsed.dryRun,
      update: parsed.update,
      confirmPublic: parsed.confirmPublic,
      runGh
    });

    if (sent.kind === "dry-run") {
      process.stdout.write(`Dry run target: ${sent.target}\n\n${sent.body}`);
    } else if (sent.kind === "updated") {
      process.stdout.write("Updated GitHub PR Open Relay packet comment.\n");
    } else {
      process.stdout.write("Posted GitHub PR Open Relay packet comment.\n");
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof SyntaxError
      ? "Invalid JSON in packet file."
      : "Could not send GitHub PR Open Relay packet.";
    process.stderr.write(`${message}\n`);
    return 1;
  }
}

async function transportGithubPrFetchCommand(args: string[]): Promise<number> {
  const parsed = parseGithubPrFetchArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  try {
    const found = fetchPacketFromGithubPr({
      prTarget: parsed.pr,
      packetType: parsed.packetType,
      ...(parsed.packetVersion ? { packetVersion: parsed.packetVersion } : {}),
      author: parsed.author,
      runGh
    });
    const result = validatePacket(found.packet);
    if (!result.valid) {
      process.stderr.write("Fetched Open Relay packet failed validation.\n");
      for (const error of result.errors) {
        process.stderr.write(`- ${error}\n`);
      }
      return 1;
    }

    const output = `${JSON.stringify(found.packet, null, 2)}\n`;
    if (parsed.output) {
      try {
        await writeFile(parsed.output, output, "utf8");
      } catch {
        process.stderr.write("Could not write fetched Open Relay packet.\n");
        return 1;
      }
      process.stdout.write("Wrote fetched Open Relay packet.\n");
    } else {
      process.stdout.write(output);
    }

    return 0;
  } catch {
    process.stderr.write("Could not fetch GitHub PR Open Relay packet.\n");
    return 1;
  }
}
```

- [ ] **Step 6: Verify CLI GREEN**

Run:

```bash
npm run build
npm test -- --test-name-pattern "github pr transport commands|send dry-run|send rejects|fetch requires author"
```

Expected: build and CLI tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: add github pr packet transport cli"
```

## Task 4: Protocol Docs, Smoke, And Closeout

**Files:**
- Create: `docs/protocol/github-pr-transport.md`
- Modify: `scripts/smoke-pack.js`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`
- Modify: `master_build.md`

- [ ] **Step 1: Write the protocol doc**

Create `docs/protocol/github-pr-transport.md`:

````markdown
# GitHub PR Packet Transport

Last updated: 2026-06-27

## Purpose

GitHub PR packet transport lets a local Open Relay CLI user post and fetch exact
validated relay packets through GitHub pull request comments. It is the first
outward transport boundary for the review loop.

## Commands

```text
open-relay transport github-pr send <packet.json> --pr <url-or-owner/repo#number> [--dry-run] [--update] [--confirm-public]
open-relay transport github-pr fetch --pr <url-or-owner/repo#number> --packet-type <type> --author <login> [--packet-version <version>] [--output <packet.json>]
```

`send` validates and renders the packet before posting. `fetch` reads marked
comments, filters by author and packet type/version, decodes the marker payload,
and validates the fetched packet before printing or writing it.

## Marker Contract

The machine-readable payload is a base64-encoded JSON packet in an HTML comment:

```markdown
<!-- open-relay-packet
packet_type: review-request
packet_version: 0.1
payload_base64: eyJwYWNrZXRfdHlwZSI6InJldmlldy1yZXF1ZXN0In0=
-->
# Open Relay Packet: review-request/0.1

<rendered packet markdown>
```

The rendered Markdown is not the machine source of truth. Implementations must
decode the marker payload and validate the decoded packet.

## Authentication

Open Relay uses the local GitHub CLI (`gh`) for authentication. Open Relay does
not read GitHub token environment variables and does not print raw `gh` output
on failure.

## Authorship And Trust

`fetch` requires `--author` because valid packet shape is not proof of identity.
The author filter checks GitHub's comment author login. This is a practical
filter, not cryptographic authenticity.

## Public Repositories

Non-dry-run sends check repository visibility. Public repositories require
`--confirm-public` before posting.

## Non-Goals

- Importing native GitHub review state or inline review comments.
- Requesting external reviews.
- Triggering fixes or merges.
- Persisting fetched packets.
- Supporting non-GitHub transports.
````

- [ ] **Step 2: Update package smoke**

In `scripts/smoke-pack.js`, add installed CLI checks that:

- `open-relay --help` includes `transport github-pr send`.
- `open-relay --help` includes `transport github-pr fetch`.
- Installed CLI dry-run sends `examples/review-request/relay.json` to `AcrossWorksAPI/open-relay#34`.
- Dry-run output includes `<!-- open-relay-packet`, `payload_base64:`, and `# Review Request Relay Packet`.
- Dry-run output does not require `gh`, network, or authentication.

- [ ] **Step 3: Update roadmap/status docs**

Update:

- `docs/STATUS.md`: mark GitHub PR exact-packet transport implementation as active; record local verification after it runs.
- `docs/planning/ROADMAP.md`: set `Boundary/transport decision` to `In progress` and point the plan column to `docs/superpowers/plans/2026-06-27-github-pr-transport.md`.
- `docs/planning/ACTIVE_WORK.md`: add new source rows for `docs/protocol/github-pr-transport.md`, `src/transport/gh.ts`, `src/transport/githubPr.ts`, and `tests/githubPrTransport.test.ts`.
- `docs/planning/PLAN_REGISTRY.md`: add this implementation plan under active plans during the branch, then move it to implemented/historical at merge closeout.
- `docs/planning/VERSION_LEDGER.md`: add branch evidence with rollback note that GitHub PR packet transport can be reverted independently from packet schemas and repo-local storage.
- `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: add or update a `Packet transport` row with create/read/update/error-smoke as `In progress`, delete/archive/storage/automation as deferred or planned.
- `master_build.md`: show GitHub PR exact-packet transport as the current near-term slice.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm run check
npm run smoke:pack
git diff --check
rg -n '\b([T]BD|[T]ODO|[F]IXME)\b' docs README.md AGENTS.md SECURITY.md CONTRIBUTING.md CODE_OF_CONDUCT.md
```

Expected:

- `npm run check` passes.
- `npm run smoke:pack` passes without live GitHub calls.
- `git diff --check` passes.
- Placeholder scan exits with no unresolved marker terms.

- [ ] **Step 5: Commit**

```bash
git add docs/protocol/github-pr-transport.md scripts/smoke-pack.js docs/STATUS.md docs/planning/ROADMAP.md docs/planning/ACTIVE_WORK.md docs/planning/PLAN_REGISTRY.md docs/planning/VERSION_LEDGER.md docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md master_build.md
git commit -m "docs: record github pr packet transport"
```

## Acceptance Criteria

- `send --dry-run` validates any supported packet type, renders it, and prints the exact PR comment body without calling `gh`.
- Non-dry-run `send` posts any supported packet through `gh api`.
- `send --update` edits the newest existing Open Relay packet comment for the same packet type/version, or posts if none exists.
- Public repository sends fail without `--confirm-public`.
- `fetch` requires `--author`.
- `fetch` returns the newest valid marked packet for the requested packet type, optional packet version, and author.
- Base64 marker payload survives packet text that contains Markdown code fences.
- Validation runs before sending and after fetching.
- Open Relay never reads GitHub token environment variables.
- `gh` is invoked with `execFileSync("gh", args, ...)`, not shell strings.
- Errors are sanitized.
- Tests do not call live GitHub.
- Package smoke proves installed CLI dry-run behavior.
- Native GitHub review import, external review requests, response storage, fix automation, and merge automation remain outside this slice.

## Self-Review

- **Spec coverage:** Claude's feedback is covered: `gh` auth, generic commands, exact packet carrier, base64 marker, author-filtered fetch, dry-run, public confirmation, and update behavior. The reviewer-packet production assumption is explicit, and native review import is a named follow-up.
- **Placeholder scan:** The plan uses concrete file paths, commands, function names, tests, and snippets; no unresolved placeholder markers are intentionally present.
- **Type consistency:** Helper types introduced in Task 1 are reused by Task 2; CLI commands in Task 3 call Task 2 orchestration; Task 4 records the same command names and marker contract.
