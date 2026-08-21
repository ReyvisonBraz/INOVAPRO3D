import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export async function updateProductCategory(productId: string, category: string): Promise<void> {
  await updateDoc(doc(db, "products", productId), {
    category,
    updatedAt: serverTimestamp(),
  });
}

export async function updateProductsCategory(
  productIds: string[],
  category: string,
): Promise<void> {
  await Promise.all(productIds.map((id) => updateProductCategory(id, category)));
}
