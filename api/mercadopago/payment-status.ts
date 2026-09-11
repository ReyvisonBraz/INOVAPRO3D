import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb, isAdminSdkConfigured } from "../../server/firebaseAdmin.js";
import { AppError } from "../../server/_observability/appError.js";
import { createRequestContext } from "../../server/_observability/context.js";
import { sendApiError } from "../../server/_observability/http.js";
import { logEvent } from "../../server/_observability/logger.js";
import { applyCatalogGuards } from "../../server/_middleware/vercelGuards.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const context = createRequestContext(req, "payment-api", "get-payment-status");
  res.setHeader("X-Correlation-Id", context.correlationId);

  // Método + taxa antes da configuração, como na ordem original: o erro de
  // Admin SDK aqui é PAYMENT_CONFIGURATION_ERROR, não o genérico do guarda.
  const methodAndRate = await applyCatalogGuards(req, res, context, {
    methods: ["GET"],
    rateLimit: { bucket: "mercadopago-payment-status", maxPerMinute: 30 },
  });
  if (methodAndRate === false) return;

  if (!isAdminSdkConfigured()) {
    sendApiError(
      res,
      context,
      new AppError("PAYMENT_CONFIGURATION_ERROR", {
        technicalMessage: "Firebase Admin SDK não configurado",
      }),
    );
    return;
  }

  const identity = await applyCatalogGuards(req, res, context, {
    auth: "user",
    requireAdminSdk: false,
  });
  if (!identity) return;
  const userId = identity.uid;

  const rawOrderId = req.query.orderId;
  const orderId = Array.isArray(rawOrderId) ? rawOrderId[0] : rawOrderId;
  if (!orderId) {
    sendApiError(
      res,
      context,
      new AppError("INVALID_REQUEST", { technicalMessage: "orderId ausente" }),
    );
    return;
  }

  try {
    const orderDoc = await getAdminDb().collection("orders").doc(orderId).get();
    if (!orderDoc.exists) {
      sendApiError(res, context, new AppError("ORDER_NOT_FOUND"), { orderId });
      return;
    }

    const order = orderDoc.data()!;
    if (order.userId !== userId) {
      sendApiError(res, context, new AppError("FORBIDDEN"), { orderId, userId });
      return;
    }

    logEvent("info", context, "Status do pagamento consultado", {
      orderId,
      paymentStatus: order.paymentStatus || "NOT_STARTED",
    });
    res.status(200).json({
      orderId,
      paymentStatus: order.paymentStatus || "NOT_STARTED",
      paymentProvider: order.paymentProvider || "manual",
      paymentProviderStatus: order.paymentProviderStatus,
      paymentProviderStatusDetail: order.paymentProviderStatusDetail,
      paymentMethod: order.paymentMethod,
      paidAt: order.paidAt,
      paymentUpdatedAt: order.paymentUpdatedAt,
    });
  } catch (error) {
    sendApiError(
      res,
      context,
      new AppError("PAYMENT_PROCESSING_FAILED", {
        cause: error,
        technicalMessage: "Falha ao consultar o pedido no Firestore",
      }),
      { orderId },
    );
  }
}
