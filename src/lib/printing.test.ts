import { describe, expect, it } from "vitest";
import { buildPrintDocumentTitle } from "./printing";

describe("buildPrintDocumentTitle", () => {
  it("monta o título do orçamento para o cliente", () => {
    expect(buildPrintDocumentTitle("CLIENT", { name: "CLIENTE TESTE", phone: "91999990000" })).toBe(
      "INOVA PRO 3D Orçamento - CLIENTE TESTE - 91999990000",
    );
  });

  it("usa o rótulo de produção, telefone padrão e remove caracteres inválidos", () => {
    expect(buildPrintDocumentTitle("PRODUCTION", { name: "CLIENTE / TESTE" })).toBe(
      "INOVA PRO 3D Ficha de Produção - CLIENTE - TESTE - Sem telefone",
    );
  });
});
