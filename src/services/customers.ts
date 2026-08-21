import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export interface CustomerDraft {
  name: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  whatsapp: string;
  tags: string[];
  address: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  customerType: "PERSON" | "COMPANY";
  document: string;
  zipCode: string;
  city: string;
  state: string;
  source: string;
  preferredContact: "WHATSAPP" | "PHONE" | "EMAIL";
  birthday: string;
  notes: string;
  internalNotes: string;
}

export async function createCustomer(draft: CustomerDraft): Promise<void> {
  await addDoc(collection(db, "customers"), {
    ...draft,
    createdAt: serverTimestamp(),
  });
}

export async function updateCustomer(id: string, draft: CustomerDraft): Promise<void> {
  await updateDoc(doc(db, "customers", id), {
    ...draft,
    updatedAt: serverTimestamp(),
  });
}
