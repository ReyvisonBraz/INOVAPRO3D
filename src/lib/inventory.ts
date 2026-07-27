import type { MaterialUsage, OrderStatus } from "../types/domain";

export type InventoryAction = "NONE" | "RESERVE" | "CONSUME" | "RELEASE";

export function inventoryActionForTransition(from: OrderStatus, to: OrderStatus): InventoryAction {
  if (to === "CANCELED") return "RELEASE";
  if (to === "PRINTING" && from !== "PRINTING") return "CONSUME";
  if (to === "QUEUE" && from !== "QUEUE") return "RESERVE";
  return "NONE";
}

export function aggregateMaterialUsages(usages: MaterialUsage[] = []): Map<string, number> {
  const totals = new Map<string, number>();
  for (const usage of usages) {
    const grams = Number(usage.estimatedGrams);
    if (
      usage.inventoryTracked === false ||
      !usage.materialId ||
      !Number.isFinite(grams) ||
      grams <= 0
    )
      continue;
    totals.set(usage.materialId, (totals.get(usage.materialId) ?? 0) + grams);
  }
  return totals;
}

export function availableStock(stockGrams?: number, reservedGrams?: number): number {
  return Math.max(0, Number(stockGrams ?? 0) - Number(reservedGrams ?? 0));
}
