import { describe, expect, it } from "vitest";
import { buildQuotePayload, type SaveQuoteInput } from "./quotes";

const baseInput: SaveQuoteInput = {
  clientName: "Maria Silva",
  phone: "91999990000",
  materialLabel: "PLA",
  weight: 120,
  printTime: "2h30m",
  quantity: 3,
  price: 187.4,
};

/** Nenhuma sentinela do Firestore (serverTimestamp/deleteField) conta como `undefined`. */
function hasUndefinedValue(data: Record<string, unknown>): boolean {
  return Object.values(data).some((value) => value === undefined);
}

describe("buildQuotePayload — criação", () => {
  it("nunca emite undefined (o Firestore rejeita)", () => {
    const data = buildQuotePayload(baseInput, { isUpdate: false });
    expect(hasUndefinedValue(data)).toBe(false);
  });

  it("nasce PENDING quando o status não é informado — é o que o fluxo de duplicar usa", () => {
    const data = buildQuotePayload(baseInput, { isUpdate: false });
    expect(data.status).toBe("PENDING");
  });

  it("grava identidade e infill default", () => {
    const data = buildQuotePayload(baseInput, { isUpdate: false });
    expect(data.userId).toBeDefined();
    expect(data.createdAt).toBeDefined();
    expect(data.infill).toBe(0);
    expect(data.fileName).toBe("Peça personalizada");
    expect(data.total).toBe(187.4);
  });

  it("usa o nome da peça quando informado", () => {
    const data = buildQuotePayload({ ...baseInput, pieceName: "Ken Kaneki" }, { isUpdate: false });
    expect(data.fileName).toBe("Ken Kaneki");
  });

  it("limita infill a 0-100", () => {
    expect(buildQuotePayload({ ...baseInput, infill: 250 }, { isUpdate: false }).infill).toBe(100);
    expect(buildQuotePayload({ ...baseInput, infill: -5 }, { isUpdate: false }).infill).toBe(0);
  });

  it("omite imagem quando vazia na criação (não há nada para apagar)", () => {
    const data = buildQuotePayload({ ...baseInput, imageUrl: "" }, { isUpdate: false });
    expect(data.imageUrl).toBeUndefined();
    expect("imageUrl" in data).toBe(false);
  });

  it("grava o snapshot sem marcar como desatualizado", () => {
    const snapshot = { version: 1 } as unknown as SaveQuoteInput["calcSnapshot"];
    const data = buildQuotePayload({ ...baseInput, calcSnapshot: snapshot }, { isUpdate: false });
    expect(data.calcSnapshot).toBe(snapshot);
    expect("calcSnapshotStale" in data).toBe(false);
  });
});

describe("buildQuotePayload — atualização", () => {
  it("nunca emite undefined", () => {
    const data = buildQuotePayload(baseInput, { isUpdate: true });
    expect(hasUndefinedValue(data)).toBe(false);
  });

  it("nunca inclui userId nem createdAt", () => {
    const data = buildQuotePayload(baseInput, { isUpdate: true });
    expect("userId" in data).toBe(false);
    expect("createdAt" in data).toBe(false);
    expect("userEmail" in data).toBe(false);
  });

  it("não mexe no status quando não informado — não ressuscita PENDING", () => {
    const data = buildQuotePayload(baseInput, { isUpdate: true });
    expect("status" in data).toBe(false);
  });

  it("atualiza o status só quando explicitamente pedido", () => {
    const data = buildQuotePayload({ ...baseInput, status: "APPROVED" }, { isUpdate: true });
    expect(data.status).toBe("APPROVED");
  });

  it("imagem vazia vira deleteField (remoção explícita)", () => {
    const data = buildQuotePayload({ ...baseInput, imageUrl: "" }, { isUpdate: true });
    expect("imageUrl" in data).toBe(true);
    expect(data.imageUrl).not.toBe("");
  });

  it("imagem ausente não mexe no campo salvo", () => {
    const data = buildQuotePayload(baseInput, { isUpdate: true });
    expect("imageUrl" in data).toBe(false);
  });

  it("imagem nova sobrescreve normalmente", () => {
    const data = buildQuotePayload(
      { ...baseInput, imageUrl: "https://x/a.webp" },
      { isUpdate: true },
    );
    expect(data.imageUrl).toBe("https://x/a.webp");
  });

  it("gravar um snapshot novo limpa a marca de desatualizado", () => {
    const snapshot = { version: 1 } as unknown as SaveQuoteInput["calcSnapshot"];
    const data = buildQuotePayload({ ...baseInput, calcSnapshot: snapshot }, { isUpdate: true });
    expect(data.calcSnapshot).toBe(snapshot);
    expect("calcSnapshotStale" in data).toBe(true);
    expect(data.calcSnapshotStale).not.toBe(false);
  });

  it("sem snapshot novo, não mexe na marca de desatualizado existente", () => {
    const data = buildQuotePayload(baseInput, { isUpdate: true });
    expect("calcSnapshotStale" in data).toBe(false);
  });
});

describe("buildQuotePayload — campos comuns", () => {
  it("limpa o telefone para somente dígitos", () => {
    const data = buildQuotePayload({ ...baseInput, phone: "(91) 99999-0000" }, { isUpdate: false });
    expect(data.phone).toBe("91999990000");
  });

  it("observação interna e do cliente vão para campos diferentes", () => {
    const data = buildQuotePayload(
      { ...baseInput, notes: "custo interno", customerNotes: "entregar embrulhado" },
      { isUpdate: false },
    );
    expect(data.adminNotes).toBe("custo interno");
    expect(data.notes).toBe("entregar embrulhado");
  });

  it("nunca deixa quantidade menor que 1 nem preço negativo", () => {
    const data = buildQuotePayload({ ...baseInput, quantity: 0, price: -10 }, { isUpdate: false });
    expect(data.quantity).toBe(1);
    expect(data.total).toBe(0);
  });
});

describe("buildQuotePayload — ficha do produto e observação", () => {
  it("grava a ficha saneada e os dois interruptores", () => {
    const data = buildQuotePayload(
      {
        ...baseInput,
        productSpec: { width: 40, height: 30, unit: "cm", finish: "Verniz fosco" },
        showProductSpecOnQuote: false,
        highlightCustomerNotes: false,
      },
      { isUpdate: false },
    );

    expect(data.productSpec).toEqual({
      width: 40,
      height: 30,
      unit: "cm",
      finish: "Verniz fosco",
    });
    expect(data.showProductSpecOnQuote).toBe(false);
    expect(data.highlightCustomerNotes).toBe(false);
  });

  it("ficha vazia não entra na criação e apaga o campo na atualização", () => {
    const criacao = buildQuotePayload({ ...baseInput, productSpec: {} }, { isUpdate: false });
    expect("productSpec" in criacao).toBe(false);

    const atualizacao = buildQuotePayload({ ...baseInput, productSpec: {} }, { isUpdate: true });
    expect(atualizacao.productSpec).toBeDefined();
    expect(atualizacao.productSpec).not.toEqual({});
  });

  it("observação apagada limpa o campo na atualização, mas não na criação", () => {
    const criacao = buildQuotePayload({ ...baseInput, customerNotes: "" }, { isUpdate: false });
    expect("notes" in criacao).toBe(false);

    const atualizacao = buildQuotePayload({ ...baseInput, customerNotes: "" }, { isUpdate: true });
    expect(atualizacao.notes).toBeDefined();
  });

  it("sem tocar na ficha, a atualização não mexe no que já está gravado", () => {
    const data = buildQuotePayload(baseInput, { isUpdate: true });
    expect("productSpec" in data).toBe(false);
  });
});
