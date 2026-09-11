import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAdminSdkConfigured } from "../../server/firebaseAdmin.js";
import { AppError } from "../../server/_observability/appError.js";
import { createRequestContext } from "../../server/_observability/context.js";
import { sendApiError } from "../../server/_observability/http.js";
import { logEvent } from "../../server/_observability/logger.js";
import { resolveVerifiedEmail } from "../../server/_orderNotification.js";
import { processPayment } from "../../server/mercadopago/_service.js";
import { applyCatalogGuards } from "../../server/_middleware/vercelGuards.js";

// Handler principal
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const context = createRequestContext(req, "payment-api", "create-pix");
  res.setHeader("X-Correlation-Id", context.correlationId);

  // Método + rate limit primeiro, sem auth — a ordem original checava a
  // configuração do pagamento entre eles e a identidade, e os dois erros de
  // configuração abaixo usam PAYMENT_CONFIGURATION_ERROR, não o
  // SERVICE_CONFIGURATION_ERROR genérico do guarda. Por isso ficam de fora.
  const methodAndRate = await applyCatalogGuards(req, res, context, {
    methods: ["POST"],
    rateLimit: { bucket: "mercadopago-process-payment", maxPerMinute: 10 },
  });
  if (methodAndRate === false) return;

  // Verificar se serviço está habilitado
  if (process.env.MERCADOPAGO_ENABLED !== "true") {
    sendApiError(
      res,
      context,
      new AppError("PAYMENT_CONFIGURATION_ERROR", {
        technicalMessage: "Integração Mercado Pago desabilitada",
      }),
    );
    return;
  }

  // Verificar se Admin SDK está configurado
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

  // Autenticar usuário — método e taxa já passaram acima, então este guarda
  // só resolve identidade (`requireAdminSdk: false`: já confirmado logo acima).
  const identity = await applyCatalogGuards(req, res, context, {
    auth: "user",
    requireAdminSdk: false,
  });
  if (!identity) return;
  const user = {
    userId: identity.uid,
    email:
      resolveVerifiedEmail({
        email: identity.email,
        emailVerified: identity.emailVerified,
      }) ?? undefined,
  };

  // Validar payload
  const body = (req.body ?? {}) as {
    orderId?: string;
    paymentMethod?: "pix";
  };

  const orderId = body.orderId;
  const paymentMethod = body.paymentMethod || "pix";

  if (!orderId || paymentMethod !== "pix") {
    sendApiError(
      res,
      context,
      new AppError("INVALID_REQUEST", {
        technicalMessage: "orderId ausente ou paymentMethod diferente de pix",
      }),
    );
    return;
  }

  // Processar pagamento
  logEvent("info", context, "Iniciando processamento de pagamento", {
    orderId,
    paymentMethod,
    userId: user.userId,
  });

  let result;
  try {
    result = await processPayment({
      orderId,
      paymentMethod,
      userId: user.userId,
      verifiedPayerEmail: user.email,
      context,
    });
  } catch (error) {
    sendApiError(
      res,
      context,
      new AppError("PAYMENT_PROCESSING_FAILED", {
        cause: error,
        technicalMessage: "Falha inesperada ao processar o pagamento",
      }),
      { orderId },
    );
    return;
  }

  if (!result.success) {
    sendApiError(
      res,
      context,
      new AppError(result.errorCode ?? "PAYMENT_PROCESSING_FAILED", {
        technicalMessage: result.error,
        details: result.errorDetails,
      }),
      { orderId },
    );
    return;
  }

  logEvent("info", context, "Pagamento processado com sucesso", {
    orderId,
    paymentId: result.paymentId,
    status: result.status,
  });

  res.status(200).json({
    success: true,
    paymentId: result.paymentId,
    status: result.status,
    statusDetail: result.statusDetail,
    qrCodeBase64: result.qrCodeBase64,
    qrCodeUrl: result.qrCodeUrl,
    pixCode: result.pixCode,
    expiresAt: result.expiresAt,
    attemptNumber: result.attemptNumber,
  });
}
