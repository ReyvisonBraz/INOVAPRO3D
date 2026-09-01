import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { validateWebhookSignature } from "./_webhook";

const secret = "segredo-de-teste";
const requestId = "request-123";
const dataId = "PAYMENT-ABC";
const timestamp = 1_800_000_000;

function validSignature() {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${timestamp};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${timestamp},v1=${hash}`;
}

describe("validateWebhookSignature", () => {
  it("aceita uma assinatura autêntica", () => {
    expect(
      validateWebhookSignature({
        signature: validSignature(),
        requestId,
        dataId,
        secret,
        nowInSeconds: timestamp,
      }),
    ).toEqual({ valid: true });
  });

  it("rejeita assinatura alterada", () => {
    expect(
      validateWebhookSignature({
        signature: `ts=${timestamp},v1=${"0".repeat(64)}`,
        requestId,
        dataId,
        secret,
        nowInSeconds: timestamp,
      }),
    ).toEqual({ valid: false, reason: "signature_invalid" });
  });

  it("rejeita notificações antigas para reduzir ataques de repetição", () => {
    expect(
      validateWebhookSignature({
        signature: validSignature(),
        requestId,
        dataId,
        secret,
        nowInSeconds: timestamp + 301,
      }),
    ).toEqual({ valid: false, reason: "timestamp_expired" });
  });
});
