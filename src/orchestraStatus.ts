import { execFile, spawn } from "node:child_process";
import { createServer, type Server } from "node:http";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 43873;
const DEFAULT_CODEX_URL = "ws://127.0.0.1:43210";
const DEFAULT_REFRESH_MS = 5000;
const DEFAULT_DOCS_URL = "https://github.com/AcrossWorksAPI/open-relay#readme";
const CHECK_TIMEOUT_MS = 3000;

export type OrchestraOptions = {
  relaySessionId?: string;
  cwd: string;
  host: string;
  port: number;
  codexUrl: string;
  relayStatusFile?: string;
  responseStateFile?: string;
  docsUrl: string;
  refreshMs: number;
  open: boolean;
  check: boolean;
};

export type OrchestraCliOptions = OrchestraOptions;

export type OrchestraParseResult =
  | { ok: true; options: OrchestraCliOptions }
  | { ok: false; message: string };

export type OrchestraServiceStatus = "ok" | "warn" | "fail";

export type OrchestraService = {
  status: OrchestraServiceStatus;
  label: string;
  detail: string;
  checked_at: string;
};

export type OrchestraStatus = {
  relay_session_id?: string;
  updated_at: string;
  version: {
    package_version: string;
    git_branch: string;
    git_commit: string;
    git_dirty: boolean;
  };
  overall: {
    status: "ready" | "attention" | "failed";
    label: string;
    detail: string;
  };
  services: {
    codex: OrchestraService;
    github: OrchestraService;
    claude: OrchestraService;
    watcher: OrchestraService;
  };
};

export type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type HttpCheckResult = {
  ok: boolean;
  detail: string;
};

export type OrchestraDeps = {
  now?: () => Date;
  packageVersion?: string;
  runCommand?: (command: string, args: string[], options: { cwd: string; timeoutMs: number }) => Promise<CommandResult>;
  checkHttp?: (url: string, timeoutMs: number) => Promise<HttpCheckResult>;
  readTextFile?: (path: string) => Promise<string>;
  env?: NodeJS.ProcessEnv;
};

export type OrchestraServer = {
  url: string;
  server: Server;
  close(): Promise<void>;
};

export function parseOrchestraArgs(
  args: string[],
  defaults: { cwd?: string } = {}
): OrchestraParseResult {
  let relaySessionId: string | undefined;
  let cwd = defaults.cwd ?? process.cwd();
  let host = DEFAULT_HOST;
  let port = DEFAULT_PORT;
  let codexUrl = DEFAULT_CODEX_URL;
  let relayStatusFile: string | undefined;
  let responseStateFile: string | undefined;
  let docsUrl = DEFAULT_DOCS_URL;
  let refreshMs = DEFAULT_REFRESH_MS;
  let open = false;
  let check = false;

  const seen = new Set<string>();
  const valueFlags = new Set([
    "--relay-session-id",
    "--cwd",
    "--host",
    "--port",
    "--codex-url",
    "--relay-status-file",
    "--response-state-file",
    "--docs-url",
    "--refresh-ms"
  ]);
  const booleanFlags = new Set(["--open", "--check"]);

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (booleanFlags.has(arg)) {
      if (seen.has(arg)) {
        return { ok: false, message: `Duplicate flag: ${arg}` };
      }
      seen.add(arg);
      if (arg === "--open") {
        open = true;
      } else {
        check = true;
      }
      continue;
    }

    if (!valueFlags.has(arg)) {
      return {
        ok: false,
        message: arg.startsWith("--") ? `Unknown flag: ${arg}` : `Unexpected argument: ${arg}`
      };
    }

    if (seen.has(arg)) {
      return { ok: false, message: `Duplicate flag: ${arg}` };
    }
    seen.add(arg);

    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      return { ok: false, message: `Missing value for ${arg}` };
    }

    if (arg === "--relay-session-id") {
      relaySessionId = value;
    } else if (arg === "--cwd") {
      cwd = value;
    } else if (arg === "--host") {
      host = value;
    } else if (arg === "--port") {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
        return { ok: false, message: "Invalid port: expected an integer from 1 to 65535." };
      }
      port = parsed;
    } else if (arg === "--codex-url") {
      codexUrl = value;
    } else if (arg === "--relay-status-file") {
      relayStatusFile = value;
    } else if (arg === "--response-state-file") {
      responseStateFile = value;
    } else if (arg === "--docs-url") {
      docsUrl = value;
    } else {
      const parsed = Number(value);
      if (!Number.isInteger(parsed) || parsed < 1000) {
        return { ok: false, message: "Invalid refresh interval: expected an integer of at least 1000." };
      }
      refreshMs = parsed;
    }

    index += 1;
  }

  return {
    ok: true,
    options: {
      ...(relaySessionId ? { relaySessionId } : {}),
      cwd,
      host,
      port,
      codexUrl,
      ...(relayStatusFile ? { relayStatusFile } : {}),
      ...(responseStateFile ? { responseStateFile } : {}),
      docsUrl,
      refreshMs,
      open,
      check
    }
  };
}

export async function buildOrchestraStatus(
  options: Pick<OrchestraOptions, "relaySessionId" | "cwd" | "codexUrl" | "relayStatusFile" | "responseStateFile">,
  deps: OrchestraDeps = {}
): Promise<OrchestraStatus> {
  const now = deps.now ?? (() => new Date());
  const checkedAt = now().toISOString();
  const runCommand = deps.runCommand ?? runCommandDefault;
  const checkHttp = deps.checkHttp ?? checkHttpDefault;
  const readTextFile = deps.readTextFile ?? readFileUtf8;
  const env = deps.env ?? process.env;

  const version = await buildVersionStatus(options.cwd, runCommand, deps.packageVersion);
  const codex = await buildCodexStatus(options.codexUrl, checkedAt, checkHttp);
  const github = await buildGithubStatus(options.cwd, checkedAt, runCommand);
  const claude = await buildClaudeStatus(options.cwd, checkedAt, runCommand, env);
  const watcher = await buildWatcherStatus(options, checkedAt, readTextFile);
  const services = { codex, github, claude, watcher };
  const serviceValues = Object.values(services);
  const hasFailure = serviceValues.some((service) => service.status === "fail");
  const hasWarning = serviceValues.some((service) => service.status === "warn");
  const overall = hasFailure
    ? {
      status: "failed" as const,
      label: "Systems blocked",
      detail: "One or more required local relay systems are failing."
    }
    : hasWarning
      ? {
        status: "attention" as const,
        label: "Attention needed",
        detail: "Core systems are reachable, but some relay evidence is missing or stale."
      }
      : {
        status: "ready" as const,
        label: "Systems ready",
        detail: "Open Relay local systems are reachable and status evidence is present."
      };

  return {
    ...(options.relaySessionId ? { relay_session_id: options.relaySessionId } : {}),
    updated_at: checkedAt,
    version,
    overall,
    services
  };
}

export async function startOrchestraServer(
  options: OrchestraOptions,
  deps: OrchestraDeps = {}
): Promise<OrchestraServer> {
  const server = createServer(async (request, response) => {
    const requestUrl = request.url ?? "/";
    try {
      if (requestUrl === "/" || requestUrl.startsWith("/?")) {
        const html = renderOrchestraHtml({
          title: "Open Relay Orchestra",
          docsUrl: options.docsUrl,
          refreshMs: options.refreshMs
        });
        response.writeHead(200, {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store"
        });
        response.end(html);
        return;
      }

      if (requestUrl === "/status.json") {
        const status = await buildOrchestraStatus(options, deps);
        response.writeHead(200, {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store"
        });
        response.end(`${JSON.stringify(status, null, 2)}\n`);
        return;
      }

      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("Not found.\n");
    } catch {
      response.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      response.end("Open Relay orchestra status failed.\n");
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port, options.host, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const url = `http://${options.host}:${options.port}/`;
  return {
    url,
    server,
    close: () => new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    })
  };
}

export function openDashboard(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn("open", [url], {
      stdio: ["ignore", "ignore", "ignore"]
    });
    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }
      reject(new Error(`open exited with code ${exitCode ?? "unknown"}.`));
    });
  });
}

export function renderOrchestraHtml(input: {
  title: string;
  docsUrl?: string;
  refreshMs?: number;
}): string {
  const title = escapeHtml(input.title);
  const docsUrl = escapeAttribute(input.docsUrl ?? DEFAULT_DOCS_URL);
  const refreshMs = input.refreshMs ?? DEFAULT_REFRESH_MS;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #f7f8fa;
      --surface: #ffffff;
      --surface-2: #f1f4f7;
      --text: #17202a;
      --muted: #607080;
      --border: #d9e0e7;
      --ok: #18864b;
      --ok-bg: #e9f7ef;
      --warn: #a66f00;
      --warn-bg: #fff6dc;
      --fail: #bf3333;
      --fail-bg: #fff0f0;
      --shadow: 0 10px 30px rgba(20, 31, 43, 0.08);
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--text); }
    main { width: min(1180px, calc(100vw - 40px)); margin: 0 auto; padding: 28px 0 40px; }
    header { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; margin-bottom: 18px; }
    h1 { margin: 0; font-size: 28px; line-height: 1.1; letter-spacing: 0; font-weight: 720; }
    .sub { margin: 8px 0 0; color: var(--muted); font-size: 14px; line-height: 1.4; }
    .actions { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; justify-content: flex-end; }
    button, a.button { border: 1px solid var(--border); background: var(--surface); color: var(--text); border-radius: 8px; padding: 8px 12px; font-size: 13px; line-height: 1; text-decoration: none; cursor: pointer; box-shadow: none; }
    button:hover, a.button:hover { border-color: #b9c4cf; background: #fbfcfd; }
    .version-strip, .overall, .panel, .log { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; box-shadow: var(--shadow); }
    .version-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; overflow: hidden; margin-bottom: 14px; background: var(--border); }
    .version-item { background: var(--surface); padding: 12px 14px; min-width: 0; }
    .k { color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 5px; }
    .v { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .overall { display: flex; align-items: center; justify-content: space-between; gap: 18px; padding: 18px; margin-bottom: 14px; }
    .overall h2 { margin: 0; font-size: 20px; line-height: 1.2; letter-spacing: 0; }
    .overall p { margin: 5px 0 0; color: var(--muted); font-size: 13px; line-height: 1.4; }
    .status-pill { display: inline-flex; align-items: center; gap: 8px; border-radius: 999px; padding: 8px 11px; font-size: 13px; border: 1px solid var(--border); white-space: nowrap; }
    .dot { width: 10px; height: 10px; border-radius: 50%; background: var(--muted); flex: 0 0 auto; }
    .ok .dot, .ready .dot { background: var(--ok); }
    .warn .dot, .attention .dot { background: var(--warn); }
    .fail .dot, .failed .dot { background: var(--fail); }
    .ok, .ready { background: var(--ok-bg); color: #0f5f35; border-color: #b8e4c9; }
    .warn, .attention { background: var(--warn-bg); color: #6f4b00; border-color: #ecd28a; }
    .fail, .failed { background: var(--fail-bg); color: #8e2222; border-color: #efb4b4; }
    .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin-bottom: 14px; }
    .panel { padding: 14px; min-height: 160px; display: flex; flex-direction: column; justify-content: space-between; }
    .panel-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 16px; }
    .panel h3 { margin: 0; font-size: 15px; line-height: 1.2; letter-spacing: 0; }
    .icon { width: 30px; height: 30px; display: inline-grid; place-items: center; border: 1px solid var(--border); border-radius: 8px; color: var(--muted); }
    .icon svg { width: 17px; height: 17px; }
    .detail { color: var(--muted); font-size: 13px; line-height: 1.45; min-height: 38px; overflow-wrap: anywhere; }
    .checked { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; margin-top: 10px; }
    .log { padding: 14px; }
    .log-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .log h3 { margin: 0; font-size: 15px; }
    .rows { display: grid; gap: 7px; }
    .row { display: grid; grid-template-columns: 140px 110px 1fr; gap: 10px; align-items: center; padding: 8px 0; border-top: 1px solid var(--border); font-size: 13px; }
    .row:first-child { border-top: 0; }
    .row-time { color: var(--muted); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 11px; }
    .row-msg { color: var(--muted); overflow-wrap: anywhere; }
    @media (max-width: 900px) {
      main { width: min(100vw - 24px, 760px); padding-top: 18px; }
      header, .overall { flex-direction: column; align-items: stretch; }
      .actions { justify-content: flex-start; }
      .version-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      .grid { grid-template-columns: 1fr; }
      .row { grid-template-columns: 1fr; gap: 4px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>${title}</h1>
        <p class="sub" id="session">Relay Session ID: -</p>
      </div>
      <div class="actions">
        <button type="button" id="refresh">Refresh</button>
        <a class="button" href="${docsUrl}" target="_blank" rel="noreferrer">Open docs</a>
      </div>
    </header>

    <section class="version-strip" aria-label="Version">
      <div class="version-item"><div class="k">Package</div><div class="v" id="version-package">-</div></div>
      <div class="version-item"><div class="k">Git Branch</div><div class="v" id="version-branch">-</div></div>
      <div class="version-item"><div class="k">Commit</div><div class="v" id="version-commit">-</div></div>
      <div class="version-item"><div class="k">Dirty</div><div class="v" id="version-dirty">-</div></div>
    </section>

    <section class="overall">
      <div>
        <h2 id="overall-label">Systems loading</h2>
        <p id="overall-detail">Checking local Open Relay systems.</p>
      </div>
      <div class="status-pill attention" id="overall-pill"><span class="dot"></span><span id="overall-status">Checking</span></div>
    </section>

    <section class="grid" aria-label="Services">
      ${servicePanel("codex", "Codex app-server", "terminal")}
      ${servicePanel("github", "GitHub transport", "branch")}
      ${servicePanel("claude", "Claude headless", "spark")}
      ${servicePanel("watcher", "Watcher state", "pulse")}
    </section>

    <section class="log">
      <div class="log-head">
        <h3>Recent Checks</h3>
        <span class="checked" id="updated-at">-</span>
      </div>
      <div class="rows" id="log-rows"></div>
    </section>
  </main>
  <script>
    const refreshMs = ${JSON.stringify(refreshMs)};
    const services = ["codex", "github", "claude", "watcher"];
    const logRows = [];

    function text(id, value) {
      document.getElementById(id).textContent = value ?? "-";
    }

    function setPill(element, status, label) {
      element.className = "status-pill " + statusClass(status);
      element.querySelector("span:last-child").textContent = label;
    }

    function statusClass(status) {
      if (status === "ok" || status === "ready") return "ok";
      if (status === "fail" || status === "failed") return "fail";
      return "warn";
    }

    function renderService(name, service) {
      const root = document.getElementById("service-" + name);
      root.className = "panel " + statusClass(service.status);
      setPill(root.querySelector(".status-pill"), service.status, service.label);
      root.querySelector(".detail").textContent = service.detail;
      root.querySelector(".checked").textContent = service.checked_at;
    }

    function renderLog(status) {
      logRows.unshift({ at: status.updated_at, status: status.overall.status, message: status.overall.detail });
      while (logRows.length > 6) logRows.pop();
      const rows = document.getElementById("log-rows");
      rows.innerHTML = "";
      for (const row of logRows) {
        const div = document.createElement("div");
        div.className = "row";
        div.innerHTML = '<div class="row-time"></div><div></div><div class="row-msg"></div>';
        div.children[0].textContent = row.at;
        const pill = document.createElement("span");
        pill.className = "status-pill " + statusClass(row.status);
        pill.innerHTML = '<span class="dot"></span><span></span>';
        pill.querySelector("span:last-child").textContent = row.status;
        div.children[1].appendChild(pill);
        div.children[2].textContent = row.message;
        rows.appendChild(div);
      }
    }

    async function refresh() {
      try {
        const response = await fetch("/status.json", { cache: "no-store" });
        const status = await response.json();
        text("session", "Relay Session ID: " + (status.relay_session_id || "-"));
        text("version-package", status.version.package_version);
        text("version-branch", status.version.git_branch);
        text("version-commit", status.version.git_commit);
        text("version-dirty", status.version.git_dirty ? "Yes" : "No");
        text("overall-label", status.overall.label);
        text("overall-detail", status.overall.detail);
        text("overall-status", status.overall.status);
        document.getElementById("overall-pill").className = "status-pill " + statusClass(status.overall.status);
        text("updated-at", "Last updated " + status.updated_at);
        for (const name of services) renderService(name, status.services[name]);
        renderLog(status);
      } catch (error) {
        text("overall-label", "Dashboard disconnected");
        text("overall-detail", "Could not fetch local orchestra status.");
        document.getElementById("overall-pill").className = "status-pill fail";
        text("overall-status", "failed");
      }
    }

    document.getElementById("refresh").addEventListener("click", refresh);
    refresh();
    setInterval(refresh, refreshMs);
  </script>
</body>
</html>`;
}

function servicePanel(id: string, title: string, icon: "terminal" | "branch" | "spark" | "pulse"): string {
  return `<article class="panel attention" id="service-${id}">
    <div>
      <div class="panel-top">
        <h3>${escapeHtml(title)}</h3>
        <span class="icon" aria-hidden="true">${iconSvg(icon)}</span>
      </div>
      <div class="status-pill attention"><span class="dot"></span><span>Checking</span></div>
    </div>
    <div>
      <p class="detail">Waiting for status.</p>
      <div class="checked">-</div>
    </div>
  </article>`;
}

function iconSvg(icon: "terminal" | "branch" | "spark" | "pulse"): string {
  if (icon === "terminal") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 8 4 4-4 4"/><path d="M13 16h4"/></svg>';
  }
  if (icon === "branch") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 6h3a6 6 0 0 1 6 6v3"/></svg>';
  }
  if (icon === "spark") {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3 2.2 6.2L20 12l-5.8 2.8L12 21l-2.2-6.2L4 12l5.8-2.8Z"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h4l2-6 4 12 2-6h6"/></svg>';
}

async function buildVersionStatus(
  cwd: string,
  runCommand: NonNullable<OrchestraDeps["runCommand"]>,
  injectedPackageVersion: string | undefined
): Promise<OrchestraStatus["version"]> {
  const [branch, commit, dirty, packageVersion] = await Promise.all([
    gitOutput(cwd, runCommand, ["rev-parse", "--abbrev-ref", "HEAD"]),
    gitOutput(cwd, runCommand, ["rev-parse", "--short", "HEAD"]),
    gitOutput(cwd, runCommand, ["status", "--porcelain"]),
    injectedPackageVersion ? Promise.resolve(injectedPackageVersion) : readPackageVersion()
  ]);

  return {
    package_version: packageVersion,
    git_branch: branch || "unknown",
    git_commit: commit || "unknown",
    git_dirty: dirty.length > 0
  };
}

async function gitOutput(
  cwd: string,
  runCommand: NonNullable<OrchestraDeps["runCommand"]>,
  args: string[]
): Promise<string> {
  const result = await runCommand("git", args, { cwd, timeoutMs: CHECK_TIMEOUT_MS });
  return result.exitCode === 0 ? result.stdout.trim() : "";
}

async function buildCodexStatus(
  codexUrl: string,
  checkedAt: string,
  checkHttp: NonNullable<OrchestraDeps["checkHttp"]>
): Promise<OrchestraService> {
  const healthUrl = codexHealthUrl(codexUrl);
  const result = await checkHttp(healthUrl, CHECK_TIMEOUT_MS);
  return {
    status: result.ok ? "ok" : "fail",
    label: result.ok ? "Reachable" : "Offline",
    detail: result.ok
      ? `Health endpoint responded at ${healthUrl}.`
      : `No response from ${healthUrl}: ${result.detail}`,
    checked_at: checkedAt
  };
}

async function buildGithubStatus(
  cwd: string,
  checkedAt: string,
  runCommand: NonNullable<OrchestraDeps["runCommand"]>
): Promise<OrchestraService> {
  const result = await runCommand("gh", ["auth", "status"], { cwd, timeoutMs: CHECK_TIMEOUT_MS });
  const detail = firstLine(result.stderr || result.stdout) || "gh auth status returned no detail.";
  return {
    status: result.exitCode === 0 ? "ok" : "fail",
    label: result.exitCode === 0 ? "Authenticated" : "Auth needed",
    detail,
    checked_at: checkedAt
  };
}

async function buildClaudeStatus(
  cwd: string,
  checkedAt: string,
  runCommand: NonNullable<OrchestraDeps["runCommand"]>,
  env: NodeJS.ProcessEnv
): Promise<OrchestraService> {
  const result = await runCommand("claude", ["--version"], { cwd, timeoutMs: CHECK_TIMEOUT_MS });
  const hasHeadlessEnv = Boolean(env.CLAUDE_CODE_OAUTH_TOKEN || env.ANTHROPIC_API_KEY);
  const version = firstLine(result.stdout || result.stderr);
  return {
    status: result.exitCode === 0 ? "ok" : "fail",
    label: result.exitCode === 0 ? "Available" : "Missing",
    detail: result.exitCode === 0
      ? `${version || "Claude CLI available"}; ${hasHeadlessEnv ? "headless auth env present" : "headless auth not exercised by dashboard"}.`
      : "Claude CLI command failed or is not installed.",
    checked_at: checkedAt
  };
}

async function buildWatcherStatus(
  options: Pick<OrchestraOptions, "relayStatusFile" | "responseStateFile">,
  checkedAt: string,
  readTextFile: NonNullable<OrchestraDeps["readTextFile"]>
): Promise<OrchestraService> {
  const details: string[] = [];
  let sawEvidence = false;
  let sawFailure = false;

  if (options.relayStatusFile) {
    const relay = await readJsonFile(options.relayStatusFile, readTextFile);
    if (relay.ok) {
      sawEvidence = true;
      const status = readString(relay.value, "status") ?? "unknown";
      const pr = readString(relay.value, "pr") ?? "unknown PR";
      details.push(`Relay ${status} for ${pr}.`);
      if (status === "failed") {
        sawFailure = true;
      }
    } else {
      details.push(`Relay status unavailable: ${relay.error}`);
    }
  }

  if (options.responseStateFile) {
    const response = await readJsonFile(options.responseStateFile, readTextFile);
    if (response.ok) {
      const handled = isRecord(response.value.last_handled_response)
        ? response.value.last_handled_response
        : undefined;
      if (handled) {
        sawEvidence = true;
        const codexStatus = readString(handled, "codex_status") ?? "unknown";
        const commentId = typeof handled.comment_id === "number" ? handled.comment_id : "unknown";
        details.push(`Response comment ${commentId} handled with Codex status ${codexStatus}.`);
        if (codexStatus === "failed") {
          sawFailure = true;
        }
      } else {
        details.push("Response state file has no handled response yet.");
      }
    } else {
      details.push(`Response state unavailable: ${response.error}`);
    }
  }

  if (!options.relayStatusFile && !options.responseStateFile) {
    details.push("No watcher status files configured.");
  }

  return {
    status: sawFailure ? "fail" : sawEvidence ? "ok" : "warn",
    label: sawFailure ? "Failure" : sawEvidence ? "Observed" : "No evidence",
    detail: details.join(" "),
    checked_at: checkedAt
  };
}

function codexHealthUrl(codexUrl: string): string {
  try {
    const url = new URL(codexUrl);
    if (url.protocol === "ws:") {
      url.protocol = "http:";
    } else if (url.protocol === "wss:") {
      url.protocol = "https:";
    }
    url.pathname = "/healthz";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return "http://127.0.0.1:43210/healthz";
  }
}

async function readJsonFile(
  path: string,
  readTextFile: NonNullable<OrchestraDeps["readTextFile"]>
): Promise<{ ok: true; value: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    const parsed = JSON.parse(await readTextFile(path)) as unknown;
    if (!isRecord(parsed)) {
      return { ok: false, error: "JSON root is not an object." };
    }
    return { ok: true, value: parsed };
  } catch {
    return { ok: false, error: "could not read or parse JSON." };
  }
}

async function runCommandDefault(
  command: string,
  args: string[],
  options: { cwd: string; timeoutMs: number }
): Promise<CommandResult> {
  try {
    const result = await execFileAsync(command, args, {
      cwd: options.cwd,
      timeout: options.timeoutMs,
      encoding: "utf8",
      maxBuffer: 1024 * 64
    });
    return {
      exitCode: 0,
      stdout: result.stdout,
      stderr: result.stderr
    };
  } catch (error: unknown) {
    if (isExecError(error)) {
      return {
        exitCode: typeof error.code === "number" ? error.code : 1,
        stdout: typeof error.stdout === "string" ? error.stdout : "",
        stderr: typeof error.stderr === "string" ? error.stderr : ""
      };
    }
    return { exitCode: 1, stdout: "", stderr: "" };
  }
}

async function checkHttpDefault(url: string, timeoutMs: number): Promise<HttpCheckResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal
    });
    return {
      ok: response.ok,
      detail: `HTTP ${response.status}`
    };
  } catch (error: unknown) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : "request failed"
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function readFileUtf8(path: string): Promise<string> {
  return readFile(path, "utf8");
}

async function readPackageVersion(): Promise<string> {
  try {
    const raw = await readFile(join(__dirname, "..", "..", "package.json"), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (isRecord(parsed) && typeof parsed.version === "string") {
      return parsed.version;
    }
  } catch {
    // Fall through to explicit unknown version.
  }
  return "unknown";
}

function isExecError(error: unknown): error is {
  code?: unknown;
  stdout?: unknown;
  stderr?: unknown;
} {
  return typeof error === "object" && error !== null;
}

function firstLine(value: string): string {
  return value.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? "";
}

function readString(value: Record<string, unknown>, key: string): string | undefined {
  const found = value[key];
  return typeof found === "string" ? found : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}
