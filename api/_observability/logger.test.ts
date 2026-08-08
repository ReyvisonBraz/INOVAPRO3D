import { describe, expect, it } from "vitest";
import { sanitizeLogData } from "./logger";

describe("sanitizeLogData", () => {
  it("mascara segredos inclusive em objetos aninhados", () => {
    expect(
      sanitizeLogData({
        orderId: "order-1",
        authorization: "Bearer secret",
        nested: { accessToken: "token", pixCode: "payload", safe: "ok" },
      }),
    ).toEqual({
      orderId: "order-1",
      authorization: "[REDACTED]",
      nested: { accessToken: "[REDACTED]", pixCode: "[REDACTED]", safe: "ok" },
    });
  });

  it("mantém identificadores operacionais não sensíveis", () => {
    expect(sanitizeLogData({ orderId: "order-1", paymentId: "payment-1" })).toEqual({
      orderId: "order-1",
      paymentId: "payment-1",
    });
  });

  it("mascara credenciais embutidas em mensagens e pilhas de erro", () => {
    const sanitized = sanitizeLogData(
      new Error("Falha com Bearer abc.def-123 e APP_USR-secret-credential"),
    );

    expect(JSON.stringify(sanitized)).not.toContain("abc.def-123");
    expect(JSON.stringify(sanitized)).not.toContain("APP_USR-secret-credential");
    expect(JSON.stringify(sanitized)).toContain("[REDACTED]");
  });
});
