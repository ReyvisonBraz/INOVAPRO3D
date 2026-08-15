import {
  addDoc,
  collection,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import { mergeCalcSnapshot, type QuoteCalcSnapshot } from "../lib/calculatorSnapshot";
import type { CalculatorTemplate } from "../types/domain";

const COLLECTION = "calculatorTemplates";

export async function fetchCalculatorTemplates(): Promise<CalculatorTemplate[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy("usageCount", "desc"), limit(30)),
  );
  return snapshot.docs.flatMap((entry) => {
    const raw = entry.data();
    const calcSnapshot = mergeCalcSnapshot(raw.snapshot);
    if (!calcSnapshot) return [];
    return [
      {
        id: entry.id,
        name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Modelo sem nome",
        description: typeof raw.description === "string" ? raw.description : undefined,
        imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
        usageCount: Math.max(0, Number(raw.usageCount) || 0),
        snapshot: calcSnapshot,
        createdAt: raw.createdAt,
        updatedAt: raw.updatedAt,
      },
    ];
  });
}

export async function createCalculatorTemplate(input: {
  name: string;
  description?: string;
  imageUrl?: string;
  snapshot: QuoteCalcSnapshot;
}): Promise<string> {
  const reference = await addDoc(collection(db, COLLECTION), {
    name: input.name.trim(),
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    snapshot: input.snapshot,
    usageCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reference.id;
}

export async function registerTemplateUsage(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    usageCount: increment(1),
    updatedAt: serverTimestamp(),
  });
}
