// Serviço de pagamento para backend
// Centraliza a lógica de negócio de pagamentos

import { getAdminDb } from "../firebaseAdmin.js";
import { omitUndefined } from "../_firestoreData.js";
import type { ErrorCode } from "../../shared/errors/catalog.js";
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
  expirationDate?: string;
  errorCode?: ErrorCode;
  error?: string;
  errorDetails?: Record<string, unknown>;
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

  // Buscar pedido
  const orderDoc = await adminDb.collection("orders").doc(orderId).get();

  if (!orderDoc.exists) {
    return { success: false, errorCode: "ORDER_NOT_FOUND", error: "Pedido não encontrado" };
  }

  const order = orderDoc.data()!;

  const amount = Number(order.total);
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      success: false,
      errorCode: "INVALID_ORDER_TOTAL",
      error: "O pedido possui um valor inválido",
    };
  }

  // Verificar propriedade do pedido
  if (order.userId !== userId) {
    return {
      success: false,
      errorCode: "FORBIDDEN",
      error: "Usuário não tem permissão para pagar este pedido",
    };
  }

  // Verificar se pedido já foi pago
  if (order.status === "PAID") {
    return { success: false, errorCode: "ORDER_ALREADY_PAID", error: "Pedido já foi pago" };
  }

  // Verificar se pedido foi cancelado
  if (order.status === "CANCELED") {
    return { success: false, errorCode: "ORDER_CANCELED", error: "Pedido foi cancelado" };
  }

  // Reutiliza a cobrança pendente. Isso evita criar vários Pix quando a pessoa
  // clica novamente, atualiza a página ou sofre uma falha temporária de rede.
  if (
    order.paymentProvider === "mercadopago" &&
    order.paymentAttemptId &&
    (order.paymentStatus === "PENDING" || order.paymentStatus === "PROCESSING")
  ) {
    const previousAttempt = await adminDb
      .collection("paymentAttempts")
      .doc(order.paymentAttemptId)
      .get();
    if (previousAttempt.exists) {
      const previous = previousAttempt.data()!;
      return {
        success: true,
        paymentId: previous.paymentId,
        status: previous.paymentProviderStatus,
        statusDetail: previous.paymentStatusDetail,
        qrCodeBase64: previous.qrCodeBase64,
        qrCodeUrl: previous.qrCodeUrl,
        pixCode: previous.pixCode,
        expirationDate: previous.expirationDate?.toDate?.()?.toISOString(),
      };
    }
  }

  // Uma chave determinística faz duas requisições simultâneas representarem a
  // mesma operação no Mercado Pago. A versão permite uma futura política
  // explícita de nova tentativa após expiração.
  const idempotencyKey = `order:${orderId}:pix:v1`;
  const attemptId = `${orderId}-pix-v1`;

  try {
    // Criar pagamento no Mercado Pago
    const result = await createPayment({
      orderId,
      amount,
      currency: "BRL",
      description: `Pedido #${orderId.slice(0, 8).toUpperCase()}`,
      paymentMethod,
      idempotencyKey,
      email: order.userEmail || undefined,
      context: request.context,
    });

    const paymentStatus = mapMercadoPagoStatus(result.status);
    const mappedPaymentMethod = mapMercadoPagoPaymentMethod(
      result.paymentMethodId || paymentMethod,
    );

    // Salvar tentativa de pagamento
    await adminDb
      .collection("paymentAttempts")
      .doc(attemptId)
      .set(
        omitUndefined({
          id: attemptId,
          orderId,
          paymentId: result.paymentId,
          paymentProvider: "mercadopago",
          paymentProviderStatus: result.status,
          paymentStatusDetail: result.statusDetail,
          paymentMethod: mappedPaymentMethod,
          idempotencyKey,
          status: paymentStatus,
          amount,
          currency: "BRL",
          createdAt: new Date(),
          updatedAt: new Date(),
          qrCodeBase64: result.qrCodeBase64,
          qrCodeUrl: result.qrCodeUrl,
          pixCode: result.pixCode,
          expirationDate: result.expirationDate ? new Date(result.expirationDate) : undefined,
        }),
      );

    // Atualizar pedido
    await adminDb.collection("orders").doc(orderId).update({
      paymentStatus,
      paymentProvider: "mercadopago",
      paymentProviderStatus: result.status,
      paymentProviderStatusDetail: result.statusDetail,
      paymentId: result.paymentId,
      paymentMethod: mappedPaymentMethod,
      paymentAttemptId: attemptId,
      idempotencyKey,
      paymentUpdatedAt: new Date(),
    });

    return {
      success: true,
      paymentId: result.paymentId,
      status: result.status,
      statusDetail: result.statusDetail,
      qrCodeBase64: result.qrCodeBase64,
      qrCodeUrl: result.qrCodeUrl,
      pixCode: result.pixCode,
      expirationDate: result.expirationDate,
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
