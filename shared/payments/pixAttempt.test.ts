import { describe, expect, it } from "vitest";
import {
  DEFAULT_PIX_EXPIRATION_MINUTES,
  buildAttemptId,
  buildIdempotencyKey,
  computePixExpiresAt,
  decidePaymentAttempt,
  resolvePixExpirationMinutes,
  type StoredPaymentAttempt,
} from "./pixAttempt";

const now = new Date("2026-08-08T12:00:00.000Z");
const orderId = "ORDER-1";

function decide(currentAttempt?: StoredPaymentAttempt | null) {
  return decidePaymentAttempt({
    orderId,
    currentAttempt,
    now,
    expirationMinutes: DEFAULT_PIX_EXPIRATION_MINUTES,
  });
}

const pending: StoredPaymentAttempt = {
  attemptNumber: 1,
  status: "PENDING",
  expiresAt: new Date("2026-08-08T12:20:00.000Z"),
  paymentId: "PAY-1",
  pixCode: "000201...",
};

describe("resolvePixExpirationMinutes", () => {
  it("usa 30 minutos quando não há configuração", () => {
    expect(resolvePixExpirationMinutes(undefined)).toBe(30);
    expect(resolvePixExpirationMinutes("")).toBe(30);
    expect(resolvePixExpirationMinutes("texto")).toBe(30);
  });

  it("respeita uma configuração válida", () => {
    expect(resolvePixExpirationMinutes("120")).toBe(120);
  });

  it("nunca sai dos limites aceitos pelo provedor", () => {
    expect(resolvePixExpirationMinutes("5")).toBe(30);
    expect(resolvePixExpirationMinutes("999999")).toBe(30 * 24 * 60);
  });
});

describe("computePixExpiresAt", () => {
  it("soma a duração ao horário do servidor", () => {
    expect(computePixExpiresAt(now, 30)).toEqual(new Date("2026-08-08T12:30:00.000Z"));
  });
});

describe("decidePaymentAttempt", () => {
  it("abre a primeira tentativa quando o pedido nunca foi cobrado", () => {
    const decision = decide(null);
    expect(decision).toMatchObject({
      action: "create",
      attemptNumber: 1,
      attemptId: buildAttemptId(orderId, 1),
      idempotencyKey: buildIdempotencyKey(orderId, 1),
      expiresAt: new Date("2026-08-08T12:30:00.000Z"),
    });
  });

  it("reaproveita a cobrança vigente em vez de criar outra", () => {
    const decision = decide(pending);
    expect(decision).toMatchObject({
      action: "reuse_stored",
      attemptNumber: 1,
      idempotencyKey: buildIdempotencyKey(orderId, 1),
    });
  });

  it("repete a chamada com a mesma chave quando a tentativa ficou pela metade", () => {
    const decision = decide({ ...pending, paymentId: undefined, pixCode: undefined });
    expect(decision).toMatchObject({
      action: "resume_provider",
      attemptNumber: 1,
      idempotencyKey: buildIdempotencyKey(orderId, 1),
    });
  });

  it("abre a tentativa seguinte quando o Pix vence", () => {
    const decision = decide({ ...pending, expiresAt: new Date("2026-08-08T11:59:59.000Z") });
    expect(decision).toMatchObject({
      action: "create",
      attemptNumber: 2,
      attemptId: buildAttemptId(orderId, 2),
      idempotencyKey: buildIdempotencyKey(orderId, 2),
    });
  });

  it("abre a tentativa seguinte após recusa, cancelamento ou expiração", () => {
    for (const status of ["EXPIRED", "REJECTED", "CANCELED"] as const) {
      expect(decide({ ...pending, status })).toMatchObject({
        action: "create",
        attemptNumber: 2,
      });
    }
  });

  it("não devolve como vigente uma cobrança já aprovada", () => {
    // Pagar de novo é barrado antes, no serviço; aqui só garantimos que a
    // cobrança aprovada nunca é reaproveitada como se estivesse pendente.
    expect(decide({ ...pending, status: "APPROVED" })).toMatchObject({ action: "create" });
  });

  it("trata cobrança antiga sem expiração registrada como vigente", () => {
    const decision = decide({ ...pending, expiresAt: null });
    expect(decision.action).toBe("reuse_stored");
  });

  it("mantém a numeração crescente e auditável", () => {
    const decision = decide({ ...pending, attemptNumber: 4, status: "EXPIRED" });
    expect(decision).toMatchObject({
      action: "create",
      attemptNumber: 5,
      attemptId: `${orderId}-pix-v5`,
      idempotencyKey: `order:${orderId}:pix:v5`,
    });
  });
});
