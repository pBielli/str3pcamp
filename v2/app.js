import { initFirebaseAuth, loginWithEmail, registerWithEmail, logoutFirebase, getFirebaseDb, FIREBASE_ENABLED } from './firebase-auth.js';

const STORAGE_KEY = 'str3pcamp-v1';

const SPOT_TYPES = {
  accoglienza: { label: 'Accoglienza', color: '#e8a030', markerColor: '#c47d10' },
  libero: { label: 'Libero', color: '#3d8a4e', markerColor: '#2a6a38' },
  camping: { label: 'Camping', color: '#3b7ade', markerColor: '#2a5ab8' },
};

const VEH = { tenda: '⛺', rooftop: '🚐' };

const ENV_TAGS = ['🌊 Mare', '⛰ Montagna', '🌄 Colline', '♨️ Terme', '🏛 Cultura', '🎡 Attrazioni', '🌲 Foresta', '🏞 Lago', '🌾 Pianura', '🛶 Fiume', '🍷 Vino & Cibo', '🚴 Sport'];

const SERVICES = { acqua: '💧 Acqua', parcheggio: '🅿️ Parcheggio', sentieri: '🥾 Sentieri', fuochi: '🔥 Fuochi', docce: '🚿 Docce', bagni: '🚻 Bagni', ristoro: '🍽️ Ristoro', wifi: '📶 WiFi', elettricità: '⚡ Elettricità', animali: '🐾 Animali ok' };

const DEFAULT_SPOTS = [
  {
    id: 1,
    name: 'Sosta libera - Genova Levante',
    lat: 44.4094352, lng: 8.6643941,
    region: 'Liguria · Italia',
    spotType: 'libero',
    vehicles: ['tenda', 'rooftop'],
    environments: ['🌊 Mare', '🌄 Colline'],
    description: 'Sosta libera vicino al mare, nei dintorni di Genova. Ottima posizione per chi ama la costa ligure con le sue calette e i borghi caratteristici.',
    services: [],
    rating: 5
  },
  {
    id: 2,
    name: 'Sosta libera - Cinque Terre entroterra',
    lat: 44.0416170, lng: 9.9681311,
    region: 'Liguria · Italia',
    spotType: 'libero',
    vehicles: ['tenda', 'rooftop'],
    environments: ['🌊 Mare', '⛰ Montagna', '🌄 Colline'],
    description: 'Sosta libera nell\'entroterra delle Cinque Terre, tra colline e mare. Paesaggi spettacolari con vista sul golfo e sentieri verso i borghi patrimonio UNESCO.',
    services: [],
    rating: 5
  },
  {
    id: 3,
    name: 'Sosta libera - Terme di San Filippo',
    lat: 42.9258709, lng: 11.7000723,
    region: 'Val d\'Orcia · Toscana · Italia',
    spotType: 'libero',
    vehicles: ['rooftop'],
    environments: ['♨️ Terme', '🌄 Colline', '🏛 Cultura', '🎡 Attrazioni'],
    description: 'Sosta libera vicinissima alle Terme di San Filippo e alla celebre "Balena Bianca", la cascata di travertino naturale dove le acque termali calde formano vasche naturali biancastre. Immersa nella magia della Val d\'Orcia.',
    services: [],
    rating: 5
  }
];

let spots = [];
let db = null;
let useFirebase = false;
let syncStatus = 'local';
let authUser = null;
let firestoreUnsubscribe = null;
let authMode = 'login';
let defaultsUploaded = false;
let map = null;
let markers = {};
let selectedId = null;
let searchVal = '';
let filterVal = 'tutti';
let addStep = 1;
let addForm = { name: '', lat: '', lng: '', region: '', spotType: 'libero', vehicles: [], environments: [], description: '', services: [], rating: 4 };
let toastT;

function setSyncBadge(status) {
  syncStatus = status;
  const badge = document.getElementById('sync-badge');
  if (!badge) return;
  const states = {
    local: { text: '💾 Locale', color: '#4a7a4e' },
    syncing: { text: '🔄 Sync...', color: '#e8a030' },
    online: { text: '☁️ Online', color: '#3d8a4e' },
    error: { text: '⚠️ Offline', color: '#8a4040' },
  };
  const s = states[status] || states.local;
  badge.textContent = s.text;
  badge.style.color = s.color;
}

function setAuthStatus(user) {
  authUser = user;
  const authBtn = document.getElementById('auth-btn');
  const userLabel = document.getElementById('user-label');

  if (authBtn) {
    authBtn.textContent = user ? 'Esci' : 'Login';
    authBtn.disabled = !FIREBASE_ENABLED;
    authBtn.onclick = user ? logoutHandler : openLoginModal;
  }

  if (userLabel) {
    userLabel.textContent = user ? user.email : '';
  }

  if (!FIREBASE_ENABLED) {
    setSyncBadge('local');
    const badge = document.getElementById('sync-badge');
    if (badge) badge.textContent = '⚠️ Firebase non configurato';
  }
}

function renderAuthForm() {
  const authTitle = document.getElementById('auth-title');
  const authSubmit = document.getElementById('auth-submit');
  const authToggle = document.getElementById('auth-toggle');
  const authMsg = document.getElementById('auth-msg');

  if (!authTitle || !authSubmit || !authToggle || !authMsg) return;

  if (authMode === 'login') {
    authTitle.textContent = '🔐 Accedi a Str3pcamp';
    authSubmit.textContent = 'Accedi';
    authToggle.textContent = 'Crea un account';
    authMsg.textContent = 'Usa email e password per sincronizzare i tuoi campeggi.';
  } else {
    authTitle.textContent = '📝 Registrati a Str3pcamp';
    authSubmit.textContent = 'Registrati';
    authToggle.textContent = 'Hai già un account?';
    authMsg.textContent = 'Crea un account per salvare i dati su Firebase e accedere da altri dispositivi.';
  }
}

function openLoginModal() {
  if (!FIREBASE_ENABLED) {
    toast('Configura Firebase in firebase-config.js', 'error');
    return;
  }
  authMode = 'login';
  renderAuthForm();
  document.getElementById('auth-modal')?.classList.add('open');
}

function closeLoginModal() {
  document.getElementById('auth-modal')?.classList.remove('open');
}

function toggleAuthMode() {
  authMode = authMode === 'login' ? 'register' : 'login';
  renderAuthForm();
}

async function authSubmitHandler() {
  const email = document.getElementById('auth-email')?.value.trim();
  const password = document.getElementById('auth-password')?.value.trim();
  if (!email || !password) {
    toast('Email e password sono obbligatorie', 'error');
    return;
  }
  try {
    if (authMode === 'login') {
      await loginWithEmail(email, password);
      toast('Accesso eseguito con successo');
    } else {
      await registerWithEmail(email, password);
      toast('Account creato con successo');
    }
    closeLoginModal();
  } catch (err) {
    toast(err?.message || 'Errore autenticazione', 'error');
  }
}

async function logoutHandler() {
  try {
    await logoutFirebase();
    detachFirestoreSync();
    loadLocal();
    setSyncBadge('local');
    toast('Disconnesso da Firebase');
  } catch (err) {
    toast('Errore durante la disconnessione', 'error');
  }
}

function detachFirestoreSync() {
  if (firestoreUnsubscribe) {
    firestoreUnsubscribe();
    firestoreUnsubscribe = null;
  }
  useFirebase = false;
  db = null;
}

async function startFirestoreSync() {
  if (!FIREBASE_ENABLED) {
    loadLocal();
    return;
  }

  db = getFirebaseDb();
  if (!db) {
    setSyncBadge('error');
    loadLocal();
    return;
  }

  useFirebase = true;
  setSyncBadge('syncing');

  const { collection, onSnapshot } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  const colRef = collection(db, 'spots');

  if (firestoreUnsubscribe) firestoreUnsubscribe();
  firestoreUnsubscribe = onSnapshot(colRef, (snapshot) => {
    spots = [];
    snapshot.forEach(d => spots.push({ ...d.data(), id: d.id }));
    if (spots.length === 0 && !defaultsUploaded) {
      defaultsUploaded = true;
      DEFAULT_SPOTS.forEach(s => fbSet(s));
    }
    renderMarkers();
    renderList();
    setSyncBadge('online');
  }, () => {
    setSyncBadge('error');
    loadLocal();
  });
}

function loadLocal() {
  useFirebase = false;
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    spots = (saved && saved.length > 0) ? saved : DEFAULT_SPOTS.map(s => ({ ...s }));
  } catch {
    spots = DEFAULT_SPOTS.map(s => ({ ...s }));
  }
  renderMarkers();
  renderList();
}

function saveLocal() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(spots)); } catch { }
}

async function fbSet(spot) {
  if (!useFirebase || !db) return;
  const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  setSyncBadge('syncing');
  await setDoc(doc(db, 'spots', String(spot.id)), spot);
  setSyncBadge('online');
}

async function fbDelete(id) {
  if (!useFirebase || !db) return;
  const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
  setSyncBadge('syncing');
  await deleteDoc(doc(db, 'spots', String(id)));
  setSyncBadge('online');
}

function save(spot) {
  if (useFirebase) {
    fbSet(spot);
  } else {
    saveLocal();
  }
}

function saveAll() {
  if (useFirebase) {
    spots.forEach(s => fbSet(s));
  } else {
    saveLocal();
  }
}

function getMarkerEmojis(spot) {
  if (spot.spotType === 'accoglienza') return '🏠';
  const base = '⛺';
  const isCamping = spot.spotType === 'camping';
  const hasTenda = spot.vehicles && spot.vehicles.includes('tenda');
  const hasRooftop = spot.vehicles && spot.vehicles.includes('rooftop');
  let txt = base;
  if (isCamping) txt += '💰';
  if (hasTenda && hasRooftop) txt += '🌲🚐';
  else if (hasTenda) txt += '🌲';
  else if (hasRooftop) txt += '🚐';
  return txt;
}

function mkIcon(spot, sel) {
  const emojis = getMarkerEmojis(spot);
  const col = SPOT_TYPES[spot.spotType]?.markerColor || '#3d8a4e';
  return L.divIcon({
    className: '',
    html: `<div class="camp-marker${sel ? ' sel' : ''}" style="border-color:${col};box-shadow:0 2px 8px rgba(0,0,0,.5)">${emojis}</div>`,
    iconSize: [null, null],
    iconAnchor: [20, 32],
    popupAnchor: [0, -34]
  });
}

function addMarker(spot) {
  const m = L.marker([spot.lat, spot.lng], { icon: mkIcon(spot, false) }).addTo(map);
  m.on('click', () => selectSpot(spot.id));
  markers[spot.id] = m;
}

function renderMarkers() {
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};
  const list = filtered();
  list.forEach(s => addMarker(s));
  document.getElementById('count-badge').textContent = list.length;
}

function selectSpot(id) {
  if (selectedId === id) { closeDetail(); return; }
  if (selectedId && markers[selectedId]) {
    const p = spots.find(s => s.id === selectedId);
    if (p) markers[selectedId].setIcon(mkIcon(p, false));
  }
  selectedId = id;
  const spot = spots.find(s => s.id === id);
  if (!spot) return;
  if (markers[id]) markers[id].setIcon(mkIcon(spot, true));
  map.panTo([spot.lat, spot.lng], { animate: true, duration: .5 });
  showDetail(spot);
}

function closeDetail() {
  if (selectedId && markers[selectedId]) {
    const s = spots.find(x => x.id === selectedId);
    if (s) markers[selectedId].setIcon(mkIcon(s, false));
  }
  selectedId = null;
  document.getElementById('detail-card').classList.remove('open');
}

function showDetail(spot) {
  const typeInfo = SPOT_TYPES[spot.spotType] || SPOT_TYPES.libero;
  const emojis = getMarkerEmojis(spot);
  const card = document.getElementById('detail-card');

  const vehLabel = spot.spotType !== 'accoglienza' ? (() => {
    const v = spot.vehicles || [];
    if (v.includes('tenda') && v.includes('rooftop')) return 'Tenda & Tenda da tetto';
    if (v.includes('rooftop')) return 'Tenda da tetto';
    if (v.includes('tenda')) return 'Tenda';
    return '';
  })() : '';

  const envHtml = (spot.environments || []).map(e => `<span class="d-env-tag">${e}</span>`).join('');
  const svcHtml = (spot.services || []).map(s => `<span class="d-tag">${SERVICES[s] || s}</span>`).join('');

  card.innerHTML = `
    <div id="detail-scroll">
      <span class="d-type-badge" style="background:${typeInfo.color}22;color:${typeInfo.color};border:1px solid ${typeInfo.color}44">${typeInfo.label.toUpperCase()}${vehLabel ? ' · ' + vehLabel : ''}</span>
      <div class="d-icons" style="margin-top:8px">${emojis}</div>
      <div class="d-name">${spot.name}</div>
      <div class="d-region">📍 ${spot.region}</div>
      <div class="d-stars">${'★'.repeat(spot.rating || 0)}${'☆'.repeat(5 - (spot.rating || 0))}</div>
      ${envHtml ? `<div class="d-env">${envHtml}</div>` : ''}
      <div class="d-desc">${spot.description}</div>
      ${svcHtml ? `<div class="d-tags">${svcHtml}</div>` : ''}
      <div class="d-coords">${spot.lat.toFixed(5)}°N · ${spot.lng.toFixed(5)}°E</div>
    </div>
    <div class="d-actions">
      <button class="btn-nav" id="d-btn-nav">🧭 Naviga</button>
      <button class="btn-cls" id="d-btn-cls">✕ Chiudi</button>
      <button class="btn-edit" id="d-btn-edit">✏️ Modifica</button>
      <button class="btn-del" id="d-btn-del">🗑 Elimina</button>
    </div>`;

  function tap(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', fn);
    el.addEventListener('touchend', function (e) { e.preventDefault(); fn(); }, { passive: false });
  }
  const sid = spot.id;
  const slat = spot.lat, slng = spot.lng;
  tap('d-btn-nav', () => navTo(slat, slng));
  tap('d-btn-cls', () => closeDetail());
  tap('d-btn-edit', () => openEdit(sid));
  tap('d-btn-del', () => confirmDelete(sid));

  card.classList.add('open');
}

function navTo(lat, lng) { window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank'); }

function confirmDelete(id) {
  const spot = spots.find(s => s.id === id);
  if (!spot) return;
  document.getElementById('confirm-msg').textContent = `Vuoi davvero eliminare "${spot.name}"? L'operazione non è reversibile.`;
  const yesBtn = document.getElementById('confirm-yes-btn');
  const newYes = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(newYes, yesBtn);
  newYes.addEventListener('click', () => { doDelete(id); closeConfirm(); });
  newYes.addEventListener('touchend', (e) => { e.preventDefault(); doDelete(id); closeConfirm(); }, { passive: false });
  const noBtn = document.getElementById('confirm-modal').querySelector('.confirm-no');
  const newNo = noBtn.cloneNode(true);
  noBtn.parentNode.replaceChild(newNo, noBtn);
  newNo.addEventListener('click', closeConfirm);
  newNo.addEventListener('touchend', (e) => { e.preventDefault(); closeConfirm(); }, { passive: false });
  document.getElementById('confirm-modal').classList.add('open');
}

function closeConfirm() { document.getElementById('confirm-modal').classList.remove('open'); }

function doDelete(id) {
  spots = spots.filter(s => s.id !== id);
  if (useFirebase) fbDelete(id);
  else saveLocal();
  closeDetail();
  renderMarkers();
  renderList();
  toast('Luogo eliminato');
}

function openEdit(id) {
  const spot = spots.find(s => s.id === id);
  if (!spot) return;
  closeDetail();
  const c = document.getElementById('edit-content');
  c.innerHTML = `
    <label class="flabel">NOME</label>
    <input class="finput" id="e-name" type="text" value="${esc(spot.name)}">
    <label class="flabel">REGIONE / PAESE</label>
    <input class="finput" id="e-region" type="text" value="${esc(spot.region)}">
    <label class="flabel">TIPO DI POSTO</label>
    <div class="type-grid" id="e-type-grid">
      <div class="type-card${spot.spotType === 'accoglienza' ? ' on' : ''}" onclick="eSetType(this,'accoglienza')"><div class="tc-icon">🏠</div><div class="tc-label">ACCOGLIENZA</div></div>
      <div class="type-card${spot.spotType === 'libero' ? ' on' : ''}" onclick="eSetType(this,'libero')"><div class="tc-icon">⛺🌲</div><div class="tc-label">LIBERO</div></div>
      <div class="type-card${spot.spotType === 'camping' ? ' on' : ''}" onclick="eSetType(this,'camping')" style="grid-column:span 2"><div class="tc-icon">⛺💰</div><div class="tc-label">CAMPING A PAGAMENTO</div></div>
    </div>
    <div id="e-veh-wrap">
      <label class="flabel">VEICOLI ACCETTATI</label>
      <div class="veh-row">
        <div class="veh-btn${(spot.vehicles || []).includes('tenda') ? ' on' : ''}" id="e-veh-tenda" onclick="eTogVeh(this,'tenda')">⛺<div class="vl">TENDA</div></div>
        <div class="veh-btn${(spot.vehicles || []).includes('rooftop') ? ' on' : ''}" id="e-veh-rooftop" onclick="eTogVeh(this,'rooftop')">🚐<div class="vl">TENDA DA TETTO</div></div>
      </div>
    </div>
    <label class="flabel">LATITUDINE</label>
    <input class="finput" id="e-lat" type="number" step=".00001" value="${spot.lat}">
    <label class="flabel">LONGITUDINE</label>
    <input class="finput" id="e-lng" type="number" step=".00001" value="${spot.lng}">
    <label class="flabel">DESCRIZIONE</label>
    <textarea class="finput ftarea" id="e-desc">${esc(spot.description)}</textarea>
    <label class="flabel">AMBIENTE E ATTRAZIONI</label>
    <div class="env-grid">${ENV_TAGS.map(e => `<div class="echip${(spot.environments || []).includes(e) ? ' on' : ''}" onclick="this.classList.toggle('on')">${e}</div>`).join('')}</div>
    <label class="flabel">VALUTAZIONE</label>
    <div class="star-row" id="e-stars">${[1, 2, 3, 4, 5].map(n => `<span class="star-p" data-n="${n}" style="color:${n <= (spot.rating || 0) ? '#f0b429' : '#2a4a2a'}" onclick="eSetRat(${n})">★</span>`).join('')}</div>
    <label class="flabel">SERVIZI</label>
    <div class="svcs-grid">${Object.entries(SERVICES).map(([k, v]) => `<div class="schip${(spot.services || []).includes(k) ? ' on' : ''}" onclick="this.classList.toggle('on')" data-svc="${k}">${v}</div>`).join('')}</div>
    <div class="btn-row" style="margin-top:16px">
      <button class="bback" onclick="closeEdit()">✕ Annulla</button>
      <button class="bprim" onclick="saveEdit(${id})">✓ Salva</button>
    </div>`;
  if (spot.spotType === 'accoglienza') document.getElementById('e-veh-wrap').style.display = 'none';
  document.getElementById('edit-modal').classList.add('open');
}

function closeEdit() { document.getElementById('edit-modal').classList.remove('open'); }

function eSetType(el, type) {
  document.querySelectorAll('#e-type-grid .type-card').forEach(c => c.classList.remove('on'));
  el.classList.add('on');
  document.getElementById('e-veh-wrap').style.display = type === 'accoglienza' ? 'none' : 'block';
}

function eTogVeh(el) { el.classList.toggle('on'); }

function eSetRat(n) {
  document.querySelectorAll('#e-stars .star-p').forEach(s => {
    s.style.color = parseInt(s.dataset.n) <= n ? '#f0b429' : '#2a4a2a';
  });
}

function saveEdit(id) {
  const idx = spots.findIndex(s => s.id === id);
  if (idx < 0) return;
  const typeEl = document.querySelector('#e-type-grid .type-card.on');
  const spotType = typeEl ? (typeEl.querySelector('.tc-icon').textContent.includes('🏠') ? 'accoglienza' : typeEl.querySelector('.tc-icon').textContent.includes('💰') ? 'camping' : 'libero') : spots[idx].spotType;
  const vehicles = [];
  if (document.getElementById('e-veh-tenda')?.classList.contains('on')) vehicles.push('tenda');
  if (document.getElementById('e-veh-rooftop')?.classList.contains('on')) vehicles.push('rooftop');
  const environments = [...document.querySelectorAll('.echip.on')].map(e => e.textContent.trim());
  const services = [...document.querySelectorAll('[data-svc].on')].map(e => e.dataset.svc);
  const rat = [...document.querySelectorAll('#e-stars .star-p')].filter(s => s.style.color === 'rgb(240, 180, 41)').length;
  spots[idx] = {
    ...spots[idx],
    name: document.getElementById('e-name').value.trim() || spots[idx].name,
    region: document.getElementById('e-region').value.trim() || spots[idx].region,
    lat: parseFloat(document.getElementById('e-lat').value) || spots[idx].lat,
    lng: parseFloat(document.getElementById('e-lng').value) || spots[idx].lng,
    description: document.getElementById('e-desc').value.trim() || spots[idx].description,
    spotType, vehicles, environments, services, rating: rat || spots[idx].rating,
  };
  save(spots[idx]);
  closeEdit();
  if (!useFirebase) { renderMarkers(); renderList(); }
  setTimeout(() => selectSpot(id), 100);
  toast('Modifiche salvate! ✓');
}

function goToGPS() {
  const btn = document.getElementById('gps-btn');
  if (!btn) return;
  btn.textContent = '⏳';
  navigator.geolocation.getCurrentPosition(pos => {
    btn.textContent = '📍';
    map.setView([pos.coords.latitude, pos.coords.longitude], 13, { animate: true });
    L.circleMarker([pos.coords.latitude, pos.coords.longitude], { radius: 8, color: '#3d8a4e', fillColor: '#5daa6e', fillOpacity: .8, weight: 2 }).addTo(map);
    toast('Posizione trovata! 📍');
  }, () => { btn.textContent = '📍'; toast('GPS non disponibile', 'error'); });
}

function filtered() {
  const q = searchVal.toLowerCase();
  return spots.filter(s =>
    (s.name.toLowerCase().includes(q) || (s.region || '').toLowerCase().includes(q)) &&
    (filterVal === 'tutti' || s.spotType === filterVal)
  );
}

function renderList() {
  const list = filtered();
  document.getElementById('list-count').textContent = list.length;
  if (!list.length) {
    document.getElementById('list-container').innerHTML = `<div class="empty-state"><div class="big">🏕️</div><div class="msg">NESSUN LUOGO ANCORA<br>Vai su ➕ per aggiungere<br>il primo campeggio!</div></div>`;
    return;
  }
  document.getElementById('list-container').innerHTML = list.map((s, i) => {
    const ti = SPOT_TYPES[s.spotType] || SPOT_TYPES.libero;
    const emojis = getMarkerEmojis(s);
    return `<div class="scard" style="animation-delay:${i * 30}ms" onclick="goToSpot(${s.id})">
      <div class="s-icons">${emojis}</div>
      <div style="flex:1;min-width:0">
        <div><span class="s-name">${s.name}</span><span class="s-type-badge" style="background:${ti.color}22;color:${ti.color}">${ti.label}</span></div>
        <div class="s-region">${s.region}</div>
        <div class="s-desc">${s.description}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">${(s.environments || []).map(e => `<span style="font-size:11px;color:#4a8a5a">${e}</span>`).join('')}</div>
        <div class="s-stars">${'★'.repeat(s.rating || 0)}${'☆'.repeat(5 - (s.rating || 0))}</div>
      </div></div>`;
  }).join('');
}

function goToSpot(id) { switchPanel('map'); setTimeout(() => selectSpot(id), 120); }

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

function renderAddStep() {
  const stepLabel = document.getElementById('step-label');
  if (stepLabel) stepLabel.textContent = `PASSO ${addStep} DI 4`;
  document.querySelectorAll('.sseg').forEach((s, i) => s.style.background = i < addStep ? '#2a5a34' : '#1a3a1e');
  const c = document.getElementById('step-content');
  if (!c) return;

  if (addStep === 1) {
    c.innerHTML = `
      <label class="flabel">NOME DEL LUOGO *</label>
      <input class="finput" id="f-name" type="text" placeholder="Es. Pineta di Castel Porziano..." value="${esc(addForm.name)}">
      <label class="flabel">REGIONE / PAESE *</label>
      <input class="finput" id="f-region" type="text" placeholder="Es. Lazio · Italia" value="${esc(addForm.region)}">
      <label class="flabel">TIPO DI POSTO</label>
      <div class="type-grid">
        <div class="type-card${addForm.spotType === 'accoglienza' ? ' on' : ''}" onclick="setSpotType('accoglienza')">
          <div class="tc-icon">🏠</div><div class="tc-label">ACCOGLIENZA<br>struttura ricettiva</div>
        </div>
        <div class="type-card${addForm.spotType === 'libero' ? ' on' : ''}" onclick="setSpotType('libero')">
          <div class="tc-icon">⛺🌲</div><div class="tc-label">LIBERO<br>campeggio gratuito</div>
        </div>
        <div class="type-card${addForm.spotType === 'camping' ? ' on' : ''}" onclick="setSpotType('camping')" style="grid-column:span 2">
          <div class="tc-icon">⛺💰</div><div class="tc-label">CAMPING A PAGAMENTO</div>
        </div>
      </div>
      ${addForm.spotType !== 'accoglienza' ? `
      <label class="flabel">TIPO DI VEICOLO ACCETTATO</label>
      <div class="veh-row">
        <div class="veh-btn${addForm.vehicles.includes('tenda') ? ' on' : ''}" onclick="togVeh('tenda')">⛺<div class="vl">TENDA</div></div>
        <div class="veh-btn${addForm.vehicles.includes('rooftop') ? ' on' : ''}" onclick="togVeh('rooftop')">🚐<div class="vl">TENDA DA TETTO</div></div>
      </div>` : ''}
      <div class="btn-row"><button class="bprim" onclick="s1next()">Avanti →</button></div>`;
  } else if (addStep === 2) {
    c.innerHTML = `
      <div style="color:#5a8a5e;font-size:13px;margin-bottom:10px">Dove si trova?</div>
      <div class="frow">
        <div><label class="flabel">LATITUDINE *</label><input class="finput" id="f-lat" type="number" step=".00001" placeholder="46.6944" value="${addForm.lat}"></div>
        <div><label class="flabel">LONGITUDINE *</label><input class="finput" id="f-lng" type="number" step=".00001" placeholder="12.0844" value="${addForm.lng}"></div>
      </div>
      <div class="ibox">💡 <strong>Come trovare le coordinate:</strong><br>Apri Google Maps → tieni premuto sul punto → copia i numeri in basso.</div>
      <button class="bprim" style="margin-top:10px;width:100%" onclick="useGPS()">📍 Usa il mio GPS</button>
      <div class="btn-row" style="margin-top:8px">
        <button class="bback" onclick="addStep=1;renderAddStep()">← Indietro</button>
        <button class="bprim" onclick="s2next()">Avanti →</button>
      </div>`;
  } else if (addStep === 3) {
    c.innerHTML = `
      <label class="flabel">DESCRIZIONE *</label>
      <textarea class="finput ftarea" id="f-desc" placeholder="Descrivi il luogo, l'atmosfera, cosa si può fare...">${esc(addForm.description)}</textarea>
      <label class="flabel">AMBIENTE E ATTRAZIONI</label>
      <div class="env-grid">${ENV_TAGS.map(e => `<div class="echip${addForm.environments.includes(e) ? ' on' : ''}" onclick="togEnv('${e.replace(/'/g, "\\'")}')">${e}</div>`).join('')}</div>
      <label class="flabel">VALUTAZIONE</label>
      <div class="star-row">${[1, 2, 3, 4, 5].map(n => `<span class="star-p" style="color:${n <= (addForm.rating || 0) ? '#f0b429' : '#2a4a2a'}" onclick="setRat(${n})">★</span>`).join('')}</div>
      <div class="btn-row" style="margin-top:14px">
        <button class="bback" onclick="addStep=2;renderAddStep()">← Indietro</button>
        <button class="bprim" onclick="s3next()">Avanti →</button>
      </div>`;
  } else {
    c.innerHTML = `
      <label class="flabel">SERVIZI DISPONIBILI</label>
      <div class="svcs-grid">${Object.entries(SERVICES).map(([k, v]) => `<div class="schip${addForm.services.includes(k) ? ' on' : ''}" onclick="togSvc('${k}')">${v}</div>`).join('')}</div>
      <div class="prev-box" style="margin-top:16px">
        <div class="prev-lbl">ANTEPRIMA</div>
        <div style="font-size:20px;margin-bottom:4px">${getMarkerEmojis(addForm)}</div>
        <div style="font-size:17px;font-weight:700;color:#c8e4b8">${esc(addForm.name)}</div>
        <div style="font-family:'Space Mono',monospace;font-size:10px;color:#4a7a4e">${esc(addForm.region)} · ${SPOT_TYPES[addForm.spotType]?.label || ''}</div>
        <div style="font-size:12px;color:#5a8a5e;margin-top:4px">${esc(addForm.description)}</div>
        ${(addForm.environments || []).length ? `<div style="margin-top:6px;font-size:12px">${addForm.environments.join(' ')}</div>` : ''}
      </div>
      <div class="btn-row">
        <button class="bback" onclick="addStep=3;renderAddStep()">← Indietro</button>
        <button class="bprim" onclick="submitSpot()">✓ Aggiungi Luogo</button>
      </div>`;
  }
}

function setSpotType(t) { addForm.spotType = t; if (t === 'accoglienza') addForm.vehicles = []; renderAddStep(); }

function togVeh(v) { addForm.vehicles = addForm.vehicles.includes(v) ? addForm.vehicles.filter(x => x !== v) : [...addForm.vehicles, v]; renderAddStep(); }

function togEnv(e) { addForm.environments = addForm.environments.includes(e) ? addForm.environments.filter(x => x !== e) : [...addForm.environments, e]; renderAddStep(); }

function togSvc(k) { addForm.services = addForm.services.includes(k) ? addForm.services.filter(x => x !== k) : [...addForm.services, k]; renderAddStep(); }

function setRat(n) { addForm.rating = n; renderAddStep(); }

function s1next() {
  addForm.name = document.getElementById('f-name').value.trim();
  addForm.region = document.getElementById('f-region').value.trim();
  if (!addForm.name || !addForm.region) { toast('Nome e regione sono obbligatori', 'error'); return; }
  if (addForm.spotType !== 'accoglienza' && !addForm.vehicles.length) { toast('Seleziona almeno un tipo di veicolo', 'error'); return; }
  addStep = 2; renderAddStep();
}

function s2next() {
  addForm.lat = document.getElementById('f-lat').value;
  addForm.lng = document.getElementById('f-lng').value;
  if (!addForm.lat || !addForm.lng) { toast('Le coordinate GPS sono obbligatorie', 'error'); return; }
  addStep = 3; renderAddStep();
}

function s3next() {
  addForm.description = document.getElementById('f-desc').value.trim();
  if (!addForm.description) { toast('Aggiungi una descrizione', 'error'); return; }
  addStep = 4; renderAddStep();
}

function useGPS() {
  toast('Rilevamento...');
  navigator.geolocation.getCurrentPosition(p => {
    document.getElementById('f-lat').value = p.coords.latitude.toFixed(6);
    document.getElementById('f-lng').value = p.coords.longitude.toFixed(6);
    toast('Posizione rilevata! 📍');
  }, () => toast('GPS non disponibile', 'error'));
}

function submitSpot() {
  const ns = { ...addForm, id: Date.now(), lat: parseFloat(addForm.lat), lng: parseFloat(addForm.lng) };
  spots.push(ns);
  save(ns);
  if (!useFirebase) { addMarker(ns); renderList(); }
  addForm = { name: '', lat: '', lng: '', region: '', spotType: 'libero', vehicles: [], environments: [], description: '', services: [], rating: 4 };
  addStep = 1;
  switchPanel('map');
  setTimeout(() => { map.setView([ns.lat, ns.lng], 13, { animate: true }); selectSpot(ns.id); }, 150);
  toast('Luogo aggiunto! 🏕️');
}

function switchPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(name + '-panel').classList.add('active');
  document.querySelector(`[data-panel="${name}"]`)?.classList.add('active');
  if (name === 'map') setTimeout(() => map.invalidateSize(), 50);
  if (name === 'list') renderList();
  if (name === 'add') renderAddStep();
}

function toast(msg, type = 'success') {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.className = 'show ' + type;
  clearTimeout(toastT);
  toastT = setTimeout(() => el.className = '', 3000);
}

async function handleAuthState(user) {
  setAuthStatus(user);
  if (user) {
    await startFirestoreSync();
  } else {
    detachFirestoreSync();
    loadLocal();
    if (FIREBASE_ENABLED) setSyncBadge('local');
  }
}

async function initApp() {
  map = L.map('leaflet-map', { zoomControl: false }).setView([45.5, 12], 5);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  const LAYERS = {
    street: L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { attribution: '© CartoDB © OpenStreetMap', maxZoom: 19, subdomains: 'abcd' }),
    satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri World Imagery', maxZoom: 19 }),
    topo: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', { attribution: '© Esri World Topo', maxZoom: 19 }),
  };
  LAYERS.street.addTo(map);
  let curLayer = 'street';
  window.setLayer = (n) => { map.removeLayer(LAYERS[curLayer]); LAYERS[n].addTo(map); curLayer = n; document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active')); document.getElementById('btn-' + n).classList.add('active'); };

  document.getElementById('search-input').addEventListener('input', e => { searchVal = e.target.value; renderMarkers(); if (document.getElementById('list-panel').classList.contains('active')) renderList(); });
  document.getElementById('filter-type').addEventListener('change', e => { filterVal = e.target.value; renderMarkers(); if (document.getElementById('list-panel').classList.contains('active')) renderList(); });

  document.querySelectorAll('.nav-btn').forEach(b => b.addEventListener('click', () => switchPanel(b.dataset.panel)));
  map.on('click', () => { if (selectedId) closeDetail(); });

  document.getElementById('auth-cancel')?.addEventListener('click', closeLoginModal);
  document.getElementById('auth-submit')?.addEventListener('click', authSubmitHandler);
  document.getElementById('auth-toggle')?.addEventListener('click', toggleAuthMode);
  document.getElementById('auth-btn')?.addEventListener('click', openLoginModal);

  const manifestData = {
    name: 'Str3pcamp',
    short_name: 'Str3pcamp',
    description: 'Campeggio libero in Europa',
    start_url: '.',
    display: 'standalone',
    background_color: '#0a1409',
    theme_color: '#0a1409',
    icons: [
      {
        src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="18" fill="%230a1409"/><text y="72" font-size="70" x="12">🏕️</text></svg>',
        sizes: 'any',
        type: 'image/svg+xml'
      }
    ]
  };
  const manifestLink = document.createElement('link');
  manifestLink.rel = 'manifest';
  manifestLink.href = URL.createObjectURL(new Blob([JSON.stringify(manifestData)], { type: 'application/json' }));
  document.head.appendChild(manifestLink);

  initFirebaseAuth(handleAuthState);
  setSyncBadge('local');
  setAuthStatus(null);
}

window.goToGPS = goToGPS;
window.closeConfirm = closeConfirm;
window.closeEdit = closeEdit;
window.eSetType = eSetType;
window.eTogVeh = eTogVeh;
window.eSetRat = eSetRat;
window.setSpotType = setSpotType;
window.togVeh = togVeh;
window.togEnv = togEnv;
window.togSvc = togSvc;
window.setRat = setRat;
window.s1next = s1next;
window.s2next = s2next;
window.s3next = s3next;
window.useGPS = useGPS;
window.submitSpot = submitSpot;
window.openEdit = openEdit;
window.saveEdit = saveEdit;
window.confirmDelete = confirmDelete;
window.goToSpot = goToSpot;
window.openLoginModal = openLoginModal;

window.addEventListener('DOMContentLoaded', initApp);
