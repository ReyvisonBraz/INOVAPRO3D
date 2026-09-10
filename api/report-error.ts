import type { VercelRequest, VercelResponse } from "@vercel/node";
import { buildErrorReport } from "../server/_reportError.js";
import { getAdminDb, isAdminSdkConfigured } from "../server/firebaseAdmin.js";
import { applyLegacyGuards } from "../server/_middleware/vercelGuards.js";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // A rota é anônima por necessidade (erro acontece para visitante deslogado
  // também), e sem limite era possível gravar em `errorReports` e disparar o
  // Telegram operacional em laço, sem token nem header algum. Mesmo teto do
  // espelho em server.ts — o único lugar que já tinha essa proteção.
  const identity = await applyLegacyGuards(req, res, {
    methods: ["POST"],
    rateLimit: { bucket: "report-error", maxPerMinute: 20 },
  });
  if (identity === false) return;

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
