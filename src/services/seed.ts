import { collection, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";

const SAMPLE_PRODUCTS = [
  {
    name: "Cadeia de Impulso Galáctico",
    description: "Modelo decorativo complexo impresso em resina de alta precisão.",
    basePrice: 149.90,
    images: ["https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&q=80&w=400"],
    active: true,
    category: "Decorativo"
  },
  {
    name: "Engrenagem Industrial v2",
    description: "Peça mecânica funcional em Nylon reforçado com fibra de carbono.",
    basePrice: 89.00,
    images: ["https://images.unsplash.com/photo-1549484081-37d4f90117a3?auto=format&fit=crop&q=80&w=400"],
    active: true,
    category: "Funcional"
  },
  {
    name: "Busto 'O Pensador' Moderno",
    description: "Interpretação low-poly de clássico da arte em PLA marmorizado.",
    basePrice: 199.00,
    images: ["https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=400"],
    active: true,
    category: "Arte"
  }
];

export async function seedProducts() {
  const path = "products";
  try {
    const querySnapshot = await getDocs(collection(db, path));
    if (querySnapshot.empty) {
      console.log("Seeding initial products...");
      for (const product of SAMPLE_PRODUCTS) {
        try {
          await addDoc(collection(db, path), {
            ...product,
            createdAt: serverTimestamp()
          });
        } catch (err) {
          // Silent catch for permission denied - only admins can seed
          console.info("Seeding skipped: User does not have permission to write products.");
          break;
        }
      }
    }
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.LIST, path);
    } catch (e) {
      console.error("Seed Check Failed:", e);
    }
  }
}
