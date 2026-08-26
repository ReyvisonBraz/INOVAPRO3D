import { getAuth } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import { firebaseApp } from "./firebaseData";

// Initialize Services
export const db = getFirestore(
  firebaseApp,
  import.meta.env.VITE_FIREBASE_DATABASE_ID || "(default)",
);
export const auth = getAuth(firebaseApp);

// Storage NÃO é inicializado aqui de propósito: importar 'firebase/storage'
// no topo o colocaria no bundle eager de TODA página. Só o admin faz upload,
// então o módulo é carregado sob demanda via getStorageInstance().
export async function getStorageInstance() {
  const { getStorage } = await import("firebase/storage");
  return getStorage(firebaseApp);
}

/**
 * Test server connection on startup as per guidelines
 */
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, "system", "health"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("offline")) {
      console.error("Firebase is offline. Check configuration.");
    }
  }
}

// Common error handler as per guidelines
export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null,
) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
