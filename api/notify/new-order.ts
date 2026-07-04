import { getAdminAuth, isAdminSdkConfigured } from "../firebaseAdmin.js";
import { sendEmail } from "../_email.js";
import { orderConfirmationEmail } from "../_emailTemplates.js";

interface NewOrderPayload {
  orderId?: string;
  customerName?: string;
  customerEmail?: string;
  total?: number;
  itemCount?: number;
  paymentMethod?: string;
}

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

function brl(v?: number): string {
  return (v ?? 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  // Verifica autenticação via Bearer token do Firebase
  const authHeader = req.headers.authorization as string | undefined;
  if (isAdminSdkConfigured() && authHeader?.startsWith("Bearer ")) {
    try {
      await getAdminAuth().verifyIdToken(authHeader.slice(7));
    } catch {
      res.status(401).json({ error: "Token inválido." });
      return;
    }
  }

  const body = req.body as NewOrderPayload;
  const orderId = typeof body.orderId === "string" ? body.orderId : "?";
  const customerName = typeof body.customerName === "string" ? body.customerName : "";
  const customerEmail = typeof body.customerEmail === "string" ? body.customerEmail : "";
  const total = typeof body.total === "number" ? body.total : 0;
  const itemCount = typeof body.itemCount === "number" ? body.itemCount : 1;
  const paymentMethod = typeof body.paymentMethod === "string" ? body.paymentMethod : "manual";

  const shortId = orderId.slice(0, 10).toUpperCase();
  const appUrl = process.env.APP_URL || "https://www.inovapro3d.com.br";

  // Notificação Telegram para o admin
  const telegramText =
    `🛒 <b>Novo pedido recebido!</b>\n` +
    `🔑 <code>${shortId}</code>\n` +
    `👤 ${customerName || customerEmail || "Cliente anônimo"}\n` +
    `📦 ${itemCount} item(ns)\n` +
    `💰 ${brl(total)}\n` +
    `💳 ${paymentMethod}\n` +
    `🔗 <a href="${appUrl}/admin">Ver painel</a>`;

  await notifyTelegram(telegramText);

  // E-mail de confirmação para o cliente
  if (customerEmail) {
    const emailData = orderConfirmationEmail({
      orderId,
      customerName,
      total,
      paymentMethod,
      appUrl,
    });
    await sendEmail({
      to: customerEmail,
      toName: customerName,
      subject: emailData.subject,
      html: emailData.html,
      text: emailData.text,
    });
  }

  res.status(200).json({ ok: true });
}
