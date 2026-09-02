import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminAuth, getAdminDb, isAdminSdkConfigured } from "../../server/firebaseAdmin.js";
import { AppError } from "../../server/_observability/appError.js";
import { createRequestContext } from "../../server/_observability/context.js";
import { sendApiError } from "../../server/_observability/http.js";
import { logEvent } from "../../server/_observability/logger.js";
import { checkRateLimit, clientIp } from "../../server/_rateLimit.js";

async function authenticate(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) return null;

  try {
    return (await getAdminAuth().verifyIdToken(authHeader.slice(7))).uid;
  } catch {
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const context = createRequestContext(req, "payment-api", "get-payment-status");
  res.setHeader("X-Correlation-Id", context.correlationId);

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    sendApiError(res, context, new AppError("METHOD_NOT_ALLOWED"));
    return;
  }

  const { allowed, retryAfterSeconds } = await checkRateLimit(
    "mercadopago-payment-status",
    clientIp(req),
    30,
    context,
  );
  if (!allowed) {
    res.setHeader("Retry-After", String(retryAfterSeconds || 60));
    sendApiError(res, context, new AppError("RATE_LIMITED"));
    return;
  }

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

  const userId = await authenticate(req);
  if (!userId) {
    sendApiError(res, context, new AppError("AUTH_REQUIRED"));
    return;
  }

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
