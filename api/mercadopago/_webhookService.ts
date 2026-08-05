import { getAdminDb } from "../firebaseAdmin.js";
import { omitUndefined } from "../_firestoreData.js";
import { getPaymentStatusById } from "./_service.js";
import { mapMercadoPagoPaymentMethod, mapMercadoPagoStatus } from "./_types.js";

export interface PaymentWebhookEvent {
  paymentId: string;
  action?: string;
  type?: string;
}

export type PaymentWebhookOutcome =
  | "updated"
  | "already_processed"
  | "order_not_found"
  | "external_reference_missing"
  | "amount_mismatch";

function toCents(value: unknown): number {
  return Math.round(Number(value) * 100);
}

/**
 * Regra de negócio compartilhada pelos adaptadores Express e Vercel.
 * O payload recebido nunca é considerado fonte de verdade: o pagamento é
 * consultado novamente na API do Mercado Pago antes de alterar o pedido.
 */
export async function processPaymentWebhook(
  event: PaymentWebhookEvent,
): Promise<PaymentWebhookOutcome> {
  const payment = await getPaymentStatusById(event.paymentId);
  if (!payment) throw new Error("Não foi possível consultar o pagamento no Mercado Pago");
  if (!payment.externalReference) return "external_reference_missing";

  const adminDb = getAdminDb();
  const orderRef = adminDb.collection("orders").doc(payment.externalReference);
  const orderSnapshot = await orderRef.get();
  if (!orderSnapshot.exists) return "order_not_found";

  const order = orderSnapshot.data()!;
  const nextPaymentStatus = mapMercadoPagoStatus(payment.status);
  if (
    order.paymentId === event.paymentId &&
    order.paymentProviderStatus === payment.status &&
    order.paymentStatus === nextPaymentStatus
  ) {
    return "already_processed";
  }

  if (toCents(payment.transactionAmount) !== toCents(order.total)) {
    await adminDb.collection("paymentEvents").add({
      orderId: payment.externalReference,
      paymentId: event.paymentId,
      event: "amount_mismatch",
      expectedAmount: order.total,
      receivedAmount: payment.transactionAmount,
      createdAt: new Date(),
    });
    return "amount_mismatch";
  }

  const now = new Date();
  const updateData: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData> = {
    paymentId: event.paymentId,
    paymentStatus: nextPaymentStatus,
    paymentProvider: "mercadopago",
    paymentProviderStatus: payment.status,
    paymentProviderStatusDetail: payment.statusDetail,
    paymentMethod: mapMercadoPagoPaymentMethod(payment.paymentMethodId),
    paymentUpdatedAt: now,
  };
  if (nextPaymentStatus === "APPROVED") {
    updateData.paidAt = payment.dateApproved ? new Date(payment.dateApproved) : now;
    updateData.status = "PAID";
  }

  const batch = adminDb.batch();
  batch.update(orderRef, updateData);

  if (order.paymentAttemptId) {
    const attemptRef = adminDb.collection("paymentAttempts").doc(order.paymentAttemptId);
    batch.update(
      attemptRef,
      omitUndefined({
        status: nextPaymentStatus,
        paymentProviderStatus: payment.status,
        paymentStatusDetail: payment.statusDetail,
        updatedAt: now,
      }),
    );
  }

  const eventRef = adminDb.collection("paymentEvents").doc();
  batch.set(eventRef, {
    orderId: payment.externalReference,
    paymentId: event.paymentId,
    action: event.action ?? null,
    type: event.type ?? null,
    statusBefore: order.paymentStatus ?? "NOT_STARTED",
    statusAfter: nextPaymentStatus,
    providerStatus: payment.status,
    createdAt: now,
  });
  await batch.commit();
  return "updated";
}
