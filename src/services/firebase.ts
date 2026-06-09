import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const env = (import.meta as any).env ?? {};

// Support both the new VITE_FIREBASE_* env vars and the legacy JSON config
// that may be injected via window.__FIREBASE_CONFIG__ at runtime.
const legacyConfig = (typeof window !== 'undefined' && (window as any).__FIREBASE_CONFIG__) ?? {};

const firebaseConfig = {
  apiKey:            env.VITE_FIREBASE_API_KEY            ?? legacyConfig.apiKey,
  authDomain:        env.VITE_FIREBASE_AUTH_DOMAIN        ?? legacyConfig.authDomain,
  projectId:         env.VITE_FIREBASE_PROJECT_ID         ?? legacyConfig.projectId,
  storageBucket:     env.VITE_FIREBASE_STORAGE_BUCKET     ?? legacyConfig.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? legacyConfig.messagingSenderId,
  appId:             env.VITE_FIREBASE_APP_ID             ?? legacyConfig.appId,
};

const firestoreDatabaseId: string =
  env.VITE_FIREBASE_DATABASE_ID ?? legacyConfig.firestoreDatabaseId ?? '(default)';

if (!firebaseConfig.apiKey) {
  console.error(
    '[INOVAPRO3D] Firebase não configurado. Adicione as variáveis VITE_FIREBASE_* ' +
    'no painel do Vercel (ou no arquivo .env local).'
  );
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Services
export const db = getFirestore(app, firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);

/**
 * Test server connection on startup as per guidelines
 */
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'system', 'health'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firebase is offline. Check configuration.");
    }
  }
}

// Common error handler as per guidelines
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
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
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
