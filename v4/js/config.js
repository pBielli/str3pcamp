// js/config.js
// Carica config.json (statico) e lo fonde con la config dinamica da Firestore (collection "tools")

let CONFIG = null;

export async function loadConfig() {
  if (CONFIG) return CONFIG;

  // 1. Carica il JSON statico
  const res = await fetch('./config.json');
  const base = await res.json();

  // 2. Carica la config dinamica da Firestore (se disponibile)
  let remote = {};
  try {
    // Import lazy per evitare circolarità: firebase dipende da config
    const { db, collection, getDocs } = await import('./firebase-raw.js');
    const snap = await getDocs(collection(db, 'tools'));
    snap.forEach(docSnap => {
      const id = docSnap.id; // es. "spotTypes", "vehicles", "services", ...
      remote[id] = docSnap.data();
    });
    console.log('[config] Config remota caricata da Firestore:', Object.keys(remote));
  } catch (e) {
    console.warn('[config] Firestore non raggiungibile, uso config statica:', e.message);
  }

  // 3. Merge: remote sovrascrive base per le chiavi esistenti
  CONFIG = {
    ...base,
    ...remote
  };

  // Normalizza: Firestore restituisce oggetti plain, assicura le strutture attese
  if (remote.spotTypes)      CONFIG.spotTypes      = remote.spotTypes;
  if (remote.vehicles)       CONFIG.vehicles       = remote.vehicles;
  if (remote.services)       CONFIG.services       = remote.services;
  if (remote.environmentTags && remote.environmentTags.list)
    CONFIG.environmentTags = remote.environmentTags.list;

  return CONFIG;
}

// Esporta CONFIG come oggetto reattivo (viene popolato dopo loadConfig())
export { CONFIG };
export function getConfig() { return CONFIG; }
