// Serviço de pagamento para backend
// Centraliza a lógica de negócio de pagamentos

import { getAdminDb } from "../firebaseAdmin.js";
import { omitUndefined } from "../_firestoreData.js";
import type { ErrorCode } from "../../shared/errors/catalog.js";
import {
  decidePaymentAttempt,
  resolvePixExpirationMinutes,
  type PaymentAttemptDecision,
  type StoredPaymentAttempt,
} from "../../shared/payments/pixAttempt.js";
import type { RequestContext } from "../_observability/context.js";
import { createPayment, getPaymentStatus, MercadoPagoApiError } from "./_client.js";
import { mapMercadoPagoStatus, mapMercadoPagoPaymentMethod } from "./_types.js";

// Interface para criação de pagamento
export interface CreatePaymentRequest {
  orderId: string;
  paymentMethod: "pix";
  userId: string;
  context?: RequestContext;
}

// Interface para resultado do pagamento
export interface CreatePaymentResult {
  success: boolean;
  paymentId?: string;
  status?: string;
  statusDetail?: string;
  qrCodeBase64?: string;
  qrCodeUrl?: string;
  pixCode?: string;
  expiresAt?: string;
  attemptNumber?: number;
  errorCode?: ErrorCode;
  error?: string;
  errorDetails?: Record<string, unknown>;
}

/** Timestamp do Firestore, Date ou ausente — tudo vira Date ou nada. */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  const timestamp = value as { toDate?: () => Date };
  return typeof timestamp.toDate === "function" ? timestamp.toDate() : null;
}

type AttemptReservation =
  | { ok: false; errorCode: ErrorCode; error: string }
  | { ok: true; action: "reuse_stored"; payment: CreatePaymentResult }
  | {
      ok: true;
      action: "create" | "resume_provider";
      decision: Extract<PaymentAttemptDecision, { expiresAt: Date }>;
      amount: number;
      payerEmail?: string;
    };

function fail(errorCode: ErrorCode, error: string): AttemptReservation {
  return { ok: false, errorCode, error };
}

// Processar pagamento
export async function processPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult> {
  const { orderId, paymentMethod, userId } = request;

  // Verificar se Admin SDK está configurado
  const adminDb = getAdminDb();
  if (!adminDb) {
    return {
      success: false,
      errorCode: "PAYMENT_CONFIGURATION_ERROR",
      error: "Admin SDK não configurado",
    };
  }

  const expirationMinutes = resolvePixExpirationMinutes(process.env.PIX_EXPIRATION_MINUTES);
  const now = new Date();
  const orderRef = adminDb.collection("orders").doc(orderId);

  // A validação e a reserva da tentativa acontecem na mesma transação: dois
  // cliques simultâneos são serializados e produzem uma única cobrança.
  const reservation = await adminDb.runTransaction<AttemptReservation>(async (transaction) => {
    const orderSnapshot = await transaction.get(orderRef);
    if (!orderSnapshot.exists) return fail("ORDER_NOT_FOUND", "Pedido não encontrado");

    const order = orderSnapshot.data()!;

    const amount = Number(order.total);
    if (!Number.isFinite(amount) || amount <= 0) {
      return fail("INVALID_ORDER_TOTAL", "O pedido possui um valor inválido");
    }
    if (order.userId !== userId) {
      return fail("FORBIDDEN", "Usuário não tem permissão para pagar este pedido");
    }
    if (order.status === "PAID" || order.paymentStatus === "APPROVED") {
      return fail("ORDER_ALREADY_PAID", "Pedido já foi pago");
    }
    if (order.status === "CANCELED") {
      return fail("ORDER_CANCELED", "Pedido foi cancelado");
    }

    const attemptRef = order.paymentAttemptId
      ? adminDb.collection("paymentAttempts").doc(order.paymentAttemptId)
      : null;
    const attemptSnapshot = attemptRef ? await transaction.get(attemptRef) : null;
    const stored = attemptSnapshot?.exists ? attemptSnapshot.data()! : null;

    const currentAttempt: StoredPaymentAttempt | null = stored
      ? {
          attemptNumber: Number(stored.attemptNumber ?? order.paymentAttemptNumber ?? 1),
          status: stored.status,
          // `expirationDate` cobre tentativas criadas antes desta política.
          expiresAt: toDate(stored.expiresAt ?? stored.expirationDate),
          paymentId: stored.paymentId,
          pixCode: stored.pixCode,
        }
      : null;

    const decision = decidePaymentAttempt({ orderId, currentAttempt, now, expirationMinutes });

    // Reutiliza a cobrança vigente. Isso evita criar vários Pix quando a pessoa
    // clica novamente, atualiza a página ou sofre uma falha temporária de rede.
    if (decision.action === "reuse_stored") {
      // `reuse_stored` só é decidido a partir de uma tentativa já gravada.
      const previous = stored as FirebaseFirestore.DocumentData;
      return {
        ok: true,
        action: "reuse_stored",
        payment: {
          success: true,
          paymentId: previous.paymentId,
          status: previous.paymentProviderStatus,
          statusDetail: previous.paymentStatusDetail,
          qrCodeBase64: previous.qrCodeBase64,
          qrCodeUrl: previous.qrCodeUrl,
          pixCode: previous.pixCode,
          expiresAt: currentAttempt?.expiresAt?.toISOString(),
          attemptNumber: decision.attemptNumber,
        },
      };
    }

    if (decision.action === "create") {
      // A reserva grava a tentativa antes da chamada externa; se a criação
      // falhar, a próxima requisição retoma esta mesma chave em vez de abrir
      // uma cobrança paralela.
      transaction.set(
        adminDb.collection("paymentAttempts").doc(decision.attemptId),
        omitUndefined({
          id: decision.attemptId,
          orderId,
          attemptNumber: decision.attemptNumber,
          paymentProvider: "mercadopago",
          idempotencyKey: decision.idempotencyKey,
          status: "PROCESSING",
          amount,
          currency: "BRL",
          expiresAt: decision.expiresAt,
          createdAt: now,
          updatedAt: now,
        }),
      );
      transaction.update(orderRef, {
        paymentProvider: "mercadopago",
        paymentStatus: "PROCESSING",
        paymentAttemptId: decision.attemptId,
        paymentAttemptNumber: decision.attemptNumber,
        idempotencyKey: decision.idempotencyKey,
        paymentExpiresAt: decision.expiresAt,
        paymentUpdatedAt: now,
      });
    }

    return {
      ok: true,
      action: decision.action,
      decision,
      amount,
      payerEmail: order.userEmail || undefined,
    };
  });

  if (!reservation.ok) {
    return { success: false, errorCode: reservation.errorCode, error: reservation.error };
  }
  if (reservation.action === "reuse_stored") {
    return reservation.payment;
  }

  const { decision, amount, payerEmail } = reservation;

  try {
    // Criar pagamento no Mercado Pago
    const result = await createPayment({
      orderId,
      amount,
      currency: "BRL",
      description: `Pedido #${orderId.slice(0, 8).toUpperCase()}`,
      paymentMethod,
      idempotencyKey: decision.idempotencyKey,
      expiresAt: decision.expiresAt,
      email: payerEmail,
      context: request.context,
    });

    const paymentStatus = mapMercadoPagoStatus(result.status);
    const mappedPaymentMethod = mapMercadoPagoPaymentMethod(
      result.paymentMethodId || paymentMethod,
    );
    // O provedor confirma o vencimento; se ele omitir, vale o que enviamos.
    const expiresAt = result.expiresAt ? new Date(result.expiresAt) : decision.expiresAt;

    const batch = adminDb.batch();
    batch.set(
      adminDb.collection("paymentAttempts").doc(decision.attemptId),
      omitUndefined({
        id: decision.attemptId,
        orderId,
        attemptNumber: decision.attemptNumber,
        paymentId: result.paymentId,
        paymentProvider: "mercadopago",
        paymentProviderStatus: result.status,
        paymentStatusDetail: result.statusDetail,
        paymentMethod: mappedPaymentMethod,
        idempotencyKey: decision.idempotencyKey,
        status: paymentStatus,
        amount,
        currency: "BRL",
        createdAt: now,
        updatedAt: now,
        qrCodeBase64: result.qrCodeBase64,
        qrCodeUrl: result.qrCodeUrl,
        pixCode: result.pixCode,
        expiresAt,
      }),
      { merge: true },
    );
    batch.update(
      orderRef,
      omitUndefined({
        paymentStatus,
        paymentProvider: "mercadopago",
        paymentProviderStatus: result.status,
        paymentProviderStatusDetail: result.statusDetail,
        paymentId: result.paymentId,
        paymentMethod: mappedPaymentMethod,
        paymentAttemptId: decision.attemptId,
        paymentAttemptNumber: decision.attemptNumber,
        idempotencyKey: decision.idempotencyKey,
        paymentExpiresAt: expiresAt,
        paymentUpdatedAt: now,
      }),
    );
    await batch.commit();

    return {
      success: true,
      paymentId: result.paymentId,
      status: result.status,
      statusDetail: result.statusDetail,
      qrCodeBase64: result.qrCodeBase64,
      qrCodeUrl: result.qrCodeUrl,
      pixCode: result.pixCode,
      expiresAt: expiresAt.toISOString(),
      attemptNumber: decision.attemptNumber,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro ao processar pagamento";
    const errorCode: ErrorCode =
      error instanceof MercadoPagoApiError ? "PAYMENT_PROVIDER_ERROR" : "PAYMENT_PROCESSING_FAILED";
    return {
      success: false,
      errorCode,
      error: message,
      errorDetails: {
        providerStatus: error instanceof MercadoPagoApiError ? error.status : undefined,
      },
    };
  }
}

// Verificar idempotência (verificar se pagamento já existe)
// Consultar status do pagamento
export async function getPaymentStatusById(
  paymentId: string,
  context?: RequestContext,
): Promise<{
  id: string;
  status: string;
  statusDetail: string;
  transactionAmount: number;
  currencyId: string;
  paymentMethodId: string;
  dateCreated: string;
  dateApproved?: string;
  externalReference?: string;
}> {
  return getPaymentStatus(paymentId, context);
}
