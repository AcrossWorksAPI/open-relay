# Relay Protocol Envelope And Multi-Type Extensibility Design

Last updated: 2026-06-27

## Purpose

Open Relay's brief defines a review loop across multiple packet types:
implementation handoff, review request, review response, and resume project.
The current implementation validates exactly one type:
`review-request` version `0.1`.

Today, `schemas/review-request.schema.json` pins `packet_type` and
`packet_version` with `const` values, and `src/schema.ts` compiles only that
schema. That is correct for the shipped packet, but it means the next packet
type or version would be hard-rejected until the validator and renderer learn
how to dispatch by packet type.

This design defines the smallest extensibility layer that keeps existing
`review-request` 0.1 packets unchanged while making new packet types possible.
It is a prerequisite for review-response, implementation-handoff, resume, and
future packet versions.

## Decision

Dispatch validation and rendering on the flat `(packet_type, packet_version)`
pair already present in every packet.

Do not introduce a wrapper envelope or move current fields into a nested
`body`. Keeping packets flat preserves the existing `review-request` 0.1 shape,
stored bundles, examples, and snapshots.

The change is additive:

- a shared header check;
- a schema registry keyed by packet type and version;
- a dispatching validator;
- per-type semantic checks;
- a renderer dispatcher.

## Recommended Approach

1. Add a minimal shared header check so malformed packets fail clearly before
   type dispatch.
2. Add a schema registry mapping `packet_type -> packet_version -> schema`.
3. Make `validatePacket` dispatch through the registry.
4. Move current review-request semantic checks behind a per-type semantic check
   map.
5. Add a top-level Markdown renderer dispatcher while keeping
   `renderReviewRequestMarkdown` as the review-request renderer.

## Alternatives Considered

| Approach | Tradeoff |
| --- | --- |
| Wrapper envelope with nested `body` | Clean long-term separation, but re-nests every shipped field and forces a migration of existing examples, saved bundles, and tests. Too much movement for the first extensibility slice. |
| One giant schema with `oneOf` branches | Quick at first, but combines all packet types into one file, worsens error messages, and becomes brittle with `additionalProperties: false`. |
| Dispatch on flat `(packet_type, packet_version)` | Chosen. No packet migration, one schema per type/version, precise errors, and a single registry extension point. |

## Header Contract

Every packet must expose enough metadata for dispatch:

```json
{
  "type": "object",
  "required": ["packet_type", "packet_version", "created_at"],
  "properties": {
    "packet_type": { "type": "string", "minLength": 1 },
    "packet_version": { "type": "string", "minLength": 1 },
    "created_at": { "type": "string", "minLength": 1 }
  }
}
```

Missing `packet_type` should produce a clear header error such as
`/ must have required property 'packet_type'`, not an unsupported-type error.

## Schema Registry

Add a small registry module:

```ts
import reviewRequest_0_1 from "../schemas/review-request.schema.json";

export const SCHEMA_REGISTRY = {
  "review-request": {
    "0.1": reviewRequest_0_1
  }
} as const;
```

Adding a new packet type or version requires:

- a schema file;
- one registry entry;
- one semantic check entry if the type has cross-field rules;
- one renderer entry if the type supports Markdown rendering.

Each per-type schema keeps its own `const` pins for `packet_type` and
`packet_version`. Those pins are correct inside a routed schema file; the
registry decides which schema applies.

## Validator Dispatch

`validatePacket(packet)` should:

1. Validate the shared header.
2. Read `packet_type` and `packet_version`.
3. Look up the matching schema in the registry.
4. Fail closed if unsupported, with a sanitized message:
   `unsupported packet_type/packet_version: <type>/<version>`.
5. Validate against the compiled schema.
6. Run semantic checks registered for that packet type.

Existing review-request semantics become one registered function:

```ts
const semanticChecks = {
  "review-request": validateReviewRequestSemantics
};
```

The current semantic check,
`change_summary.total_files_changed === changed_files.length`, remains unchanged.

## Renderer Dispatch

Keep the existing review-request renderer:

```ts
renderReviewRequestMarkdown(packet)
```

Add a dispatcher:

```ts
renderPacketMarkdown(packet)
```

The dispatcher reads `packet_type` and routes to the registered renderer. For
now, only `review-request` is supported. Future packet types add renderer
entries without changing the review-request renderer.

## Storage Alignment

`manifest.json` already records:

- `packet_type`;
- `packet_version`;
- `storage_version`.

Keep that shape. `packet_version` tracks the packet schema. `storage_version`
tracks bundle/manifest shape. No new manifest fields are needed for this slice.

## Versioning And Migration Rules

- Any required-field or structural packet-shape change requires a new
  `packet_version`.
- Optional-field additions still require a version bump while schemas use
  `additionalProperties: false`.
- The registry may support multiple versions of the same type at once.
- Unknown packet versions fail closed.
- Version migrators are deferred until a second version exists.

## Security And Privacy

This slice adds no new packet data collection. Dispatch errors must not echo
raw packet contents. Unsupported type/version errors may echo only the type,
version, and supported combinations.

## Lifecycle And Scope Coverage

| Area | Decision |
| --- | --- |
| Create/extend | New packet type equals schema, registry entry, semantic checks, and renderer. |
| Validate | Dispatch per `packet_type` and `packet_version`; unsupported pairs fail closed. |
| Migrate | Migration rules documented; migrators deferred. |
| Scope | Validation and rendering dispatch only. No new packet type, transport, or agent invocation in this slice. |
| Error/recovery | Header and unsupported-type failures are precise and sanitized. |
| Smoke | Existing `review-request` validation, rendering, storage, package smoke, and snapshots must remain unchanged. |

## Testing Strategy

- Existing `review-request` 0.1 validation and rendering tests pass unchanged.
- Unknown `packet_type` fails closed and does not echo packet contents.
- Unknown `packet_version` fails closed and does not echo packet contents.
- Missing `packet_type` produces a header validation error.
- A test-only second registry entry proves dispatch can validate and render a
  new type without changing review-request code.

## Out Of Scope

- Defining review-response fields.
- Defining implementation-handoff fields.
- Defining resume-project fields.
- Packet-version migrators.
- Packet transport or delivery.
- New output aliases for existing packet creation.

## Open Decisions

- Whether to keep schema files flat or move to
  `schemas/<packet-type>/<version>.schema.json`.
- Whether to add a top-level protocol version later.
- Which transport boundary comes first: committed file, clipboard, MCP tool, PR
  comment, or another local mechanism.
