import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

function init() {
  if (getApps().length > 0) return;

  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    // Fallback sem credenciais — funciona localmente via Application Default Credentials
    // mas token verification e Firestore writes serão no-ops
    if (projectId) initializeApp({ projectId });
    else initializeApp();
    if (process.env.NODE_ENV === 'production') {
      console.warn('[firebase-admin] FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY não configurados. Funcionalidades server-side degradadas.');
    }
  }
}

export function getAdminDb() { init(); return getFirestore(); }
export function getAdminAuth() { init(); return getAuth(); }

export function isAdminSdkConfigured(): boolean {
  return !!(process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}
