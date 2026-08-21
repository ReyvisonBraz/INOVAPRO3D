import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface ShowcaseDraft {
  title: string;
  subtitle: string;
  image: string;
  link: string;
  active: boolean;
}

export async function createShowcaseItem(draft: ShowcaseDraft): Promise<void> {
  await addDoc(collection(db, "showcase"), {
    ...draft,
    createdAt: serverTimestamp(),
  });
}

export async function updateShowcaseItem(id: string, draft: ShowcaseDraft): Promise<void> {
  await updateDoc(doc(db, "showcase", id), { ...draft });
}
