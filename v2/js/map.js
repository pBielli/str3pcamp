// ── MAP MODULE ────────────────────────────────────────────────

import { getSpots, currentUser } from './firebase.js';

export let map = null;
let markers = {};
export let selectedId = null;
let curLayer = 'street';
let userLocationMarker = null;
let userLocationWatcher = null;
let layers = {};

// Set from config
let SPOT_TYPES = {};
let onSelectSpot = null;
let getFiltered = null;

export function initMap(config, spotTypes, onSelect, filteredFn) {
  SPOT_TYPES = spotTypes;
  onSelectSpot = onSelect;
  getFiltered = filteredFn;

  map = L.map('leaflet-map', { zoomControl: false }).setView(
    config.map.defaultCenter,
    config.map.defaultZoom
  );
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // Setup layers
  const cfgLayers = config.map.layers;
  for (const [key, val] of Object.entries(cfgLayers)) {
    const opts = { attribution: val.attribution, maxZoom: val.maxZoom };
    if (val.subdomains) opts.subdomains = val.subdomains;
    layers[key] = L.tileLayer(val.url, opts);
  }
  layers[config.map.defaultLayer].addTo(map);
  curLayer = config.map.defaultLayer;

  // Build layer switcher buttons
  const switcher = document.getElementById('layer-switcher');
  switcher.innerHTML = '';
  for (const [key, val] of Object.entries(cfgLayers)) {
    const btn = document.createElement('button');
    btn.className = 'layer-btn' + (key === curLayer ? ' active' : '');
    btn.id = 'btn-' + key;
    btn.textContent = val.emoji + ' ' + val.label;
    btn.onclick = () => setLayer(key);
    switcher.appendChild(btn);
  }

  map.on('click', () => { if (selectedId) closeDetail(); });
}

export function setLayer(n) {
  map.removeLayer(layers[curLayer]);
  layers[n].addTo(map);
  curLayer = n;
  document.querySelectorAll('.layer-btn').forEach(b => b.classList.remove('active'));
  const btn = document.getElementById('btn-' + n);
  if (btn) btn.classList.add('active');
}

// ── MARKERS ───────────────────────────────────────────────────
function getMarkerEmojis(spot) {
  if (spot.spotType === 'accoglienza') return '🏠';
  const base = '⛺';
  const isCamping  = spot.spotType === 'camping';
  const hasTenda   = spot.vehicles && spot.vehicles.includes('tenda');
  const hasRooftop = spot.vehicles && spot.vehicles.includes('rooftop');
  let txt = base;
  if (isCamping) txt += '💰';
  if (hasTenda && hasRooftop) txt += '🌲🚐';
  else if (hasTenda)          txt += '🌲';
  else if (hasRooftop)        txt += '🚐';
  return txt;
}
export { getMarkerEmojis };

function mkIcon(spot, sel) {
  const emojis = getMarkerEmojis(spot);
  const col = SPOT_TYPES[spot.spotType]?.markerColor || '#3d8a4e';
  return L.divIcon({
    className: '',
    html: `<div class="camp-marker${sel ? ' sel' : ''}" style="border-color:${col}">${emojis}</div>`,
    iconSize: [null, null],
    iconAnchor: [20, 32],
    popupAnchor: [0, -34]
  });
}

function addMarker(spot) {
  const m = L.marker([spot.lat, spot.lng], { icon: mkIcon(spot, false) }).addTo(map);
  m.on('click', () => { if (onSelectSpot) onSelectSpot(spot.id); });
  markers[spot.id] = m;
}

export function renderMarkers() {
  Object.values(markers).forEach(m => map.removeLayer(m));
  markers = {};
  const list = getFiltered ? getFiltered() : getSpots();
  list.forEach(s => addMarker(s));
  const badge = document.getElementById('count-badge');
  if (badge) badge.textContent = list.length;
}

export function selectSpot(id) {
  if (selectedId === id) { closeDetail(); return; }
  if (selectedId && markers[selectedId]) {
    const prev = getSpots().find(s => s.id === selectedId);
    if (prev) markers[selectedId].setIcon(mkIcon(prev, false));
  }
  selectedId = id;
  const spot = getSpots().find(s => s.id === id);
  if (!spot) return;
  if (markers[id]) markers[id].setIcon(mkIcon(spot, true));
  map.panTo([spot.lat, spot.lng], { animate: true, duration: .5 });
  showDetail(spot);
}

export function closeDetail() {
  if (selectedId && markers[selectedId]) {
    const s = getSpots().find(x => x.id === selectedId);
    if (s) markers[selectedId].setIcon(mkIcon(s, false));
  }
  selectedId = null;
  document.getElementById('detail-card').classList.remove('open');
}

// ── DETAIL CARD ───────────────────────────────────────────────
function showDetail(spot) {
  const typeInfo = SPOT_TYPES[spot.spotType] || SPOT_TYPES.libero;
  const emojis = getMarkerEmojis(spot);
  const card = document.getElementById('detail-card');

  const SERVICES = window.APP_CONFIG?.services || {};

  const vehLabel = spot.spotType !== 'accoglienza' ? (() => {
    const v = spot.vehicles || [];
    if (v.includes('tenda') && v.includes('rooftop')) return 'Tenda & Tenda da tetto';
    if (v.includes('rooftop')) return 'Tenda da tetto';
    if (v.includes('tenda'))   return 'Tenda';
    return '';
  })() : '';

  const envHtml = (spot.environments || []).map(e => `<span class="d-env-tag">${e}</span>`).join('');
  const svcHtml = (spot.services || []).map(s => `<span class="d-tag">${SERVICES[s] || s}</span>`).join('');

  card.innerHTML = `
    <div id="detail-scroll">
      <span class="d-type-badge" style="background:${typeInfo.color}22;color:${typeInfo.color};border:1px solid ${typeInfo.color}44">
        ${typeInfo.label.toUpperCase()}${vehLabel ? ' · ' + vehLabel : ''}
      </span>
      <div class="d-icons" style="margin-top:8px">${emojis}</div>
      <div class="d-name">${esc(spot.name)}</div>
      <div class="d-region">📍 ${esc(spot.region)}${spot.city ? ' · ' + esc(spot.city) : ''}</div>
      <div class="d-stars">${'★'.repeat(spot.rating || 0)}${'☆'.repeat(5 - (spot.rating || 0))}</div>
      ${envHtml ? `<div class="d-env">${envHtml}</div>` : ''}
      <div class="d-desc">${esc(spot.description)}</div>
      ${svcHtml ? `<div class="d-tags">${svcHtml}</div>` : ''}
      <div class="d-coords">${spot.lat.toFixed(5)}°N · ${spot.lng.toFixed(5)}°E</div>
    </div>
    <div class="d-actions">
      <button class="btn-nav" id="d-btn-nav">🧭 Naviga</button>
      <button class="btn-cls" id="d-btn-cls">✕ Chiudi</button>
      ${currentUser ? `<button class="btn-edit" id="d-btn-edit">✏️</button><button class="btn-del" id="d-btn-del">🗑</button>` : ''}
    </div>`;

  function tap(id, fn) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', fn);
    el.addEventListener('touchend', e => { e.preventDefault(); fn(); }, { passive: false });
  }
  const sid = spot.id, slat = spot.lat, slng = spot.lng;
  tap('d-btn-nav',  () => navTo(slat, slng));
  tap('d-btn-cls',  () => closeDetail());
  tap('d-btn-edit', () => window.openEdit && window.openEdit(sid));
  tap('d-btn-del',  () => window.confirmDelete && window.confirmDelete(sid));

  card.classList.add('open');
}

function navTo(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── USER LOCATION ─────────────────────────────────────────────
export function startUserLocation() {
  if (!navigator.geolocation) {
    window.toast && window.toast('GPS non supportato', 'error');
    return;
  }

  const btn = document.getElementById('gps-btn');
  if (btn) btn.textContent = '⏳';

  const opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 };

  navigator.geolocation.getCurrentPosition(pos => {
    if (btn) btn.textContent = '📍';
    placeUserMarker(pos.coords.latitude, pos.coords.longitude);
    map.setView([pos.coords.latitude, pos.coords.longitude], 13, { animate: true });
    window.toast && window.toast('Posizione trovata! 📍');
  }, err => {
    if (btn) btn.textContent = '📍';
    const msgs = {
      1: 'Permesso GPS negato',
      2: 'Posizione non disponibile',
      3: 'Timeout GPS'
    };
    window.toast && window.toast(msgs[err.code] || 'GPS non disponibile', 'error');
  }, opts);
}

export function placeUserMarker(lat, lng) {
  if (userLocationMarker) map.removeLayer(userLocationMarker);
  const icon = L.divIcon({
    className: '',
    html: `<div class="user-location-marker"><div class="user-location-dot"></div></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
  userLocationMarker = L.marker([lat, lng], { icon, zIndexOffset: 1000 }).addTo(map);
  userLocationMarker.bindPopup('<div style="font-family:Space Mono,monospace;font-size:10px;color:#a8d4a8">📍 Sei qui</div>');
}

export function getUserLocation(callback) {
  if (!navigator.geolocation) { callback(null); return; }
  navigator.geolocation.getCurrentPosition(
    pos => callback({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    ()   => callback(null),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}
