import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import type { OrderItem } from "../types/domain";
import { db } from "./firebase";

export async function updateOrderItems(
  orderId: string,
  items: OrderItem[],
  total: number,
): Promise<void> {
  await updateDoc(doc(db, "orders", orderId), {
    items,
    total,
    updatedAt: serverTimestamp(),
  });
}
