import type { PricingResult } from "./pricing";

export type ScenarioTone = "healthy" | "warning" | "loss";

export interface PricingScenario {
  id: "BASE" | "HALF_FAILURE" | "FULL_REPRINT" | "FILAMENT_SHOCK" | "DISCOUNT" | "DOUBLE_LOT";
  label: string;
  price: number;
  cost: number;
  profit: number;
  marginPct: number;
  profitDelta: number;
  tone: ScenarioTone;
}

export interface ScenarioTable {
  rows: PricingScenario[];
  basePrice: number;
  baseCost: number;
  baseProfit: number;
  sustainableFloor: number;
  maxSafeDiscountPct: number;
  contributionPerMachineHour: number;
}

export interface ScenarioOptions {
  tier: "RETAIL" | "WHOLESALE";
  discountPct: number;
  filamentShockPct: number;
  /** Resultado recalculado com todas as bandejas e produtos em dobro. */
  doubleLot?: PricingResult;
}

const nonNegative = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
};

const row = (
  id: PricingScenario["id"],
  label: string,
  price: number,
  cost: number,
  baseProfit: number,
  sustainableFloor: number,
): PricingScenario => {
  const safePrice = nonNegative(price);
  const safeCost = nonNegative(cost);
  const profit = safePrice - safeCost;
  return {
    id,
    label,
    price: safePrice,
    cost: safeCost,
    profit,
    marginPct: safePrice > 0 ? (profit / safePrice) * 100 : 0,
    profitDelta: profit - baseProfit,
    tone: profit < 0 ? "loss" : safePrice < sustainableFloor ? "warning" : "healthy",
  };
};

export function buildScenarioTable(base: PricingResult, options: ScenarioOptions): ScenarioTable {
  const basePrice = options.tier === "WHOLESALE" ? base.wholesaleTotal : base.retailTotal;
  const baseProfit = options.tier === "WHOLESALE" ? base.profitWholesale : base.profitRetail;
  const baseCost = base.totalCost;
  const sustainableFloor = Math.max(base.minimumSustainablePrice, baseCost);
  const discountPct = Math.min(100, nonNegative(options.discountPct));
  const filamentShockPct = nonNegative(options.filamentShockPct);
  // Cenários reais substituem a provisão estatística pela falha concreta para
  // não cobrar as duas ao mesmo tempo.
  const costWithoutFailureProvision = Math.max(0, baseCost - base.failureLoss);
  const halfFailureCost = costWithoutFailureProvision + base.fullReprintCost * 0.5;
  const fullReprintCost = costWithoutFailureProvision + base.fullReprintCost;
  const filamentShockCost = baseCost + base.materialCost * (filamentShockPct / 100);
  const discountedPrice = basePrice * (1 - discountPct / 100);
  const doubleLot = options.doubleLot;
  const doubleLotPrice = doubleLot
    ? options.tier === "WHOLESALE"
      ? doubleLot.wholesaleTotal
      : doubleLot.retailTotal
    : basePrice * 2;
  const doubleLotCost = doubleLot?.totalCost ?? baseCost * 2;

  const rows: PricingScenario[] = [
    row("BASE", "Base (como está)", basePrice, baseCost, baseProfit, sustainableFloor),
    row(
      "HALF_FAILURE",
      "Uma falha a 50% do job",
      basePrice,
      halfFailureCost,
      baseProfit,
      sustainableFloor,
    ),
    row(
      "FULL_REPRINT",
      "Reimpressão completa",
      basePrice,
      fullReprintCost,
      baseProfit,
      sustainableFloor,
    ),
    row(
      "FILAMENT_SHOCK",
      `Filamento +${filamentShockPct.toFixed(0)}%`,
      basePrice,
      filamentShockCost,
      baseProfit,
      sustainableFloor,
    ),
    row(
      "DISCOUNT",
      `Desconto de ${discountPct.toFixed(0)}%`,
      discountedPrice,
      baseCost,
      baseProfit,
      sustainableFloor,
    ),
    row(
      "DOUBLE_LOT",
      "Lote ×2",
      doubleLotPrice,
      doubleLotCost,
      baseProfit,
      Math.max(doubleLot?.minimumSustainablePrice ?? sustainableFloor * 2, doubleLotCost),
    ),
  ];

  return {
    rows,
    basePrice,
    baseCost,
    baseProfit,
    sustainableFloor,
    maxSafeDiscountPct:
      basePrice > 0 ? Math.max(0, ((basePrice - sustainableFloor) / basePrice) * 100) : 0,
    contributionPerMachineHour: base.hours > 0 ? baseProfit / base.hours : 0,
  };
}
