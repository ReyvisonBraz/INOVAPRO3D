// Decisão pura de limitação de taxa — janela fixa de 1 minuto.
//
// Separado da leitura/escrita do bucket (que mora em `_rateLimit.ts`, dentro
// de uma transação do Firestore) pelo mesmo motivo que `_webhookDecision.ts`
// separa a decisão do pagamento de `_webhookService.ts`: a regra de negócio
// fica testável sem precisar do emulador.

export interface RateLimitBucket {
  count: number;
  resetAt: Date;
}

export interface RateLimitDecision {
  allowed: boolean;
  /** Segundos até a janela atual expirar; 0 quando `allowed` é true. */
  retryAfterSeconds: number;
  /** Estado do bucket a persistir, independente do resultado. */
  nextBucket: RateLimitBucket;
}

const WINDOW_MS = 60_000;

/**
 * `stored` é o que está gravado no Firestore para esta chave (ou `null` na
 * primeira requisição). O limite é inclusivo: a requisição número
 * `maxPerMinute` ainda passa, a `maxPerMinute + 1` é a primeira negada —
 * mesmo comportamento que o `Map` em memória que este módulo substitui.
 */
export function decideRateLimit(
  stored: RateLimitBucket | null,
  now: Date,
  maxPerMinute: number,
): RateLimitDecision {
  const windowExpired = !stored || stored.resetAt.getTime() <= now.getTime();

  if (windowExpired) {
    return {
      allowed: true,
      retryAfterSeconds: 0,
      nextBucket: { count: 1, resetAt: new Date(now.getTime() + WINDOW_MS) },
    };
  }

  const count = stored.count + 1;
  const allowed = count <= maxPerMinute;
  return {
    allowed,
    retryAfterSeconds: allowed
      ? 0
      : Math.max(1, Math.ceil((stored.resetAt.getTime() - now.getTime()) / 1000)),
    nextBucket: { count, resetAt: stored.resetAt },
  };
}
