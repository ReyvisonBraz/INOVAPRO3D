// ============================================================================
// DECISÃO PURA DOS GUARDAS DE ROTA
// ----------------------------------------------------------------------------
// Mesma separação que `_rateLimitDecision.ts` faz para o limitador e
// `mercadopago/_webhookDecision.ts` faz para o pagamento: a regra fica pura e
// testável sem emulador; o I/O (Firestore, Firebase Auth) mora em `guards.ts`.
//
// O que este módulo existe para garantir é a ORDEM e, principalmente, que a
// assimetria de falha entre os guardas sobreviva à unificação:
//
//   - `checkRateLimit` falha ABERTO de propósito (ver `_rateLimit.ts`): um
//     limitador que derruba as rotas quando o Firestore oscila troca uma
//     rajada não contida por indisponibilidade de pagamento e pedido.
//   - A verificação de identidade falha FECHADO: sem token válido, `identity`
//     chega `null` e a decisão é negar. Não existe caminho em que uma falha
//     de infraestrutura do limitador produza uma requisição autenticada.
//
// Por isso `rateLimit.allowed === true` nunca é lido como "já autorizado":
// cada guarda é avaliado no seu próprio termo, em sequência.
// ============================================================================

/** Identidade extraída do Bearer token. Os claims são os mesmos que o
 *  `verifyTokenWithClaims` do Express já devolvia. */
export interface Identity {
  uid: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
}

/** Nível de autenticação exigido pela rota. */
export type AuthLevel = "none" | "user" | "admin";

/**
 * Códigos reaproveitados de `shared/errors/catalog.ts` — os adaptadores os
 * convertem em `AppError` (Vercel) ou no corpo `{ error }` do Express.
 */
export type GuardReason =
  | "METHOD_NOT_ALLOWED"
  | "RATE_LIMITED"
  | "AUTH_REQUIRED"
  | "FORBIDDEN"
  | "SERVICE_CONFIGURATION_ERROR";

export type GuardDecision =
  | { ok: true; identity: Identity | null }
  | {
      ok: false;
      reason: GuardReason;
      /** Valor do header `Allow`, só em METHOD_NOT_ALLOWED. */
      allow?: string;
      /** Valor do header `Retry-After`, só em RATE_LIMITED. */
      retryAfterSeconds?: number;
    };

export interface GuardInputs {
  method: string;
  /** `undefined` = a rota aceita qualquer método. */
  allowedMethods?: string[];
  /** `undefined` = a rota não tem limite de taxa. */
  rateLimit?: { allowed: boolean; retryAfterSeconds: number };
  /** `undefined` = a rota funciona sem o Admin SDK. */
  adminSdkConfigured?: boolean;
  auth: AuthLevel;
  /** `null` quando o header falta ou o token é inválido/expirado. */
  identity: Identity | null;
  /** Só consultado quando `auth === "admin"`. */
  isAdmin?: boolean;
}

/**
 * Ordem: método → taxa → Admin SDK → identidade → papel.
 *
 * O limite de taxa vem antes da autenticação de propósito: verificar um token
 * é uma chamada de rede ao Firebase, então limitar primeiro é justamente o que
 * protege contra uma rajada de tokens inválidos. A checagem do Admin SDK vem
 * antes da identidade porque sem ele não há como verificar token nenhum — o
 * erro honesto ali é "serviço não configurado", não "não autorizado".
 */
export function decideGuards(inputs: GuardInputs): GuardDecision {
  if (inputs.allowedMethods && !inputs.allowedMethods.includes(inputs.method)) {
    return {
      ok: false,
      reason: "METHOD_NOT_ALLOWED",
      allow: inputs.allowedMethods.join(", "),
    };
  }

  if (inputs.rateLimit && !inputs.rateLimit.allowed) {
    return {
      ok: false,
      reason: "RATE_LIMITED",
      retryAfterSeconds: inputs.rateLimit.retryAfterSeconds || 60,
    };
  }

  if (inputs.adminSdkConfigured === false) {
    return { ok: false, reason: "SERVICE_CONFIGURATION_ERROR" };
  }

  if (inputs.auth === "none") {
    return { ok: true, identity: inputs.identity };
  }

  if (!inputs.identity) {
    return { ok: false, reason: "AUTH_REQUIRED" };
  }

  if (inputs.auth === "admin" && inputs.isAdmin !== true) {
    return { ok: false, reason: "FORBIDDEN" };
  }

  return { ok: true, identity: inputs.identity };
}
