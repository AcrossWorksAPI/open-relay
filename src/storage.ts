import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { renderReviewRequestMarkdown } from "./renderReviewRequest";
import type { ReviewRequestPacket } from "./reviewRequest";

export type SavedReviewRequestBundle = {
  storageId: string;
};

type SaveReviewRequestBundleInput = {
  storageRoot: string;
  packet: ReviewRequestPacket;
};

type ReviewRequestManifest = {
  storage_version: "0.1";
  packet_type: "review-request";
  packet_version: "0.1";
  storage_id: string;
  created_at: string;
  files: {
    json: "relay.json";
    markdown: "relay.md";
  };
};

export function buildStorageId(createdAt: string, headCommit: string): string {
  const compact = createdAt
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");
  return `${compact}-${headCommit.slice(0, 7)}`;
}

export async function saveReviewRequestBundle(
  input: SaveReviewRequestBundleInput
): Promise<SavedReviewRequestBundle> {
  const baseId = buildStorageId(input.packet.created_at, input.packet.repository.head_commit);
  const { storageId, bundleDir } = await createBundleDirectory(input.storageRoot, baseId);
  const manifest: ReviewRequestManifest = {
    storage_version: "0.1",
    packet_type: "review-request",
    packet_version: input.packet.packet_version,
    storage_id: storageId,
    created_at: input.packet.created_at,
    files: {
      json: "relay.json",
      markdown: "relay.md"
    }
  };

  try {
    await writeFile(join(bundleDir, "relay.json"), `${JSON.stringify(input.packet, null, 2)}\n`, "utf8");
    await writeFile(join(bundleDir, "relay.md"), renderReviewRequestMarkdown(input.packet), "utf8");
    await writeFile(join(bundleDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  } catch (error: unknown) {
    await rm(bundleDir, { recursive: true, force: true });
    throw error;
  }

  return { storageId };
}

async function createBundleDirectory(
  storageRoot: string,
  baseId: string
): Promise<{ storageId: string; bundleDir: string }> {
  await mkdir(storageRoot, { recursive: true });

  for (let suffix = 1; suffix <= 99; suffix += 1) {
    const storageId = suffix === 1 ? baseId : `${baseId}-${suffix}`;
    const bundleDir = join(storageRoot, storageId);

    try {
      await mkdir(bundleDir);
      return { storageId, bundleDir };
    } catch (error: unknown) {
      if (isAlreadyExistsError(error)) {
        continue;
      }
      throw error;
    }
  }

  throw new Error("Could not allocate storage id.");
}

function isAlreadyExistsError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "EEXIST";
}
