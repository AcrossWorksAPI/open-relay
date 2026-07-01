import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import type { RelayWatchReceipt } from "./relayWatch";

export type RelayWatchStatus = {
  relay_session_id?: string;
  updated_at: string;
  pr: string;
  packet_author: string;
  mode: RelayWatchReceipt["mode"];
  status: RelayWatchReceipt["status"] | "running" | "sleeping";
  watch: boolean;
  state_file: string;
  iteration?: number;
  request?: RelayWatchReceipt["request"];
  response?: RelayWatchReceipt["response"];
  reason?: string;
  error?: string;
};

export type RelayWatchStatusOptions = {
  iteration?: number;
  watch: boolean;
  status?: RelayWatchStatus["status"];
  updatedAt?: string;
};

export type RelayWatchNotification = {
  title: string;
  subtitle?: string;
  message: string;
  sound?: string;
};

type MacNotificationDeps = {
  spawnProcess?: typeof spawn;
};

export function relayWatchStatusFromReceipt(
  receipt: RelayWatchReceipt,
  options: RelayWatchStatusOptions
): RelayWatchStatus {
  return {
    ...(receipt.relay_session_id ? { relay_session_id: receipt.relay_session_id } : {}),
    updated_at: options.updatedAt ?? new Date().toISOString(),
    pr: receipt.pr,
    packet_author: receipt.packet_author,
    mode: receipt.mode,
    status: options.status ?? receipt.status,
    watch: options.watch,
    state_file: receipt.state_file,
    ...(options.iteration !== undefined ? { iteration: options.iteration } : {}),
    ...(receipt.request ? { request: receipt.request } : {}),
    ...(receipt.response ? { response: receipt.response } : {}),
    ...(receipt.reason ? { reason: receipt.reason } : {}),
    ...(receipt.error ? { error: receipt.error } : {})
  };
}

export async function writeRelayWatchStatus(
  statusPath: string,
  status: RelayWatchStatus
): Promise<void> {
  await mkdir(dirname(statusPath), { recursive: true });
  await writeFile(statusPath, `${JSON.stringify(status, null, 2)}\n`, "utf8");
}

export function buildRelayWatchNotification(status: RelayWatchStatus): RelayWatchNotification {
  return {
    title: "Open Relay",
    subtitle: status.relay_session_id
      ? `Relay Session ID: ${status.relay_session_id}`
      : `Status: ${status.status}`,
    message: relayWatchNotificationMessage(status)
  };
}

export async function sendMacNotification(
  notification: RelayWatchNotification,
  deps: MacNotificationDeps = {}
): Promise<void> {
  const spawnProcess = deps.spawnProcess ?? spawn;
  const script = [
    "display notification ",
    appleScriptString(notification.message),
    " with title ",
    appleScriptString(notification.title),
    notification.subtitle ? ` subtitle ${appleScriptString(notification.subtitle)}` : "",
    notification.sound ? ` sound name ${appleScriptString(notification.sound)}` : ""
  ].join("");

  await new Promise<void>((resolve, reject) => {
    const child = spawnProcess("osascript", ["-e", script], {
      stdio: ["ignore", "ignore", "ignore"]
    });

    child.on("error", reject);
    child.on("close", (exitCode) => {
      if (exitCode === 0) {
        resolve();
        return;
      }
      reject(new Error(`osascript exited with code ${exitCode ?? "unknown"}.`));
    });
  });
}

function relayWatchNotificationMessage(status: RelayWatchStatus): string {
  if (status.status === "posted" || status.status === "updated") {
    const findings = status.response?.findings ?? 0;
    const findingLabel = findings === 1 ? "finding" : "findings";
    return `Relay ${status.status} review-response for ${status.pr} (${findings} ${findingLabel}).`;
  }
  if (status.status === "failed") {
    return `Relay failed for ${status.pr}: ${status.error ?? "Unknown error."}`;
  }
  if (status.status === "dry-run") {
    return `Relay dry-run completed for ${status.pr}.`;
  }
  if (status.status === "skipped") {
    return `Relay skipped already handled request for ${status.pr}.`;
  }
  if (status.status === "sleeping") {
    return `Relay watching ${status.pr}.`;
  }
  return `Relay running for ${status.pr}.`;
}

function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")}"`;
}
