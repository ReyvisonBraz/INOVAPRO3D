import { createHmac, timingSafeEqual } from "node:crypto";

interface ParsedSignature {
  timestamp: string;
  hash: string;
}

export interface WebhookSignatureInput {
  signature?: string;
  requestId?: string;
  dataId?: string;
  secret?: string;
  nowInSeconds?: number;
}

export type WebhookValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | "configuration_missing"
        | "headers_missing"
        | "signature_malformed"
        | "timestamp_expired"
        | "signature_invalid";
    };

const MAX_TIMESTAMP_AGE_SECONDS = 5 * 60;

function parseSignature(signature: string): ParsedSignature | null {
  const values = new Map(
    signature.split(",").map((part) => {
      const [key, ...rest] = part.trim().split("=");
      return [key, rest.join("=")] as const;
    }),
  );
  const timestamp = values.get("ts");
  const hash = values.get("v1");
  return timestamp && hash ? { timestamp, hash } : null;
}

/**
 * Valida a assinatura descrita pelo Mercado Pago. A assinatura usa metadados
 * da requisição, e não o JSON completo do webhook.
 */
export function validateWebhookSignature({
  signature,
  requestId,
  dataId,
  secret,
  nowInSeconds = Math.floor(Date.now() / 1000),
}: WebhookSignatureInput): WebhookValidationResult {
  if (!secret) return { valid: false, reason: "configuration_missing" };
  if (!signature || !requestId || !dataId) {
    return { valid: false, reason: "headers_missing" };
  }

  const parsed = parseSignature(signature);
  if (!parsed || !/^\d+$/.test(parsed.timestamp) || !/^[a-f\d]{64}$/i.test(parsed.hash)) {
    return { valid: false, reason: "signature_malformed" };
  }

  const timestamp = Number(parsed.timestamp);
  if (Math.abs(nowInSeconds - timestamp) > MAX_TIMESTAMP_AGE_SECONDS) {
    return { valid: false, reason: "timestamp_expired" };
  }

  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${parsed.timestamp};`;
  const expected = Buffer.from(createHmac("sha256", secret).update(manifest).digest("hex"), "hex");
  const received = Buffer.from(parsed.hash, "hex");

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { valid: false, reason: "signature_invalid" };
  }
  return { valid: true };
}
