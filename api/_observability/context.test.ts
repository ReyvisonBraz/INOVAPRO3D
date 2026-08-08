import { describe, expect, it } from "vitest";
import { createRequestContext } from "./context";

describe("createRequestContext", () => {
  it("cria um identificador único e preserva o identificador da plataforma", () => {
    const first = createRequestContext(
      { headers: { "x-vercel-id": "gru1::request-1" } },
      "payment-api",
      "create-pix",
    );
    const second = createRequestContext({ headers: {} }, "payment-api", "create-pix");

    expect(first.correlationId).toMatch(/^req_[0-9a-f-]{36}$/);
    expect(first.correlationId).not.toBe(second.correlationId);
    expect(first).toMatchObject({
      service: "payment-api",
      operation: "create-pix",
      platformRequestId: "gru1::request-1",
    });
  });
});
