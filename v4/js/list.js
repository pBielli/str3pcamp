// ── LIST MODULE ───────────────────────────────────────────────

import { getSpots, save, useFirebase, currentUser, fbDelete, saveLocal } from './firebase.js';
import { renderMarkers, closeDetail, selectSpot, getMarkerEmojis } from './map.js';

export function renderList(filtered) {
  const list = filtered || getFiltered();
  const countEl = document.getElementById('list-count');
  if (countEl) countEl.textContent = list.length;

  const container = document.getElementById('list-container');
  if (!container) return;

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="big">🏕️</div>
        <div class="msg">NESSUN LUOGO TROVATO<br>Vai su ➕ per aggiungere<br>il primo campeggio!</div>
      </div>`;
    return;
  }

  const SPOT_TYPES = window.APP_CONFIG?.spotTypes || {};

  container.innerHTML = list.map((s, i) => {
    const ti = SPOT_TYPES[s.spotType] || SPOT_TYPES.libero || { label: '', color: '#3d8a4e' };
    const emojis = getMarkerEmojis(s);
    return `<div class="scard" style="animation-delay:${i * 25}ms" data-id="${s.id}">
      <div class="s-icons">${emojis}</div>
      <div style="flex:1;min-width:0">
        <div>
          <span class="s-name">${esc(s.name)}</span>
          <span class="s-type-badge" style="background:${ti.color}22;color:${ti.color}">${ti.label}</span>
        </div>
        <div class="s-region">${esc(s.region)}${s.city ? ' · ' + esc(s.city) : ''}</div>
        <div class="s-desc">${esc(s.description)}</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">
          ${(s.environments || []).map(e => `<span style="font-size:11px;color:#4a8a5a">${e}</span>`).join('')}
        </div>
        <div class="s-stars">${'★'.repeat(s.rating || 0)}${'☆'.repeat(5 - (s.rating || 0))}</div>
      </div>
    </div>`;
  }).join('');

  // Events
  container.querySelectorAll('.scard').forEach(card => {
    card.addEventListener('click', () => goToSpot(parseInt(card.dataset.id)));
  });
}

export function goToSpot(id) {
  window.switchPanel && window.switchPanel('map');
  setTimeout(() => selectSpot(id), 120);
}

function getFiltered() {
  if (window._getFiltered) return window._getFiltered();
  return getSpots();
}

// ── EDIT MODULE ───────────────────────────────────────────────
export function openEdit(id) {
  const spots = getSpots();
  const spot = spots.find(s => s.id === id);
  if (!spot) return;
  closeDetail();

  const ENV_TAGS = window.APP_CONFIG?.environmentTags || [];
  const SERVICES = window.APP_CONFIG?.services || {};

  const c = document.getElementById('edit-content');
  c.innerHTML = `
    <label class="flabel">NOME</label>
    <input class="finput" id="e-name" type="text" value="${esc(spot.name)}">

    <label class="flabel">REGIONE / PAESE</label>
    <input class="finput" id="e-region" type="text" value="${esc(spot.region)}">

    <label class="flabel">CITTÀ</label>
    <input class="finput" id="e-city" type="text" value="${esc(spot.city || '')}">

    <label class="flabel">TIPO DI POSTO</label>
    <div class="type-grid" id="e-type-grid">
      <div class="type-card${spot.spotType==='accoglienza'?' on':''}" id="etc-accoglienza">
        <div class="tc-icon">🏠</div><div class="tc-label">ACCOGLIENZA</div>
      </div>
      <div class="type-card${spot.spotType==='libero'?' on':''}" id="etc-libero">
        <div class="tc-icon">⛺🌲</div><div class="tc-label">LIBERO</div>
      </div>
      <div class="type-card${spot.spotType==='camping'?' on':''}" id="etc-camping" style="grid-column:span 2">
        <div class="tc-icon">⛺💰</div><div class="tc-label">CAMPING A PAGAMENTO</div>
      </div>
    </div>

    <div id="e-veh-wrap" style="${spot.spotType === 'accoglienza' ? 'display:none' : ''}">
      <label class="flabel">VEICOLI ACCETTATI</label>
      <div class="veh-row">
        <div class="veh-btn${(spot.vehicles||[]).includes('tenda')?' on':''}" id="e-veh-tenda">⛺<div class="vl">TENDA</div></div>
        <div class="veh-btn${(spot.vehicles||[]).includes('rooftop')?' on':''}" id="e-veh-rooftop">🚐<div class="vl">TENDA DA TETTO</div></div>
      </div>
    </div>

    <label class="flabel">LATITUDINE</label>
    <input class="finput" id="e-lat" type="number" step=".000001" value="${spot.lat}">
    <label class="flabel">LONGITUDINE</label>
    <input class="finput" id="e-lng" type="number" step=".000001" value="${spot.lng}">

    <label class="flabel">DESCRIZIONE</label>
    <textarea class="finput ftarea" id="e-desc">${esc(spot.description)}</textarea>

    <label class="flabel">AMBIENTE E ATTRAZIONI</label>
    <div class="env-grid">
      ${ENV_TAGS.map(e => `<div class="echip${(spot.environments||[]).includes(e)?' on':''}" data-env="${esc(e)}">${e}</div>`).join('')}
    </div>

    <label class="flabel">VALUTAZIONE</label>
    <div class="star-row" id="e-stars">
      ${[1,2,3,4,5].map(n => `<span class="star-p" data-n="${n}" style="color:${n<=(spot.rating||0)?'#f0b429':'#2a4a2a'}">★</span>`).join('')}
    </div>

    <label class="flabel">SERVIZI</label>
    <div class="svcs-grid">
      ${Object.entries(SERVICES).map(([k,v]) => `<div class="schip${(spot.services||[]).includes(k)?' on':''}" data-svc="${k}">${v}</div>`).join('')}
    </div>

    <div class="btn-row" style="margin-top:18px">
      <button class="bback" id="e-cancel">✕ Annulla</button>
      <button class="bprim" id="e-save">✓ Salva</button>
    </div>`;

  // Type selector
  ['accoglienza','libero','camping'].forEach(type => {
    const el = document.getElementById('etc-' + type);
    if (!el) return;
    el.onclick = () => {
      document.querySelectorAll('#e-type-grid .type-card').forEach(c => c.classList.remove('on'));
      el.classList.add('on');
      document.getElementById('e-veh-wrap').style.display = type === 'accoglienza' ? 'none' : '';
    };
  });

  // Vehicle toggles
  document.getElementById('e-veh-tenda').onclick   = e => e.currentTarget.classList.toggle('on');
  document.getElementById('e-veh-rooftop').onclick  = e => e.currentTarget.classList.toggle('on');

  // Env chips
  document.querySelectorAll('.echip[data-env]').forEach(chip => {
    chip.onclick = () => chip.classList.toggle('on');
  });

  // Stars
  document.querySelectorAll('#e-stars .star-p').forEach(star => {
    star.onclick = () => {
      const n = parseInt(star.dataset.n);
      document.querySelectorAll('#e-stars .star-p').forEach(s => {
        s.style.color = parseInt(s.dataset.n) <= n ? '#f0b429' : '#2a4a2a';
      });
    };
  });

  // Svc chips
  document.querySelectorAll('[data-svc]').forEach(chip => {
    chip.onclick = () => chip.classList.toggle('on');
  });

  document.getElementById('e-cancel').onclick = closeEdit;
  document.getElementById('e-save').onclick   = () => saveEdit(id);

  document.getElementById('edit-modal').classList.add('open');
}

export function closeEdit() {
  document.getElementById('edit-modal').classList.remove('open');
}

function saveEdit(id) {
  const spots = getSpots();
  const idx = spots.findIndex(s => s.id === id);
  if (idx < 0) return;

  const typeEl = document.querySelector('#e-type-grid .type-card.on');
  const spotType = typeEl
    ? (typeEl.querySelector('.tc-icon').textContent.includes('🏠') ? 'accoglienza'
      : typeEl.querySelector('.tc-icon').textContent.includes('💰') ? 'camping' : 'libero')
    : spots[idx].spotType;

  const vehicles = [];
  if (document.getElementById('e-veh-tenda')?.classList.contains('on'))   vehicles.push('tenda');
  if (document.getElementById('e-veh-rooftop')?.classList.contains('on')) vehicles.push('rooftop');

  const environments = [...document.querySelectorAll('.echip[data-env].on')].map(e => e.dataset.env);
  const services     = [...document.querySelectorAll('[data-svc].on')].map(e => e.dataset.svc);
  const rating       = [...document.querySelectorAll('#e-stars .star-p')].filter(s => s.style.color === 'rgb(240, 180, 41)').length;

  spots[idx] = {
    ...spots[idx],
    name:         document.getElementById('e-name').value.trim()   || spots[idx].name,
    region:       document.getElementById('e-region').value.trim() || spots[idx].region,
    city:         document.getElementById('e-city').value.trim()   || spots[idx].city || '',
    lat:          parseFloat(document.getElementById('e-lat').value) || spots[idx].lat,
    lng:          parseFloat(document.getElementById('e-lng').value) || spots[idx].lng,
    description:  document.getElementById('e-desc').value.trim()   || spots[idx].description,
    spotType, vehicles, environments, services,
    rating: rating || spots[idx].rating,
  };

  save(spots[idx]);
  closeEdit();
  if (!useFirebase) { renderMarkers(); renderList(); }
  setTimeout(() => selectSpot(id), 100);
  window.toast && window.toast('Modifiche salvate! ✓');
}

// ── DELETE ────────────────────────────────────────────────────
export function confirmDelete(id) {
  const spots = getSpots();
  const spot = spots.find(s => s.id === id);
  if (!spot) return;
  document.getElementById('confirm-msg').textContent = `Vuoi davvero eliminare "${spot.name}"? L'operazione non è reversibile.`;

  const yesBtn = document.getElementById('confirm-yes-btn');
  const newYes = yesBtn.cloneNode(true);
  yesBtn.parentNode.replaceChild(newYes, yesBtn);
  newYes.addEventListener('click', () => { doDelete(id); closeConfirm(); });
  newYes.addEventListener('touchend', e => { e.preventDefault(); doDelete(id); closeConfirm(); }, { passive: false });

  const noBtn  = document.querySelector('#confirm-modal .confirm-no');
  const newNo  = noBtn.cloneNode(true);
  noBtn.parentNode.replaceChild(newNo, noBtn);
  newNo.addEventListener('click', closeConfirm);
  newNo.addEventListener('touchend', e => { e.preventDefault(); closeConfirm(); }, { passive: false });

  document.getElementById('confirm-modal').classList.add('open');
}

function closeConfirm() { document.getElementById('confirm-modal').classList.remove('open'); }

function doDelete(id) {
  const spots = getSpots();
  const filtered = spots.filter(s => s.id !== id);
  // We need a way to update spots in firebase module
  // Use window shim
  if (window._setSpots) window._setSpots(filtered);
  if (useFirebase) fbDelete(id);
  else saveLocal();
  closeDetail();
  renderMarkers();
  renderList();
  window.toast && window.toast('Luogo eliminato');
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
