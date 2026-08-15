import type { PaymentStatus } from "./contracts";

/**
 * Duração comercial do Pix. O Mercado Pago aceita de 30 minutos a 30 dias;
 * adotamos o mínimo do provedor para não criar dois relógios — um visual e
 * outro real — na experiência do cliente.
 */
export const DEFAULT_PIX_EXPIRATION_MINUTES = 30;
export const MIN_PIX_EXPIRATION_MINUTES = 30;
export const MAX_PIX_EXPIRATION_MINUTES = 30 * 24 * 60;

/**
 * A duração é configurável por ambiente, mas nunca fora dos limites aceitos
 * pelo provedor: um valor inválido cairia como erro na criação da cobrança.
 */
export function resolvePixExpirationMinutes(raw?: string | null): number {
  const parsed = Number(raw);
  if (raw === undefined || raw === null || raw === "" || !Number.isFinite(parsed)) {
    return DEFAULT_PIX_EXPIRATION_MINUTES;
  }
  return Math.min(
    MAX_PIX_EXPIRATION_MINUTES,
    Math.max(MIN_PIX_EXPIRATION_MINUTES, Math.round(parsed)),
  );
}

export function computePixExpiresAt(now: Date, minutes: number): Date {
  return new Date(now.getTime() + minutes * 60_000);
}

/** Identificadores versionados: cada tentativa do pedido é um registro próprio. */
export function buildAttemptId(orderId: string, attemptNumber: number): string {
  return `${orderId}-pix-v${attemptNumber}`;
}

/**
 * A chave é determinística para que duas requisições simultâneas da mesma
 * tentativa representem uma única cobrança no provedor, e versionada para que
 * uma tentativa nova nunca recupere a cobrança vencida anterior.
 */
export function buildIdempotencyKey(orderId: string, attemptNumber: number): string {
  return `order:${orderId}:pix:v${attemptNumber}`;
}

/** Tentativa já gravada no banco, reduzida ao necessário para decidir. */
export interface StoredPaymentAttempt {
  attemptNumber: number;
  status: PaymentStatus;
  expiresAt?: Date | null;
  paymentId?: string;
  pixCode?: string;
}

export interface AttemptDecisionInput {
  orderId: string;
  currentAttempt?: StoredPaymentAttempt | null;
  now: Date;
  expirationMinutes: number;
}

export type PaymentAttemptDecision =
  /** A cobrança vigente já tem QR Code: devolvemos o que está gravado. */
  | { action: "reuse_stored"; attemptNumber: number; attemptId: string; idempotencyKey: string }
  /** A tentativa foi reservada mas não concluída: repetimos a chamada com a mesma chave. */
  | {
      action: "resume_provider";
      attemptNumber: number;
      attemptId: string;
      idempotencyKey: string;
      expiresAt: Date;
    }
  /** Não há cobrança aproveitável: uma nova tentativa é reservada. */
  | {
      action: "create";
      attemptNumber: number;
      attemptId: string;
      idempotencyKey: string;
      expiresAt: Date;
    };

function isReusable(attempt: StoredPaymentAttempt, now: Date): boolean {
  if (attempt.status !== "PENDING" && attempt.status !== "PROCESSING") return false;
  // Sem expiração registrada (cobranças anteriores à política) tratamos como
  // vigente: quem decide o vencimento de fato é o provedor.
  if (!attempt.expiresAt) return true;
  return attempt.expiresAt.getTime() > now.getTime();
}

/**
 * Decide entre reaproveitar a cobrança vigente e abrir uma tentativa nova.
 * Um clique repetido dentro da mesma tentativa nunca duplica cobrança; um Pix
 * vencido sempre gera uma tentativa auditável com número seguinte.
 */
export function decidePaymentAttempt({
  orderId,
  currentAttempt,
  now,
  expirationMinutes,
}: AttemptDecisionInput): PaymentAttemptDecision {
  if (currentAttempt && isReusable(currentAttempt, now)) {
    const attemptNumber = currentAttempt.attemptNumber;
    const identifiers = {
      attemptNumber,
      attemptId: buildAttemptId(orderId, attemptNumber),
      idempotencyKey: buildIdempotencyKey(orderId, attemptNumber),
    };
    if (currentAttempt.paymentId && currentAttempt.pixCode) {
      return { action: "reuse_stored", ...identifiers };
    }
    return {
      action: "resume_provider",
      ...identifiers,
      expiresAt: currentAttempt.expiresAt ?? computePixExpiresAt(now, expirationMinutes),
    };
  }

  const attemptNumber = (currentAttempt?.attemptNumber ?? 0) + 1;
  return {
    action: "create",
    attemptNumber,
    attemptId: buildAttemptId(orderId, attemptNumber),
    idempotencyKey: buildIdempotencyKey(orderId, attemptNumber),
    expiresAt: computePixExpiresAt(now, expirationMinutes),
  };
}
