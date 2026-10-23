# Open Relay Node security update

2026-10-24. Scope: runtime selection only, no protocol/entity/permission change.
Official requirement: https://nodejs.org/en/blog/vulnerability/october-2026-security-releases
reviewed 24 October. Permit patched major-bounded ranges22.23.4/24.22.1/26.12.1;
pin24.22.1 for local/CI/release, retaining the existing release major. Both
workflows read .node-version. No locked dependency changes.

Verification: npm test on Homebrew Node24.22.1 builds TypeScript and passes all
250 tests. No live agents or package publication invoked. Credential-free HTTPS
accepts valid control/rejects both compromised certificate endpoints; harmless
Brotli roundtrip passes. Probe/results retained. Node is a Homebrew bottle,
not an official nodejs.org binary. Other admitted majors are not full-suite
compatibility claims. Existing running processes need restart to use new Node.

Source branch codex/security-runtime-20261024; review/integration pending.
No release tag, registry publish or deployment. Codex owns Claude review; Cam
retains release approval. Do not restore known vulnerable versions as rollback.
