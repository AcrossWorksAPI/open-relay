# Review Response Packet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `review-response` 0.1 validation, Markdown rendering, examples, generic rendering CLI support, and package smoke coverage.

**Architecture:** Add `review-response` as the first real consumer of the protocol envelope by registering a new schema and renderer. Keep packet authoring, transport, storage, PR comments, and automation deferred. Reuse the existing validator/renderer dispatch seams and extract shared Markdown escaping helpers so `review-request` and `review-response` keep one escaping posture.

**Tech Stack:** TypeScript, Node.js built-in test runner, JSON Schema draft-07 through Ajv, existing npm package smoke.

---

## Files

- Create `schemas/review-response.schema.json`: formal schema for `review-response` 0.1.
- Create `src/reviewResponse.ts`: exported TypeScript packet type used by renderer and package entrypoint.
- Create `src/renderMarkdown.ts`: shared Markdown escaping and label helpers extracted from `renderReviewRequest.ts`.
- Create `src/renderReviewResponse.ts`: pure JSON-to-Markdown renderer for review-response packets.
- Create `docs/protocol/review-response-packet.md`: protocol documentation mirroring the approved design.
- Create `examples/review-response/relay.json`: synthetic review-response fixture.
- Create `examples/review-response/relay.md`: snapshot-bound Markdown fixture.
- Create `tests/renderReviewResponse.test.ts`: renderer order, snapshot, confidence, escaping, and empty-state tests.
- Modify `src/schemaRegistry.ts`: register review-response schema and semantic checks.
- Modify `src/renderPacket.ts`: register review-response renderer.
- Modify `src/renderReviewRequest.ts`: import shared Markdown helpers without changing output.
- Modify `src/cli.ts`: add generic `render <packet.json>` and neutral/type-safe validate messages while preserving `render review-request` alias.
- Modify `src/index.ts`: export `renderReviewResponseMarkdown` and `ReviewResponsePacket`.
- Modify `tests/schema.test.ts`: add review-response example validation, enum acceptance, semantic checks, and unsupported-version sanitization.
- Modify `tests/renderPacket.test.ts`: add review-response dispatch parity.
- Modify `tests/cli.test.ts`: add generic render behavior, validate-message neutrality, review-request alias back-compat, and package entrypoint export coverage.
- Modify `scripts/smoke-pack.js`: smoke installed generic render and review-response validate/render paths.
- Modify roadmap/status/ledger files for closeout.

## Task 1: Schema And Semantics

**Files:**
- Create: `schemas/review-response.schema.json`
- Create: `src/reviewResponse.ts`
- Modify: `src/schemaRegistry.ts`
- Modify: `tests/schema.test.ts`

- [x] **Step 1: Write failing schema tests**

Add tests that:

```ts
test("validates the synthetic review-response example", async () => {
  const packet = await validReviewResponseFixture();
  const result = validatePacket(packet);

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test("rejects contradictory review-response outcomes", async () => {
  const approved = await validReviewResponseFixture();
  (approved.findings as Array<Record<string, unknown>>)[0].blocking = true;
  assert.match(validatePacket(approved).errors.join("\n"), /approved outcome cannot include blocking findings/);

  const commentary = await validReviewResponseFixture();
  commentary.outcome = "commentary";
  (commentary.findings as Array<Record<string, unknown>>)[0].blocking = true;
  assert.match(validatePacket(commentary).errors.join("\n"), /commentary outcome cannot include blocking findings/);

  const changes = await validReviewResponseFixture();
  changes.outcome = "changes_requested";
  (changes.findings as Array<Record<string, unknown>>)[0].blocking = false;
  assert.match(validatePacket(changes).errors.join("\n"), /changes_requested outcome requires at least one blocking finding/);

  const blocked = await validReviewResponseFixture();
  blocked.outcome = "blocked";
  (blocked.reviewed_scope as Record<string, unknown>).limitations = [];
  assert.match(validatePacket(blocked).errors.join("\n"), /blocked outcome requires at least one limitation/);
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npm test -- --test-name-pattern "review-response|contradictory"
```

Expected: failure because the example file, schema, and registry entry do not exist yet.

- [x] **Step 3: Implement schema and semantics**

Add `schemas/review-response.schema.json` with `additionalProperties: false`, required top-level fields from the design, required empty-array-capable `verification`, optional `provenance` and `sensitive_data`, and the approved enums. Register it in `SCHEMA_REGISTRY` under `"review-response": { "0.1": ... }`.

Implement `validateReviewResponseSemantics(packet)` in `src/schemaRegistry.ts`:

```ts
if (outcome === "approved" && hasBlockingFinding) {
  return ["/findings approved outcome cannot include blocking findings"];
}
if (outcome === "commentary" && hasBlockingFinding) {
  return ["/findings commentary outcome cannot include blocking findings"];
}
if (outcome === "changes_requested" && !hasBlockingFinding) {
  return ["/findings changes_requested outcome requires at least one blocking finding"];
}
if (outcome === "blocked" && limitations.length === 0) {
  return ["/reviewed_scope/limitations blocked outcome requires at least one limitation"];
}
```

- [x] **Step 4: Verify GREEN**

Run:

```bash
npm test -- --test-name-pattern "review-response|contradictory|unsupported"
```

Expected: review-response schema and semantic tests pass; unsupported-combination tests now include `review-response/0.1`.

## Task 2: Examples, Protocol Doc, And Renderer

**Files:**
- Create: `src/renderMarkdown.ts`
- Create: `src/renderReviewResponse.ts`
- Create: `docs/protocol/review-response-packet.md`
- Create: `examples/review-response/relay.json`
- Create: `examples/review-response/relay.md`
- Create: `tests/renderReviewResponse.test.ts`
- Modify: `src/renderReviewRequest.ts`
- Modify: `src/renderPacket.ts`
- Modify: `tests/renderPacket.test.ts`

- [x] **Step 1: Write failing renderer tests**

Add tests that assert:

```ts
test("renders the committed review-response example markdown", () => {
  assert.equal(renderReviewResponseMarkdown(examplePacket), exampleMarkdown);
});

test("renders outcome and confidence together", () => {
  const markdown = renderReviewResponseMarkdown(examplePacket);
  assert.match(markdown, /## Outcome And Confidence/);
  assert.match(markdown, /- Outcome: `approved`/);
  assert.match(markdown, /- Confidence: `high`/);
});

test("renders review-response through the packet dispatcher", () => {
  assert.equal(renderPacketMarkdown(examplePacket), renderReviewResponseMarkdown(examplePacket));
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npm test -- --test-name-pattern "review-response markdown|Outcome And Confidence|packet dispatcher"
```

Expected: failure because the renderer and fixture Markdown do not exist yet.

- [x] **Step 3: Implement renderer and examples**

Extract `inlineText`, `blockText`, `codeSpanText`, `escapeTableCell`, `escapeCodeSpanTableCell`, `formatList`, and `labelForProvenanceType` into `src/renderMarkdown.ts`. Update `renderReviewRequest.ts` to import them and keep the existing review-request snapshot byte-identical.

Implement `renderReviewResponseMarkdown(packet)` with this section order:

1. Review Response
2. Response To
3. Reviewer
4. Outcome And Confidence
5. Summary
6. Findings
7. Reviewed Scope
8. Verification
9. Provenance
10. Redactions
11. Sensitive Data
12. Next Action

Render neutral empty states for empty findings, files, limitations, verification, provenance, and redactions. Generate `examples/review-response/relay.md` from `examples/review-response/relay.json` through the renderer.

- [x] **Step 4: Verify GREEN**

Run:

```bash
npm test -- --test-name-pattern "render.*response|committed example markdown|packet dispatcher"
```

Expected: renderer tests pass and the review-request committed example snapshot remains unchanged.

## Task 3: Generic CLI Render And Validate Messages

**Files:**
- Modify: `src/cli.ts`
- Modify: `tests/cli.test.ts`

- [x] **Step 1: Write failing CLI tests**

Add tests that assert:

```ts
test("renders a review-response packet through generic render", () => {
  const result = spawnSync(process.execPath, [cliPath, "render", "examples/review-response/relay.json"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^# Review Response Relay Packet/);
  assert.match(result.stdout, /## Outcome And Confidence/);
});

test("keeps render review-request as a backward-compatible alias", () => {
  const result = spawnSync(process.execPath, [cliPath, "render", "review-request", "examples/review-request/relay.json"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /^# Review Request Relay Packet/);
});

test("validate uses packet-neutral messages", () => {
  const result = spawnSync(process.execPath, [cliPath, "validate", "examples/review-response/relay.json"], { encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /valid packet/);
  assert.doesNotMatch(result.stdout, /valid review-request packet/);
});
```

- [x] **Step 2: Verify RED**

Run:

```bash
npm test -- --test-name-pattern "generic render|packet-neutral|backward-compatible alias"
```

Expected: failure because generic render and neutral validate messages are not implemented.

- [x] **Step 3: Implement CLI changes**

Update help to include:

```text
open-relay render <packet.json> [--output <relay.md>]
open-relay render review-request <packet.json> [--output <relay.md>]
```

Route `render review-request` to the same generic renderer parser as an alias. Route `render <packet.json>` through `validatePacket` and `renderPacketMarkdown`.

Use generic output messages for generic render:

```text
Wrote packet Markdown.
Could not write packet Markdown.
Invalid packet: <path>
```

Keep the alias success/write-error messages compatible where existing tests depend on them.

Change `validate` success/failure messages to packet-neutral:

```text
<path> is a valid packet.
Invalid packet: <path>
```

- [x] **Step 4: Verify GREEN**

Run:

```bash
npm test -- --test-name-pattern "render|validate|entrypoint"
```

Expected: CLI tests pass with existing review-request behavior still covered.

## Task 4: Package Exports, Smoke, And Closeout

**Files:**
- Modify: `src/index.ts`
- Modify: `scripts/smoke-pack.js`
- Modify: `docs/STATUS.md`
- Modify: `docs/planning/ROADMAP.md`
- Modify: `docs/planning/ACTIVE_WORK.md`
- Modify: `docs/planning/PLAN_REGISTRY.md`
- Modify: `docs/planning/VERSION_LEDGER.md`
- Modify: `docs/planning/ENTITY_LIFECYCLE_SCOPE_MATRIX.md`
- Modify: `master_build.md`

- [x] **Step 1: Write failing package smoke expectations**

Update `scripts/smoke-pack.js` so installed package smoke asserts:

```js
runCli(cli, ["validate", join(fixtureDir, "examples", "review-response", "relay.json")], {
  contains: "valid packet"
});
runCli(cli, ["render", join(fixtureDir, "examples", "review-response", "relay.json")], {
  contains: "# Review Response Relay Packet"
});
```

Update the entrypoint test command to assert `renderReviewResponseMarkdown` exists.

- [x] **Step 2: Verify RED**

Run:

```bash
npm run smoke:pack
```

Expected: failure until schema, examples, renderer, package export, and generic render are implemented.

- [x] **Step 3: Implement export and closeout docs**

Export `renderReviewResponseMarkdown` and `ReviewResponsePacket` from `src/index.ts`. Update roadmap/status/ledger/matrix to mark review-response implementation in progress on the branch, record tests and package smoke evidence, and keep transport, storage, generation, PR comments, and automation deferred.

- [x] **Step 4: Final verification**

Run:

```bash
npm run check
npm run smoke:pack
git diff --check
```

Expected: all pass.

## Self-Review

- Spec coverage: The plan covers schema, semantic checks, protocol doc, examples, renderer, generic render CLI, validate-message neutrality, package export, package smoke, and governance closeout.
- Deferred scope: Authoring/generation, Markdown parsing, GitHub PR comments, automation, review-response storage, agent-specific templates, global storage, and transport remain deferred.
- Placeholder scan: No `TBD`, `TODO`, or unowned "implement later" steps are present.
- Type consistency: The plan consistently uses `response_to`, `reviewer`, `outcome`, `confidence`, `findings`, `reviewed_scope`, `verification`, `provenance`, `redactions`, `sensitive_data`, and `next_action`.
