import { FIREBASE_CONFIG } from './firebase-config.js';

let app = null;
let db = null;
let auth = null;
let authUnsubscribe = null;

export const FIREBASE_ENABLED = FIREBASE_CONFIG.apiKey !== 'INSERISCI_QUI';

async function ensureFirebase() {
  if (!FIREBASE_ENABLED) return null;
  if (app && db && auth) return { app, db, auth };

  const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
  const { getFirestore } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  const { getAuth } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');

  app = initializeApp(FIREBASE_CONFIG);
  db = getFirestore(app);
  auth = getAuth(app);

  return { app, db, auth };
}

export async function initFirebaseAuth(onStateChanged) {
  if (!FIREBASE_ENABLED) {
    onStateChanged(null);
    return () => {};
  }
  await ensureFirebase();
  const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  if (authUnsubscribe) authUnsubscribe();
  authUnsubscribe = onAuthStateChanged(auth, onStateChanged);
  return authUnsubscribe;
}

export async function loginWithEmail(email, password) {
  if (!FIREBASE_ENABLED) throw new Error('Firebase non configurato');
  await ensureFirebase();
  const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email, password) {
  if (!FIREBASE_ENABLED) throw new Error('Firebase non configurato');
  await ensureFirebase();
  const { createUserWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function logoutFirebase() {
  if (!FIREBASE_ENABLED || !auth) return;
  const { signOut } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');
  return signOut(auth);
}

export function getFirebaseDb() {
  return db;
}
