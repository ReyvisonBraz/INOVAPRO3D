import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAdminSdkConfigured } from "../firebaseAdmin.js";
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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }
  if (!isAdminSdkConfigured()) {
    res.status(503).json({ error: "Serviço indisponível." });
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
    res.status(200).json({ received: true, outcome: "ignored" });
    return;
  }

  const validation = validateWebhookSignature({
    signature: firstHeader(req.headers["x-signature"]),
    requestId: firstHeader(req.headers["x-request-id"]),
    dataId: paymentId,
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
  });
  if (!validation.valid) {
    console.warn("[mercadopago-webhook] Notificação rejeitada", { reason: validation.reason });
    res.status(401).json({ error: "Assinatura inválida." });
    return;
  }

  try {
    const outcome = await processPaymentWebhook({
      paymentId,
      action: payload.action,
      type: payload.type,
    });
    res.status(200).json({ received: true, outcome });
  } catch (error) {
    console.error("[mercadopago-webhook] Falha ao processar notificação", {
      paymentId,
      error: error instanceof Error ? error.message : "Erro desconhecido",
    });
    res.status(500).json({ error: "Erro ao processar webhook." });
  }
}
