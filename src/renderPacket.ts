import { renderReviewRequestMarkdown } from "./renderReviewRequest";
import { renderReviewResponseMarkdown } from "./renderReviewResponse";
import { renderResumeProjectMarkdown } from "./renderResumeProject";
import type { ReviewRequestPacket } from "./reviewRequest";
import type { ReviewResponsePacket } from "./reviewResponse";
import type { ResumeProjectPacket } from "./resumeProject";

export type PacketRenderer = (packet: Record<string, unknown>) => string;

export const PACKET_RENDERERS: Record<string, PacketRenderer> = {
  "review-request": (packet) => renderReviewRequestMarkdown(packet as unknown as ReviewRequestPacket),
  "review-response": (packet) => renderReviewResponseMarkdown(packet as unknown as ReviewResponsePacket),
  "resume-project": (packet) => renderResumeProjectMarkdown(packet as unknown as ResumeProjectPacket)
};

export function renderPacketMarkdown(packet: Record<string, unknown>): string {
  const type = String(packet.packet_type);
  const renderer = PACKET_RENDERERS[type];

  if (!renderer) {
    throw new Error(`No renderer registered for packet_type: ${type}`);
  }

  return renderer(packet);
}
