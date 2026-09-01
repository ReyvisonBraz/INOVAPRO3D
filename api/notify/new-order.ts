// Notificação de novo pedido (Telegram + e-mail de confirmação).
//
// Autenticação é OBRIGATÓRIA e o chamador precisa ser o dono do pedido. O corpo
// da requisição carrega apenas `orderId`: identidade sai do token verificado e
// valores saem do documento gravado pelo servidor. Antes, a verificação do token só rodava
// quando o header estava presente — omitir o header pulava a checagem inteira e
// transformava a rota em relay de e-mail aberto na internet.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminAuth, getAdminDb, isAdminSdkConfigured } from "../../server/firebaseAdmin.js";
import { sendEmail } from "../../server/_email.js";
import { orderConfirmationEmail } from "../../server/_emailTemplates.js";
import {
  buildOrderTelegramMessage,
  loadOrderForNotification,
  resolveTrustedIdentity,
} from "../../server/_orderNotification.js";

async function notifyTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    });
  } catch {
    /* nunca deixar notificação quebrar o fluxo */
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  // Sem Admin SDK não há como verificar o token nem ler o pedido. Recusa
  // explícita: degradar para "sem autenticação" seria abrir a rota.
  if (!isAdminSdkConfigured()) {
    res.status(503).json({ error: "Serviço indisponível." });
    return;
  }

  const authHeader = typeof req.headers.authorization === "string" ? req.headers.authorization : "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Não autorizado." });
    return;
  }

  let decodedToken: { uid: string; email?: string; emailVerified?: boolean; name?: string };
  try {
    const decoded = await getAdminAuth().verifyIdToken(authHeader.slice(7));
    decodedToken = {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified === true,
      name: decoded.name,
    };
  } catch {
    res.status(401).json({ error: "Token inválido." });
    return;
  }

  const adminDb = getAdminDb();
  const identity = await resolveTrustedIdentity(adminDb, decodedToken.uid, decodedToken);
  const lookup = await loadOrderForNotification(
    adminDb,
    (req.body as { orderId?: unknown } | undefined)?.orderId,
    { uid: decodedToken.uid, ...identity },
  );
  if (!lookup.ok) {
    res.status(lookup.status).json({ error: lookup.error });
    return;
  }
  const order = lookup.data;

  const appUrl = process.env.APP_URL || "https://www.inovapro3d.com.br";
  await notifyTelegram(buildOrderTelegramMessage(order, appUrl));

  if (order.customerEmail) {
    const emailData = orderConfirmationEmail({
      orderId: order.orderId,
      customerName: order.customerName,
      total: order.total,
      paymentMethod: order.paymentMethod,
      appUrl,
    });
    await sendEmail({
      to: order.customerEmail,
      toName: order.customerName,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });
  }

  res.status(200).json({ ok: true });
}
