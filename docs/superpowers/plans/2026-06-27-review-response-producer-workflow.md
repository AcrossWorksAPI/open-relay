# Review Response Producer Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a local workflow that turns an explicit reviewer-authored draft plus an existing `review-request` packet into a validated `review-response/0.1` packet, then optionally posts that exact packet to a GitHub PR through the merged exact-packet transport.

**Architecture:** Keep packet production separate from packet transport. A new producer reads and validates a `review-request` packet, reads a small review draft JSON file, derives `response_to` from the request, builds a complete `review-response/0.1` packet, validates it through the existing packet registry, renders through the generic renderer when Markdown is requested, and reuses the GitHub PR transport helper when sending. The transport remains exact and simple: it never synthesizes review content from GitHub prose.

**Tech Stack:** TypeScript, Node.js 22, existing JSON Schema validation through Ajv, existing CLI parser style, existing Markdown renderer dispatcher, existing GitHub PR transport helpers, Node's built-in test runner, and `npm run smoke:pack`.

---

## Context

The request side of the loop is now built:

- `review-request/0.1` can be generated, rendered, handed off, saved, and posted to a GitHub PR.
- `review-response/0.1` can be validated and rendered.
- GitHub PR exact-packet transport can send, update, and fetch marked packets.

The missing workflow is the reviewer side. A reviewing agent can produce findings, but Open Relay has no command that creates a valid `review-response` packet from that review and posts it back through the transport. Today the user still has to bridge that gap manually.

This slice closes that gap without importing native GitHub reviews, invoking Claude, triggering fixes, or merging PRs.

## Command Contract

Add two commands:

```text
open-relay generate review-response --request <review-request.json> --review <review-response-draft.json> [--format json|markdown] [--output <path>]
open-relay respond github-pr --request <review-request.json> --review <review-response-draft.json> --pr <url-or-owner/repo#number> [--dry-run] [--update] [--confirm-public]
```

`generate review-response` is the local packet producer. It writes or prints a complete validated packet in JSON by default, or rendered Markdown with `--format markdown`.

`respond github-pr` is the no-copy/paste reviewer workflow. It builds the same validated packet, renders it, and passes it to the existing GitHub PR transport helper. `--dry-run`, `--update`, and `--confirm-public` keep the same meanings as `transport github-pr send`.

Do not add `handoff review-response` in this slice. The command would only re-emit an existing generated packet shape and would violate the roadmap rule against command duplication.

## Draft Input Contract

The draft file is reviewer-authored JSON. It contains the reviewer's content, not envelope or request-linkage fields.

Example:

```json
{
  "reviewer": {
    "name": "Claude Code",
    "kind": "agent",
    "tool": "Claude Code"
  },
  "outcome": "approved",
  "confidence": "high",
  "summary": "No blocking findings. The transport keeps exact packet movement separate from native GitHub review import.",
  "findings": [],
  "reviewed_scope": {
    "files": [
      {
        "path": "src/transport/githubPr.ts",
        "notes": "Reviewed marker encoding, send, update, and fetch behavior."
      }
    ],
    "limitations": []
  },
  "verification": [
    {
      "kind": "command",
      "command": "npm run check",
      "result": "passed",
      "evidence": "123 tests passed in the implementation branch."
    }
  ],
  "redactions": [],
  "next_action": "Merge after CI passes."
}
```

The producer must validate the draft with a top-level key allowlist before
building the packet. Reserved fields are owned by Open Relay and must be
rejected if present in the draft:

- `packet_type`
- `packet_version`
- `created_at`
- `response_to`

Unknown draft keys must also be rejected. This prevents reviewer-authored
optional content from disappearing because of a typo, such as `verificaton`
instead of `verification`.

`verification` and `redactions` may be omitted in the draft and default to empty arrays. `provenance` and `sensitive_data` remain optional. All final packet semantics remain enforced by the existing `review-response` schema and registry semantic checks.

## Derived `response_to`

The producer must derive the `response_to` object from the validated request packet:

```ts
response_to: {
  packet_type: request.packet_type,
  packet_version: request.packet_version,
  repository: request.repository.name,
  working_branch: request.repository.working_branch,
  base_commit: request.repository.base_commit,
  head_commit: request.repository.head_commit,
  diff_range: request.repository.diff_range,
  ...(request.repository.pull_request_url ? { pull_request_url: request.repository.pull_request_url } : {}),
  source: "review-request packet"
}
```

Do not copy `repository.local_path`, `remote_url`, or free-form request prose into `response_to`. The response packet should identify the reviewed change without expanding the sensitive or verbose request surface.

`storage_id` remains deferred because current `review-request` packets do not carry a saved-bundle id. A later response-storage slice can add this when saved request bundles become first-class inputs.

## Non-Goals

- Calling Claude, Codex, or any external reviewer.
- Inferring findings from Markdown prose.
- Importing native GitHub review approvals, review comments, or inline comments.
- Posting native GitHub reviews.
- Triggering fixes, commits, rebases, merges, or auto-merge.
- Saving response bundles under `.open-relay/`.
- Adding new packet versions.
- Adding agent-specific prompt templates.

## Implementation Tasks

### Task 1: Add Review Draft Types And Builder Tests

- [ ] Create `tests/reviewResponseProducer.test.ts`.
- [ ] Add a parsed fixture helper that loads `examples/review-request/relay.json`.
- [ ] Write a passing-input test before implementation:

```ts
test("builds a valid review-response packet from a request and draft", () => {
  const packet = buildReviewResponsePacket({
    request: validReviewRequestFixture(),
    draft: {
      reviewer: { name: "Claude Code", kind: "agent", tool: "Claude Code" },
      outcome: "approved",
      confidence: "high",
      summary: "No blocking findings.",
      findings: [],
      reviewed_scope: { files: [{ path: "src/cli.ts" }], limitations: [] },
      verification: [],
      redactions: [],
      next_action: "Merge after CI passes."
    },
    createdAt: "2026-06-27T00:00:00Z"
  });

  assert.equal(validatePacket(packet).valid, true);
  assert.equal(packet.packet_type, "review-response");
  assert.equal(packet.response_to.repository, "example/open-relay");
  assert.equal(packet.response_to.diff_range, "def5678..abc1234");
});
```

- [ ] Add a test that `response_to` is derived from the request.
- [ ] Add a test that the reserved-field guard rejects drafts containing `packet_type`, `packet_version`, `created_at`, or `response_to` before the packet is built.
- [ ] Add a test that the draft-key allowlist rejects misspelled or unknown keys such as `verificaton` before the packet is built.
- [ ] Add a test that defaulted `verification` and `redactions` become empty arrays in the final packet.
- [ ] Add semantic tests through `validatePacket`:
  - `approved` rejects blocking findings.
  - `changes_requested` requires at least one blocking finding.
  - `blocked` requires at least one reviewed-scope limitation.

Expected initial result: tests fail because `src/reviewResponseProducer.ts` does not exist.

### Task 2: Implement The Producer Module

- [ ] Add `src/reviewResponseProducer.ts`.
- [ ] Export the builder from `src/index.ts`.
- [ ] Keep the module pure. It should not read files, write files, call git, call GitHub, or touch process state.

Implementation shape:

```ts
import type { ReviewRequestPacket } from "./reviewRequest";
import type { ReviewResponsePacket } from "./reviewResponse";

export type ReviewResponseDraft = {
  reviewer: ReviewResponsePacket["reviewer"];
  outcome: ReviewResponsePacket["outcome"];
  confidence: ReviewResponsePacket["confidence"];
  summary: string;
  findings: ReviewResponsePacket["findings"];
  reviewed_scope: ReviewResponsePacket["reviewed_scope"];
  verification?: ReviewResponsePacket["verification"];
  provenance?: ReviewResponsePacket["provenance"];
  redactions?: ReviewResponsePacket["redactions"];
  sensitive_data?: ReviewResponsePacket["sensitive_data"];
  next_action: string;
};

export function buildReviewResponsePacket(input: {
  request: ReviewRequestPacket;
  draft: ReviewResponseDraft;
  createdAt?: string;
}): ReviewResponsePacket {
  return {
    packet_version: "0.1",
    packet_type: "review-response",
    created_at: input.createdAt ?? new Date().toISOString(),
    response_to: {
      packet_type: input.request.packet_type,
      packet_version: input.request.packet_version,
      repository: input.request.repository.name,
      working_branch: input.request.repository.working_branch,
      base_commit: input.request.repository.base_commit,
      head_commit: input.request.repository.head_commit,
      diff_range: input.request.repository.diff_range,
      ...(input.request.repository.pull_request_url ? {
        pull_request_url: input.request.repository.pull_request_url
      } : {}),
      source: "review-request packet"
    },
    reviewer: input.draft.reviewer,
    outcome: input.draft.outcome,
    confidence: input.draft.confidence,
    summary: input.draft.summary,
    findings: input.draft.findings,
    reviewed_scope: input.draft.reviewed_scope,
    verification: input.draft.verification ?? [],
    ...(input.draft.provenance ? { provenance: input.draft.provenance } : {}),
    redactions: input.draft.redactions ?? [],
    ...(input.draft.sensitive_data ? { sensitive_data: input.draft.sensitive_data } : {}),
    next_action: input.draft.next_action
  };
}
```

- [ ] Add a small `validateReviewResponseDraftKeys(value: unknown)` helper in this module or the CLI parser. The final behavior must reject reserved fields and unknown top-level keys before building, with generic messages that do not echo draft contents.

Draft-key helper shape:

```ts
const allowedDraftKeys = new Set([
  "reviewer",
  "outcome",
  "confidence",
  "summary",
  "findings",
  "reviewed_scope",
  "verification",
  "provenance",
  "redactions",
  "sensitive_data",
  "next_action"
]);

const reservedDraftKeys = new Set([
  "packet_type",
  "packet_version",
  "created_at",
  "response_to"
]);

export function validateReviewResponseDraftKeys(value: unknown):
  | { ok: true }
  | { ok: false; reason: "reserved" | "unknown" } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: true };
  }

  for (const key of Object.keys(value)) {
    if (reservedDraftKeys.has(key)) {
      return { ok: false, reason: "reserved" };
    }
    if (!allowedDraftKeys.has(key)) {
      return { ok: false, reason: "unknown" };
    }
  }

  return { ok: true };
}
```

### Task 3: Add Response Producer Argument Parsing

- [ ] Add `src/reviewResponseArgs.ts`.
- [ ] Keep this separate from `src/args.ts`, which is already scoped to `generate review-request`.
- [ ] Add `tests/reviewResponseArgs.test.ts`.

Parser contracts:

```ts
export type GenerateReviewResponseOptions = {
  request: string;
  review: string;
  format: "json" | "markdown";
  output?: string;
};

export type RespondGithubPrOptions = {
  request: string;
  review: string;
  pr: string;
  dryRun: boolean;
  update: boolean;
  confirmPublic: boolean;
};
```

`generate review-response` accepts only:

- `--request <path>` required
- `--review <path>` required
- `--format json|markdown` optional, default `json`
- `--output <path>` optional

`respond github-pr` accepts only:

- `--request <path>` required
- `--review <path>` required
- `--pr <url-or-owner/repo#number>` required
- `--dry-run` optional
- `--update` optional
- `--confirm-public` optional

Reject unknown flags, duplicate flags, missing values, invalid formats, malformed PR targets, and unexpected positional arguments with exit code 2 at the CLI layer.

Do not accept `--format` or `--output` on `respond github-pr`. Users who want local files should use `generate review-response`.

### Task 4: Add CLI Builder And Generate Command

- [ ] Update `src/cli.ts` usage text:

```text
open-relay generate review-response --request <review-request.json> --review <review-response-draft.json> [--format json|markdown] [--output <path>]
```

- [ ] Add `generateReviewResponseCommand(args: string[])`.
- [ ] Add a shared helper in `src/cli.ts` or a small new module:

```ts
async function buildValidatedReviewResponseFromFiles(input: {
  requestPath: string;
  reviewPath: string;
}): Promise<
  | { ok: true; packet: ReviewResponsePacket }
  | { ok: false; exitCode: 1 | 2; message: string; errors?: string[] }
>
```

Required behavior:

1. Read the request JSON.
2. Reject invalid request JSON with `Invalid JSON in review-request file.` and no raw parser snippet.
3. Validate the request with `validatePacket`.
4. Require `packet_type === "review-request"` after validation. Reject other valid packet types with `Expected review-request packet.`.
5. Read the draft JSON.
6. Reject invalid draft JSON with `Invalid JSON in review-response draft file.` and no raw parser snippet.
7. Reject reserved draft fields with `Review-response draft contains reserved Open Relay fields.`.
8. Reject unknown draft fields with `Review-response draft contains unknown fields.`.
9. Build with `buildReviewResponsePacket`.
10. Validate the final packet with `validatePacket`.
11. If validation fails, print `Generated review-response packet failed validation.` plus validation errors.

Output behavior:

- Default stdout JSON remains `${JSON.stringify(packet, null, 2)}\n`.
- `--format markdown` uses `renderPacketMarkdown(packet)`.
- `--output` success messages are sanitized:
  - JSON: `Wrote review-response packet.`
  - Markdown: `Wrote review-response Markdown.`
- Write failures are sanitized:
  - JSON: `Could not write review-response packet.`
  - Markdown: `Could not write review-response Markdown.`

### Task 5: Add `respond github-pr`

- [ ] Update `src/cli.ts` usage text:

```text
open-relay respond github-pr --request <review-request.json> --review <review-response-draft.json> --pr <url-or-owner/repo#number> [--dry-run] [--update] [--confirm-public]
```

- [ ] Add route:

```ts
if (args[0] === "respond" && args[1] === "github-pr") {
  return respondGithubPrCommand(args.slice(2));
}
```

- [ ] Implement `respondGithubPrCommand` by reusing the same build/validate helper from Task 4.
- [ ] Render via `renderPacketMarkdown(packet)`.
- [ ] Send through `sendPacketToGithubPr` with existing `runGh`.
- [ ] Reuse `safeTransportError` for allowed transport errors.

Output behavior:

- Dry run prints:

```text
Dry run target: <owner/repo#number>

<exact Open Relay packet comment body>
```

- Posted: `Posted GitHub PR Open Relay packet comment.`
- Updated: `Updated GitHub PR Open Relay packet comment.`
- Transport failure: `Could not send GitHub PR Open Relay packet.` or one of the existing allowlisted safe messages.

This command must not write a temporary packet file. It should compose in memory so no response packet is left behind accidentally.

### Task 6: CLI And Transport-Composition Tests

- [ ] Extend `tests/cli.test.ts` or add `tests/reviewResponseCli.test.ts`.

Required tests:

- `--help` prints both new commands.
- `generate review-response` prints valid JSON to stdout.
- Generated JSON validates and has `response_to` derived from the request.
- `generate review-response --format markdown` prints `# Review Response Relay Packet`.
- `generate review-response --output <SECRET_PATH>` prints sanitized success without echoing the path.
- Invalid request JSON does not print file contents or parser snippets.
- Invalid draft JSON does not print file contents or parser snippets.
- Reserved draft fields are rejected.
- Unknown draft fields are rejected so optional reviewer content cannot silently disappear because of a typo.
- A draft that violates outcome semantics fails final validation.
- `respond github-pr --dry-run` prints an exact marked packet comment with `packet_type: review-response`, a base64 payload, and rendered response Markdown.
- `respond github-pr --dry-run` does not require `gh`.
- `respond github-pr` rejects missing `--pr` with exit code 2.
- `respond github-pr` rejects `--output` and `--format` with exit code 2.
- Malformed PR target errors do not echo secret-shaped target strings.

Fixture helper for CLI tests:

```ts
function writeReviewResponseDraft(path: string): void {
  writeFileSync(path, JSON.stringify({
    reviewer: { name: "Claude Code", kind: "agent", tool: "Claude Code" },
    outcome: "approved",
    confidence: "high",
    summary: "No blocking findings.",
    findings: [],
    reviewed_scope: { files: [{ path: "src/cli.ts" }], limitations: [] },
    verification: [],
    redactions: [],
    next_action: "Merge after CI passes."
  }, null, 2), "utf8");
}
```

### Task 7: Package Smoke

- [ ] Update `scripts/smoke-pack.js`.
- [ ] Write a response draft into the smoke workspace.
- [ ] Run installed CLI:

```text
open-relay generate review-response --request <example request> --review <draft> --format markdown --output <response.md>
```

- [ ] Assert the output contains:
  - `# Review Response Relay Packet`
  - `## Outcome`
  - `## Next Action`

- [ ] Run installed CLI:

```text
open-relay respond github-pr --request <example request> --review <draft> --pr AcrossWorksAPI/open-relay#34 --dry-run
```

- [ ] Assert the dry-run output contains:
  - `<!-- open-relay-packet`
  - `packet_type: review-response`
  - `payload_base64:`
  - `# Review Response Relay Packet`

Do not add a live GitHub call to package smoke.

### Task 8: Protocol And User Docs

- [ ] Add `docs/protocol/review-response-producer.md`.

Required content:

- Purpose: reviewer-authored draft to validated `review-response` packet.
- Commands and draft input shape.
- Reserved fields and why Open Relay derives them.
- Unknown-field rejection and why the draft is fail-closed for typos.
- `response_to` derivation rules.
- Relationship to GitHub PR transport.
- Non-goals: no native GitHub import, no AI invocation, no fixes, no merges.

- [ ] Update `docs/protocol/github-pr-transport.md` Packet Producer Contract to point to the producer workflow as the local way to create review-response packets.
- [ ] Update `README.md` with a short "Close a review loop" example:

```text
open-relay transport github-pr fetch --pr AcrossWorksAPI/open-relay#36 --packet-type review-request --author codex --output request.json
open-relay respond github-pr --request request.json --review review-draft.json --pr AcrossWorksAPI/open-relay#36 --dry-run
```

Keep the README wording clear that the reviewer still authors the review draft.

### Task 9: Roadmap And Closeout

- [ ] Update `docs/STATUS.md`.
- [ ] Update `docs/planning/ROADMAP.md`.
- [ ] Update `docs/planning/ACTIVE_WORK.md`.
- [ ] Update `docs/planning/PLAN_REGISTRY.md`.
- [ ] Update `docs/planning/VERSION_LEDGER.md`.
- [ ] Update `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md` if it tracks the response producer as a workflow surface.

Status posture:

- The planning PR marks this slice `In progress`.
- The implementation PR marks it `Done` only after local verification, package smoke, CI, and review are green.
- Do not mark anything `Live`; this is still a local CLI, not a published package or hosted service.

### Task 10: Verification

Run before opening the implementation PR:

```text
npm run check
npm run smoke:pack
git diff --check
```

Also run targeted manual smokes:

```text
node dist/src/cli.js generate review-response --request examples/review-request/relay.json --review /tmp/review-draft.json
node dist/src/cli.js generate review-response --request examples/review-request/relay.json --review /tmp/review-draft.json --format markdown
node dist/src/cli.js respond github-pr --request examples/review-request/relay.json --review /tmp/review-draft.json --pr AcrossWorksAPI/open-relay#36 --dry-run
```

Manual smoke expectations:

- JSON output validates as `review-response/0.1`.
- Markdown output starts with `# Review Response Relay Packet`.
- Dry-run output contains the HTML marker, base64 payload, and rendered response Markdown.
- No command echoes output paths, raw invalid JSON snippets, GitHub tokens, local paths, or secret-shaped values.

## Review Focus

Ask reviewers to check:

- Does the draft-file design reduce copy/paste without making Open Relay pretend to author the review?
- Is `response_to` derived from the request packet with the right amount of data and no local-path expansion?
- Does `respond github-pr` compose with exact-packet transport cleanly, without polluting the transport layer?
- Are reserved-field and unknown-field draft guards plus sanitized error paths sufficient for public open-source use?
- Is the command surface small enough, or should one of the two commands wait?

## Expected End State

After implementation, the review loop can run locally as:

1. Codex creates and posts a `review-request` packet.
2. Claude or another reviewer fetches the request packet.
3. The reviewer writes a `review-response` draft.
4. Open Relay builds and validates the final `review-response` packet.
5. Open Relay posts the exact packet to the PR.
6. Codex fetches the reviewer-authored packet and acts on its outcome.

That is the first complete no-copy/paste Open Relay loop. Automation, native review import, and merge/fix gates remain later slices.
