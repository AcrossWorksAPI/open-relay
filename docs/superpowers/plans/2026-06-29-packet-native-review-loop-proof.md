# Packet-Native Review Loop Proof Plan

Relay Session ID: `R7M4Q9K2`

> **For agentic workers:** This is a live-trial proof plan, not a packet schema
> implementation. Work through the checkpoints in order. Do not skip approval
> gates. Do not paste packet JSON or packet Markdown through chat.

## Goal

Prove that Codex and Claude desktop-app threads can exchange Open Relay
`review-request` and `review-response` packets through GitHub PR packet
transport without using chat or a shared filesystem as the packet carrier.

The first failed trial proved only that local packets and rendered prompts can
be produced. It did not prove packet transport because no marked packet comment
was posted to PR #58 and no reviewer packet was fetched from the PR.

## Scope

In scope:

- PR #58:
  `https://github.com/AcrossWorksAPI/open-relay/pull/58`
- Branch: `codex/implementation-handoff-packet-plan`
- Packet types: `review-request/0.1`, `review-response/0.1`,
  `resume-project/0.1`
- Transport: `transport github-pr send/fetch`
- Response producer: `generate review-response`
- Local proof directories under `/private/tmp`
- Human approval checkpoints for outward PR comments

Out of scope:

- No packet schema changes
- No implementation-handoff runtime work
- No native GitHub review import
- No independent GitHub identity proof
- No external agent invocation by Open Relay
- No file edits by Claude
- No merge, tag, publish, release, auto-merge, or destructive commands

## Honest Claim Boundary

If this trial passes, Open Relay may claim:

> A `review-request` and `review-response` can round-trip through GitHub PR
> exact-packet comments between two desktop-agent threads using the same local
> GitHub login, with fetched packets validating and matching the posted packet
> contents.

It must not claim:

> Two independently authenticated agents exchanged packets.

Independent identity, session manifests, and orchestration remain future work.

## Required Invariants

- Packet bodies must not cross desktop chat.
- Codex and Claude must use separate clean directories.
- A failed fetch must fail the trial; it must not fall back to an existing local
  file.
- The first proof run must not use `--update`; distinct PR comments are required
  evidence.
- Every fetched packet must validate with `open-relay validate`.
- Posted and fetched packets must match by canonical JSON equality on both
  legs.
- The result must record the one-GitHub-login limitation.

## Approval Register

Update this table as the trial progresses. Do not mark a checkpoint `Approved`,
`Done`, or `Passed` without evidence in the evidence column.

| ID | Checkpoint | Approval state | Evidence |
| --- | --- | --- | --- |
| ORT-0 | Owner approves this version-controlled proof plan | Proposed | This plan file is committed before live packet posting. |
| ORT-1 | Owner authorizes Codex to post one `review-request` packet comment to PR #58 | Pending | Required before Codex runs non-dry-run `transport github-pr send`. |
| ORT-2 | Owner authorizes Claude to post one `review-response` packet comment to PR #58 | Pending | Required before Claude runs non-dry-run `transport github-pr send`. |
| ORT-3 | Codex creates a clean private proof directory | Pending | Directory path recorded; no existing files before generation. |
| ORT-4 | Codex generates and validates the `review-request` packet | Pending | `open-relay validate` output plus local packet path recorded. |
| ORT-5 | Codex posts the `review-request` packet to PR #58 without `--update` | Pending | PR comment URL or comment id recorded. |
| ORT-6 | Codex fetches the `review-request` packet from PR #58 and proves equality | Pending | Fetch output, validation output, and canonical JSON match recorded. |
| ORT-7 | Claude creates a clean private proof directory | Pending | Directory path recorded; no existing files before fetch. |
| ORT-8 | Claude fetches and validates Codex's `review-request` from PR #58 | Pending | Fetch output and validation output recorded from Claude directory. |
| ORT-9 | Claude reviews the fetched request and writes local `review-draft.json` | Pending | Draft path recorded; packet body not pasted in chat. |
| ORT-10 | Claude generates, validates, and posts a `review-response` packet to PR #58 without `--update` | Pending | Local packet path plus PR comment URL or comment id recorded. |
| ORT-11 | Claude fetches the `review-response` packet from PR #58 and proves equality | Pending | Fetch output, validation output, and canonical JSON match recorded. |
| ORT-12 | Codex fetches Claude's `review-response` from PR #58 | Pending | Fetch output and validation output recorded from Codex directory. |
| ORT-13 | Codex derives and validates `resume-project` from the fetched response | Pending | `generate resume-project` and validation output recorded. |
| ORT-14 | Owner records pass/fail result and limitation | Pending | Status and version ledger updated after the trial. |

## Proof Directories

Use proof run suffixes. If either directory already exists, increment the suffix
for both agents.

```text
/private/tmp/open-relay-r7m4q9k2-codex-proof-001
/private/tmp/open-relay-r7m4q9k2-claude-proof-001
```

Codex must not read or write Claude's proof directory. Claude must not read or
write Codex's proof directory.

## Owner Authorization Text

Before live posting, the owner should approve this exact scope or a stricter
variant:

```text
Owner authorizes Codex and Claude, for Relay Session ID R7M4Q9K2, to post Open
Relay packet comments only on PR #58 using `transport github-pr send`.
Codex may post one `review-request` packet comment. Claude may post one
pre-generated `review-response` packet comment. No merge, publish, tag, file
edits by Claude, native GitHub review submission, or other write actions are
authorized.
```

## Commands

Use `node dist/src/cli.js` from the repository checkout until the npm package is
published and registry-smoked.

### ORT-3 And ORT-4: Codex Request Packet

```bash
mkdir /private/tmp/open-relay-r7m4q9k2-codex-proof-001

node dist/src/cli.js generate review-request \
  --base origin/main \
  --head HEAD \
  --goal "Relay Session ID R7M4Q9K2. Packet-native proof review for PR #58." \
  --summary "Codex posts a review-request packet through GitHub PR transport; Claude must fetch it from PR #58, review, and post a review-response packet back through transport." \
  --behavioral-intent "Prove request/response movement through PR packet comments without packet body copy/paste." \
  --output /private/tmp/open-relay-r7m4q9k2-codex-proof-001/review-request.json

node dist/src/cli.js validate \
  /private/tmp/open-relay-r7m4q9k2-codex-proof-001/review-request.json
```

### ORT-5: Codex Posts Request Packet

Requires ORT-1 approval.

```bash
node dist/src/cli.js transport github-pr send \
  /private/tmp/open-relay-r7m4q9k2-codex-proof-001/review-request.json \
  --pr https://github.com/AcrossWorksAPI/open-relay/pull/58 \
  --confirm-public
```

Do not add `--update` on the first proof run.

### ORT-6: Codex Fetches Request Packet

```bash
AUTHOR="$(gh api user --jq .login)"

node dist/src/cli.js transport github-pr fetch \
  --pr https://github.com/AcrossWorksAPI/open-relay/pull/58 \
  --packet-type review-request \
  --author "$AUTHOR" \
  --output /private/tmp/open-relay-r7m4q9k2-codex-proof-001/review-request-fetched.json

node dist/src/cli.js validate \
  /private/tmp/open-relay-r7m4q9k2-codex-proof-001/review-request-fetched.json
```

Canonical equality check:

```bash
node -e '
const fs = require("node:fs");
const sort = (value) => {
  if (Array.isArray(value)) return value.map(sort);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, sort(child)])
    );
  }
  return value;
};
const left = sort(JSON.parse(fs.readFileSync(process.argv[1], "utf8")));
const right = sort(JSON.parse(fs.readFileSync(process.argv[2], "utf8")));
if (JSON.stringify(left) !== JSON.stringify(right)) {
  console.error("canonical JSON mismatch");
  process.exit(1);
}
console.log("canonical JSON match");
' \
  /private/tmp/open-relay-r7m4q9k2-codex-proof-001/review-request.json \
  /private/tmp/open-relay-r7m4q9k2-codex-proof-001/review-request-fetched.json
```

### ORT-7 And ORT-8: Claude Fetches Request Packet

Claude must use only:

```text
/private/tmp/open-relay-r7m4q9k2-claude-proof-001
```

```bash
mkdir /private/tmp/open-relay-r7m4q9k2-claude-proof-001

AUTHOR="$(gh api user --jq .login)"

node dist/src/cli.js transport github-pr fetch \
  --pr https://github.com/AcrossWorksAPI/open-relay/pull/58 \
  --packet-type review-request \
  --author "$AUTHOR" \
  --output /private/tmp/open-relay-r7m4q9k2-claude-proof-001/review-request-fetched.json

node dist/src/cli.js validate \
  /private/tmp/open-relay-r7m4q9k2-claude-proof-001/review-request-fetched.json
```

Claude must not use packet bodies pasted in chat or files from Codex's proof
directory.

### ORT-9: Claude Writes Review Draft

Claude reviews the fetched request packet, the PR #58 diff, and any linked
source material, then writes:

```text
/private/tmp/open-relay-r7m4q9k2-claude-proof-001/review-draft.json
```

The draft is reviewer-authored JSON only. It must not include Open Relay-owned
fields such as `packet_type`, `packet_version`, `created_at`, or `response_to`.

### ORT-10: Claude Generates And Posts Response Packet

Requires ORT-2 approval.

```bash
node dist/src/cli.js generate review-response \
  --request /private/tmp/open-relay-r7m4q9k2-claude-proof-001/review-request-fetched.json \
  --review /private/tmp/open-relay-r7m4q9k2-claude-proof-001/review-draft.json \
  --output /private/tmp/open-relay-r7m4q9k2-claude-proof-001/review-response.json

node dist/src/cli.js validate \
  /private/tmp/open-relay-r7m4q9k2-claude-proof-001/review-response.json

node dist/src/cli.js transport github-pr send \
  /private/tmp/open-relay-r7m4q9k2-claude-proof-001/review-response.json \
  --pr https://github.com/AcrossWorksAPI/open-relay/pull/58 \
  --confirm-public
```

Do not add `--update` on the first proof run. This proof uses
`generate review-response` plus exact-packet `transport github-pr send` so the
posted response has a local JSON file for canonical equality. `respond github-pr`
remains covered by local tests, but it is not the live proof path
because it posts an in-memory packet without writing the posted JSON to disk.

### ORT-11: Claude Fetches Response Packet

```bash
AUTHOR="$(gh api user --jq .login)"

node dist/src/cli.js transport github-pr fetch \
  --pr https://github.com/AcrossWorksAPI/open-relay/pull/58 \
  --packet-type review-response \
  --author "$AUTHOR" \
  --output /private/tmp/open-relay-r7m4q9k2-claude-proof-001/review-response-fetched.json

node dist/src/cli.js validate \
  /private/tmp/open-relay-r7m4q9k2-claude-proof-001/review-response-fetched.json
```

Run the same canonical JSON equality script from ORT-6 with these paths:

```text
/private/tmp/open-relay-r7m4q9k2-claude-proof-001/review-response.json
/private/tmp/open-relay-r7m4q9k2-claude-proof-001/review-response-fetched.json
```

### ORT-12 And ORT-13: Codex Fetches Response And Resumes

```bash
AUTHOR="$(gh api user --jq .login)"

node dist/src/cli.js transport github-pr fetch \
  --pr https://github.com/AcrossWorksAPI/open-relay/pull/58 \
  --packet-type review-response \
  --author "$AUTHOR" \
  --output /private/tmp/open-relay-r7m4q9k2-codex-proof-001/review-response-fetched.json

node dist/src/cli.js validate \
  /private/tmp/open-relay-r7m4q9k2-codex-proof-001/review-response-fetched.json

node dist/src/cli.js generate resume-project \
  --response /private/tmp/open-relay-r7m4q9k2-codex-proof-001/review-response-fetched.json \
  --output /private/tmp/open-relay-r7m4q9k2-codex-proof-001/resume-project.json

node dist/src/cli.js validate \
  /private/tmp/open-relay-r7m4q9k2-codex-proof-001/resume-project.json
```

## Pass Criteria

The trial passes only if all criteria are true:

- PR #58 contains two distinct marked Open Relay packet comments: one
  `review-request/0.1` and one `review-response/0.1`.
- Claude's request packet came from `transport github-pr fetch` into a clean
  Claude-only directory.
- Codex's response packet came from `transport github-pr fetch` into a
  Codex-only directory.
- Both fetched packets validate.
- Posted and fetched canonical JSON matches on both legs.
- No packet body crossed chat.
- The result records that this is a one-GitHub-login desktop-agent transport
  proof, not independent identity proof.

## Failure Handling

Stop the trial and record a failed checkpoint if:

- A fetch returns no matching packet.
- A fetched packet fails validation.
- Canonical JSON equality fails.
- A packet body is pasted through chat.
- Claude or Codex reads the other agent's proof directory.
- A PR comment is updated or deleted during the first proof run.
- Any unapproved write action is attempted.

The next product slice should be chosen from the failure evidence:

- If marked comments or fetch are brittle, investigate native GitHub review
  import or stronger transport diagnostics.
- If session correlation is the pain point, promote the Relay Session ID or
  project/session orchestration candidate.
- If identity is the pain point, design independent-authorship proof or signed
  packet provenance.

## Closeout

After pass or fail, update:

- `docs/STATUS.md`
- `docs/planning/ACTIVE_WORK.md`
- `docs/planning/PLAN_REGISTRY.md`
- `docs/planning/VERSION_LEDGER.md`
- `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

Do not mark no-copy/paste review-loop behavior as proven until this plan's pass
criteria are met and recorded.
