import { describe, expect, it } from "vitest";
import { decideRateLimit, type RateLimitBucket } from "./_rateLimitDecision";

const now = new Date("2026-09-02T12:00:00.000Z");

describe("decideRateLimit", () => {
  it("permite a primeira requisição (sem bucket armazenado) e inicia count=1", () => {
    const decision = decideRateLimit(null, now, 10);
    expect(decision.allowed).toBe(true);
    expect(decision.retryAfterSeconds).toBe(0);
    expect(decision.nextBucket).toEqual({
      count: 1,
      resetAt: new Date("2026-09-02T12:01:00.000Z"),
    });
  });

  it("permite e incrementa enquanto count fica abaixo do teto", () => {
    const stored: RateLimitBucket = { count: 3, resetAt: new Date("2026-09-02T12:00:30.000Z") };
    const decision = decideRateLimit(stored, now, 10);
    expect(decision.allowed).toBe(true);
    expect(decision.nextBucket.count).toBe(4);
    // resetAt da janela em curso não muda — só a próxima janela recalcula.
    expect(decision.nextBucket.resetAt).toEqual(stored.resetAt);
  });

  it("o teto é inclusivo: a requisição número maxPerMinute ainda passa", () => {
    const stored: RateLimitBucket = { count: 9, resetAt: new Date("2026-09-02T12:00:30.000Z") };
    const decision = decideRateLimit(stored, now, 10);
    expect(decision.allowed).toBe(true);
    expect(decision.nextBucket.count).toBe(10);
  });

  it("nega a partir de maxPerMinute + 1 e devolve retryAfterSeconds > 0", () => {
    const stored: RateLimitBucket = { count: 10, resetAt: new Date("2026-09-02T12:00:30.000Z") };
    const decision = decideRateLimit(stored, now, 10);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBe(30);
    // O bucket ainda é gravado com o count real — outra negação na mesma
    // janela vê o histórico, em vez de reiniciar a contagem por engano.
    expect(decision.nextBucket.count).toBe(11);
  });

  it("arredonda retryAfterSeconds para cima e nunca devolve zero numa negação", () => {
    const stored: RateLimitBucket = { count: 10, resetAt: new Date("2026-09-02T12:00:00.400Z") };
    const decision = decideRateLimit(stored, now, 10);
    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBe(1);
  });

  it("janela expirada reinicia a contagem mesmo que o bucket estivesse estourado", () => {
    const stored: RateLimitBucket = { count: 999, resetAt: new Date("2026-09-02T11:59:59.000Z") };
    const decision = decideRateLimit(stored, now, 10);
    expect(decision.allowed).toBe(true);
    expect(decision.nextBucket).toEqual({
      count: 1,
      resetAt: new Date("2026-09-02T12:01:00.000Z"),
    });
  });

  it("resetAt exatamente igual a `now` conta como expirado (comparação inclusiva)", () => {
    const stored: RateLimitBucket = { count: 5, resetAt: now };
    const decision = decideRateLimit(stored, now, 10);
    expect(decision.allowed).toBe(true);
    expect(decision.nextBucket.count).toBe(1);
  });
});
