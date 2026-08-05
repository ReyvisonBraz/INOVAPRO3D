// Serviço de pagamento para backend
// Centraliza a lógica de negócio de pagamentos

import { getAdminDb } from "../firebaseAdmin.js";
import { createPayment, getPaymentStatus } from "./_client.js";
import { mapMercadoPagoStatus, mapMercadoPagoPaymentMethod } from "./_types.js";

// Log estruturado para pagamentos
function log(level: "info" | "warn" | "error", message: string, data?: Record<string, unknown>) {
  const maskedData = data ? maskSensitiveData(data) : undefined;
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: "payment-service",
      message,
      ...maskedData,
    }),
  );
}

// Mascarar dados sensíveis nos logs
function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const masked = { ...data };
  const sensitiveKeys = ["accessToken", "secret", "key", "token", "password"];

  for (const key of Object.keys(masked)) {
    if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
      masked[key] = "***MASKED***";
    }
  }

  return masked;
}

// Interface para criação de pagamento
export interface CreatePaymentRequest {
  orderId: string;
  paymentMethod: "pix";
  userId: string;
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
  error?: string;
}

// Processar pagamento
export async function processPayment(request: CreatePaymentRequest): Promise<CreatePaymentResult> {
  const { orderId, paymentMethod, userId } = request;

  log("info", "Processando pagamento", { orderId, paymentMethod, userId });

  // Verificar se Admin SDK está configurado
  const adminDb = getAdminDb();
  if (!adminDb) {
    log("error", "Admin SDK não configurado");
    return { success: false, error: "Serviço indisponível" };
  }

  // Buscar pedido
  const orderDoc = await adminDb.collection("orders").doc(orderId).get();

  if (!orderDoc.exists) {
    log("warn", "Pedido não encontrado", { orderId });
    return { success: false, error: "Pedido não encontrado" };
  }

  const order = orderDoc.data()!;

  const amount = Number(order.total);
  if (!Number.isFinite(amount) || amount <= 0) {
    log("error", "Pedido com valor inválido", { orderId });
    return { success: false, error: "O pedido possui um valor inválido" };
  }

  // Verificar propriedade do pedido
  if (order.userId !== userId) {
    log("warn", "Usuário não tem permissão para pagar este pedido", { orderId, userId });
    return { success: false, error: "Você não tem permissão para pagar este pedido" };
  }

  // Verificar se pedido já foi pago
  if (order.status === "PAID") {
    log("warn", "Pedido já foi pago", { orderId });
    return { success: false, error: "Pedido já foi pago" };
  }

  // Verificar se pedido foi cancelado
  if (order.status === "CANCELED") {
    log("warn", "Pedido foi cancelado", { orderId });
    return { success: false, error: "Pedido foi cancelado" };
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
    });

    const paymentStatus = mapMercadoPagoStatus(result.status);
    const mappedPaymentMethod = mapMercadoPagoPaymentMethod(
      result.paymentMethodId || paymentMethod,
    );

    // Salvar tentativa de pagamento
    await adminDb
      .collection("paymentAttempts")
      .doc(attemptId)
      .set({
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
      });

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

    log("info", "Pagamento processado com sucesso", {
      orderId,
      paymentId: result.paymentId,
      status: paymentStatus,
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
    log("error", "Erro ao processar pagamento", { orderId, error: message });
    return { success: false, error: message };
  }
}

// Verificar idempotência (verificar se pagamento já existe)
// Consultar status do pagamento
export async function getPaymentStatusById(paymentId: string): Promise<{
  id: string;
  status: string;
  statusDetail: string;
  transactionAmount: number;
  currencyId: string;
  paymentMethodId: string;
  dateCreated: string;
  dateApproved?: string;
  externalReference?: string;
} | null> {
  try {
    return await getPaymentStatus(paymentId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro desconhecido";
    log("error", "Erro ao consultar status do pagamento", { paymentId, error: message });
    return null;
  }
}
