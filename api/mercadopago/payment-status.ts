import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminAuth, getAdminDb, isAdminSdkConfigured } from "../firebaseAdmin.js";

// Log estruturado para endpoint de status
function log(level: "info" | "warn" | "error", message: string, data?: Record<string, unknown>) {
  const maskedData = data ? maskSensitiveData(data) : undefined;
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      service: "payment-status-endpoint",
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

// Rate limiting para status (30 requisições por minuto)
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
      res.status(429).json({ error: "Muitas requisições." });
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
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  // Rate limiting: 30 requisições por minuto
  rateLimit(30)(req, res, () => {});

  if (res.writableEnded) {
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

  // Validar parâmetros
  const orderId = req.query.orderId as string;
  if (!orderId) {
    log("warn", "Parâmetro orderId não fornecido");
    res.status(400).json({ error: "orderId é obrigatório." });
    return;
  }

  // Buscar pedido
  const adminDb = getAdminDb();
  const orderDoc = await adminDb.collection("orders").doc(orderId).get();

  if (!orderDoc.exists) {
    log("warn", "Pedido não encontrado", { orderId });
    res.status(404).json({ error: "Pedido não encontrado." });
    return;
  }

  const order = orderDoc.data()!;

  // Verificar propriedade do pedido
  if (order.userId !== user.userId) {
    log("warn", "Usuário não tem permissão para consultar este pedido", {
      orderId,
      userId: user.userId,
    });
    res.status(403).json({ error: "Você não tem permissão para consultar este pedido." });
    return;
  }

  // Retornar status do pagamento
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
}
