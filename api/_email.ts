// Envio de e-mail transacional via SendPulse (REST API).
// Credenciais ficam em variáveis de ambiente (servidor). Sem elas, vira no-op
// silencioso — nada quebra.
//
//   SENDPULSE_API_USER_ID  → SendPulse → Configurações → API → ID
//   SENDPULSE_API_SECRET   → mesma tela → Secret
//   EMAIL_FROM             → remetente verificado (ex: vendas@inovapro3d.com.br)
//   EMAIL_FROM_NAME        → nome exibido (ex: INOVAPRO3D)

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string | null> {
  const id = process.env.SENDPULSE_API_USER_ID;
  const secret = process.env.SENDPULSE_API_SECRET;
  if (!id || !secret) return null;

  if (cachedToken && Date.now() < cachedToken.expiresAt) return cachedToken.token;

  try {
    const res = await fetch("https://api.sendpulse.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ grant_type: "client_credentials", client_id: id, client_secret: secret }),
    });
    if (!res.ok) {
      console.error("[email] SendPulse auth falhou:", res.status);
      return null;
    }
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + ((data.expires_in ?? 3600) - 60) * 1000,
    };
    return cachedToken.token;
  } catch (err) {
    console.error("[email] SendPulse auth erro:", err);
    return null;
  }
}

export interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
}

/** Envia um e-mail. Retorna true se aceito pela SendPulse. Nunca lança. */
export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  const token = await getToken();
  if (!token) return false; // não configurado → no-op

  const fromEmail = process.env.EMAIL_FROM || "vendas@inovapro3d.com.br";
  const fromName = process.env.EMAIL_FROM_NAME || "INOVAPRO3D";

  try {
    const res = await fetch("https://api.sendpulse.com/smtp/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        email: {
          subject: input.subject,
          from: { name: fromName, email: fromEmail },
          to: [{ name: input.toName || input.to, email: input.to }],
          // SendPulse espera o HTML em base64 neste endpoint.
          html: Buffer.from(input.html, "utf-8").toString("base64"),
          text: input.text || "",
        },
      }),
    });
    if (!res.ok) {
      console.error("[email] SendPulse send falhou:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] SendPulse send erro:", err);
    return false;
  }
}
