// Notificação de novo pedido (Telegram + e-mail de confirmação).
//
// Autenticação é OBRIGATÓRIA e o chamador precisa ser o dono do pedido. O corpo
// da requisição carrega apenas `orderId`: identidade sai do token verificado e
// valores saem do documento gravado pelo servidor. Antes, a verificação do token só rodava
// quando o header estava presente — omitir o header pulava a checagem inteira e
// transformava a rota em relay de e-mail aberto na internet.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAdminDb } from "../../server/firebaseAdmin.js";
import { sendEmail } from "../../server/_email.js";
import { orderConfirmationEmail } from "../../server/_emailTemplates.js";
import {
  buildOrderTelegramMessage,
  loadOrderForNotification,
  resolveTrustedIdentity,
} from "../../server/_orderNotification.js";
import { applyLegacyGuards } from "../../server/_middleware/vercelGuards.js";

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
  // O espelho Express (server.ts) sempre teve `rateLimit(5)` nesta rota; esta
  // função — o runtime de produção na Vercel — nunca teve limite algum.
  // Sem Admin SDK não há como verificar o token nem ler o pedido, e o guarda
  // recusa explicitamente: degradar para "sem autenticação" seria abrir a rota.
  const decodedToken = await applyLegacyGuards(req, res, {
    methods: ["POST"],
    rateLimit: { bucket: "notify-new-order", maxPerMinute: 5 },
    auth: "user",
  });
  if (!decodedToken) return;

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
