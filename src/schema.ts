import { readFile } from "node:fs/promises";
import Ajv, { type ErrorObject } from "ajv";

import {
  lookupPacketSchema,
  supportedPacketSummary
} from "./schemaRegistry";

export type ValidationResult = {
  valid: boolean;
  errors: string[];
};

const ajv = new Ajv({
  allErrors: true,
  strict: true
});

const validateHeader = ajv.compile({
  type: "object",
  required: ["packet_type", "packet_version"],
  properties: {
    packet_type: { type: "string", minLength: 1 },
    packet_version: { type: "string", minLength: 1 }
  }
});

export function validatePacket(packet: unknown): ValidationResult {
  if (!validateHeader(packet)) {
    return {
      valid: false,
      errors: formatErrors(validateHeader.errors ?? [])
    };
  }

  const packetRecord = packet as unknown as Record<string, unknown>;
  const packetType = String(packetRecord.packet_type);
  const packetVersion = String(packetRecord.packet_version);
  const entry = lookupPacketSchema(packetType, packetVersion);

  if (!entry) {
    return {
      valid: false,
      errors: [
        `unsupported packet_type/packet_version: ${packetType}/${packetVersion} (supported: ${supportedPacketSummary()})`
      ]
    };
  }

  const valid = entry.validate(packet);
  const schemaErrors = valid ? [] : formatErrors(entry.validate.errors ?? []);
  const semanticErrors = valid && entry.semantics ? entry.semantics(packetRecord) : [];
  const errors = [...schemaErrors, ...semanticErrors];

  if (errors.length === 0) {
    return {
      valid: true,
      errors: []
    };
  }

  return {
    valid: false,
    errors
  };
}

export async function validatePacketFile(path: string): Promise<ValidationResult> {
  const raw = await readFile(path, "utf8");
  const packet = JSON.parse(raw) as unknown;

  return validatePacket(packet);
}

function formatErrors(errors: ErrorObject[]): string[] {
  return errors.map((error) => {
    const location = error.instancePath === "" ? "/" : error.instancePath;
    return `${location} ${error.message ?? "is invalid"}`;
  });
}
