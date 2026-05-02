// js/firebase-raw.js
// Inizializzazione Firebase con config letta inline da config.json
// Separato da firebase.js per evitare dipendenze circolari con config.js

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Leggi config.json in modo sincrono-compatibile (fetch al primo avvio)
let _app;
async function getApp() {
  if (_app) return _app;
  const cfg = await (await fetch('./config.json')).json();
  const fc  = cfg.firebase;
  const firebaseConfig = {
    apiKey:            fc.apiKey,
    authDomain:        fc.authDomain,
    projectId:         fc.projectId,
    storageBucket:     fc.storageBucket,
    messagingSenderId: fc.messagingSenderId,
    appId:             fc.appId
  };
  if (!getApps().length) {
    _app = initializeApp(firebaseConfig);
  } else {
    _app = getApps()[0];
  }
  return _app;
}

const app  = await getApp();
const db   = getFirestore(app);
const stor = getStorage(app);
const auth = getAuth(app);

export { app, db, stor, auth };
export {
  collection, doc, getDoc, getDocs, addDoc, updateDoc,
  deleteDoc, setDoc, serverTimestamp,
  ref, uploadBytes, getDownloadURL,
  signInWithEmailAndPassword, signOut, onAuthStateChanged
};
