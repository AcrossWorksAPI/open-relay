# Render Review Request Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a deterministic `review-request` JSON-to-Markdown renderer and expose it through the Open Relay CLI.

**Architecture:** Add a pure `src/renderReviewRequest.ts` module that accepts a validated `ReviewRequestPacket` and returns Markdown. Keep filesystem, JSON parsing, validation, and sanitized CLI errors in `src/cli.ts` so rendering is reusable by later generator output formats.

**Tech Stack:** TypeScript, Node.js built-in filesystem APIs, Node's built-in test runner, existing AJV schema validation.

---

## File Structure

- Create `src/renderReviewRequest.ts`: pure Markdown rendering helpers and exported `renderReviewRequestMarkdown(packet)` function.
- Modify `src/index.ts`: export the renderer for programmatic package consumers.
- Modify `src/cli.ts`: add `render review-request <packet.json> [--output <relay.md>]` routing, strict argument parsing, packet file reading, validation, rendering, and output handling.
- Modify `tests/cli.test.ts`: add CLI tests for help, stdout render, output-file render, invalid JSON leak behavior, schema-invalid packet behavior, output write failure, and package export.
- Create `tests/renderReviewRequest.test.ts`: unit tests for Markdown order, content, empty states, and table escaping.
- Modify docs after implementation closeout: `docs/STATUS.md`, `docs/planning/ROADMAP.md`, `docs/planning/ACTIVE_WORK.md`, `docs/planning/PLAN_REGISTRY.md`, `docs/planning/VERSION_LEDGER.md`, and `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`.

## Task 1: Renderer Unit Tests

**Files:**
- Create: `tests/renderReviewRequest.test.ts`

- [ ] **Step 1: Write tests for the pure renderer**

```ts
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { renderReviewRequestMarkdown } from "../src/renderReviewRequest";
import type { ReviewRequestPacket } from "../src/reviewRequest";

const examplePacket = JSON.parse(
  readFileSync("examples/review-request/relay.json", "utf8")
) as ReviewRequestPacket;

test("renders review-request markdown in protocol order", () => {
  const markdown = renderReviewRequestMarkdown(examplePacket);
  const headings = [
    "## Review Request",
    "## Goal",
    "## Repository Context",
    "## Change Summary",
    "## Changed Files",
    "## Verification",
    "## Risks And Assumptions",
    "## Provenance",
    "## Redactions",
    "## Sensitive Data",
    "## Next Action"
  ];

  let previousIndex = -1;
  for (const heading of headings) {
    const index = markdown.indexOf(heading);
    assert.notEqual(index, -1, `${heading} missing`);
    assert.ok(index > previousIndex, `${heading} is out of order`);
    previousIndex = index;
  }

  assert.match(markdown, /^# Review Request Relay Packet/);
  assert.match(markdown, /- Packet version: `0\.1`/);
  assert.match(markdown, /- Audience: Claude Code/);
  assert.match(markdown, /- Behavioral intent: Improve open-source readiness without changing product behavior\./);
  assert.match(markdown, /\| `SECURITY\.md` \| added \| Vulnerability reporting and security policy \| high \|/);
  assert.match(markdown, /Review whether this packet provides enough context/);
  assert.ok(markdown.endsWith("\n"));
});

test("escapes markdown table cells", () => {
  const packet: ReviewRequestPacket = {
    ...examplePacket,
    changed_files: [{
      path: "docs/a|b.md",
      status: "modified",
      role: "Line one\nLine two",
      review_priority: "high"
    }],
    verification: [{
      command: "npm | test",
      result: "passed",
      notes: "Line one\nLine two"
    }]
  };

  const markdown = renderReviewRequestMarkdown(packet);

  assert.match(markdown, /\| `docs\/a\\\|b\.md` \| modified \| Line one Line two \| high \|/);
  assert.match(markdown, /\| `npm \\\| test` \| passed \| Line one Line two \|/);
});

test("renders neutral empty states", () => {
  const packet: ReviewRequestPacket = {
    ...examplePacket,
    change_summary: {
      ...examplePacket.change_summary,
      excluded_scope: []
    },
    verification: [],
    risks: [],
    provenance: [],
    redactions: []
  };

  const markdown = renderReviewRequestMarkdown(packet);

  assert.match(markdown, /- Excluded scope: none listed/);
  assert.match(markdown, /No verification evidence listed\./);
  assert.match(markdown, /No risks listed\./);
  assert.match(markdown, /No provenance listed\./);
  assert.match(markdown, /No redactions listed\./);
});
```

- [ ] **Step 2: Run tests to verify they fail before implementation**

Run:

```bash
npm test -- --test-name-pattern="renders review-request markdown|escapes markdown table cells|renders neutral empty states"
```

Expected: build fails because `src/renderReviewRequest.ts` does not exist.

- [ ] **Step 3: Commit the failing tests only if using TDD branch checkpoints**

```bash
git add tests/renderReviewRequest.test.ts
git commit -m "test: specify review-request markdown renderer"
```

If the worker is implementing in one final commit, leave this uncommitted and proceed.

## Task 2: Pure Markdown Renderer

**Files:**
- Create: `src/renderReviewRequest.ts`
- Test: `tests/renderReviewRequest.test.ts`

- [ ] **Step 1: Implement the renderer**

```ts
import type { ReviewRequestPacket } from "./reviewRequest";

export function renderReviewRequestMarkdown(packet: ReviewRequestPacket): string {
  const sections = [
    "# Review Request Relay Packet",
    "",
    `- Packet version: \`${packet.packet_version}\``,
    `- Packet type: \`${packet.packet_type}\``,
    `- Created at: \`${packet.created_at}\``,
    "",
    "## Review Request",
    "",
    `- Audience: ${packet.requested_review.audience}`,
    `- Focus: ${formatList(packet.requested_review.focus)}`,
    `- Requested output: ${packet.requested_review.requested_output}`,
    "",
    "## Goal",
    "",
    packet.goal,
    "",
    "## Repository Context",
    "",
    `- Repository: \`${packet.repository.name}\``,
    ...(packet.repository.remote_url ? [`- Remote: \`${packet.repository.remote_url}\``] : []),
    `- Local path: ${packet.repository.local_path ? `\`${packet.repository.local_path}\`` : "redacted"}`,
    `- Base branch: \`${packet.repository.base_branch}\``,
    `- Working branch: \`${packet.repository.working_branch}\``,
    `- Base commit: \`${packet.repository.base_commit}\``,
    `- Head commit: \`${packet.repository.head_commit}\``,
    `- Diff range: \`${packet.repository.diff_range}\``,
    ...(packet.repository.pull_request_url ? [`- Pull request: \`${packet.repository.pull_request_url}\``] : []),
    `- Reviewer access: ${packet.repository.reviewer_access}`,
    "",
    "## Change Summary",
    "",
    packet.change_summary.summary,
    "",
    `- Behavioral intent: ${packet.change_summary.behavioral_intent}`,
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
    packet.next_action,
    ""
  ];

  return `${sections.join("\n")}`;
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
    "| Command or evidence | Result | Notes |",
    "| --- | --- | --- |",
    ...packet.verification.map((item) =>
      `| \`${escapeTableCell(item.command)}\` | ${escapeTableCell(item.result)} | ${escapeTableCell(item.notes)} |`
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
    .map((item) => `- ${labelForProvenanceType(item.type)}: \`${item.reference}\` - ${item.supports}`)
    .join("\n");
}

function renderRedactions(packet: ReviewRequestPacket): string {
  if (packet.redactions.length === 0) {
    return "No redactions listed.";
  }

  return packet.redactions
    .map((item) => `- \`${item.field}\`: ${item.reason}`)
    .join("\n");
}

function renderSensitiveData(packet: ReviewRequestPacket): string {
  if (!packet.sensitive_data) {
    return "No sensitive-data note provided.";
  }

  return packet.sensitive_data.excluded
    ? packet.sensitive_data.notes
    : `Sensitive-data exclusion not asserted. ${packet.sensitive_data.notes}`;
}

function formatList(values: string[], emptyText = "none"): string {
  return values.length > 0 ? values.join(", ") : emptyText;
}

function escapeTableCell(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|");
}

function labelForProvenanceType(type: ReviewRequestPacket["provenance"][number]["type"]): string {
  return type
    .split("_")
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
```

- [ ] **Step 2: Run renderer tests**

Run:

```bash
npm test -- --test-name-pattern="renders review-request markdown|escapes markdown table cells|renders neutral empty states"
```

Expected: tests pass.

- [ ] **Step 3: Commit renderer module**

```bash
git add src/renderReviewRequest.ts tests/renderReviewRequest.test.ts
git commit -m "feat: render review-request markdown"
```

## Task 3: CLI Render Route

**Files:**
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Add CLI tests for render routing and failure handling**

Append these tests to `tests/cli.test.ts` before the package entrypoint test:

```ts
test("prints render review-request in help", () => {
  const result = spawnSync(process.execPath, [cliPath, "--help"], {
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /open-relay render review-request/);
});

test("renders a review-request packet to stdout", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "render", "review-request", "examples/review-request/relay.json"],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^# Review Request Relay Packet/);
  assert.match(result.stdout, /## Next Action/);
  assert.equal(result.stderr, "");
});

test("renders a review-request packet to a file", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-render-"));
  const outputPath = join(directory, "SECRET_OUTPUT_SHOULD_NOT_APPEAR.md");

  try {
    const result = spawnSync(
      process.execPath,
      [cliPath, "render", "review-request", "examples/review-request/relay.json", "--output", outputPath],
      { encoding: "utf8" }
    );

    assert.equal(result.status, 0);
    assert.match(result.stdout, /Wrote review-request Markdown/);
    assert.doesNotMatch(result.stdout, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
    assert.equal(result.stderr, "");
    assert.match(readFileSync(outputPath, "utf8"), /^# Review Request Relay Packet/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("rejects invalid render JSON without printing file contents", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-render-"));
  const packetPath = join(directory, "bad.json");
  writeFileSync(packetPath, "{\"token\": SECRET_TOKEN_SHOULD_NOT_APPEAR}", "utf8");

  const result = spawnSync(process.execPath, [cliPath, "render", "review-request", packetPath], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid JSON/);
  assert.doesNotMatch(result.stderr, /SECRET/);
});

test("rejects schema-invalid render packets", () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-render-"));
  const packetPath = join(directory, "packet.json");
  writeFileSync(packetPath, JSON.stringify({ packet_version: "0.1" }), "utf8");

  const result = spawnSync(process.execPath, [cliPath, "render", "review-request", packetPath], {
    encoding: "utf8"
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Invalid review-request packet/);
  assert.match(result.stderr, /must have required property/);
});

test("rejects unwritable render output paths without echoing path values", () => {
  const outputPath = join(tmpdir(), "SECRET_OUTPUT_SHOULD_NOT_APPEAR", "relay.md");

  const result = spawnSync(
    process.execPath,
    [cliPath, "render", "review-request", "examples/review-request/relay.json", "--output", outputPath],
    { encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Could not write review-request Markdown/);
  assert.doesNotMatch(result.stderr, /SECRET_OUTPUT_SHOULD_NOT_APPEAR/);
});
```

Also update the filesystem import at the top:

```ts
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
```

- [ ] **Step 2: Run CLI tests to verify they fail before implementation**

Run:

```bash
npm test -- --test-name-pattern="render"
```

Expected: render CLI tests fail because the command is unknown.

- [ ] **Step 3: Implement strict render argument parsing and route**

Modify `src/cli.ts` so the relevant sections look like:

```ts
import { readFile, writeFile } from "node:fs/promises";

import { parseGenerateReviewRequestArgs } from "./args";
import { collectGitContext } from "./git";
import { renderReviewRequestMarkdown } from "./renderReviewRequest";
import { buildReviewRequestPacket, type ReviewRequestPacket } from "./reviewRequest";
import { validatePacket, validatePacketFile } from "./schema";

const usage = `Open Relay

Usage:
  open-relay validate <packet.json>
  open-relay generate review-request --base <ref> --head <ref> --goal <text> --summary <text> --behavioral-intent <text> [--output <packet.json>]
  open-relay render review-request <packet.json> [--output <relay.md>]
  open-relay --help
`;
```

Add the route:

```ts
  if (args[0] === "render" && args[1] === "review-request") {
    return renderReviewRequestCommand(args.slice(2));
  }
```

Add the command implementation:

```ts
type RenderReviewRequestArgs =
  | { ok: true; packetPath: string; output?: string }
  | { ok: false; message: string };

async function renderReviewRequestCommand(args: string[]): Promise<number> {
  const parsed = parseRenderReviewRequestArgs(args);
  if (!parsed.ok) {
    process.stderr.write(`${parsed.message}\n\n${usage}`);
    return 2;
  }

  try {
    const raw = await readFile(parsed.packetPath, "utf8");
    const packet = JSON.parse(raw) as unknown;
    const result = validatePacket(packet);

    if (!result.valid) {
      process.stderr.write(`Invalid review-request packet: ${parsed.packetPath}\n`);
      for (const error of result.errors) {
        process.stderr.write(`- ${error}\n`);
      }
      return 1;
    }

    const markdown = renderReviewRequestMarkdown(packet as ReviewRequestPacket);

    if (parsed.output) {
      try {
        await writeFile(parsed.output, markdown, "utf8");
      } catch {
        process.stderr.write("Could not write review-request Markdown.\n");
        return 1;
      }
      process.stdout.write("Wrote review-request Markdown.\n");
    } else {
      process.stdout.write(markdown);
    }

    return 0;
  } catch (error: unknown) {
    const message = error instanceof SyntaxError
      ? `Invalid JSON in ${parsed.packetPath}`
      : `Could not render review-request packet: ${error instanceof Error ? error.message : String(error)}`;

    process.stderr.write(`${message}\n`);
    return 1;
  }
}

function parseRenderReviewRequestArgs(args: string[]): RenderReviewRequestArgs {
  const packetPath = args[0];
  let output: string | undefined;

  if (!packetPath) {
    return { ok: false, message: "Missing packet path." };
  }

  for (let index = 1; index < args.length; index += 1) {
    const arg = args[index];

    if (arg !== "--output") {
      return { ok: false, message: arg.startsWith("--") ? `Unknown flag: ${arg}` : `Unexpected argument: ${arg}` };
    }

    if (output) {
      return { ok: false, message: "Duplicate flag: --output" };
    }

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      return { ok: false, message: "Missing value for --output" };
    }

    output = value;
    index += 1;
  }

  return { ok: true, packetPath, ...(output ? { output } : {}) };
}
```

- [ ] **Step 4: Run CLI render tests**

Run:

```bash
npm test -- --test-name-pattern="render"
```

Expected: render tests pass.

- [ ] **Step 5: Commit CLI route**

```bash
git add src/cli.ts tests/cli.test.ts
git commit -m "feat: add review-request render command"
```

## Task 4: Package Export And Full Verification

**Files:**
- Modify: `src/index.ts`
- Modify: `tests/cli.test.ts`

- [ ] **Step 1: Export the renderer**

Add to `src/index.ts`:

```ts
export { renderReviewRequestMarkdown } from "./renderReviewRequest";
```

- [ ] **Step 2: Extend package entrypoint test**

Update the package entrypoint smoke in `tests/cli.test.ts`:

```ts
test("exports the validator and renderer from the package entrypoint", () => {
  const result = spawnSync(
    process.execPath,
    [
      "-e",
      "const relay = require('.'); if (typeof relay.validatePacket !== 'function') process.exit(1); if (typeof relay.renderReviewRequestMarkdown !== 'function') process.exit(1);"
    ],
    {
      encoding: "utf8"
    }
  );

  assert.equal(result.status, 0);
  assert.equal(result.stderr, "");
});
```

- [ ] **Step 3: Run the full check suite**

Run:

```bash
npm run check
git diff --check
```

Expected: all tests pass and whitespace check is clean.

- [ ] **Step 4: Run CLI smoke for example rendering**

Run:

```bash
node dist/src/cli.js render review-request examples/review-request/relay.json > /private/tmp/open-relay-review-request.md
head -40 /private/tmp/open-relay-review-request.md
```

Expected: Markdown starts with `# Review Request Relay Packet`, includes `## Review Request`, and includes the example audience and goal.

- [ ] **Step 5: Run invalid JSON leak smoke**

Run:

```bash
printf '{"token": SECRET_TOKEN_SHOULD_NOT_APPEAR}' > /private/tmp/open-relay-bad-render.json
node dist/src/cli.js render review-request /private/tmp/open-relay-bad-render.json
```

Expected: exit code `1`, stderr contains `Invalid JSON`, and stderr does not contain `SECRET_TOKEN_SHOULD_NOT_APPEAR`.

- [ ] **Step 6: Commit export and verification fixes**

```bash
git add src/index.ts tests/cli.test.ts src/renderReviewRequest.ts tests/renderReviewRequest.test.ts
git commit -m "test: verify review-request renderer export"
```

## Task 5: Roadmap Closeout

**Files:**
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`

- [ ] **Step 1: Update status docs after implementation verification**

Record:

- Render template implementation status.
- Local verification commands and results.
- GitHub PR URL and `Governance Checks` result after CI runs.
- Remaining deferred decisions: direct generator Markdown output, agent-specific templates, package publishing, storage, private redaction rules.

- [ ] **Step 2: Update roadmap table**

Set `Codex and Claude render templates` to `Done` only after the implementation PR is merged. Before merge, use `In progress` with this plan as the source:

```markdown
| Unversioned | Codex and Claude render templates | In progress | Medium | No | Review-request packet CLI MVP | docs/superpowers/plans/2026-06-26-render-review-request.md |
```

- [ ] **Step 3: Update lifecycle matrix**

Set the `Render template` row to shipped for create/list/view, notes/support
metadata, audit/events, and error/empty/recovery/smoke only after the
implementation PR is merged and verified. Keep storage, delete, and
notifications planned or deferred as documented.

- [ ] **Step 4: Run final verification**

Run:

```bash
npm run check
git diff --check
```

Expected: tests pass and whitespace check is clean.

- [ ] **Step 5: Push and open PR**

```bash
git push -u origin codex/render-review-request-implementation
gh pr create --repo AcrossWorksAPI/open-relay --base main --head codex/render-review-request-implementation --title "feat: render review-request markdown" --body-file /private/tmp/open-relay-render-pr-body.md
```

Expected: GitHub returns a PR URL. Wait for `Governance Checks`, then request Claude review if CI is green.
