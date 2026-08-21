import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface FAQDraft {
  question: string;
  answer: string;
}

export async function createFAQ(draft: FAQDraft): Promise<void> {
  await addDoc(collection(db, "faqs"), {
    ...draft,
    createdAt: serverTimestamp(),
  });
}
