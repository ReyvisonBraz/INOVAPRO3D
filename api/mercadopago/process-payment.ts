import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminAuth, isAdminSdkConfigured } from "../firebaseAdmin.js";
import { AppError } from "../_observability/appError.js";
import { createRequestContext } from "../_observability/context.js";
import { sendApiError } from "../_observability/http.js";
import { logEvent } from "../_observability/logger.js";
import { resolveVerifiedEmail } from "../_orderNotification.js";
import { processPayment } from "./_service.js";

// Rate limiting simples
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxPerMinute: number, context: ReturnType<typeof createRequestContext>) {
  return (req: VercelRequest, res: VercelResponse, next: () => void) => {
    const key = `${req.method}:${req.url}:${req.headers["x-forwarded-for"] || req.socket.remoteAddress}`;
    const now = Date.now();
    const bucket = rateBuckets.get(key);

    if (!bucket || now > bucket.resetAt) {
      rateBuckets.set(key, { count: 1, resetAt: now + 60_000 });
      next();
      return;
    }

    bucket.count++;
    if (bucket.count > maxPerMinute) {
      res.setHeader("Retry-After", "60");
      sendApiError(res, context, new AppError("RATE_LIMITED"));
      return;
    }

    next();
  };
}

// Middleware de autenticação
async function authenticate(
  req: VercelRequest,
): Promise<{ userId: string; email?: string } | null> {
  const authHeader = req.headers.authorization as string | undefined;
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
    return {
      userId: decoded.uid,
      email:
        resolveVerifiedEmail({
          email: decoded.email,
          emailVerified: decoded.email_verified === true,
        }) ?? undefined,
    };
  } catch {
    return null;
  }
}

// Handler principal
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const context = createRequestContext(req, "payment-api", "create-pix");
  res.setHeader("X-Correlation-Id", context.correlationId);

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    sendApiError(
      res,
      context,
      new AppError("METHOD_NOT_ALLOWED", { technicalMessage: "Método HTTP não permitido" }),
    );
    return;
  }

  // Rate limiting: 10 requisições por minuto
  rateLimit(10, context)(req, res, () => {});

  if (res.writableEnded) {
    return;
  }

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

  // Autenticar usuário
  const user = await authenticate(req);
  if (!user) {
    sendApiError(res, context, new AppError("AUTH_REQUIRED"));
    return;
  }

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
