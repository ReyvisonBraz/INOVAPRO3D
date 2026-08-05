import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminAuth, isAdminSdkConfigured } from "../firebaseAdmin.js";
import { processPayment } from "./_service.js";

// Log estruturado para endpoint de pagamento
function log(level: "info" | "warn" | "error", message: string, data?: Record<string, unknown>) {
  const maskedData = data ? maskSensitiveData(data) : undefined;
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: "process-payment-endpoint",
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

// Rate limiting simples
const rateBuckets = new Map<string, { count: number; resetAt: number }>();
function rateLimit(maxPerMinute: number) {
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
      res.status(429).json({ error: "Muitas requisições. Tente novamente em instantes." });
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
    return { userId: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

// Handler principal
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  // Rate limiting: 10 requisições por minuto
  rateLimit(10)(req, res, () => {});

  if (res.writableEnded) {
    return;
  }

  // Verificar se serviço está habilitado
  if (process.env.MERCADOPAGO_ENABLED !== "true") {
    log("warn", "Tentativa de acesso a serviço desabilitado");
    res.status(503).json({ error: "Pagamento indisponível no momento." });
    return;
  }

  // Verificar se Admin SDK está configurado
  if (!isAdminSdkConfigured()) {
    log("error", "Admin SDK não configurado");
    res.status(503).json({ error: "Serviço indisponível." });
    return;
  }

  // Autenticar usuário
  const user = await authenticate(req);
  if (!user) {
    log("warn", "Tentativa de acesso não autorizado");
    res.status(401).json({ error: "Não autorizado." });
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
    log("warn", "Payload inválido", { body });
    res.status(400).json({ error: "orderId e paymentMethod são obrigatórios." });
    return;
  }

  // Processar pagamento
  log("info", "Iniciando processamento de pagamento", {
    orderId,
    paymentMethod,
    userId: user.userId,
  });

  const result = await processPayment({
    orderId,
    paymentMethod,
    userId: user.userId,
  });

  if (!result.success) {
    log("error", "Falha ao processar pagamento", { orderId, error: result.error });
    res.status(400).json({ error: result.error });
    return;
  }

  log("info", "Pagamento processado com sucesso", {
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
    expirationDate: result.expirationDate,
  });
}
