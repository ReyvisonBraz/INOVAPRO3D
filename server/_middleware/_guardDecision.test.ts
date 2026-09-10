import { describe, expect, it } from "vitest";
import { decideGuards, type GuardInputs, type Identity } from "./_guardDecision";

const identity: Identity = { uid: "user-1", email: "ana@example.com", emailVerified: true };

const baseInputs: GuardInputs = {
  method: "POST",
  allowedMethods: ["POST"],
  auth: "none",
  identity: null,
};

describe("decideGuards — ordem de precedência", () => {
  it("libera quando não há nenhuma restrição configurada", () => {
    expect(decideGuards(baseInputs)).toEqual({ ok: true, identity: null });
  });

  it("método errado vence tudo o mais, mesmo com taxa esgotada", () => {
    const decision = decideGuards({
      ...baseInputs,
      method: "GET",
      rateLimit: { allowed: false, retryAfterSeconds: 30 },
    });
    expect(decision).toEqual({ ok: false, reason: "METHOD_NOT_ALLOWED", allow: "POST" });
  });

  it("taxa esgotada vence a checagem de Admin SDK", () => {
    const decision = decideGuards({
      ...baseInputs,
      rateLimit: { allowed: false, retryAfterSeconds: 45 },
      adminSdkConfigured: false,
    });
    expect(decision).toEqual({ ok: false, reason: "RATE_LIMITED", retryAfterSeconds: 45 });
  });

  it("retryAfterSeconds cai para 60 quando o limitador devolve 0 (falha aberta)", () => {
    const decision = decideGuards({
      ...baseInputs,
      rateLimit: { allowed: false, retryAfterSeconds: 0 },
    });
    expect(decision).toMatchObject({ reason: "RATE_LIMITED", retryAfterSeconds: 60 });
  });

  it("Admin SDK ausente vence a checagem de identidade", () => {
    const decision = decideGuards({
      ...baseInputs,
      auth: "user",
      adminSdkConfigured: false,
      identity: null,
    });
    expect(decision).toEqual({ ok: false, reason: "SERVICE_CONFIGURATION_ERROR" });
  });

  it("sem identidade, nega mesmo com Admin SDK configurado", () => {
    const decision = decideGuards({
      ...baseInputs,
      auth: "user",
      adminSdkConfigured: true,
      identity: null,
    });
    expect(decision).toEqual({ ok: false, reason: "AUTH_REQUIRED" });
  });

  it("identidade válida com auth 'user' libera sem checar papel", () => {
    const decision = decideGuards({
      ...baseInputs,
      auth: "user",
      adminSdkConfigured: true,
      identity,
    });
    expect(decision).toEqual({ ok: true, identity });
  });

  it("auth 'admin' com identidade válida mas sem papel ADMIN nega", () => {
    const decision = decideGuards({
      ...baseInputs,
      auth: "admin",
      adminSdkConfigured: true,
      identity,
      isAdmin: false,
    });
    expect(decision).toEqual({ ok: false, reason: "FORBIDDEN" });
  });

  it("auth 'admin' com papel ADMIN libera", () => {
    const decision = decideGuards({
      ...baseInputs,
      auth: "admin",
      adminSdkConfigured: true,
      identity,
      isAdmin: true,
    });
    expect(decision).toEqual({ ok: true, identity });
  });
});

describe("decideGuards — a assimetria de falha não pode se misturar", () => {
  it("rate limit liberado (fail-open) nunca substitui a checagem de identidade", () => {
    // O limitador pode devolver `allowed: true` só porque o Firestore caiu
    // (fail-open documentado em `_rateLimit.ts`) — isso não pode, por
    // engano, ser lido como "requisição já autorizada".
    const decision = decideGuards({
      ...baseInputs,
      auth: "admin",
      rateLimit: { allowed: true, retryAfterSeconds: 0 },
      adminSdkConfigured: true,
      identity: null,
    });
    expect(decision).toEqual({ ok: false, reason: "AUTH_REQUIRED" });
  });

  it("token inválido nega mesmo quando o rate limit e o Admin SDK estão OK", () => {
    const decision = decideGuards({
      ...baseInputs,
      auth: "admin",
      rateLimit: { allowed: true, retryAfterSeconds: 0 },
      adminSdkConfigured: true,
      identity: null,
      isAdmin: undefined,
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) expect(decision.reason).toBe("AUTH_REQUIRED");
  });
});
