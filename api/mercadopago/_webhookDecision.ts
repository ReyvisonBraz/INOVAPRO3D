import type { PaymentStatus } from "../../shared/payments/contracts.js";
import {
  resolvePaymentTransition,
  type PaymentTransition,
} from "../../shared/payments/paymentStateMachine.js";
import type { OrderStatus } from "../../src/types/domain.js";
import {
  isKnownMercadoPagoStatus,
  mapMercadoPagoPaymentMethod,
  mapMercadoPagoStatus,
} from "./_types.js";

/** Pagamento como o provedor o descreve, já consultado na fonte de verdade. */
export interface WebhookPaymentInput {
  paymentId: string;
  providerStatus: string;
  statusDetail?: string;
  paymentMethodId?: string;
  transactionAmount: number;
  dateApproved?: string;
}

/** Recorte do pedido necessário para decidir a transição. */
export interface WebhookOrderInput {
  total: number;
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentId?: string;
  paymentProviderStatus?: string;
}

export interface WebhookDecisionInput {
  payment: WebhookPaymentInput;
  order: WebhookOrderInput;
  now: Date;
}

export type WebhookDecision =
  | { outcome: "amount_mismatch"; expectedAmountCents: number; receivedAmountCents: number }
  | { outcome: "already_processed"; transition: PaymentTransition }
  | { outcome: "ignored_stale"; transition: PaymentTransition }
  | {
      outcome: "updated";
      transition: PaymentTransition;
      orderUpdate: Record<string, unknown>;
      attemptUpdate: Record<string, unknown>;
      requiresOperationsAlert: boolean;
    };

/** Centavos evitam comparar dinheiro em ponto flutuante. */
export function toCents(value: unknown): number {
  return Math.round(Number(value) * 100);
}

/**
 * Regra única de transição usada pelo webhook e pela reconciliação. É pura:
 * recebe o pagamento do provedor e o pedido gravado, devolve o que escrever.
 * Nenhuma decisão financeira depende de leitura de banco ou de relógio local.
 */
export function decidePaymentWebhook({
  payment,
  order,
  now,
}: WebhookDecisionInput): WebhookDecision {
  const expectedAmountCents = toCents(order.total);
  const receivedAmountCents = toCents(payment.transactionAmount);
  if (expectedAmountCents !== receivedAmountCents) {
    return { outcome: "amount_mismatch", expectedAmountCents, receivedAmountCents };
  }

  const previousStatus: PaymentStatus = order.paymentStatus ?? "NOT_STARTED";
  const nextStatus = mapMercadoPagoStatus(payment.providerStatus);
  const transition = resolvePaymentTransition(previousStatus, nextStatus);

  // Duas notificações do mesmo evento não devem produzir escrita nenhuma.
  const alreadyRecorded =
    order.paymentId === payment.paymentId && order.paymentProviderStatus === payment.providerStatus;
  if (transition.reason === "NO_CHANGE" && alreadyRecorded) {
    return { outcome: "already_processed", transition };
  }

  // Notificação atrasada não regride um estado final mais novo.
  if (transition.reason === "STALE_OR_INVALID") {
    return { outcome: "ignored_stale", transition };
  }

  const orderUpdate: Record<string, unknown> = {
    paymentId: payment.paymentId,
    paymentProvider: "mercadopago",
    paymentProviderStatus: payment.providerStatus,
    paymentProviderStatusDetail: payment.statusDetail,
    paymentMethod: mapMercadoPagoPaymentMethod(payment.paymentMethodId ?? ""),
    paymentUpdatedAt: now,
  };
  const attemptUpdate: Record<string, unknown> = {
    paymentProviderStatus: payment.providerStatus,
    paymentStatusDetail: payment.statusDetail,
    updatedAt: now,
  };

  // `NO_CHANGE` com metadados diferentes atualiza o registro do provedor sem
  // mover o estado financeiro (ex.: `pending` seguido de `in_process`).
  if (transition.accepted) {
    orderUpdate.paymentStatus = nextStatus;
    attemptUpdate.status = nextStatus;
  }

  if (transition.accepted) {
    switch (transition.fulfillmentAction) {
      case "RELEASE_FULFILLMENT": {
        const paidAt = payment.dateApproved ? new Date(payment.dateApproved) : now;
        orderUpdate.paidAt = paidAt;
        attemptUpdate.paidAt = paidAt;
        // Um pedido que já avançou na produção não volta para PAID.
        if (!order.status || order.status === "PENDING_PAYMENT") {
          orderUpdate.status = "PAID";
        }
        break;
      }
      case "HOLD_FULFILLMENT":
        // Estorno e chargeback tiram o pedido do fluxo normal e avisam a operação.
        orderUpdate.fulfillmentHold = true;
        orderUpdate.fulfillmentHoldReason = nextStatus;
        break;
      case "KEEP_AWAITING_PAYMENT":
        // Pix vencido, recusado ou cancelado não cancela o pedido: o cliente
        // ainda pode gerar uma nova tentativa dentro do mesmo pedido.
        break;
      case "NONE":
        break;
    }
  }

  const requiresOperationsAlert =
    !isKnownMercadoPagoStatus(payment.providerStatus) ||
    (transition.accepted && transition.fulfillmentAction === "HOLD_FULFILLMENT");

  return { outcome: "updated", transition, orderUpdate, attemptUpdate, requiresOperationsAlert };
}
