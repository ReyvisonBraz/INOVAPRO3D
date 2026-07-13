import {
  collection,
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { aggregateMaterialUsages, inventoryActionForTransition } from "../lib/inventory";
import type { InventoryMovementType, MaterialUsage, Order, OrderStatus } from "../types/domain";

export class InsufficientInventoryError extends Error {
  constructor(public readonly shortages: string[]) {
    super(`Estoque insuficiente: ${shortages.join(", ")}`);
    this.name = "InsufficientInventoryError";
  }
}

/**
 * Altera a etapa do pedido e movimenta todos os filamentos na mesma transacao.
 * Assim dois operadores nunca conseguem reservar o mesmo saldo.
 */
export async function transitionOrderStatus(order: Order, nextStatus: OrderStatus): Promise<void> {
  const action = inventoryActionForTransition(order.status, nextStatus);
  const usages = order.materialUsages ?? order.items.flatMap((item) => item.materialUsages ?? []);
  const totals = aggregateMaterialUsages(usages);

  await runTransaction(db, async (transaction) => {
    const orderRef = doc(db, "orders", order.id);
    const materialEntries = await Promise.all([...totals].map(async ([materialId, grams]) => {
      const ref = doc(db, "materials", materialId);
      const snapshot = await transaction.get(ref);
      return { materialId, grams, ref, snapshot };
    }));

    const shortages: string[] = [];
    if (action === "RESERVE" || action === "CONSUME") {
      for (const entry of materialEntries) {
        if (!entry.snapshot.exists()) {
          shortages.push(`${entry.materialId} nao cadastrado`);
          continue;
        }
        const data = entry.snapshot.data();
        const stock = Number(data.stockGrams ?? 0);
        const reserved = Number(data.reservedGrams ?? 0);
        const alreadyReserved = action === "CONSUME"
          ? usages.filter((u) => u.materialId === entry.materialId).reduce((sum, u) => sum + Number(u.reservedGrams ?? 0), 0)
          : 0;
        const neededFromAvailable = Math.max(0, entry.grams - alreadyReserved);
        if (stock - reserved < neededFromAvailable) {
          shortages.push(`${data.name ?? entry.materialId}: faltam ${Math.ceil(neededFromAvailable - (stock - reserved))}g`);
        }
      }
    }
    if (shortages.length) throw new InsufficientInventoryError(shortages);

    let movementType: InventoryMovementType | null = null;
    for (const entry of materialEntries) {
      if (!entry.snapshot.exists() || action === "NONE") continue;
      const data = entry.snapshot.data();
      const stock = Number(data.stockGrams ?? 0);
      const reserved = Number(data.reservedGrams ?? 0);
      const reservedForOrder = usages.filter((u) => u.materialId === entry.materialId).reduce((sum, u) => sum + Number(u.reservedGrams ?? 0), 0);
      let stockAfter = stock;
      let reservedAfter = reserved;
      let quantity = entry.grams;

      if (action === "RESERVE") {
        reservedAfter += entry.grams;
        movementType = "RESERVATION";
      } else if (action === "CONSUME") {
        stockAfter -= entry.grams;
        reservedAfter -= Math.min(reservedForOrder, entry.grams);
        movementType = "CONSUMPTION";
      } else if (action === "RELEASE") {
        quantity = reservedForOrder;
        if (quantity <= 0) continue;
        reservedAfter = Math.max(0, reserved - quantity);
        movementType = "RELEASE";
      }

      transaction.update(entry.ref, {
        stockGrams: stockAfter,
        reservedGrams: reservedAfter,
        inStock: stockAfter - reservedAfter > 0,
        updatedAt: serverTimestamp(),
      });
      const movementRef = doc(collection(db, "inventoryMovements"));
      transaction.set(movementRef, {
        materialId: entry.materialId,
        materialName: data.name ?? entry.materialId,
        type: movementType,
        quantityGrams: quantity,
        orderId: order.id,
        reason: `Mudanca de ${order.status} para ${nextStatus}`,
        adminId: auth.currentUser?.uid ?? null,
        stockAfterGrams: stockAfter,
        reservedAfterGrams: reservedAfter,
        createdAt: serverTimestamp(),
      });
    }

    const updatedUsages: MaterialUsage[] = usages.map((usage) => {
      if (action === "RESERVE") return { ...usage, reservedGrams: usage.estimatedGrams };
      if (action === "CONSUME") return { ...usage, reservedGrams: 0, consumedGrams: usage.estimatedGrams };
      if (action === "RELEASE") return { ...usage, reservedGrams: 0 };
      return usage;
    });
    transaction.update(orderRef, {
      status: nextStatus,
      ...(totals.size ? { materialUsages: updatedUsages } : {}),
      updatedAt: serverTimestamp(),
    });
  });
}

export async function adjustMaterialStock(materialId: string, deltaGrams: number, reason: string): Promise<void> {
  if (!Number.isFinite(deltaGrams) || deltaGrams === 0) throw new Error("Informe uma quantidade diferente de zero.");
  await runTransaction(db, async (transaction) => {
    const materialRef = doc(db, "materials", materialId);
    const snapshot = await transaction.get(materialRef);
    if (!snapshot.exists()) throw new Error("Filamento nao encontrado.");
    const data = snapshot.data();
    const stock = Number(data.stockGrams ?? 0);
    const reserved = Number(data.reservedGrams ?? 0);
    const stockAfter = stock + deltaGrams;
    if (stockAfter < reserved || stockAfter < 0) throw new Error("O ajuste deixaria o estoque abaixo do saldo reservado.");
    transaction.update(materialRef, { stockGrams: stockAfter, inStock: stockAfter - reserved > 0, updatedAt: serverTimestamp() });
    transaction.set(doc(collection(db, "inventoryMovements")), {
      materialId, materialName: data.name ?? materialId,
      type: deltaGrams > 0 ? "ENTRY" : "ADJUSTMENT",
      quantityGrams: Math.abs(deltaGrams), reason,
      adminId: auth.currentUser?.uid ?? null,
      stockAfterGrams: stockAfter, reservedAfterGrams: reserved,
      createdAt: serverTimestamp(),
    });
  });
}
