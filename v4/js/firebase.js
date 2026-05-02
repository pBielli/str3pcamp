// js/firebase.js
// Inizializzazione Firebase tramite config.json centralizzato

import { CONFIG } from './config.js';

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, doc, getDoc, getDocs,
  addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import {
  getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Le credenziali vengono lette dal config (modificabile per cedere l'app a terzi)
const firebaseConfig = {
  apiKey:            CONFIG.firebase.apiKey,
  authDomain:        CONFIG.firebase.authDomain,
  projectId:         CONFIG.firebase.projectId,
  storageBucket:     CONFIG.firebase.storageBucket,
  messagingSenderId: CONFIG.firebase.messagingSenderId,
  appId:             CONFIG.firebase.appId
};

const app  = initializeApp(firebaseConfig);
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
