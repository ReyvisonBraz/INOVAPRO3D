import { describe, expect, it } from "vitest";
import { createPublicErrorResponse, ERROR_CATALOG } from "./catalog";

describe("catálogo público de erros", () => {
  it("gera uma resposta estável com protocolo", () => {
    expect(createPublicErrorResponse("PAYMENT_PROVIDER_ERROR", "req_123")).toEqual({
      error: {
        code: "PAYMENT_PROVIDER_ERROR",
        message: ERROR_CATALOG.PAYMENT_PROVIDER_ERROR.message,
        retryable: true,
        correlationId: "req_123",
      },
    });
  });

  it("não inclui detalhes técnicos no contrato público", () => {
    const serialized = JSON.stringify(ERROR_CATALOG);
    expect(serialized).not.toMatch(/stack|access.?token|firestore|mercado pago api/i);
  });
});
