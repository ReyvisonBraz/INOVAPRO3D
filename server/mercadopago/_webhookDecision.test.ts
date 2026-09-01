import { describe, expect, it } from "vitest";
import { decidePaymentWebhook, type WebhookDecisionInput } from "./_webhookDecision";

const now = new Date("2026-08-08T12:00:00.000Z");

function decide(overrides: {
  payment?: Partial<WebhookDecisionInput["payment"]>;
  order?: Partial<WebhookDecisionInput["order"]>;
}) {
  return decidePaymentWebhook({
    payment: {
      paymentId: "PAY-1",
      providerStatus: "approved",
      statusDetail: "accredited",
      paymentMethodId: "pix",
      transactionAmount: 95.5,
      ...overrides.payment,
    },
    order: {
      total: 95.5,
      status: "PENDING_PAYMENT",
      paymentStatus: "PENDING",
      paymentId: "PAY-1",
      paymentProviderStatus: "pending",
      ...overrides.order,
    },
    now,
  });
}

describe("decidePaymentWebhook", () => {
  it("libera a produção quando o pagamento é aprovado", () => {
    const decision = decide({});
    expect(decision.outcome).toBe("updated");
    if (decision.outcome !== "updated") return;
    expect(decision.orderUpdate.paymentStatus).toBe("APPROVED");
    expect(decision.orderUpdate.status).toBe("PAID");
    expect(decision.orderUpdate.paidAt).toEqual(now);
    expect(decision.attemptUpdate.status).toBe("APPROVED");
    expect(decision.requiresOperationsAlert).toBe(false);
  });

  it("usa a data de aprovação do provedor quando ela existe", () => {
    const decision = decide({ payment: { dateApproved: "2026-08-08T11:59:00.000Z" } });
    if (decision.outcome !== "updated") throw new Error("esperava atualização");
    expect(decision.orderUpdate.paidAt).toEqual(new Date("2026-08-08T11:59:00.000Z"));
  });

  it("não devolve para PAID um pedido que já entrou em produção", () => {
    const decision = decide({ order: { status: "PRINTING" } });
    if (decision.outcome !== "updated") throw new Error("esperava atualização");
    expect(decision.orderUpdate.paymentStatus).toBe("APPROVED");
    expect(decision.orderUpdate.status).toBeUndefined();
  });

  it("recusa divergência de valor antes de qualquer transição", () => {
    const decision = decide({ payment: { transactionAmount: 10 } });
    expect(decision).toMatchObject({
      outcome: "amount_mismatch",
      expectedAmountCents: 9550,
      receivedAmountCents: 1000,
    });
  });

  it("ignora a repetição exata da mesma notificação", () => {
    const decision = decide({
      payment: { providerStatus: "pending" },
      order: { paymentStatus: "PENDING", paymentProviderStatus: "pending" },
    });
    expect(decision.outcome).toBe("already_processed");
  });

  it("atualiza metadados quando o provedor detalha sem mudar o estado financeiro", () => {
    const decision = decide({
      payment: { providerStatus: "in_process" },
      order: { paymentStatus: "PENDING", paymentProviderStatus: "pending" },
    });
    if (decision.outcome !== "updated") throw new Error("esperava atualização");
    expect(decision.transition.reason).toBe("NO_CHANGE");
    expect(decision.orderUpdate.paymentProviderStatus).toBe("in_process");
    expect(decision.orderUpdate.paymentStatus).toBeUndefined();
    expect(decision.orderUpdate.status).toBeUndefined();
  });

  it("não regride um pagamento aprovado por notificação atrasada", () => {
    const decision = decide({
      payment: { providerStatus: "pending" },
      order: { paymentStatus: "APPROVED", status: "PAID", paymentProviderStatus: "approved" },
    });
    expect(decision.outcome).toBe("ignored_stale");
  });

  it("aceita aprovação tardia depois de uma expiração", () => {
    const decision = decide({
      order: { paymentStatus: "EXPIRED", paymentProviderStatus: "expired" },
    });
    if (decision.outcome !== "updated") throw new Error("esperava atualização");
    expect(decision.transition.reason).toBe("LATE_APPROVAL");
    expect(decision.orderUpdate.status).toBe("PAID");
  });

  it("mantém o pedido aguardando pagamento quando o Pix expira", () => {
    const decision = decide({
      payment: { providerStatus: "expired" },
      order: { paymentStatus: "PENDING", paymentProviderStatus: "pending" },
    });
    if (decision.outcome !== "updated") throw new Error("esperava atualização");
    expect(decision.orderUpdate.paymentStatus).toBe("EXPIRED");
    expect(decision.orderUpdate.status).toBeUndefined();
    expect(decision.orderUpdate.fulfillmentHold).toBeUndefined();
  });

  it("retira o pedido do fluxo normal e alerta em caso de estorno", () => {
    const decision = decide({
      payment: { providerStatus: "refunded" },
      order: { paymentStatus: "APPROVED", status: "PRINTING", paymentProviderStatus: "approved" },
    });
    if (decision.outcome !== "updated") throw new Error("esperava atualização");
    expect(decision.orderUpdate.paymentStatus).toBe("REFUNDED");
    expect(decision.orderUpdate.fulfillmentHold).toBe(true);
    expect(decision.orderUpdate.fulfillmentHoldReason).toBe("REFUNDED");
    expect(decision.requiresOperationsAlert).toBe(true);
  });

  it("trata chargeback como retenção da produção", () => {
    const decision = decide({
      payment: { providerStatus: "charged_back" },
      order: { paymentStatus: "APPROVED", status: "SHIPPED", paymentProviderStatus: "approved" },
    });
    if (decision.outcome !== "updated") throw new Error("esperava atualização");
    expect(decision.orderUpdate.fulfillmentHold).toBe(true);
    expect(decision.requiresOperationsAlert).toBe(true);
  });

  it("nunca aprova um status desconhecido e pede revisão da operação", () => {
    const decision = decide({
      payment: { providerStatus: "status_que_nao_existe" },
      order: { paymentStatus: "PENDING", paymentProviderStatus: "pending" },
    });
    if (decision.outcome !== "updated") throw new Error("esperava atualização");
    expect(decision.orderUpdate.paymentStatus).toBe("PROCESSING");
    expect(decision.orderUpdate.status).toBeUndefined();
    expect(decision.requiresOperationsAlert).toBe(true);
  });

  it("aceita a primeira notificação de um pedido sem estado financeiro", () => {
    const decision = decide({
      order: { paymentStatus: undefined, paymentId: undefined, paymentProviderStatus: undefined },
    });
    if (decision.outcome !== "updated") throw new Error("esperava atualização");
    expect(decision.transition.reason).toBe("INITIAL");
    expect(decision.orderUpdate.paymentStatus).toBe("APPROVED");
  });
});
