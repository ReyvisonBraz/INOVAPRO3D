import { buildErrorReport } from "./_reportError.js";
import { getAdminDb, isAdminSdkConfigured } from "./firebaseAdmin.js";

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
    /* nunca deixar a notificação quebrar o relato */
  }
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }
  try {
    const { valid, data, telegramText } = buildErrorReport(req.body || {});
    if (!valid) {
      res.status(400).json({ id: null, error: "Relato vazio." });
      return;
    }
    let id: string | null = null;
    if (isAdminSdkConfigured()) {
      try {
        const ref = await getAdminDb().collection("errorReports").add(data);
        id = ref.id;
      } catch (err) {
        console.error("[report-error] falha ao gravar no Firestore:", err);
      }
    }
    await notifyTelegram(telegramText + (id ? `🔑 <code>${id}</code>` : ""));
    res.status(200).json({ id });
  } catch {
    // Relato de erro nunca deve falhar de forma barulhenta.
    res.status(200).json({ id: null });
  }
}
