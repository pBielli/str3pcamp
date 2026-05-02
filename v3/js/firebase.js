// ── FIREBASE & STORAGE MODULE ─────────────────────────────────

let db = null, auth = null;
export let useFirebase = false;
export let currentUser = null;
let spots = [];
let onSpotsChange = null;

export function setOnSpotsChange(fn) { onSpotsChange = fn; }
export function getSpots() { return spots; }
export function setSpots(arr) { spots = arr; }

export function setSyncBadge(status) {
  const badge = document.getElementById('sync-badge');
  if (!badge) return;
  const states = {
    local:   { text: '💾 Locale',  color: '#4a7a4e' },
    syncing: { text: '🔄 Sync...', color: '#e8a030' },
    online:  { text: '☁️ Online',  color: '#3d8a4e' },
    error:   { text: '⚠️ Offline', color: '#8a4040' },
  };
  const s = states[status] || states.local;
  badge.textContent = s.text;
  badge.style.color = s.color;
}

export function updateAuthUI(user) {
  currentUser = user;
  const loginBtn  = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const userInfo  = document.getElementById('user-info');
  if (user) {
    if (loginBtn)  loginBtn.style.display  = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
    if (userInfo)  { userInfo.textContent = user.displayName || user.email; userInfo.style.display = 'block'; }
  } else {
    if (loginBtn)  loginBtn.style.display  = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (userInfo)  userInfo.style.display  = 'none';
  }
}

export async function initFirebase(config, defaultSpots) {
  try {
    setSyncBadge('syncing');
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js');
    const { getFirestore, collection, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
    const { getAuth, onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js');

    const app = initializeApp(config);
    db   = getFirestore(app);
    auth = getAuth(app);
    useFirebase = true;
    window._fbAuth     = auth;
    window._fbProvider = new GoogleAuthProvider();
    window._fbSignOut  = signOut;

    onAuthStateChanged(auth, user => updateAuthUI(user));

    document.getElementById('login-btn').onclick = () =>
      signInWithPopup(auth, window._fbProvider)
        .then(() => window.toast && window.toast('Accesso effettuato! 👋'))
        .catch(e => window.toast && window.toast('Errore login: ' + e.message, 'error'));

    document.getElementById('logout-btn').onclick = () =>
      signOut(auth).then(() => window.toast && window.toast('Disconnesso'));

    const colRef = collection(db, 'spots');
    onSnapshot(colRef, (snapshot) => {
      spots = [];
      snapshot.forEach(d => spots.push({ ...d.data(), id: d.id }));
      if (spots.length === 0 && !window._defaultsUploaded) {
        window._defaultsUploaded = true;
        defaultSpots.forEach(s => fbSet(s));
      }
      if (onSpotsChange) onSpotsChange();
      setSyncBadge('online');
    }, () => { setSyncBadge('error'); loadLocal(defaultSpots); });

  } catch (e) {
    console.warn('Firebase init failed', e);
    setSyncBadge('error');
    loadLocal(defaultSpots);
  }
}

export function loadLocal(defaultSpots) {
  useFirebase = false;
  try {
    const saved = JSON.parse(localStorage.getItem('str3pcamp-v1'));
    spots = (saved && saved.length > 0) ? saved : defaultSpots.map(s => ({ ...s }));
  } catch { spots = defaultSpots.map(s => ({ ...s })); }
  if (onSpotsChange) onSpotsChange();
}

export function saveLocal() {
  try { localStorage.setItem('str3pcamp-v1', JSON.stringify(spots)); } catch {}
}

export async function fbSet(spot) {
  if (!useFirebase || !db) return;
  const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  setSyncBadge('syncing');
  await setDoc(doc(db, 'spots', String(spot.id)), spot);
  setSyncBadge('online');
}

export async function fbDelete(id) {
  if (!useFirebase || !db) return;
  const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  setSyncBadge('syncing');
  await deleteDoc(doc(db, 'spots', String(id)));
  setSyncBadge('online');
}

export function save(spot) {
  if (useFirebase) fbSet(spot);
  else saveLocal();
}

export function saveAll() {
  if (useFirebase) spots.forEach(s => fbSet(s));
  else saveLocal();
}
