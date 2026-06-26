import assert from "node:assert/strict";
import { test } from "node:test";

import { sanitizeRemoteUrl } from "../src/redaction";

test("keeps safe GitHub HTTPS and SSH remotes", () => {
  assert.deepEqual(sanitizeRemoteUrl("https://github.com/AcrossWorksAPI/open-relay.git"), {
    value: "https://github.com/AcrossWorksAPI/open-relay.git",
    redaction: undefined
  });
  assert.deepEqual(sanitizeRemoteUrl("git@github.com:AcrossWorksAPI/open-relay.git"), {
    value: "git@github.com:AcrossWorksAPI/open-relay.git",
    redaction: undefined
  });
});

test("strips credentialed HTTPS remotes", () => {
  const result = sanitizeRemoteUrl("https://user:secret@example.com/org/repo.git");

  assert.equal(result.value, undefined);
  assert.deepEqual(result.redaction, {
    field: "repository.remote_url",
    reason: "Remote URL contained credentials or an unsupported format."
  });
});

test("omits local path remotes", () => {
  const result = sanitizeRemoteUrl("../private-repo");

  assert.equal(result.value, undefined);
  assert.equal(result.redaction?.field, "repository.remote_url");
});
