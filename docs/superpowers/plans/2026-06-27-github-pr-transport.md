# GitHub PR Review-Request Transport Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the first outward Open Relay transport by posting an existing validated `review-request` packet to an explicit GitHub pull request through the local `gh` CLI.

**Architecture:** Use GitHub PR comments as the first transport boundary because PRs are already the review workspace and provide audit history. Use the local `gh` CLI instead of raw GitHub API token handling, so Open Relay never reads or prints tokens and no new npm dependency is needed. Scope this first slice to sending `review-request` packets only; fetching GitHub reviews into `review-response` packets is the next slice because it carries separate state-mapping semantics.

**Tech Stack:** TypeScript, Node.js `execFileSync` with argument arrays, GitHub CLI (`gh`) as an external runtime dependency, existing JSON Schema validator, existing Markdown renderer, existing Node test runner, existing npm package smoke.

---

## Transport Decision

Use GitHub pull request comments as the first transport boundary, driven through `gh`.

This is the first networked/publication capability in Open Relay. All previous runtime slices were local-only. The safety posture is therefore stricter than normal CLI output:

- Sending requires an explicit PR target.
- Sending defaults to a dry run.
- Public repositories require an explicit confirmation flag before posting.
- Open Relay never handles GitHub tokens directly.
- Errors never echo packet bodies, token values, raw `gh` stderr, local paths, or full PR URLs.

## Chosen First Slice

Implement only:

```text
open-relay transport github-pr send review-request --pr <url-or-owner/repo#number> --packet <path> [--dry-run] [--update] [--confirm-public]
```

This removes half of the manual relay immediately: Codex can generate/save a request packet locally, then publish the review request to the PR without the owner copying it into GitHub.

Do not implement `fetch review-response` in this slice. The next slice should map GitHub's structured review data into `review-response`:

- review `state` -> `outcome`;
- review body -> `summary`;
- inline review comments -> `findings`;
- PR review URL -> `provenance`;
- `CHANGES_REQUESTED` without inline comments -> one synthesized blocking finding from the review body.

That mapping is valuable, but it is a separate risk/semantic surface from sending an already-valid packet.

## Command Behavior

`send review-request` accepts:

- `--pr <target>`: required. Accepts `https://github.com/owner/repo/pull/34` or `owner/repo#34`.
- `--packet <path>`: required. Must point to a JSON packet.
- `--dry-run`: optional. Prints the comment body that would be posted and does not call `gh`.
- `--update`: optional. Updates the latest existing Open Relay review-request comment on the PR instead of posting a new comment.
- `--confirm-public`: optional. Required for non-dry-run posting when the target repository is public.

Rules:

- Missing required flags or duplicate singleton flags exit `2`.
- Malformed PR targets exit `2`.
- Missing `gh`, unauthenticated `gh`, network failure, invalid JSON, invalid packet, non-review-request packet, public repo without confirmation, and post/update failure exit `1`.
- Dry runs validate the packet and render the exact comment body, but do not check repo visibility or call `gh`.
- Non-dry-run sends check repository visibility with `gh repo view owner/repo --json visibility`.
- Non-dry-run sends post with `gh api repos/owner/repo/issues/number/comments --method POST --field body=<body>`.
- `--update` finds an existing marker comment using `gh api repos/owner/repo/issues/number/comments`, then patches it with `gh api repos/owner/repo/issues/comments/comment_id --method PATCH --field body=<body>`.
- Success output for posting is exactly `Posted Open Relay review request to GitHub PR.`
- Success output for update is exactly `Updated Open Relay review request on GitHub PR.`
- Success output never includes the PR target, comment id, packet path, or packet body.

## Comment Contract

The posted comment body uses this format:

````markdown
<!-- open-relay:review-request packet_version=0.1 -->
# Open Relay Review Request

<rendered review-request Markdown>
````

The marker is invisible on GitHub but available through `gh api` for update/future correlation. The rendered Markdown is produced by `renderReviewRequestMarkdown(packet)`, not hand-built by transport code.

## Alternatives Decided

| Option | Decision |
| --- | --- |
| Clipboard transport | Deferred because it preserves the human as courier and has weak audit history. |
| Raw GitHub REST API with `GITHUB_TOKEN` | Rejected for the first networked slice because Open Relay would handle a token directly. |
| Generic `send <packet.json>` | Deferred. The first outward action should be explicit about publishing a review request. |
| `fetch review-response` in the same PR | Deferred to the next slice; GitHub review-state mapping is valuable but distinct from send. |
| MCP or hosted relay | Deferred until the CLI loop proves the transport shape. |

## Files

- Create `docs/protocol/github-pr-transport.md`: transport semantics, command behavior, marker, `gh` dependency, security posture, and non-goals.
- Create `src/transport/gh.ts`: thin injectable `runGh(args: string[])` wrapper around `execFileSync("gh", args, ...)` with sanitized failure messages.
- Create `src/transport/githubPr.ts`: PR target parsing, review-request comment body formatting, repo visibility parsing, existing-marker comment extraction, and send/update orchestration.
- Create `tests/githubPrTransport.test.ts`: pure parser/formatter/update-selection tests and fake `runGh` orchestration tests.
- Modify `src/cli.ts`: add `transport github-pr send review-request` route, strict parser, JSON read/validation, review-request type guard, dry-run output, and sanitized error handling.
- Modify `tests/cli.test.ts`: add help, parser, dry-run, token-free error, non-review-request rejection, public confirmation, and sanitized failure coverage.
- Modify `scripts/smoke-pack.js`: assert installed CLI help exposes the send command and dry-run works without network.
- Modify `docs/STATUS.md`: record the active transport implementation branch and verification evidence.
- Modify `docs/planning/ROADMAP.md`: mark Boundary/transport decision as In progress and point to this plan.
- Modify `docs/planning/ACTIVE_WORK.md`: record GitHub PR review-request transport as the active first boundary.
- Modify `docs/planning/PLAN_REGISTRY.md`: register this plan and protocol doc.
- Modify `docs/planning/VERSION_LEDGER.md`: add branch evidence and rollback note.
- Modify `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: mark transport create/error-smoke as In progress; fetch/read, automation, review-response storage, and merge actions remain planned/deferred.
- Modify `master_build.md`: show GitHub PR review-request transport as the current near-term slice.

## Task 1: Pure Transport Helpers

**Files:**
- Create: `src/transport/githubPr.ts`
- Create: `tests/githubPrTransport.test.ts`

- [ ] **Step 1: Write failing parser and formatter tests**

Add `tests/githubPrTransport.test.ts`:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildReviewRequestCommentBody,
  findLatestOpenRelayReviewRequestComment,
  parseGithubPrTarget
} from "../src/transport/githubPr";

const reviewRequestPacket = {
  packet_type: "review-request",
  packet_version: "0.1"
};

test("parses github pull request URL targets", () => {
  assert.deepEqual(
    parseGithubPrTarget("https://github.com/AcrossWorksAPI/open-relay/pull/34"),
    {
      owner: "AcrossWorksAPI",
      repo: "open-relay",
      pullNumber: 34,
      display: "AcrossWorksAPI/open-relay#34"
    }
  );
});

test("parses owner repo number shorthand targets", () => {
  assert.deepEqual(parseGithubPrTarget("AcrossWorksAPI/open-relay#34"), {
    owner: "AcrossWorksAPI",
    repo: "open-relay",
    pullNumber: 34,
    display: "AcrossWorksAPI/open-relay#34"
  });
});

test("rejects unsupported pull request targets without echoing them", () => {
  assert.throws(
    () => parseGithubPrTarget("https://example.com/acme/repo/pull/SECRET_REF_SHOULD_NOT_APPEAR"),
    /Invalid GitHub pull request target/
  );
});

test("builds marked review-request comments from rendered markdown", () => {
  const body = buildReviewRequestCommentBody({
    packet: reviewRequestPacket,
    markdown: "# Review Request Relay Packet\n\n## Next Action\n"
  });

  assert.match(body, /<!-- open-relay:review-request packet_version=0\.1 -->/);
  assert.match(body, /# Open Relay Review Request/);
  assert.match(body, /# Review Request Relay Packet/);
  assert.match(body, /## Next Action/);
});

test("finds latest existing open relay review-request comment", () => {
  const first = buildReviewRequestCommentBody({
    packet: reviewRequestPacket,
    markdown: "# First\n"
  });
  const second = buildReviewRequestCommentBody({
    packet: reviewRequestPacket,
    markdown: "# Second\n"
  });

  const found = findLatestOpenRelayReviewRequestComment([
    { id: 1, body: first, created_at: "2026-06-27T00:00:00Z" },
    { id: 2, body: "human comment", created_at: "2026-06-27T00:02:00Z" },
    { id: 3, body: second, created_at: "2026-06-27T00:01:00Z" }
  ]);

  assert.equal(found?.id, 3);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --test-name-pattern "github pull request|owner repo|marked review-request|latest existing"
```

Expected: build fails because `src/transport/githubPr.ts` does not exist.

- [ ] **Step 3: Implement pure helpers**

Create `src/transport/githubPr.ts`:

```ts
export type GithubPrTarget = {
  owner: string;
  repo: string;
  pullNumber: number;
  display: string;
};

export type GithubIssueComment = {
  id: number;
  body: string;
  created_at: string;
};

const reviewRequestMarker = "<!-- open-relay:review-request packet_version=0.1 -->";

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
  if (url.hostname !== "github.com" || segments.length !== 4 || segments[2] !== "pull") {
    throw new Error("Invalid GitHub pull request target.");
  }

  return buildTarget(segments[0], segments[1], segments[3]);
}

export function buildReviewRequestCommentBody(input: {
  packet: Record<string, unknown>;
  markdown: string;
}): string {
  const packetVersion = String(input.packet.packet_version ?? "");
  return [
    `<!-- open-relay:review-request packet_version=${packetVersion} -->`,
    "# Open Relay Review Request",
    "",
    input.markdown.trimEnd(),
    ""
  ].join("\n");
}

export function findLatestOpenRelayReviewRequestComment(
  comments: GithubIssueComment[]
): GithubIssueComment | undefined {
  return comments
    .filter((comment) => comment.body.includes(reviewRequestMarker))
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
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
    display: `${owner}/${repo}#${pullNumber}`
  };
}
```

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm test -- --test-name-pattern "github pull request|owner repo|marked review-request|latest existing"
```

Expected: parser, formatter, and update-selection tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/transport/githubPr.ts tests/githubPrTransport.test.ts
git commit -m "feat: add github pr transport helpers"
```

## Task 2: Injectable `gh` Transport Operations

**Files:**
- Create: `src/transport/gh.ts`
- Modify: `src/transport/githubPr.ts`
- Modify: `tests/githubPrTransport.test.ts`

- [ ] **Step 1: Write failing send orchestration tests**

Append tests:

```ts
import {
  sendReviewRequestToGithubPr,
  type RunGh
} from "../src/transport/githubPr";

test("dry-run send does not call gh", () => {
  const calls: string[][] = [];
  const result = sendReviewRequestToGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packet: reviewRequestPacket,
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
  assert.match(result.body, /open-relay:review-request/);
});

test("send checks public visibility before posting", () => {
  const calls: string[][] = [];
  const runGh: RunGh = (args) => {
    calls.push(args);
    if (args[0] === "repo") {
      return JSON.stringify({ visibility: "private" });
    }
    return JSON.stringify({ id: 123 });
  };

  sendReviewRequestToGithubPr({
    prTarget: "AcrossWorksAPI/open-relay#34",
    packet: reviewRequestPacket,
    markdown: "# Review Request Relay Packet\n",
    dryRun: false,
    update: false,
    confirmPublic: false,
    runGh
  });

  assert.deepEqual(calls[0], ["repo", "view", "AcrossWorksAPI/open-relay", "--json", "visibility"]);
  assert.equal(calls[1][0], "api");
  assert.match(calls[1].join(" "), /issues\/34\/comments/);
});

test("send rejects public repositories without confirmation", () => {
  const runGh: RunGh = (args) => {
    if (args[0] === "repo") {
      return JSON.stringify({ visibility: "public" });
    }
    return "{}";
  };

  assert.throws(
    () => sendReviewRequestToGithubPr({
      prTarget: "AcrossWorksAPI/open-relay#34",
      packet: reviewRequestPacket,
      markdown: "# Review Request Relay Packet\n",
      dryRun: false,
      update: false,
      confirmPublic: false,
      runGh
    }),
    /Public GitHub repository requires --confirm-public/
  );
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --test-name-pattern "dry-run send|checks public visibility|public repositories"
```

Expected: build fails because `sendReviewRequestToGithubPr` is not exported.

- [ ] **Step 3: Implement `runGh` wrapper**

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

- [ ] **Step 4: Implement send orchestration**

Add to `src/transport/githubPr.ts`:

```ts
export type RunGh = (args: string[]) => string;

export type SendReviewRequestInput = {
  prTarget: string;
  packet: Record<string, unknown>;
  markdown: string;
  dryRun: boolean;
  update: boolean;
  confirmPublic: boolean;
  runGh: RunGh;
};

export type SendReviewRequestResult =
  | { kind: "dry-run"; body: string; target: string }
  | { kind: "posted" }
  | { kind: "updated" };

export function sendReviewRequestToGithubPr(input: SendReviewRequestInput): SendReviewRequestResult {
  const target = parseGithubPrTarget(input.prTarget);
  const body = buildReviewRequestCommentBody({
    packet: input.packet,
    markdown: input.markdown
  });

  if (input.dryRun) {
    return { kind: "dry-run", body, target: target.display };
  }

  assertPublicConfirmation(target, input.confirmPublic, input.runGh);

  if (input.update) {
    updateReviewRequestComment(target, body, input.runGh);
    return { kind: "updated" };
  }

  input.runGh([
    "api",
    `repos/${target.owner}/${target.repo}/issues/${target.pullNumber}/comments`,
    "--method",
    "POST",
    "--field",
    `body=${body}`
  ]);

  return { kind: "posted" };
}

function assertPublicConfirmation(target: GithubPrTarget, confirmPublic: boolean, runGh: RunGh): void {
  const raw = runGh(["repo", "view", `${target.owner}/${target.repo}`, "--json", "visibility"]);
  const parsed = JSON.parse(raw) as { visibility?: string };
  if (parsed.visibility === "public" && !confirmPublic) {
    throw new Error("Public GitHub repository requires --confirm-public.");
  }
}

function updateReviewRequestComment(target: GithubPrTarget, body: string, runGh: RunGh): void {
  const raw = runGh([
    "api",
    `repos/${target.owner}/${target.repo}/issues/${target.pullNumber}/comments`
  ]);
  const comments = JSON.parse(raw) as GithubIssueComment[];
  const comment = findLatestOpenRelayReviewRequestComment(comments);
  if (!comment) {
    throw new Error("No existing Open Relay review-request comment found.");
  }

  runGh([
    "api",
    `repos/${target.owner}/${target.repo}/issues/comments/${comment.id}`,
    "--method",
    "PATCH",
    "--field",
    `body=${body}`
  ]);
}
```

- [ ] **Step 5: Verify GREEN**

Run:

```bash
npm test -- --test-name-pattern "dry-run send|checks public visibility|public repositories"
```

Expected: send orchestration tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/transport/gh.ts src/transport/githubPr.ts tests/githubPrTransport.test.ts
git commit -m "feat: add gh-backed review request transport"
```

## Task 3: CLI Send Command

**Files:**
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Write failing CLI tests**

Add tests:

```ts
test("prints github-pr send command in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], { encoding: "utf8" });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay transport github-pr send review-request --pr <url-or-owner\/repo#number> --packet <path>/);
});

test("dry-runs github-pr review-request transport without gh", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "send",
    "review-request",
    "--pr",
    "AcrossWorksAPI/open-relay#34",
    "--packet",
    "examples/review-request/relay.json",
    "--dry-run"
  ], { encoding: "utf8" });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Would post Open Relay review request to AcrossWorksAPI\/open-relay#34/);
  assert.match(result.stdout, /<!-- open-relay:review-request packet_version=0\.1 -->/);
  assert.match(result.stdout, /# Review Request Relay Packet/);
});

test("rejects github-pr send without dry-run when gh fails", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "send",
    "review-request",
    "--pr",
    "AcrossWorksAPI/open-relay#34",
    "--packet",
    "examples/review-request/relay.json"
  ], {
    encoding: "utf8",
    env: { ...process.env, PATH: "" }
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Could not send Open Relay review request/);
  assert.doesNotMatch(result.stderr, /AcrossWorksAPI\/open-relay/);
  assert.doesNotMatch(result.stderr, /Review Request Relay Packet/);
});

test("rejects non-review-request packets for github-pr send", () => {
  const result = spawnSync(process.execPath, [
    cliPath,
    "transport",
    "github-pr",
    "send",
    "review-request",
    "--pr",
    "AcrossWorksAPI/open-relay#34",
    "--packet",
    "examples/review-response/relay.json",
    "--dry-run"
  ], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Packet is not a review-request/);
});
```

- [ ] **Step 2: Verify RED**

Run:

```bash
npm test -- --test-name-pattern "github-pr send|dry-runs github-pr|non-review-request"
```

Expected: tests fail because CLI route does not exist.

- [ ] **Step 3: Implement CLI parser and route**

Update `src/cli.ts`:

- Add usage line:

```text
open-relay transport github-pr send review-request --pr <url-or-owner/repo#number> --packet <path> [--dry-run] [--update] [--confirm-public]
```

- Route:

```ts
if (args[0] === "transport" && args[1] === "github-pr" && args[2] === "send" && args[3] === "review-request") {
  return transportGithubPrSendReviewRequestCommand(args.slice(4));
}
```

- Parser returns:

```ts
type TransportGithubPrSendArgs =
  | { ok: true; prTarget: string; packetPath: string; dryRun: boolean; update: boolean; confirmPublic: boolean }
  | { ok: false; message: string };
```

- Parser rules:
  - `--pr` and `--packet` require values.
  - `--dry-run`, `--update`, and `--confirm-public` are boolean flags.
  - Unknown flags fail.
  - Duplicate singleton flags fail.
  - Positional arguments fail.

- Command rules:
  - Read packet JSON.
  - Validate with `validatePacket`.
  - Reject if `packet_type !== "review-request"`.
  - Render with `renderPacketMarkdown`.
  - Call `sendReviewRequestToGithubPr` with `runGh` from `src/transport/gh.ts`.
  - On dry run, write:

```text
Would post Open Relay review request to owner/repo#number.

<body>
```

  - On posted success, write `Posted Open Relay review request to GitHub PR.`
  - On updated success, write `Updated Open Relay review request on GitHub PR.`
  - On invalid JSON, write `Invalid JSON in <path>`.
  - On write/send/gh failures, write `Could not send Open Relay review request.`

- [ ] **Step 4: Verify GREEN**

Run:

```bash
npm test -- --test-name-pattern "github-pr send|dry-runs github-pr|non-review-request"
```

Expected: CLI transport tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: add github pr send cli"
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

Create `docs/protocol/github-pr-transport.md` with:

```markdown
# GitHub PR Transport

Last updated: 2026-06-27

## Purpose

GitHub PR transport moves already-valid Open Relay packets through GitHub pull
request comments. The first implementation sends `review-request` packets.

## Commands

`open-relay transport github-pr send review-request --pr <target> --packet <path> [--dry-run] [--update] [--confirm-public]`

## Safety Contract

Sending is an outward publication action. `--pr` is always explicit. Dry runs do
not call `gh`. Non-dry-run sends use the user's local `gh` authentication and
never read or print token values. Public repositories require
`--confirm-public`.

## Marker Contract

Open Relay comments include `<!-- open-relay:review-request packet_version=0.1 -->`
so `--update` and future fetch/correlation commands can find transport-owned
comments without scraping prose.

## Non-Goals

- Fetching review responses.
- Parsing arbitrary reviewer prose.
- Requesting Claude review.
- Posting GitHub review decisions.
- Triggering Codex fixes.
- Auto-merging.
- Saving fetched responses.
- Supporting GitHub Enterprise or non-GitHub remotes.
```

- [ ] **Step 2: Update package smoke**

In `scripts/smoke-pack.js`, add:

```js
runCli(cli, ["--help"], { contains: "open-relay transport github-pr send review-request" });

runCli(cli, [
  "transport",
  "github-pr",
  "send",
  "review-request",
  "--pr",
  "AcrossWorksAPI/open-relay#34",
  "--packet",
  join(fixtureDir, "examples", "review-request", "relay.json"),
  "--dry-run"
], {
  contains: "Would post Open Relay review request to AcrossWorksAPI/open-relay#34"
});
```

- [ ] **Step 3: Update roadmap docs**

Make these status changes:

- `docs/planning/ROADMAP.md`: Boundary/transport decision -> `In progress`, plan -> `docs/superpowers/plans/2026-06-27-github-pr-transport.md`.
- `docs/planning/ACTIVE_WORK.md`: current direction says GitHub PR review-request transport is the active first boundary.
- `docs/planning/PLAN_REGISTRY.md`: register this plan and protocol doc as active.
- `docs/planning/VERSION_LEDGER.md`: add branch evidence row with local commands.
- `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`: transport create/error-smoke -> `In progress`; fetch/read, automation, review-response storage, and merge actions remain planned/deferred.
- `master_build.md`: near-term queue says first packet transport boundary is in progress.
- `docs/STATUS.md`: next step says review and merge GitHub PR review-request transport.

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
git commit -m "docs: close github pr review-request transport"
```

## Acceptance Criteria

- A user can dry-run posting an existing valid `review-request` packet to a GitHub PR without `gh` being installed.
- A user can post an existing valid `review-request` packet to a GitHub PR through local `gh` authentication.
- A user can update the latest existing Open Relay review-request comment on a PR.
- Sending validates packets before rendering/posting.
- Sending refuses non-review-request packets.
- Sending refuses public repository posting unless `--confirm-public` is supplied.
- Open Relay never reads `GITHUB_TOKEN` or `GH_TOKEN`.
- Command execution uses `execFileSync("gh", args, ...)`, not shell strings.
- Failure output never echoes packet bodies, raw `gh` stderr, local paths, token values, or full PR URLs.
- No tests hit live GitHub.
- The implementation does not fetch responses, request Claude, parse arbitrary prose, trigger fixes, save responses, or merge PRs.

## Follow-Up Slice

After send lands, implement:

```text
open-relay transport github-pr fetch review-response --pr <target> [--reviewer <login>] [--output <path>]
```

The fetch slice should map GitHub's structured reviews and inline review comments to a validated `review-response` packet. It should not parse arbitrary prose beyond assigning GitHub-provided review/comment bodies into packet fields.

## Self-Review

- Spec coverage: This reconciles the GitHub PR first-boundary call with the safer `gh`-based implementation path, explicit outward-action safety, dry-run, public-repo confirmation, update behavior, package smoke, and roadmap closeout.
- Scope check: This is one bounded implementation slice: send an existing validated review request to a PR. Fetching review responses is explicitly the next slice.
- Placeholder-term scan: The plan contains no unresolved marker words or unowned future work phrased as implementation steps.
- Type consistency: The plan consistently uses `GithubPrTarget`, `GithubIssueComment`, `RunGh`, `sendReviewRequestToGithubPr`, and `transport github-pr send review-request`.
