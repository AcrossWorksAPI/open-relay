# GitHub PR Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first Open Relay transport boundary by posting and fetching validated relay packets through GitHub pull request comments.

**Architecture:** Implement GitHub PR comments as the first explicit transport because PRs are already the review workspace for Codex and Claude. Keep the transport generic over packet type: the CLI sends any valid packet and fetches the newest valid marked packet matching a requested type/version. Do not parse arbitrary reviewer prose, request Claude, trigger fixes, merge PRs, or add hosted services in this slice.

**Tech Stack:** TypeScript, Node.js built-in `fetch`, GitHub REST API issue comments, existing JSON Schema validator, existing Markdown renderer, existing Node test runner, existing npm package smoke.

---

## Transport Decision

Use GitHub pull request comments as the first transport boundary.

The first transport comment contains both:

1. A human-readable Markdown render from `renderPacketMarkdown(packet)`.
2. The exact validated packet JSON in a fenced `json open-relay` block.

That makes the comment readable by humans and agents while keeping a precise machine payload for `fetch`. The transport is explicit and auditable, but still local-first: the CLI runs on the user's machine and talks directly to GitHub only when the user runs a `transport github-pr` command.

Alternatives intentionally deferred:

- Clipboard transport: quickest, but still depends on a human as courier and gives weak audit history.
- Committed packet files: auditable, but changes the reviewed branch and creates repository noise before the transport semantics are settled.
- MCP or hosted relay: likely useful later, but too much infrastructure for the first boundary.
- Parsing arbitrary Claude prose: attractive, but brittle and unsafe before the exact packet transport works.

## Command Shape

Add two commands:

```text
open-relay transport github-pr send <packet.json> --pr <url>
open-relay transport github-pr fetch --pr <url> --packet-type <type> [--packet-version <version>] [--output <packet.json>]
```

Rules:

- `send` validates the packet before posting.
- `send` renders the packet with the existing generic renderer.
- `fetch` extracts only marked Open Relay packet comments, parses the fenced JSON payload, validates it, and returns the newest matching packet.
- `fetch` writes JSON to stdout by default or to `--output` when supplied.
- `--packet-version` is optional; when omitted, `fetch` chooses the newest valid packet with the requested `packet_type`.
- Commands require `GITHUB_TOKEN` or `GH_TOKEN`.
- Success messages must not echo PR URLs, output paths, token values, comment ids, API URLs, or raw packet bodies.
- Failure messages must be sanitized and actionable.

## Comment Format

`send` posts comments in this format:

````markdown
<!-- open-relay:packet packet_type=review-request packet_version=0.1 -->
# Open Relay Packet: review-request/0.1

<rendered packet markdown>

## Machine Packet

```json open-relay
{
  "packet_version": "0.1",
  "packet_type": "review-request"
}
```
````

The actual JSON block contains the full pretty-printed packet plus a trailing newline. `fetch` must ignore any unmarked comment or marked comment without a valid `json open-relay` fenced packet.

## Files

- Create `docs/protocol/github-pr-transport.md`: transport semantics, command behavior, comment marker, security posture, and non-goals.
- Create `src/githubPrTransport.ts`: PR URL parsing, comment body formatting, packet extraction, GitHub API calls, and sanitized transport errors.
- Create `tests/githubPrTransport.test.ts`: pure transport parser/formatter/extractor/client tests with a local HTTP server.
- Modify `src/cli.ts`: add `transport github-pr send` and `transport github-pr fetch` routes, strict argument parsing, token lookup, validation, rendering, write handling, and sanitized errors.
- Modify `tests/cli.test.ts`: add help, parser, sanitized error, fake API success, and invalid packet coverage for transport commands.
- Modify `scripts/smoke-pack.js`: assert installed CLI help exposes the transport commands and token-missing failures stay sanitized.
- Modify `docs/STATUS.md`: record the active transport implementation branch and verification evidence.
- Modify `docs/planning/ROADMAP.md`: mark Boundary/transport decision as In progress and point to this plan.
- Modify `docs/planning/ACTIVE_WORK.md`: record GitHub PR comment transport as the next active implementation.
- Modify `docs/planning/PLAN_REGISTRY.md`: register this plan and protocol doc.
- Modify `docs/planning/VERSION_LEDGER.md`: add branch evidence and rollback note.
- Modify `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: mark transport create/view/error-smoke as In progress, while PR review APIs, automation, and merge actions remain unbuilt.
- Modify `master_build.md`: show transport as the current near-term slice.

## Task 1: Pure Transport Helpers

**Files:**
- Create: `src/githubPrTransport.ts`
- Create: `tests/githubPrTransport.test.ts`

- [ ] **Step 1: Write failing parser and formatter tests**

Add this test file:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildTransportCommentBody,
  extractOpenRelayPacketsFromComments,
  parseGithubPullRequestUrl
} from "../src/githubPrTransport";

const packet = {
  packet_type: "review-request",
  packet_version: "0.1",
  created_at: "2026-06-27T00:00:00.000Z"
};

test("parses github pull request URLs", () => {
  assert.deepEqual(
    parseGithubPullRequestUrl("https://github.com/AcrossWorksAPI/open-relay/pull/34"),
    {
      owner: "AcrossWorksAPI",
      repo: "open-relay",
      pullNumber: 34
    }
  );
});

test("rejects unsupported pull request URLs without echoing them", () => {
  assert.throws(
    () => parseGithubPullRequestUrl("https://example.com/acme/repo/pull/1"),
    /Invalid GitHub pull request URL/
  );
});

test("builds marked comments with rendered markdown and exact packet JSON", () => {
  const body = buildTransportCommentBody({
    packet,
    markdown: "# Review Request Relay Packet\n"
  });

  assert.match(body, /<!-- open-relay:packet packet_type=review-request packet_version=0\.1 -->/);
  assert.match(body, /# Open Relay Packet: review-request\/0\.1/);
  assert.match(body, /# Review Request Relay Packet/);
  assert.match(body, /```json open-relay\n/);
  assert.match(body, /"packet_type": "review-request"/);
});

test("extracts newest matching marked packet from comments", () => {
  const older = buildTransportCommentBody({
    packet: { ...packet, created_at: "2026-06-27T00:00:00.000Z" },
    markdown: "# Older\n"
  });
  const newer = buildTransportCommentBody({
    packet: { ...packet, created_at: "2026-06-27T00:01:00.000Z" },
    markdown: "# Newer\n"
  });

  const [found] = extractOpenRelayPacketsFromComments([
    { body: older, created_at: "2026-06-27T00:00:00.000Z" },
    { body: "plain human comment", created_at: "2026-06-27T00:02:00.000Z" },
    { body: newer, created_at: "2026-06-27T00:03:00.000Z" }
  ], {
    packetType: "review-request"
  });

  assert.equal(found.packet.created_at, "2026-06-27T00:01:00.000Z");
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --test-name-pattern "github pull request|marked comments|newest matching"
```

Expected: build fails because `src/githubPrTransport.ts` does not exist.

- [ ] **Step 3: Implement pure helpers**

Create `src/githubPrTransport.ts` with:

```ts
export type GithubPullRequestRef = {
  owner: string;
  repo: string;
  pullNumber: number;
};

export type GithubComment = {
  body: string;
  created_at: string;
};

export type ExtractedTransportPacket = {
  packet: Record<string, unknown>;
  createdAt: string;
};

export type ExtractPacketOptions = {
  packetType: string;
  packetVersion?: string;
};

const markerPattern = /<!-- open-relay:packet packet_type=([^ ]+) packet_version=([^ ]+) -->/;
const packetFencePattern = /```json open-relay\n([\s\S]*?)\n```/;

export function parseGithubPullRequestUrl(value: string): GithubPullRequestRef {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("Invalid GitHub pull request URL.");
  }

  const segments = url.pathname.split("/").filter(Boolean);
  if (url.hostname !== "github.com" || segments.length !== 4 || segments[2] !== "pull") {
    throw new Error("Invalid GitHub pull request URL.");
  }

  const pullNumber = Number.parseInt(segments[3], 10);
  if (!Number.isInteger(pullNumber) || pullNumber <= 0 || `${pullNumber}` !== segments[3]) {
    throw new Error("Invalid GitHub pull request URL.");
  }

  return {
    owner: segments[0],
    repo: segments[1],
    pullNumber
  };
}

export function buildTransportCommentBody(input: {
  packet: Record<string, unknown>;
  markdown: string;
}): string {
  const packetType = String(input.packet.packet_type ?? "");
  const packetVersion = String(input.packet.packet_version ?? "");
  const json = `${JSON.stringify(input.packet, null, 2)}\n`;

  return [
    `<!-- open-relay:packet packet_type=${packetType} packet_version=${packetVersion} -->`,
    `# Open Relay Packet: ${packetType}/${packetVersion}`,
    "",
    input.markdown.trimEnd(),
    "",
    "## Machine Packet",
    "",
    "```json open-relay",
    json.trimEnd(),
    "```",
    ""
  ].join("\n");
}

export function extractOpenRelayPacketsFromComments(
  comments: GithubComment[],
  options: ExtractPacketOptions
): ExtractedTransportPacket[] {
  return comments
    .flatMap((comment) => {
      const marker = markerPattern.exec(comment.body);
      if (!marker) {
        return [];
      }

      const [, packetType, packetVersion] = marker;
      if (packetType !== options.packetType) {
        return [];
      }
      if (options.packetVersion && packetVersion !== options.packetVersion) {
        return [];
      }

      const fence = packetFencePattern.exec(comment.body);
      if (!fence) {
        return [];
      }

      try {
        const packet = JSON.parse(fence[1]) as Record<string, unknown>;
        return [{ packet, createdAt: comment.created_at }];
      } catch {
        return [];
      }
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm test -- --test-name-pattern "github pull request|marked comments|newest matching"
```

Expected: parser, formatter, and extraction tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/githubPrTransport.ts tests/githubPrTransport.test.ts
git commit -m "feat: add github pr transport helpers"
```

## Task 2: GitHub API Client

**Files:**
- Modify: `src/githubPrTransport.ts`
- Modify: `tests/githubPrTransport.test.ts`

- [ ] **Step 1: Write failing API client tests**

Append tests using a local HTTP server:

```ts
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { once } from "node:events";

import {
  fetchLatestGithubPrPacket,
  postGithubPrPacket
} from "../src/githubPrTransport";

test("posts packet comments to the github issue comments endpoint", async () => {
  const requests: Array<{ method?: string; url?: string; authorization?: string; body: string }> = [];
  const server = createServer(async (request: IncomingMessage, response: ServerResponse) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    await once(request, "end");
    requests.push({
      method: request.method,
      url: request.url,
      authorization: request.headers.authorization,
      body: Buffer.concat(chunks).toString("utf8")
    });
    response.writeHead(201, { "content-type": "application/json" });
    response.end(JSON.stringify({ id: 123 }));
  });
  await listen(server);

  try {
    await postGithubPrPacket({
      prUrl: "https://github.com/AcrossWorksAPI/open-relay/pull/34",
      token: "SECRET_TOKEN_SHOULD_NOT_APPEAR",
      packet,
      markdown: "# Review Request Relay Packet\n",
      apiBaseUrl: localBaseUrl(server)
    });

    assert.equal(requests[0].method, "POST");
    assert.equal(requests[0].url, "/repos/AcrossWorksAPI/open-relay/issues/34/comments");
    assert.equal(requests[0].authorization, "Bearer SECRET_TOKEN_SHOULD_NOT_APPEAR");
    assert.match(JSON.parse(requests[0].body).body, /open-relay:packet/);
  } finally {
    await close(server);
  }
});

test("fetches newest valid packet from github issue comments", async () => {
  const body = buildTransportCommentBody({
    packet,
    markdown: "# Review Request Relay Packet\n"
  });
  const server = createServer((_request: IncomingMessage, response: ServerResponse) => {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify([
      { body: "plain comment", created_at: "2026-06-27T00:00:00Z" },
      { body, created_at: "2026-06-27T00:01:00Z" }
    ]));
  });
  await listen(server);

  try {
    const found = await fetchLatestGithubPrPacket({
      prUrl: "https://github.com/AcrossWorksAPI/open-relay/pull/34",
      token: "token",
      packetType: "review-request",
      apiBaseUrl: localBaseUrl(server)
    });

    assert.equal(found.packet.packet_type, "review-request");
  } finally {
    await close(server);
  }
});

async function listen(server: ReturnType<typeof createServer>): Promise<void> {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
}

async function close(server: ReturnType<typeof createServer>): Promise<void> {
  server.close();
  await once(server, "close");
}

function localBaseUrl(server: ReturnType<typeof createServer>): string {
  const address = server.address();
  assert.ok(address && typeof address === "object");
  return `http://127.0.0.1:${address.port}`;
}
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --test-name-pattern "posts packet comments|fetches newest valid packet"
```

Expected: build fails because `postGithubPrPacket` and `fetchLatestGithubPrPacket` are not exported yet.

- [ ] **Step 3: Implement API client**

Add:

```ts
export type GithubApiInput = {
  prUrl: string;
  token: string;
  apiBaseUrl?: string;
};

export type PostGithubPrPacketInput = GithubApiInput & {
  packet: Record<string, unknown>;
  markdown: string;
};

export type FetchGithubPrPacketInput = GithubApiInput & {
  packetType: string;
  packetVersion?: string;
};

export class GithubTransportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GithubTransportError";
  }
}

export async function postGithubPrPacket(input: PostGithubPrPacketInput): Promise<void> {
  const pr = parseGithubPullRequestUrl(input.prUrl);
  const response = await fetch(githubIssueCommentsUrl(input.apiBaseUrl, pr), {
    method: "POST",
    headers: githubHeaders(input.token),
    body: JSON.stringify({
      body: buildTransportCommentBody({
        packet: input.packet,
        markdown: input.markdown
      })
    })
  });

  if (response.status !== 201) {
    throw new GithubTransportError("Could not post GitHub PR comment.");
  }
}

export async function fetchLatestGithubPrPacket(
  input: FetchGithubPrPacketInput
): Promise<ExtractedTransportPacket> {
  const pr = parseGithubPullRequestUrl(input.prUrl);
  const response = await fetch(githubIssueCommentsUrl(input.apiBaseUrl, pr), {
    headers: githubHeaders(input.token)
  });

  if (!response.ok) {
    throw new GithubTransportError("Could not read GitHub PR comments.");
  }

  const comments = await response.json() as GithubComment[];
  const [packet] = extractOpenRelayPacketsFromComments(comments, {
    packetType: input.packetType,
    ...(input.packetVersion ? { packetVersion: input.packetVersion } : {})
  });

  if (!packet) {
    throw new GithubTransportError("No matching Open Relay packet found.");
  }

  return packet;
}

function githubIssueCommentsUrl(apiBaseUrl: string | undefined, pr: GithubPullRequestRef): string {
  const base = apiBaseUrl ?? "https://api.github.com";
  return `${base}/repos/${encodeURIComponent(pr.owner)}/${encodeURIComponent(pr.repo)}/issues/${pr.pullNumber}/comments`;
}

function githubHeaders(token: string): Record<string, string> {
  return {
    "accept": "application/vnd.github+json",
    "authorization": `Bearer ${token}`,
    "content-type": "application/json",
    "user-agent": "open-relay"
  };
}
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm test -- --test-name-pattern "posts packet comments|fetches newest valid packet"
```

Expected: API client tests pass with no real network use.

- [ ] **Step 5: Commit**

```bash
git add src/githubPrTransport.ts tests/githubPrTransport.test.ts
git commit -m "feat: add github pr transport client"
```

## Task 3: CLI Send And Fetch Commands

**Files:**
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Write failing CLI tests**

Add tests that assert:

```ts
test("prints github-pr transport commands in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay transport github-pr send <packet\.json> --pr <url>/);
  assert.match(result.stdout, /open-relay transport github-pr fetch --pr <url> --packet-type <type>/);
});

test("rejects github-pr transport without a token", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "send",
    "examples/review-request/relay.json",
    "--pr",
    "https://github.com/AcrossWorksAPI/open-relay/pull/34"
  ], {
    encoding: "utf8",
    env: { ...process.env, GITHUB_TOKEN: "", GH_TOKEN: "" }
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing GitHub token/);
  assert.doesNotMatch(result.stderr, /AcrossWorksAPI\/open-relay/);
});

test("rejects github-pr fetch with duplicate packet type", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "fetch",
    "--pr", "https://github.com/AcrossWorksAPI/open-relay/pull/34",
    "--packet-type", "review-response",
    "--packet-type", "review-request"
  ], { encoding: "utf8" });

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Duplicate flag: --packet-type/);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --test-name-pattern "github-pr transport"
```

Expected: tests fail because the command is not routed yet.

- [ ] **Step 3: Implement CLI route and strict parsers**

Update usage to include:

```text
open-relay transport github-pr send <packet.json> --pr <url>
open-relay transport github-pr fetch --pr <url> --packet-type <type> [--packet-version <version>] [--output <packet.json>]
```

Add command routing:

```ts
if (args[0] === "transport" && args[1] === "github-pr") {
  if (args[2] === "send") {
    return transportGithubPrSendCommand(args.slice(3));
  }
  if (args[2] === "fetch") {
    return transportGithubPrFetchCommand(args.slice(3));
  }
}
```

Use these behaviors:

- `send` parses `<packet.json> --pr <url>`.
- `send` rejects unknown flags, duplicate `--pr`, missing packet path, and missing `--pr`.
- `send` reads and parses JSON with the same invalid-JSON privacy posture as validate/render.
- `send` validates the packet with `validatePacket`.
- `send` renders with `renderPacketMarkdown`.
- `send` posts with `postGithubPrPacket`.
- `send` prints exactly `Posted Open Relay packet to GitHub PR.` on success.
- `fetch` parses `--pr`, `--packet-type`, optional `--packet-version`, optional `--output`.
- `fetch` validates the fetched packet before writing.
- `fetch` writes pretty JSON plus trailing newline to stdout or `--output`.
- `fetch` prints exactly `Fetched Open Relay packet from GitHub PR.` on file write success.
- Both commands read token with `process.env.GITHUB_TOKEN || process.env.GH_TOKEN`.
- Both commands pass `process.env.OPEN_RELAY_GITHUB_API_BASE_URL` into the client for tests. Do not mention that variable in help output.

- [ ] **Step 4: Add fake API CLI success tests**

Add a local HTTP server helper in `tests/cli.test.ts` and test:

```ts
test("sends packets to github-pr transport through the CLI", async () => {
  const requests: string[] = [];
  const server = createServer(async (request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    await once(request, "end");
    requests.push(Buffer.concat(chunks).toString("utf8"));
    response.writeHead(201, { "content-type": "application/json" });
    response.end(JSON.stringify({ id: 1 }));
  });
  await listen(server);

  try {
    const result = spawnSync(process.execPath, [
      cliPath,
      "transport",
      "github-pr",
      "send",
      "examples/review-request/relay.json",
      "--pr",
      "https://github.com/AcrossWorksAPI/open-relay/pull/34"
    ], {
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_TOKEN: "SECRET_TOKEN_SHOULD_NOT_APPEAR",
        OPEN_RELAY_GITHUB_API_BASE_URL: localBaseUrl(server)
      }
    });

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Posted Open Relay packet to GitHub PR/);
    assert.doesNotMatch(result.stdout, /AcrossWorksAPI\/open-relay/);
    assert.match(requests[0], /open-relay:packet/);
  } finally {
    await close(server);
  }
});
```

Add the matching `fetch` test with a server returning a comment containing `examples/review-response/relay.json` inside a transport comment and assert stdout validates as `packet_type: "review-response"`.

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- --test-name-pattern "github-pr transport|GitHub token|sends packets|fetches packets"
```

Expected: CLI parser and fake API tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: add github pr transport cli"
```

## Task 4: Protocol Doc, Package Smoke, And Closeout

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

- [ ] **Step 1: Write protocol doc**

Create `docs/protocol/github-pr-transport.md` with these sections:

```markdown
# GitHub PR Transport

Last updated: 2026-06-27

## Purpose

GitHub PR transport moves already-valid Open Relay packets through GitHub pull
request comments. It is the first explicit transport boundary for the review
loop.

## Commands

- `open-relay transport github-pr send <packet.json> --pr <url>`
- `open-relay transport github-pr fetch --pr <url> --packet-type <type> [--packet-version <version>] [--output <packet.json>]`

## Comment Contract

Transport comments must include an Open Relay marker and a fenced `json
open-relay` machine packet. The human-readable body is for review. The fenced
JSON is the source of truth for `fetch`.

## Security And Privacy

Commands require `GITHUB_TOKEN` or `GH_TOKEN`. Output must not echo token
values, PR URLs, API URLs, output paths, comment ids, or raw packet bodies in
success or failure messages. The command posts only the packet the user
explicitly provides.

## Non-Goals

- Requesting Claude review.
- Parsing arbitrary reviewer prose.
- Posting review decisions to GitHub review APIs.
- Triggering Codex fixes.
- Auto-merging.
- Saving fetched review responses.
- Supporting GitHub Enterprise or non-GitHub remotes.
```

- [ ] **Step 2: Update package smoke**

In `scripts/smoke-pack.js`, add:

```js
runCli(cli, ["--help"], { contains: "open-relay transport github-pr send" });
runCli(cli, ["--help"], { contains: "open-relay transport github-pr fetch" });

const missingToken = spawnSync(cli, [
  "transport",
  "github-pr",
  "send",
  join(fixtureDir, "examples", "review-request", "relay.json"),
  "--pr",
  "https://github.com/AcrossWorksAPI/open-relay/pull/34"
], {
  encoding: "utf8",
  env: { ...process.env, GITHUB_TOKEN: "", GH_TOKEN: "" }
});
assert.equal(missingToken.status, 1);
assert.match(missingToken.stderr, /Missing GitHub token/);
assert.doesNotMatch(missingToken.stderr, /AcrossWorksAPI\/open-relay/);
```

- [ ] **Step 3: Update roadmap docs**

Make these status changes:

- `docs/planning/ROADMAP.md`: Boundary/transport decision -> `In progress`, plan -> `docs/superpowers/plans/2026-06-27-github-pr-transport.md`.
- `docs/planning/ACTIVE_WORK.md`: current direction says GitHub PR comment transport is the active first boundary.
- `docs/planning/PLAN_REGISTRY.md`: register this plan and protocol doc as active.
- `docs/planning/VERSION_LEDGER.md`: add branch evidence row with local commands.
- `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: transport create/view/error-smoke -> `In progress`; notifications/automation/merge remain `Deferred` or `Planned`.
- `master_build.md`: near-term queue says first packet transport boundary is in progress.
- `docs/STATUS.md`: next step says review and merge GitHub PR transport.

- [ ] **Step 4: Final verification**

Run:

```bash
npm run check
npm run smoke:pack
git diff --check
rg -n '\b([T]BD|[T]ODO|[F]IXME)\b' docs README.md AGENTS.md SECURITY.md CONTRIBUTING.md CODE_OF_CONDUCT.md
```

Expected:

- `npm run check` passes.
- `npm run smoke:pack` passes.
- `git diff --check` prints nothing and exits 0.
- `rg` prints nothing and exits 1.

- [ ] **Step 5: Commit**

```bash
git add docs/protocol/github-pr-transport.md scripts/smoke-pack.js docs/STATUS.md docs/planning/ROADMAP.md docs/planning/ACTIVE_WORK.md docs/planning/PLAN_REGISTRY.md docs/planning/VERSION_LEDGER.md docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md master_build.md
git commit -m "docs: close github pr transport implementation"
```

## Acceptance Criteria

- A user can post any valid relay packet to a GitHub PR comment with one command.
- A user can fetch the newest valid marked relay packet of a requested type from a GitHub PR comment with one command.
- Transport commands validate packets before sending and after fetching.
- The comment format is readable by humans and exact enough for machines.
- No live tests hit GitHub.
- No command output leaks token values, PR URLs, API URLs, output paths, comment ids, or packet bodies.
- The implementation remains generic over packet type and does not add type-specific transport commands.
- The implementation does not request Claude, parse arbitrary prose, trigger fixes, save fetched responses, or merge PRs.

## Self-Review

- Spec coverage: This plan covers the chosen GitHub PR comment boundary, send/fetch commands, exact comment contract, token handling, sanitized output, local test strategy, package smoke, and roadmap closeout.
- Scope check: This is one bounded implementation slice. It moves exact packets through PR comments and deliberately avoids reviewer-prose parsing, automation, PR review APIs, and hosted relay infrastructure.
- Placeholder-term scan: The plan contains no unresolved marker words or unowned future work phrased as implementation steps.
- Type consistency: The plan consistently uses `GithubPullRequestRef`, `GithubComment`, `ExtractedTransportPacket`, `postGithubPrPacket`, `fetchLatestGithubPrPacket`, and `transport github-pr`.
