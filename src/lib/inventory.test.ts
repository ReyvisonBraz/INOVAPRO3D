import { describe, expect, it } from "vitest";
import { aggregateMaterialUsages, availableStock, inventoryActionForTransition } from "./inventory";

describe("inventory", () => {
  it("agrega o mesmo filamento usado em varios itens", () => {
    const totals = aggregateMaterialUsages([
      { materialId: "pla", estimatedGrams: 120 },
      { materialId: "pla", estimatedGrams: 80 },
      { materialId: "petg", estimatedGrams: 50 },
    ]);
    expect(totals.get("pla")).toBe(200);
    expect(totals.get("petg")).toBe(50);
  });

  it("ignora consumos invalidos", () => {
    expect(
      aggregateMaterialUsages([
        { materialId: "pla", estimatedGrams: -2 },
        { materialId: "", estimatedGrams: 10 },
      ]).size,
    ).toBe(0);
  });

  it("ignora filamentos manuais sem vinculo com o estoque", () => {
    const totals = aggregateMaterialUsages([
      { materialId: "manual:pla", inventoryTracked: false, estimatedGrams: 50 },
      { materialId: "stock-pla", estimatedGrams: 25 },
    ]);
    expect(totals.get("manual:pla")).toBeUndefined();
    expect(totals.get("stock-pla")).toBe(25);
  });

  it("calcula o saldo realmente disponivel", () => {
    expect(availableStock(1000, 350)).toBe(650);
    expect(availableStock(100, 150)).toBe(0);
  });

  it("define as operacoes das etapas de producao", () => {
    expect(inventoryActionForTransition("PAID", "QUEUE")).toBe("RESERVE");
    expect(inventoryActionForTransition("QUEUE", "PRINTING")).toBe("CONSUME");
    expect(inventoryActionForTransition("QUEUE", "CANCELED")).toBe("RELEASE");
    expect(inventoryActionForTransition("PAID", "PAID")).toBe("NONE");
  });
});
