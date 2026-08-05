import { describe, expect, it } from "vitest";
import { fulfillmentActionFor, resolvePaymentTransition } from "./paymentStateMachine";

describe("resolvePaymentTransition", () => {
  it("avança um pagamento novo até a aprovação", () => {
    expect(resolvePaymentTransition("NOT_STARTED", "PENDING")).toMatchObject({
      accepted: true,
      reason: "INITIAL",
    });
    expect(resolvePaymentTransition("PENDING", "APPROVED")).toMatchObject({
      accepted: true,
      fulfillmentAction: "RELEASE_FULFILLMENT",
    });
  });

  it("impede regressão de aprovado para estados intermediários", () => {
    expect(resolvePaymentTransition("APPROVED", "PENDING")).toMatchObject({
      accepted: false,
      reason: "STALE_OR_INVALID",
    });
    expect(resolvePaymentTransition("APPROVED", "PROCESSING").accepted).toBe(false);
  });

  it("aceita aprovação tardia após o vencimento", () => {
    expect(resolvePaymentTransition("EXPIRED", "APPROVED")).toMatchObject({
      accepted: true,
      reason: "LATE_APPROVAL",
      fulfillmentAction: "RELEASE_FULFILLMENT",
    });
  });

  it("aceita eventos financeiros finais e impede reversão posterior", () => {
    expect(resolvePaymentTransition("APPROVED", "REFUNDED").accepted).toBe(true);
    expect(resolvePaymentTransition("APPROVED", "CHARGED_BACK").accepted).toBe(true);
    expect(resolvePaymentTransition("PENDING", "REFUNDED").accepted).toBe(true);
    expect(resolvePaymentTransition("REFUNDED", "APPROVED").accepted).toBe(false);
  });

  it("trata repetição idempotente como nenhuma mudança", () => {
    expect(resolvePaymentTransition("PENDING", "PENDING")).toMatchObject({
      accepted: false,
      reason: "NO_CHANGE",
    });
  });
});

describe("fulfillmentActionFor", () => {
  it("mantém produção bloqueada para estados sem pagamento válido", () => {
    expect(fulfillmentActionFor("EXPIRED")).toBe("KEEP_AWAITING_PAYMENT");
    expect(fulfillmentActionFor("REJECTED")).toBe("KEEP_AWAITING_PAYMENT");
    expect(fulfillmentActionFor("CANCELED")).toBe("KEEP_AWAITING_PAYMENT");
  });

  it("interrompe produção em eventos financeiros posteriores", () => {
    expect(fulfillmentActionFor("REFUNDED")).toBe("HOLD_FULFILLMENT");
    expect(fulfillmentActionFor("CHARGED_BACK")).toBe("HOLD_FULFILLMENT");
  });
});
