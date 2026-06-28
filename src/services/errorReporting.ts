import { auth } from "./firebase";

// Versão do app — ajuda a saber em qual build o erro aconteceu.
const APP_VERSION = "INOVAPRO-OS v2.4.8";

// Erros que NÃO são bugs (artefatos de deploy, ruído de browser) — não relatamos
// automaticamente, mas ainda permitimos relato manual do usuário.
const IGNORED = [
  /dynamically imported module/i,
  /Importing a module script failed/i,
  /Failed to fetch dynamically/i,
  /ChunkLoadError/i,
  /ResizeObserver loop/i,
  /Load failed/i,
];

function isIgnorable(message: string): boolean {
  return IGNORED.some((re) => re.test(message));
}

// Anti-spam: não reenvia a mesma mensagem em janela curta.
const recentlySent = new Map<string, number>();

export interface ReportContext {
  /** Onde aconteceu (ex: "checkout", "react", "window.onerror"). */
  where?: string;
  /** Texto que o próprio usuário escreveu ao reportar. */
  userNote?: string;
}

/**
 * Relata um erro ao backend (Firestore + Telegram). Nunca lança exceção —
 * relatar erro jamais pode quebrar a aplicação. Retorna o protocolo (id) ou null.
 *
 * Use em qualquer `catch`:  `reportError(err, { where: "checkout" })`
 */
export async function reportError(error: unknown, ctx: ReportContext = {}): Promise<string | null> {
  try {
    const message = error instanceof Error ? error.message : String(error ?? "Erro desconhecido");
    const stack = error instanceof Error ? error.stack ?? "" : "";

    // Relato automático de erros ignoráveis é descartado; relato manual passa.
    if (!ctx.userNote && isIgnorable(message)) return null;

    if (!ctx.userNote) {
      const key = `${ctx.where ?? ""}:${message}`;
      const now = Date.now();
      const last = recentlySent.get(key) ?? 0;
      if (now - last < 15000) return null; // mesmo erro em <15s → ignora
      recentlySent.set(key, now);
    }

    const payload = {
      message,
      stack,
      where: ctx.where ?? "desconhecido",
      route: typeof location !== "undefined" ? location.pathname + location.search : "",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      userEmail: auth.currentUser?.email ?? null,
      userId: auth.currentUser?.uid ?? null,
      userNote: ctx.userNote ?? null,
      userReported: !!ctx.userNote,
      appVersion: APP_VERSION,
    };

    const res = await fetch("/api/report-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true, // tenta enviar mesmo se a página estiver fechando
    });
    if (!res.ok) return null;
    const data = (await res.json().catch(() => ({}))) as { id?: string | null };
    return data.id ?? null;
  } catch {
    return null;
  }
}

/** Captura global de erros não tratados (chame uma vez no boot). */
export function installGlobalErrorHandlers(): void {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (e) => {
    if (e.error) void reportError(e.error, { where: "window.onerror" });
  });

  window.addEventListener("unhandledrejection", (e) => {
    void reportError(e.reason, { where: "unhandledrejection" });
  });
}
