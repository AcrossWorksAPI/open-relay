import { renderReviewRequestMarkdown } from "./renderReviewRequest";
import type { ReviewRequestPacket } from "./reviewRequest";

export type PacketRenderer = (packet: Record<string, unknown>) => string;

export const PACKET_RENDERERS: Record<string, PacketRenderer> = {
  "review-request": (packet) => renderReviewRequestMarkdown(packet as unknown as ReviewRequestPacket)
};

export function renderPacketMarkdown(packet: Record<string, unknown>): string {
  const type = String(packet.packet_type);
  const renderer = PACKET_RENDERERS[type];

  if (!renderer) {
    throw new Error(`No renderer registered for packet_type: ${type}`);
  }

  return renderer(packet);
}
