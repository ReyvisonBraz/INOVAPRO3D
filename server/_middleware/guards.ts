// ============================================================================
// GUARDAS COMPARTILHADOS — I/O em volta da decisão pura de `_guardDecision.ts`
// ----------------------------------------------------------------------------
// Substitui as 7 cópias manuais de verificação de Bearer token que existiam
// espalhadas entre `server.ts` e `api/*.ts`, mais o preâmbulo de rate-limit e
// checagem de Admin SDK que cada rota repetia por conta própria.
//
// Cada runtime chama `runGuards` e traduz o `GuardDecision` para o seu
// próprio formato de resposta — este módulo não responde a `req`/`res`
// diretamente, então o corpo de erro que cada runtime já expõe ao cliente
// não muda. Os adaptadores ficam em `vercelGuards.ts` e `expressGuards.ts`.
// ============================================================================

import { getAdminAuth, getAdminDb, isAdminSdkConfigured } from "../firebaseAdmin.js";
import { checkRateLimit, clientIp, type RateLimitRequest } from "../_rateLimit.js";
import type { RequestContext } from "../_observability/context.js";
import {
  decideGuards,
  type AuthLevel,
  type GuardDecision,
  type Identity,
} from "./_guardDecision.js";

export type { AuthLevel, GuardDecision, GuardReason, Identity } from "./_guardDecision.js";

export interface GuardRequest extends RateLimitRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
}

export interface GuardOptions {
  /** `undefined` = a rota aceita qualquer método. */
  methods?: string[];
  /** `undefined` = sem limite de taxa. O `bucket` distingue rotas na mesma coleção. */
  rateLimit?: { bucket: string; maxPerMinute: number };
  /** Padrão "none" — nenhuma verificação de identidade. */
  auth?: AuthLevel;
  /**
   * Exige o Admin SDK configurado antes de prosseguir. Implícito quando
   * `auth` é "user"/"admin" (não há como verificar token sem ele) — só
   * precisa ser passado explicitamente por rotas sem auth que ainda assim
   * dependem do SDK (ex.: leitura de dados via Admin).
   */
  requireAdminSdk?: boolean;
}

/**
 * Decodifica o Bearer token. `null` em qualquer falha — header ausente,
 * token inválido ou expirado — nunca uma string vazia ou sentinela: mesmo
 * cuidado que o `verifyToken` original documentava (falha sempre fechado).
 */
async function verifyBearerIdentity(req: GuardRequest): Promise<Identity | null> {
  const header = req.headers.authorization;
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith("Bearer ")) return null;
  try {
    const decoded = await getAdminAuth().verifyIdToken(value.slice(7));
    return {
      uid: decoded.uid,
      email: decoded.email,
      emailVerified: decoded.email_verified === true,
      name: decoded.name,
    };
  } catch {
    return null;
  }
}

async function isAdminUser(uid: string): Promise<boolean> {
  try {
    const user = await getAdminDb().collection("users").doc(uid).get();
    return user.data()?.role === "ADMIN";
  } catch {
    return false;
  }
}

/**
 * Roda os guardas na ordem método → taxa → Admin SDK → identidade → papel e
 * devolve a decisão pronta para cada adaptador traduzir. Ver
 * `_guardDecision.ts` para por que essa ordem e por que rate-limit e auth têm
 * polaridades de falha diferentes que não podem se misturar.
 */
export async function runGuards(
  req: GuardRequest,
  options: GuardOptions,
  context?: RequestContext,
): Promise<GuardDecision> {
  const auth = options.auth ?? "none";
  const needsAdminSdk = options.requireAdminSdk ?? auth !== "none";

  const rateLimitOutcome = options.rateLimit
    ? await checkRateLimit(
        options.rateLimit.bucket,
        clientIp(req),
        options.rateLimit.maxPerMinute,
        context,
      )
    : undefined;

  // Sem o SDK não há como verificar token nenhum — resolve a identidade só
  // quando a checagem de configuração (feita dentro de `decideGuards`) tem
  // chance de passar, para não gastar uma chamada de rede à toa.
  const adminSdkConfigured = needsAdminSdk ? isAdminSdkConfigured() : undefined;
  const canAuthenticate = auth !== "none" && adminSdkConfigured !== false;
  const identity = canAuthenticate ? await verifyBearerIdentity(req) : null;
  const isAdmin = auth === "admin" && identity ? await isAdminUser(identity.uid) : undefined;

  return decideGuards({
    method: req.method ?? "GET",
    allowedMethods: options.methods,
    rateLimit: rateLimitOutcome,
    adminSdkConfigured,
    auth,
    identity,
    isAdmin,
  });
}
