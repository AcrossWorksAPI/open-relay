import assert from "node:assert/strict";
import { test } from "node:test";

import {
  buildOrchestraStatus,
  parseOrchestraArgs,
  renderOrchestraHtml
} from "../src/orchestraStatus";

test("parses orchestra defaults", () => {
  const parsed = parseOrchestraArgs([
    "--relay-session-id", "R7M4Q9K2",
    "--relay-status-file", "/tmp/relay-status.json",
    "--response-state-file", "/tmp/response-state.json"
  ], {
    cwd: "/repo"
  });

  assert.equal(parsed.ok, true);
  if (!parsed.ok) {
    return;
  }
  assert.equal(parsed.options.relaySessionId, "R7M4Q9K2");
  assert.equal(parsed.options.host, "127.0.0.1");
  assert.equal(parsed.options.port, 43873);
  assert.equal(parsed.options.cwd, "/repo");
  assert.equal(parsed.options.codexUrl, "ws://127.0.0.1:43210");
  assert.equal(parsed.options.relayStatusFile, "/tmp/relay-status.json");
  assert.equal(parsed.options.responseStateFile, "/tmp/response-state.json");
  assert.equal(parsed.options.open, false);
  assert.equal(parsed.options.check, false);
});

test("rejects invalid orchestra port", () => {
  const parsed = parseOrchestraArgs(["--port", "70000"]);

  assert.equal(parsed.ok, false);
  if (parsed.ok) {
    return;
  }
  assert.match(parsed.message, /Invalid port/);
});

test("builds orchestra status from injected checks", async () => {
  const status = await buildOrchestraStatus({
    relaySessionId: "R7M4Q9K2",
    cwd: "/repo",
    codexUrl: "ws://127.0.0.1:43210",
    relayStatusFile: "/tmp/relay-status.json",
    responseStateFile: "/tmp/response-state.json"
  }, {
    now: () => new Date("2026-07-02T03:11:42.000Z"),
    packageVersion: "0.1.0",
    runCommand: async (command, args) => {
      if (command === "git" && args.join(" ") === "rev-parse --abbrev-ref HEAD") {
        return { exitCode: 0, stdout: "main\n", stderr: "" };
      }
      if (command === "git" && args.join(" ") === "rev-parse --short HEAD") {
        return { exitCode: 0, stdout: "a793aa6\n", stderr: "" };
      }
      if (command === "git" && args.join(" ") === "status --porcelain") {
        return { exitCode: 0, stdout: "", stderr: "" };
      }
      if (command === "gh") {
        return { exitCode: 0, stdout: "", stderr: "Logged in to github.com account AcrossWorksAPI\n" };
      }
      if (command === "claude") {
        return { exitCode: 0, stdout: "1.0.0\n", stderr: "" };
      }
      throw new Error(`Unexpected command: ${command}`);
    },
    checkHttp: async () => ({ ok: true, detail: "HTTP 200" }),
    readTextFile: async (path) => {
      if (path === "/tmp/relay-status.json") {
        return JSON.stringify({
          status: "posted",
          updated_at: "2026-07-02T03:11:40.000Z",
          pr: "https://github.com/AcrossWorksAPI/open-relay/pull/61"
        });
      }
      return JSON.stringify({
        last_handled_response: {
          comment_id: 4852154639,
          codex_status: "completed",
          handled_at: "2026-07-02T03:11:41.000Z"
        }
      });
    },
    env: {
      CLAUDE_CODE_OAUTH_TOKEN: "present"
    }
  });

  assert.equal(status.relay_session_id, "R7M4Q9K2");
  assert.equal(status.version.package_version, "0.1.0");
  assert.equal(status.version.git_branch, "main");
  assert.equal(status.version.git_commit, "a793aa6");
  assert.equal(status.version.git_dirty, false);
  assert.equal(status.overall.status, "ready");
  assert.equal(status.services.codex.status, "ok");
  assert.equal(status.services.github.status, "ok");
  assert.equal(status.services.claude.status, "ok");
  assert.equal(status.services.watcher.status, "ok");
});

test("renders orchestra HTML dashboard shell without leaking script content", () => {
  const html = renderOrchestraHtml({
    title: "Open Relay Orchestra"
  });

  assert.match(html, /Open Relay Orchestra/);
  assert.match(html, /status\.json/);
  assert.match(html, /Systems/);
  assert.doesNotMatch(html, /CLAUDE_CODE_OAUTH_TOKEN/);
});
