import { describe, expect, it } from "vitest";
import { computePricing, DEFAULT_MACHINE, type PricingResult } from "./pricing";
import { buildScenarioTable } from "./scenarios";

const result = (patch: Partial<PricingResult> = {}) => {
  const base = computePricing({
    material: "pla",
    spoolPrice: 100,
    spoolWeight: 1000,
    steadyPowerWatts: 120,
    weightGrams: 200,
    hours: 5,
    quantity: 2,
    reservePct: 0,
    failureRatePct: 5,
    failureImpactPct: 50,
    kwhCost: 1,
    startupPowerWatts: 1000,
    startupMinutes: 8,
    machine: DEFAULT_MACHINE,
    laborHours: 1,
    laborRate: 30,
    extraSupplies: 5,
    packagingCost: 4,
    targetProfitPerMachineHour: 5,
    wholesaleMarkup: 2,
    retailMarkup: 2.5,
    minPrice: 35,
  });
  return { ...base, ...patch };
};

describe("buildScenarioTable", () => {
  it("reimpressão completa usa exatamente a métrica do motor", () => {
    const base = result();
    const table = buildScenarioTable(base, {
      tier: "RETAIL",
      discountPct: 8,
      filamentShockPct: 10,
    });
    const reprint = table.rows.find((row) => row.id === "FULL_REPRINT")!;
    expect(reprint.profit).toBeCloseTo(base.retailProfitAfterFullReprint, 10);
  });

  it("choque de filamento eleva o custo só pela fração do material", () => {
    const base = result();
    const table = buildScenarioTable(base, {
      tier: "RETAIL",
      discountPct: 0,
      filamentShockPct: 20,
    });
    const shock = table.rows.find((row) => row.id === "FILAMENT_SHOCK")!;
    expect(shock.cost - base.totalCost).toBeCloseTo(base.materialCost * 0.2, 10);
  });

  it("desconto reduz lucro e margem de forma monotônica", () => {
    const base = result();
    const low = buildScenarioTable(base, {
      tier: "RETAIL",
      discountPct: 5,
      filamentShockPct: 0,
    }).rows.find((row) => row.id === "DISCOUNT")!;
    const high = buildScenarioTable(base, {
      tier: "RETAIL",
      discountPct: 20,
      filamentShockPct: 0,
    }).rows.find((row) => row.id === "DISCOUNT")!;
    expect(high.profit).toBeLessThan(low.profit);
    expect(high.marginPct).toBeLessThan(low.marginPct);
  });

  it("usa o recálculo real recebido para o lote dobrado", () => {
    const base = result();
    const doubled = result({ retailTotal: 300, totalCost: 120, profitRetail: 180 });
    const table = buildScenarioTable(base, {
      tier: "RETAIL",
      discountPct: 0,
      filamentShockPct: 0,
      doubleLot: doubled,
    });
    expect(table.rows.find((row) => row.id === "DOUBLE_LOT")).toMatchObject({
      price: 300,
      cost: 120,
      profit: 180,
    });
  });

  it("nunca gera NaN com resultado vazio", () => {
    const empty = result({ retailTotal: 0, totalCost: 0, hours: 0 });
    const table = buildScenarioTable(empty, {
      tier: "RETAIL",
      discountPct: Number.NaN,
      filamentShockPct: Number.NaN,
    });
    expect(table.rows.every((row) => Object.values(row).every((value) => value === value))).toBe(
      true,
    );
    expect(table.maxSafeDiscountPct).toBe(0);
  });
});
