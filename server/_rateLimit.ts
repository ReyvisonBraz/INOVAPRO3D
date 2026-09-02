// Limitador de taxa compartilhado entre instâncias, para o Express
// (server.ts) e para as funções serverless da Vercel (api/).
//
// O que este módulo substitui: cada rota limitada mantinha seu próprio `Map`
// em memória do processo. Em Express de instância única isso funciona; em
// runtime serverless, cada invocação pode cair numa instância fria diferente
// e o contador começa do zero — o teto configurado deixa de ser o teto real,
// vira `máximo × número de instâncias`. Este módulo grava o contador no
// Firestore dentro de uma transação, então duas requisições simultâneas em
// instâncias diferentes são serializadas pelo próprio banco.
//
// A decisão (janela fixa, teto inclusivo) é pura e mora em
// `_rateLimitDecision.ts`; aqui só a leitura/escrita.
//
// Sem regra em firestore.rules de propósito — mesmo padrão de
// `paymentAttempts`/`paymentEvents`/`cspReports`: só o Admin SDK toca esta
// coleção (que ignora as regras), e o default-deny do arquivo já cobre o
// cliente. Os documentos são pequenos e de vida curta (a janela expira em
// 1 minuto), mas não se autodestroem — vale configurar uma política de TTL
// no campo `resetAt` (console do Firebase ou `gcloud firestore fields
// ttl-policies create`) para não acumular indefinidamente; não é algo que dê
// para fazer por código.

import { createHash } from "node:crypto";
import { getAdminDb, isAdminSdkConfigured } from "./firebaseAdmin.js";
import { decideRateLimit, type RateLimitBucket } from "./_rateLimitDecision.js";
import { logEvent } from "./_observability/logger.js";
import type { RequestContext } from "./_observability/context.js";

/** Estrutura mínima comum a `express.Request` e `VercelRequest`. */
export interface RateLimitRequest {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}

/**
 * IP do cliente a partir de `X-Forwarded-For` (primeira entrada da cadeia),
 * com fallback ao socket. Não depende de `req.ip`/`trust proxy` do Express,
 * que este projeto não configura.
 */
export function clientIp(req: RateLimitRequest): string {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
  return (first || req.socket?.remoteAddress || "unknown").slice(0, 80);
}

/**
 * IDs de documento do Firestore têm um alfabeto restrito e o IP pode conter
 * `:` (IPv6) ou vir truncado com caracteres imprevisíveis; hash evita validar
 * isso na mão. `bucket` distingue rotas (`"report-error"`, `"csp-report"`...)
 * dentro da mesma coleção.
 */
function bucketId(bucket: string, identifier: string): string {
  return createHash("sha256").update(`${bucket}:${identifier}`).digest("hex");
}

export interface RateLimitOutcome {
  allowed: boolean;
  retryAfterSeconds: number;
}

function toBucket(data: FirebaseFirestore.DocumentData | undefined): RateLimitBucket | null {
  if (!data || typeof data.count !== "number") return null;
  const resetAt = data.resetAt as { toDate?: () => Date } | undefined;
  if (typeof resetAt?.toDate !== "function") return null;
  return { count: data.count, resetAt: resetAt.toDate() };
}

/**
 * Verifica e consome uma unidade do limite. Falha ABERTO em erro de
 * infraestrutura (Firestore indisponível, Admin SDK não configurado): um
 * limitador de taxa que falha fechado transforma uma instabilidade do banco
 * em indisponibilidade das rotas que ele protege — inclusive pagamento e
 * criação de pedido — o que é pior do que temporariamente perder o teto.
 * Diferente da verificação de identidade (`verifyToken` em server.ts), que
 * falha fechado de propósito: ali o custo do erro é autenticação pulada,
 * categoricamente mais grave que uma rajada não contida.
 *
 * Sem `FIREBASE_CLIENT_EMAIL`/`FIREBASE_PRIVATE_KEY` (dev local sem
 * `.env.local`, preview sem segredo configurado), `getAdminDb()` ainda
 * devolve um client — só que sem credenciais explícitas ele tenta descobrir
 * Application Default Credentials pela rede antes de desistir, e isso é
 * lento (segundos, não milissegundos). Checar `isAdminSdkConfigured()`
 * primeiro evita pagar essa latência em toda requisição sempre que o SDK
 * simplesmente não está configurado — a mesma checagem que já guarda as
 * rotas de pagamento e pedido antes de qualquer leitura ao Firestore.
 */
export async function checkRateLimit(
  bucket: string,
  identifier: string,
  maxPerMinute: number,
  context?: RequestContext,
): Promise<RateLimitOutcome> {
  if (!isAdminSdkConfigured()) {
    return { allowed: true, retryAfterSeconds: 0 };
  }

  try {
    const db = getAdminDb();
    const ref = db.collection("rateLimits").doc(bucketId(bucket, identifier));
    const now = new Date();

    return await db.runTransaction(async (tx) => {
      const snapshot = await tx.get(ref);
      const decision = decideRateLimit(toBucket(snapshot.data()), now, maxPerMinute);
      tx.set(ref, {
        count: decision.nextBucket.count,
        resetAt: decision.nextBucket.resetAt,
        bucket,
        updatedAt: now,
      });
      return { allowed: decision.allowed, retryAfterSeconds: decision.retryAfterSeconds };
    });
  } catch (error) {
    // Aqui o SDK está configurado e a falha é uma surpresa real (outage,
    // rede) — vale o log de aviso, ao contrário do caso "não configurado"
    // acima, que é estado esperado em dev/preview.
    if (context) {
      logEvent("warn", context, "Rate limit indisponível — requisição liberada por padrão", {
        bucket,
        error,
      });
    } else {
      console.warn(`[rate-limit] "${bucket}" indisponível, liberando por padrão:`, error);
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }
}
