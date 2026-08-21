import { doc, getDoc } from "firebase/firestore";
import type { Quote } from "../types/domain";
import { db } from "./firebase";

export async function fetchQuoteById(id: string): Promise<Quote | null> {
  const snapshot = await getDoc(doc(db, "quotes", id));
  if (!snapshot.exists()) return null;
  return { id: snapshot.id, ...snapshot.data() } as Quote;
}
