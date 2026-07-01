import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import type { RelayWatchReceipt } from "../src/relayWatch";
import {
  buildRelayWatchNotification,
  relayWatchStatusFromReceipt,
  sendMacNotification,
  writeRelayWatchStatus
} from "../src/relayWatchStatus";

test("builds relay watch status from a posted receipt", () => {
  const status = relayWatchStatusFromReceipt(postedReceipt(), {
    iteration: 2,
    watch: true
  });

  assert.equal(status.relay_session_id, "R7M4Q9K2");
  assert.equal(status.status, "posted");
  assert.equal(status.watch, true);
  assert.equal(status.iteration, 2);
  assert.equal(status.request?.comment_id, 4849936129);
  assert.equal(status.response?.outcome, "approved");
});

test("writes relay watch status JSON", async () => {
  const directory = mkdtempSync(join(tmpdir(), "open-relay-status-"));
  const statusPath = join(directory, "status.json");

  try {
    const status = relayWatchStatusFromReceipt(postedReceipt(), {
      iteration: 1,
      watch: false
    });
    await writeRelayWatchStatus(statusPath, status);

    const written = JSON.parse(readFileSync(statusPath, "utf8")) as Record<string, unknown>;
    assert.equal(written.status, "posted");
    assert.equal(written.iteration, 1);
    assert.match(readFileSync(statusPath, "utf8"), /\n$/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("builds desktop notification copy from status", () => {
  const status = relayWatchStatusFromReceipt(postedReceipt(), {
    iteration: 1,
    watch: true
  });

  const notification = buildRelayWatchNotification(status);

  assert.equal(notification.title, "Open Relay");
  assert.match(notification.subtitle ?? "", /R7M4Q9K2/);
  assert.match(notification.message, /posted review-response/);
  assert.match(notification.message, /2 findings/);
});

test("sends mac notification through osascript", async () => {
  const calls: Array<{ command: string; args: string[] }> = [];
  const spawnProcess = ((command: string, args: string[]) => {
    calls.push({ command, args });
    const child = new EventEmitter() as EventEmitter & { kill: () => void };
    child.kill = () => undefined;
    queueMicrotask(() => child.emit("close", 0));
    return child;
  }) as unknown as typeof import("node:child_process").spawn;

  await sendMacNotification({
    title: "Open Relay",
    subtitle: "R7M4Q9K2",
    message: "Relay posted review-response."
  }, {
    spawnProcess
  });

  assert.equal(calls[0].command, "osascript");
  assert.deepEqual(calls[0].args.slice(0, 1), ["-e"]);
  assert.match(calls[0].args[1], /display notification/);
  assert.match(calls[0].args[1], /Open Relay/);
});

function postedReceipt(): RelayWatchReceipt {
  return {
    relay_session_id: "R7M4Q9K2",
    created_at: "2026-07-01T03:19:34.000Z",
    pr: "https://github.com/AcrossWorksAPI/open-relay/pull/60",
    packet_author: "AcrossWorksAPI",
    mode: "live",
    status: "posted",
    state_file: "/private/tmp/open-relay-state.json",
    request: {
      comment_id: 4849936129,
      head_commit: "acf6a352c94529e923841cf12ccc8b888d8ad882",
      repository: "AcrossWorksAPI/open-relay",
      working_branch: "codex/local-relay-watch"
    },
    response: {
      packet_type: "review-response",
      packet_version: "0.1",
      outcome: "approved",
      findings: 2
    }
  };
}
