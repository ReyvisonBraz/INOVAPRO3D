import { getAdminDb } from "../firebaseAdmin.js";
import { omitUndefined } from "../_firestoreData.js";
import type { RequestContext } from "../_observability/context.js";
import { logEvent } from "../_observability/logger.js";
import { getPaymentStatusById } from "./_service.js";
import { decidePaymentWebhook } from "./_webhookDecision.js";

export interface PaymentWebhookEvent {
  paymentId: string;
  action?: string;
  type?: string;
  context?: RequestContext;
}

export type PaymentWebhookOutcome =
  | "updated"
  | "already_processed"
  | "ignored_stale"
  | "order_not_found"
  | "external_reference_missing"
  | "amount_mismatch";

function toUpdateData(
  data: Record<string, unknown>,
): FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> {
  return omitUndefined(data) as FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>;
}

function fallbackContext(paymentId: string): RequestContext {
  return {
    correlationId: `payment_${paymentId}`,
    service: "mercadopago-webhook",
    operation: "process-notification",
  };
}

/**
 * Regra de negócio compartilhada pelos adaptadores Express e Vercel.
 * O payload recebido nunca é considerado fonte de verdade: o pagamento é
 * consultado novamente na API do Mercado Pago antes de alterar o pedido.
 * A decisão vem de `decidePaymentWebhook` e a gravação acontece em uma única
 * transação, para que duas notificações simultâneas não se sobrescrevam.
 */
export async function processPaymentWebhook(
  event: PaymentWebhookEvent,
): Promise<PaymentWebhookOutcome> {
  const context = event.context ?? fallbackContext(event.paymentId);
  const payment = await getPaymentStatusById(event.paymentId, context);
  if (!payment.externalReference) return "external_reference_missing";

  const adminDb = getAdminDb();
  const orderId = payment.externalReference;
  const orderRef = adminDb.collection("orders").doc(orderId);
  const now = new Date();

  const result = await adminDb.runTransaction(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) return { outcome: "order_not_found" as const };

    const order = orderSnapshot.data()!;
    const attemptRef = order.paymentAttemptId
      ? adminDb.collection("paymentAttempts").doc(order.paymentAttemptId)
      : null;
    const attemptSnapshot = attemptRef ? await transaction.get(attemptRef) : null;

    const decision = decidePaymentWebhook({
      payment: {
        paymentId: event.paymentId,
        providerStatus: payment.status,
        statusDetail: payment.statusDetail,
        paymentMethodId: payment.paymentMethodId,
        transactionAmount: payment.transactionAmount,
        dateApproved: payment.dateApproved,
      },
      order: {
        total: order.total,
        status: order.status,
        paymentStatus: order.paymentStatus,
        paymentId: order.paymentId,
        paymentProviderStatus: order.paymentProviderStatus,
      },
      now,
    });

    if (decision.outcome === "already_processed") {
      return { outcome: "already_processed" as const };
    }

    const eventRef = adminDb.collection("paymentEvents").doc();
    const eventBase = {
      orderId,
      paymentId: event.paymentId,
      action: event.action ?? null,
      type: event.type ?? null,
      providerStatus: payment.status,
      createdAt: now,
    };

    if (decision.outcome === "amount_mismatch") {
      transaction.set(eventRef, {
        ...eventBase,
        event: "amount_mismatch",
        expectedAmount: order.total,
        receivedAmount: payment.transactionAmount,
      });
      return {
        outcome: "amount_mismatch" as const,
        expectedAmountCents: decision.expectedAmountCents,
        receivedAmountCents: decision.receivedAmountCents,
      };
    }

    if (decision.outcome === "ignored_stale") {
      transaction.set(eventRef, {
        ...eventBase,
        event: "stale_notification_ignored",
        statusBefore: decision.transition.previousStatus,
        statusAfter: decision.transition.previousStatus,
        rejectedStatus: decision.transition.nextStatus,
      });
      return { outcome: "ignored_stale" as const, transition: decision.transition };
    }

    // A decisão é um objeto de domínio; a conversão para o formato do Firestore
    // acontece somente aqui, na borda de persistência.
    transaction.update(orderRef, toUpdateData(decision.orderUpdate));
    if (attemptRef && attemptSnapshot?.exists) {
      transaction.update(attemptRef, toUpdateData(decision.attemptUpdate));
    }
    transaction.set(eventRef, {
      ...eventBase,
      event: "payment_status_changed",
      statusBefore: decision.transition.previousStatus,
      statusAfter: decision.transition.accepted
        ? decision.transition.nextStatus
        : decision.transition.previousStatus,
      transitionReason: decision.transition.reason,
      fulfillmentAction: decision.transition.fulfillmentAction,
      requiresOperationsAlert: decision.requiresOperationsAlert,
    });
    return {
      outcome: "updated" as const,
      transition: decision.transition,
      requiresOperationsAlert: decision.requiresOperationsAlert,
    };
  });

  if (result.outcome === "ignored_stale") {
    logEvent("warn", context, "Notificação atrasada ignorada", {
      paymentId: event.paymentId,
      orderId,
      previousStatus: result.transition.previousStatus,
      rejectedStatus: result.transition.nextStatus,
    });
  }
  if (result.outcome === "updated" && result.requiresOperationsAlert) {
    logEvent("error", context, "Pagamento exige revisão da operação", {
      paymentId: event.paymentId,
      orderId,
      providerStatus: payment.status,
      fulfillmentAction: result.transition.fulfillmentAction,
    });
  }

  return result.outcome;
}
