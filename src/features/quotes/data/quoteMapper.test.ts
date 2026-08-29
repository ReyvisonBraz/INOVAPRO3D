import { describe, expect, it } from "vitest";
import { mapActiveQuoteDocuments, mapQuoteDocument } from "./quoteMapper";

const document = (id: string, data: unknown) => ({ id, data: () => data });

describe("quoteMapper", () => {
  it("mantém o ID do documento como fonte autoritativa", () => {
    const quote = mapQuoteDocument(document("quote-id", { id: "legacy-id", total: 249.9 }));

    expect(quote.id).toBe("quote-id");
    expect(quote.total).toBe(249.9);
  });

  it("remove orçamentos enviados para a lixeira", () => {
    const quotes = mapActiveQuoteDocuments([
      document("active", { total: 10 }),
      document("deleted", { total: 20, _deleted: true }),
    ]);

    expect(quotes.map((quote) => quote.id)).toEqual(["active"]);
  });

  it("rejeita payloads que não são objetos", () => {
    expect(() => mapQuoteDocument(document("invalid", []))).toThrow(
      "Orçamento invalid possui dados inválidos",
    );
  });
});
