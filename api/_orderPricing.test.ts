import { describe, it, expect } from "vitest";
import { computeOrderTotal, type ProductRecord, type MaterialRecord } from "./_orderPricing";

const products = new Map<string, ProductRecord>([
  ["p1", { basePrice: 100, active: true, name: "Peça A" }],
  ["p2", { basePrice: 50, active: true, name: "Peça B", productionMaterial: "PETG" }],
  ["inativo", { basePrice: 80, active: false, name: "Descontinuada" }],
]);
const materials = new Map<string, MaterialRecord>([
  ["pla", { priceMult: 1, name: "PLA" }],
  ["petg", { priceMult: 1.4, name: "PETG" }],
]);

describe("computeOrderTotal", () => {
  it("recalcula total a partir do basePrice, ignorando qualquer preço do cliente", () => {
    const r = computeOrderTotal(
      [{ type: "PRODUCT", productId: "p1", quantity: 2 }],
      products,
      materials,
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.lines[0].unitPrice).toBe(100);
      expect(r.total).toBe(200);
    }
  });

  it("ignora material legado do cliente e mantém o preço fixo do produto", () => {
    const r = computeOrderTotal(
      [{ type: "PRODUCT", productId: "p1", materialId: "petg", quantity: 1 }],
      products,
      materials,
    );
    expect(r.ok && r.total).toBe(100);
    if (r.ok) expect(r.lines[0].materialId).toBeNull();
  });

  it("soma múltiplas linhas", () => {
    const r = computeOrderTotal(
      [
        { type: "PRODUCT", productId: "p1", quantity: 1 },
        { type: "PRODUCT", productId: "p2", quantity: 3 },
      ],
      products,
      materials,
    );
    expect(r.ok && r.total).toBe(250);
  });

  it("recusa produto inexistente", () => {
    const r = computeOrderTotal(
      [{ type: "PRODUCT", productId: "zzz", quantity: 1 }],
      products,
      materials,
    );
    expect(r.ok).toBe(false);
  });

  it("recusa produto inativo", () => {
    const r = computeOrderTotal(
      [{ type: "PRODUCT", productId: "inativo", quantity: 1 }],
      products,
      materials,
    );
    expect(r.ok).toBe(false);
  });

  it("ignora material inexistente enviado pelo cliente", () => {
    const r = computeOrderTotal(
      [{ type: "PRODUCT", productId: "p1", materialId: "nao-existe", quantity: 1 }],
      products,
      materials,
    );
    expect(r.ok && r.total).toBe(100);
  });

  it("registra o material interno do produto com fallback PLA", () => {
    const petg = computeOrderTotal(
      [{ type: "PRODUCT", productId: "p2", quantity: 1 }],
      products,
      materials,
    );
    const pla = computeOrderTotal(
      [{ type: "PRODUCT", productId: "p1", quantity: 1 }],
      products,
      materials,
    );
    expect(petg.ok && petg.lines[0].productionMaterial).toBe("PETG");
    expect(pla.ok && pla.lines[0].productionMaterial).toBe("PLA");
  });

  it("recusa itens do tipo QUOTE (fora de escopo desta etapa)", () => {
    const r = computeOrderTotal(
      [{ type: "QUOTE", productId: "p1", quantity: 1 }],
      products,
      materials,
    );
    expect(r.ok).toBe(false);
  });

  it("satura quantidade inválida para o intervalo [1, 99]", () => {
    const r0 = computeOrderTotal(
      [{ type: "PRODUCT", productId: "p2", quantity: 0 }],
      products,
      materials,
    );
    const rBig = computeOrderTotal(
      [{ type: "PRODUCT", productId: "p2", quantity: 1000 }],
      products,
      materials,
    );
    expect(r0.ok && r0.lines[0].quantity).toBe(1);
    expect(rBig.ok && rBig.lines[0].quantity).toBe(99);
  });

  it("recusa carrinho vazio", () => {
    expect(computeOrderTotal([], products, materials).ok).toBe(false);
  });
});
