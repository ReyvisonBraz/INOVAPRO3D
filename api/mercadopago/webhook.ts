import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAdminSdkConfigured } from "../firebaseAdmin.js";
import { AppError } from "../_observability/appError.js";
import { createRequestContext } from "../_observability/context.js";
import { sendApiError } from "../_observability/http.js";
import { logEvent } from "../_observability/logger.js";
import { validateWebhookSignature } from "./_webhook.js";
import { processPaymentWebhook } from "./_webhookService.js";

interface MercadoPagoWebhookPayload {
  action?: string;
  data?: { id?: string | number };
  type?: string;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const context = createRequestContext(req, "payment-webhook", "receive-notification");
  res.setHeader("X-Correlation-Id", context.correlationId);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendApiError(res, context, new AppError("METHOD_NOT_ALLOWED"));
    return;
  }
  if (!isAdminSdkConfigured()) {
    sendApiError(
      res,
      context,
      new AppError("PAYMENT_CONFIGURATION_ERROR", {
        technicalMessage: "Firebase Admin SDK não configurado para o webhook",
      }),
    );
    return;
  }

  const payload = (req.body ?? {}) as MercadoPagoWebhookPayload;
  const queryDataId = req.query["data.id"];
  const paymentId = String(
    (Array.isArray(queryDataId) ? queryDataId[0] : queryDataId) ?? payload.data?.id ?? "",
  );
  if (!paymentId) {
    // Eventos sem pagamento não pertencem a este endpoint, mas retornamos 200
    // para evitar novas tentativas desnecessárias do provedor.
    logEvent("info", context, "Notificação sem pagamento ignorada", {
      action: payload.action,
      type: payload.type,
      context,
    });
    res
      .status(200)
      .json({ received: true, outcome: "ignored", correlationId: context.correlationId });
    return;
  }

  const validation = validateWebhookSignature({
    signature: firstHeader(req.headers["x-signature"]),
    requestId: firstHeader(req.headers["x-request-id"]),
    dataId: paymentId,
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
  });
  if (!validation.valid) {
    sendApiError(
      res,
      context,
      new AppError("WEBHOOK_SIGNATURE_INVALID", {
        technicalMessage: "Assinatura da notificação inválida",
        details: { reason: validation.reason },
      }),
      { paymentId },
    );
    return;
  }

  try {
    const outcome = await processPaymentWebhook({
      paymentId,
      action: payload.action,
      type: payload.type,
      context,
    });
    const level =
      outcome === "amount_mismatch" ? "error" : outcome === "ignored_stale" ? "warn" : "info";
    logEvent(level, context, "Webhook processado", {
      paymentId,
      outcome,
    });
    res.status(200).json({ received: true, outcome, correlationId: context.correlationId });
  } catch (error) {
    sendApiError(
      res,
      context,
      new AppError("PAYMENT_PROCESSING_FAILED", {
        cause: error,
        technicalMessage: "Falha ao processar notificação de pagamento",
      }),
      { paymentId },
    );
  }
}
