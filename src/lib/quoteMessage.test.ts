import { describe, expect, it } from "vitest";
import { buildCommercialQuoteMessage } from "./quoteMessage";

describe("mensagem comercial do orçamento", () => {
  it("mostra somente os dados úteis para o cliente", () => {
    const message = buildCommercialQuoteMessage({
      customerName: "JOÃO SILVA",
      projectName: "KEN KANEKI",
      quantity: 2,
      total: 180,
    });

    expect(message).toContain("JOÃO SILVA");
    expect(message).toContain("KEN KANEKI");
    expect(message).toContain("180,00");
    expect(message).toContain("90,00");
    expect(message).not.toMatch(
      /\bgramas?\b|\bpeso\b|\binfill\b|\bpreenchimento\b|tempo de impressão|\batacado\b|\bvarejo\b/i,
    );
  });

  it("omite valor unitário quando existe apenas uma unidade", () => {
    const message = buildCommercialQuoteMessage({ total: 75, quantity: 1 });
    expect(message).not.toContain("Valor por unidade");
  });
});
