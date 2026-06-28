// Lógica pura de relato de erro — sem dependências (Firestore/Telegram ficam
// em quem chama: a função serverless da Vercel e o server.ts local).
// Assim evitamos problemas de extensão de import entre os dois ambientes.

const str = (v: unknown, max: number): string =>
  (typeof v === "string" ? v : v == null ? "" : String(v)).slice(0, max);

export interface ErrorReportInput {
  message?: unknown;
  stack?: unknown;
  where?: unknown;
  route?: unknown;
  userAgent?: unknown;
  userEmail?: unknown;
  userId?: unknown;
  userNote?: unknown;
  userReported?: unknown;
  appVersion?: unknown;
}

export interface BuiltErrorReport {
  valid: boolean;
  data: Record<string, unknown>;
  telegramText: string;
}

/** Sanitiza o payload do cliente e monta o documento + a mensagem do Telegram. */
export function buildErrorReport(body: ErrorReportInput): BuiltErrorReport {
  const data = {
    message: str(body?.message, 1000),
    stack: str(body?.stack, 4000),
    where: str(body?.where, 120) || "desconhecido",
    route: str(body?.route, 300),
    userAgent: str(body?.userAgent, 400),
    userEmail: body?.userEmail ? str(body.userEmail, 200) : null,
    userId: body?.userId ? str(body.userId, 128) : null,
    userNote: body?.userNote ? str(body.userNote, 1000) : null,
    userReported: !!body?.userReported,
    appVersion: str(body?.appVersion, 40),
    createdAt: new Date(),
    resolved: false,
  };

  const valid = !!(data.message || data.userNote);

  const tag = data.userReported
    ? "🙋 <b>Erro reportado por um usuário</b>"
    : "🐞 <b>Erro capturado automaticamente</b>";

  const telegramText =
    `${tag} — INOVAPRO3D\n\n` +
    `📍 Onde: ${data.where}\n` +
    `🧭 Rota: ${data.route || "—"}\n` +
    `💬 ${data.message || "(sem mensagem)"}\n` +
    (data.userNote ? `📝 Relato: ${data.userNote}\n` : "") +
    (data.userEmail ? `👤 ${data.userEmail}\n` : "") +
    (data.appVersion ? `🏷️ ${data.appVersion}\n` : "");

  return { valid, data, telegramText };
}
