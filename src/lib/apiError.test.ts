import { describe, expect, it } from "vitest";
import { ApiClientError, formatSupportCode, readApiError } from "./apiError";

describe("readApiError", () => {
  it("lê o contrato seguro do backend", async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: "PAYMENT_PROVIDER_ERROR",
          message: "Serviço temporariamente indisponível.",
          retryable: true,
          correlationId: "req_12345678-abcd",
        },
      }),
      { status: 502, headers: { "Content-Type": "application/json" } },
    );

    await expect(readApiError(response, "Falha")).resolves.toMatchObject({
      code: "PAYMENT_PROVIDER_ERROR",
      correlationId: "req_12345678-abcd",
      retryable: true,
    });
  });

  it("não apresenta mensagens técnicas de endpoints legados", async () => {
    const response = new Response(JSON.stringify({ error: "Access Token inválido: secret" }), {
      status: 500,
    });
    const error = await readApiError(response, "Mensagem segura");
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.message).toBe("Mensagem segura");
    expect(error.message).not.toContain("secret");
  });

  it("rejeita um código desconhecido mesmo quando o restante do JSON parece válido", async () => {
    const response = new Response(
      JSON.stringify({
        error: {
          code: "UNKNOWN_REMOTE_CODE",
          message: "Mensagem não confiável",
          retryable: true,
          correlationId: "req_12345678-abcd",
        },
      }),
      { status: 500 },
    );

    const error = await readApiError(response, "Mensagem segura");
    expect(error.message).toBe("Mensagem segura");
    expect(error.code).toBeUndefined();
  });
});

describe("formatSupportCode", () => {
  it("gera um protocolo curto pesquisável pelo prefixo do correlationId", () => {
    expect(formatSupportCode("req_12345678-abcd-efgh")).toBe("PAY-12345678");
    expect(formatSupportCode()).toBeNull();
  });
});
