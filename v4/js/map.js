// js/map.js — Mappa Leaflet con lingua italiana e marker da config

import { db, collection, getDocs, onSnapshot } from './firebase-raw.js';

let map;

export async function initMap(cfg) {
  const mc = cfg.map;

  // Crea mappa con centro e zoom da config
  map = L.map('map', {
    center: [mc.defaultCenter.lat, mc.defaultCenter.lng],
    zoom:   mc.defaultZoom,
    zoomControl: false
  });
  window._map = map;

  // Tile layer italiano (OpenStreetMap con parametro language se supportato)
  L.tileLayer(mc.tileUrl, {
    attribution: mc.tileAttribution,
    maxZoom: 19
  }).addTo(map);

  // Controllo zoom in posizione top-right (lascia spazio al FAB)
  L.control.zoom({ position: 'topright' }).addTo(map);

  // Marker layer group
  window._markersLayer = L.layerGroup().addTo(map);
  window._markersData  = {};  // id -> {marker, spot}

  // Carica spots da Firestore in realtime
  const spotsCol = collection(db, 'spots');
  onSnapshot(spotsCol, snapshot => {
    snapshot.docChanges().forEach(change => {
      const id   = change.doc.id;
      const spot = { id, ...change.doc.data() };

      if (change.type === 'removed') {
        if (window._markersData[id]) {
          window._markersLayer.removeLayer(window._markersData[id].marker);
          delete window._markersData[id];
        }
        return;
      }

      // Rimuovi vecchio marker se esiste
      if (window._markersData[id]) {
        window._markersLayer.removeLayer(window._markersData[id].marker);
      }

      const marker = createMarker(spot, cfg);
      if (marker) {
        window._markersLayer.addLayer(marker);
        window._markersData[id] = { marker, spot };
      }
    });

    // Aggiorna lista
    window._onSpotsUpdate?.();
  });

  // Ricerca Nominatim in italiano
  const searchInput = document.getElementById('search-input');
  let searchTimer;
  searchInput?.addEventListener('input', e => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (q.length < 3) return;
    searchTimer = setTimeout(() => geocodeIT(q), 600);
  });
  searchInput?.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      clearTimeout(searchTimer);
      geocodeIT(searchInput.value.trim());
    }
  });
}

// Crea marker Leaflet con colore e icona da config
function createMarker(spot, cfg) {
  if (!spot.lat || !spot.lng) return null;

  const typeConf = cfg.spotTypes?.[spot.type] || {};
  const color    = typeConf.markerColor || '#888';
  const vehicle  = cfg.vehicles?.[spot.vehicle];
  const emoji    = vehicle?.emoji || '📍';

  const icon = L.divIcon({
    className: '',
    html: `
      <div style="
        width:34px;height:34px;
        background:${color};
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:2.5px solid rgba(0,0,0,.2);
        box-shadow:0 2px 6px rgba(0,0,0,.3);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:.75rem;line-height:1">${emoji}</span>
      </div>`,
    iconSize:   [34, 34],
    iconAnchor: [17, 34],
    popupAnchor:[0, -36]
  });

  const marker = L.marker([spot.lat, spot.lng], { icon });

  // Popup
  marker.bindPopup(() => buildPopup(spot, cfg), {
    maxWidth: 300,
    className: 'rb-popup'
  });

  marker.on('click', () => {
    openDetail(spot);
  });

  return marker;
}

function buildPopup(spot, cfg) {
  const typeConf = cfg.spotTypes?.[spot.type] || {};
  const color    = typeConf.color || '#888';
  const label    = typeConf.label || spot.type;

  const tags = (spot.tags || []).slice(0, 3)
    .map(t => `<span class="spot-popup-tag">${t}</span>`).join('');

  const svcs = Object.entries(spot.services || {})
    .filter(([,v]) => v)
    .slice(0, 4)
    .map(([k]) => `<span class="spot-svc-badge">${cfg.services?.[k] || k}</span>`)
    .join('');

  const stars = '⭐'.repeat(spot.rating || 0);

  const el = document.createElement('div');
  el.className = 'spot-popup';
  el.innerHTML = `
    <div class="spot-popup-header" style="border-left:4px solid ${color}">
      <div class="spot-popup-type">${label}</div>
      <div class="spot-popup-name">${spot.name || 'Senza nome'}</div>
      ${stars ? `<div style="color:#e8a030;font-size:.8rem;margin-top:2px">${stars}</div>` : ''}
    </div>
    <div class="spot-popup-body">
      ${tags  ? `<div class="spot-popup-tags">${tags}</div>` : ''}
      ${svcs  ? `<div class="spot-popup-services">${svcs}</div>` : ''}
      <div class="spot-popup-actions">
        <button class="btn-popup btn-popup-primary" onclick="openDetail('${spot.id}')">Dettagli</button>
        <button class="btn-popup btn-popup-secondary" onclick="window._map?.setView([${spot.lat},${spot.lng}],15)">Centra</button>
      </div>
    </div>`;
  return el;
}

// Apri drawer dettaglio
function openDetail(spotOrId) {
  const spot = typeof spotOrId === 'string'
    ? window._markersData[spotOrId]?.spot
    : spotOrId;
  if (!spot) return;

  window.openSpotDetail?.(spot);
}
window.openDetail = openDetail;

// Geocoding Nominatim in italiano
async function geocodeIT(query) {
  try {
    const url = `https://nominatim.openstreetmap.org/search?` +
      `q=${encodeURIComponent(query)}&format=json&limit=1&accept-language=it&countrycodes=it`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'it' } });
    const data = await res.json();
    if (data.length) {
      const { lat, lon, display_name } = data[0];
      window._map?.setView([+lat, +lon], 13);
      L.popup()
        .setLatLng([+lat, +lon])
        .setContent(`<b>📍 ${display_name.split(',')[0]}</b>`)
        .openOn(window._map);
    } else {
      window.showToast?.('Nessun risultato trovato', 'info');
    }
  } catch(e) {
    console.error('Geocoding error:', e);
  }
}

// Filtra marker per tipo
export function filterMarkers(type) {
  if (!window._markersData) return;
  Object.values(window._markersData).forEach(({ marker, spot }) => {
    if (type === 'all' || spot.type === type) {
      marker.addTo(window._markersLayer);
    } else {
      window._markersLayer.removeLayer(marker);
    }
  });
}
window.filterMarkers = filterMarkers;
