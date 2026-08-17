import {
  addDoc,
  collection,
  deleteDoc,
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

function templateFromDocument(entry: {
  id: string;
  data: () => Record<string, unknown>;
}): CalculatorTemplate | null {
  const raw = entry.data();
  const calcSnapshot = mergeCalcSnapshot(raw.snapshot);
  if (!calcSnapshot) return null;
  return {
    id: entry.id,
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Modelo sem nome",
    description: typeof raw.description === "string" ? raw.description : undefined,
    imageUrl: typeof raw.imageUrl === "string" ? raw.imageUrl : undefined,
    usageCount: Math.max(0, Number(raw.usageCount) || 0),
    archived: raw.archived === true,
    archivedAt: raw.archivedAt as CalculatorTemplate["archivedAt"],
    deleted: raw.deleted === true,
    deletedAt: raw.deletedAt as CalculatorTemplate["deletedAt"],
    snapshot: calcSnapshot,
    createdAt: raw.createdAt as CalculatorTemplate["createdAt"],
    updatedAt: raw.updatedAt as CalculatorTemplate["updatedAt"],
  };
}

async function fetchTemplateDocuments(): Promise<CalculatorTemplate[]> {
  const snapshot = await getDocs(
    query(collection(db, COLLECTION), orderBy("usageCount", "desc"), limit(100)),
  );
  return snapshot.docs
    .map(templateFromDocument)
    .filter((template): template is CalculatorTemplate => Boolean(template));
}

export async function fetchCalculatorTemplates(): Promise<CalculatorTemplate[]> {
  return (await fetchTemplateDocuments())
    .filter((template) => !template.archived && !template.deleted)
    .slice(0, 30);
}

export async function fetchAllCalculatorTemplates(): Promise<CalculatorTemplate[]> {
  return fetchTemplateDocuments();
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

export async function updateCalculatorTemplate(
  id: string,
  input: {
    name?: string;
    description?: string;
    imageUrl?: string;
    snapshot?: QuoteCalcSnapshot;
  },
): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    ...(input.name !== undefined ? { name: input.name.trim() } : {}),
    ...(input.description !== undefined ? { description: input.description.trim() } : {}),
    ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
    ...(input.snapshot ? { snapshot: input.snapshot } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function cloneCalculatorTemplate(template: CalculatorTemplate): Promise<string> {
  return createCalculatorTemplate({
    name: `Cópia de ${template.name}`,
    description: template.description,
    imageUrl: template.imageUrl,
    snapshot: template.snapshot,
  });
}

export async function setCalculatorTemplateArchived(id: string, archived: boolean): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    archived,
    archivedAt: archived ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCalculatorTemplate(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    deleted: true,
    deletedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function restoreCalculatorTemplate(id: string): Promise<void> {
  await updateDoc(doc(db, COLLECTION, id), {
    deleted: false,
    deletedAt: null,
    archived: false,
    archivedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function permanentlyDeleteCalculatorTemplate(id: string): Promise<void> {
  await deleteDoc(doc(db, COLLECTION, id));
}
