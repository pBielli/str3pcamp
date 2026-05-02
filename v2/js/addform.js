// ── ADD FORM MODULE ───────────────────────────────────────────

import { getSpots, setSpots, save, currentUser, useFirebase } from './firebase.js';
import { renderMarkers, selectSpot, getUserLocation } from './map.js';
import { renderList } from './list.js';
import { createPlacesSearch, reverseGeocode } from './places.js';

let addStep = 1;
let addForm = defaultForm();

function defaultForm() {
  return {
    name: '', lat: '', lng: '', region: '', city: '',
    spotType: 'libero', vehicles: [], environments: [],
    description: '', services: [], rating: 4
  };
}

function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Config loaded from window
function cfg() { return window.APP_CONFIG || {}; }

export function resetForm() {
  addForm = defaultForm();
  addStep = 1;
}

export function renderAddStep() {
  const SPOT_TYPES   = cfg().spotTypes || {};
  const ENV_TAGS     = cfg().environmentTags || [];
  const SERVICES     = cfg().services || {};

  document.getElementById('step-label').textContent = `PASSO ${addStep} DI 4`;
  document.querySelectorAll('.sseg').forEach((s, i) => {
    s.style.background = i < addStep ? '#2a5a34' : '#182c1b';
  });

  const c = document.getElementById('step-content');

  if (addStep === 1) {
    // ── Step 1: nome, tipo, veicolo ──────────────────────────
    c.innerHTML = `
      <label class="flabel">IMPORTA DA MAPPA</label>
      <div id="places-search-mount"></div>

      <div class="places-separator">oppure inserisci manualmente</div>

      <label class="flabel">NOME DEL LUOGO *</label>
      <input class="finput" id="f-name" type="text" placeholder="Es. Pineta di Castel Porziano..." value="${esc(addForm.name)}">

      <label class="flabel">REGIONE / PAESE *</label>
      <input class="finput" id="f-region" type="text" placeholder="Es. Lazio · Italia" value="${esc(addForm.region)}">

      <label class="flabel">CITTÀ</label>
      <input class="finput" id="f-city" type="text" placeholder="Es. Roma" value="${esc(addForm.city)}">

      <label class="flabel">TIPO DI POSTO</label>
      <div class="type-grid">
        <div class="type-card${addForm.spotType==='accoglienza'?' on':''}" id="tc-accoglienza">
          <div class="tc-icon">🏠</div><div class="tc-label">ACCOGLIENZA<br>struttura ricettiva</div>
        </div>
        <div class="type-card${addForm.spotType==='libero'?' on':''}" id="tc-libero">
          <div class="tc-icon">⛺🌲</div><div class="tc-label">LIBERO<br>campeggio gratuito</div>
        </div>
        <div class="type-card${addForm.spotType==='camping'?' on':''}" id="tc-camping" style="grid-column:span 2">
          <div class="tc-icon">⛺💰</div><div class="tc-label">CAMPING A PAGAMENTO</div>
        </div>
      </div>

      <div id="veh-section" style="${addForm.spotType === 'accoglienza' ? 'display:none' : ''}">
        <label class="flabel">TIPO DI VEICOLO ACCETTATO</label>
        <div class="veh-row">
          <div class="veh-btn${addForm.vehicles.includes('tenda')?' on':''}" id="vb-tenda">⛺<div class="vl">TENDA</div></div>
          <div class="veh-btn${addForm.vehicles.includes('rooftop')?' on':''}" id="vb-rooftop">🚐<div class="vl">TENDA DA TETTO</div></div>
        </div>
      </div>

      <div class="btn-row">
        <button class="bprim" id="btn-s1next">Avanti →</button>
      </div>`;

    // Attach events (no rerenders inside these handlers!)
    document.getElementById('tc-accoglienza').onclick = () => setSpotTypeLocal('accoglienza');
    document.getElementById('tc-libero').onclick      = () => setSpotTypeLocal('libero');
    document.getElementById('tc-camping').onclick     = () => setSpotTypeLocal('camping');
    document.getElementById('vb-tenda').onclick   = () => togVehLocal('tenda');
    document.getElementById('vb-rooftop').onclick = () => togVehLocal('rooftop');
    document.getElementById('btn-s1next').onclick = s1next;

    // Mount places search
    const mount = document.getElementById('places-search-mount');
    const { element } = createPlacesSearch({
      placeholder: '🔍 Cerca luogo su mappa...',
      onSelect: (place) => {
        addForm.name   = place.name   || addForm.name;
        addForm.region = place.region || addForm.region;
        addForm.city   = place.city   || addForm.city;
        addForm.lat    = place.lat;
        addForm.lng    = place.lng;
        document.getElementById('f-name').value   = addForm.name;
        document.getElementById('f-region').value = addForm.region;
        document.getElementById('f-city').value   = addForm.city;
        window.toast && window.toast('Luogo importato! Controlla e modifica se necessario 📍', 'info');
      }
    });
    mount.appendChild(element);

  } else if (addStep === 2) {
    // ── Step 2: coordinate ───────────────────────────────────
    c.innerHTML = `
      <div style="color:#5a8a5e;font-size:14px;margin-bottom:10px">Dove si trova questo luogo?</div>
      <div class="frow">
        <div>
          <label class="flabel">LATITUDINE *</label>
          <input class="finput" id="f-lat" type="number" step=".000001" placeholder="46.6944" value="${addForm.lat}">
        </div>
        <div>
          <label class="flabel">LONGITUDINE *</label>
          <input class="finput" id="f-lng" type="number" step=".000001" placeholder="12.0844" value="${addForm.lng}">
        </div>
      </div>
      <div class="ibox">
        💡 <strong>Come trovare le coordinate:</strong><br>
        Apri Google Maps → tieni premuto sul punto → copia i numeri in basso.<br>
        Oppure usa il pulsante GPS qui sotto.
      </div>
      <button class="bprim" style="margin-top:10px;width:100%" id="btn-gps">📍 Usa il mio GPS</button>
      <div class="btn-row" style="margin-top:8px">
        <button class="bback" id="btn-s2back">← Indietro</button>
        <button class="bprim" id="btn-s2next">Avanti →</button>
      </div>`;

    document.getElementById('btn-gps').onclick   = useGPSLocal;
    document.getElementById('btn-s2back').onclick = () => { addStep = 1; renderAddStep(); };
    document.getElementById('btn-s2next').onclick = s2next;

  } else if (addStep === 3) {
    // ── Step 3: descrizione, ambiente, rating ────────────────
    c.innerHTML = `
      <label class="flabel">DESCRIZIONE *</label>
      <textarea class="finput ftarea" id="f-desc" placeholder="Descrivi il luogo, l'atmosfera, cosa si può fare...">${esc(addForm.description)}</textarea>

      <label class="flabel">AMBIENTE E ATTRAZIONI</label>
      <div class="env-grid" id="env-grid">
        ${(cfg().environmentTags || []).map(e => `
          <div class="echip${addForm.environments.includes(e) ? ' on' : ''}" data-env="${esc(e)}">${e}</div>
        `).join('')}
      </div>

      <label class="flabel">VALUTAZIONE</label>
      <div class="star-row" id="star-row">
        ${[1,2,3,4,5].map(n => `
          <span class="star-p" data-n="${n}" style="color:${n <= (addForm.rating || 0) ? '#f0b429' : '#2a4a2a'}">★</span>
        `).join('')}
      </div>

      <div class="btn-row">
        <button class="bback" id="btn-s3back">← Indietro</button>
        <button class="bprim" id="btn-s3next">Avanti →</button>
      </div>`;

    // Env chips — toggle without full re-render
    document.querySelectorAll('#env-grid .echip').forEach(chip => {
      chip.onclick = () => {
        const e = chip.dataset.env;
        chip.classList.toggle('on');
        if (chip.classList.contains('on')) {
          if (!addForm.environments.includes(e)) addForm.environments.push(e);
        } else {
          addForm.environments = addForm.environments.filter(x => x !== e);
        }
      };
    });

    // Stars
    document.querySelectorAll('#star-row .star-p').forEach(star => {
      star.onclick = () => {
        const n = parseInt(star.dataset.n);
        addForm.rating = n;
        document.querySelectorAll('#star-row .star-p').forEach(s => {
          s.style.color = parseInt(s.dataset.n) <= n ? '#f0b429' : '#2a4a2a';
        });
      };
    });

    document.getElementById('btn-s3back').onclick = () => { addStep = 2; renderAddStep(); };
    document.getElementById('btn-s3next').onclick = s3next;

  } else {
    // ── Step 4: servizi + anteprima ──────────────────────────
    const SPOT_TYPES_LABELS = cfg().spotTypes || {};
    c.innerHTML = `
      <label class="flabel">SERVIZI DISPONIBILI</label>
      <div class="svcs-grid" id="svcs-grid">
        ${Object.entries(SERVICES).map(([k, v]) => `
          <div class="schip${addForm.services.includes(k) ? ' on' : ''}" data-svc="${k}">${v}</div>
        `).join('')}
      </div>

      <div class="prev-box" style="margin-top:16px">
        <div class="prev-lbl">ANTEPRIMA</div>
        <div style="font-size:22px;margin-bottom:4px">${getMarkerEmojisLocal(addForm)}</div>
        <div style="font-size:17px;font-weight:700;color:#c8e4b8">${esc(addForm.name)}</div>
        <div style="font-family:'Space Mono',monospace;font-size:10px;color:#4a7a4e">
          ${esc(addForm.region)}${addForm.city ? ' · ' + esc(addForm.city) : ''} · ${SPOT_TYPES_LABELS[addForm.spotType]?.label || ''}
        </div>
        <div style="font-size:12px;color:#5a8a5e;margin-top:4px">${esc(addForm.description)}</div>
        ${addForm.environments.length ? `<div style="margin-top:6px;font-size:13px">${addForm.environments.join(' ')}</div>` : ''}
        <div style="font-family:'Space Mono',monospace;font-size:9px;color:#2d5a32;margin-top:6px">
          ${addForm.lat ? `${parseFloat(addForm.lat).toFixed(5)}°N · ${parseFloat(addForm.lng).toFixed(5)}°E` : 'Coordinate non impostate'}
        </div>
      </div>

      <div class="btn-row">
        <button class="bback" id="btn-s4back">← Indietro</button>
        <button class="bprim" id="btn-submit">✓ Aggiungi Luogo</button>
      </div>`;

    // Service chips — toggle without re-render
    document.querySelectorAll('#svcs-grid .schip').forEach(chip => {
      chip.onclick = () => {
        const k = chip.dataset.svc;
        chip.classList.toggle('on');
        if (chip.classList.contains('on')) {
          if (!addForm.services.includes(k)) addForm.services.push(k);
        } else {
          addForm.services = addForm.services.filter(x => x !== k);
        }
      };
    });

    document.getElementById('btn-s4back').onclick = () => { addStep = 3; renderAddStep(); };
    document.getElementById('btn-submit').onclick  = submitSpot;
  }
}

// ── LOCAL HELPERS (no re-render) ──────────────────────────────
function setSpotTypeLocal(t) {
  addForm.spotType = t;
  // Toggle type card visuals
  ['accoglienza','libero','camping'].forEach(type => {
    const el = document.getElementById('tc-' + type);
    if (el) el.classList.toggle('on', type === t);
  });
  // Show/hide vehicle section
  const vehSec = document.getElementById('veh-section');
  if (vehSec) vehSec.style.display = t === 'accoglienza' ? 'none' : '';
  if (t === 'accoglienza') addForm.vehicles = [];
}

function togVehLocal(v) {
  addForm.vehicles = addForm.vehicles.includes(v)
    ? addForm.vehicles.filter(x => x !== v)
    : [...addForm.vehicles, v];
  const btn = document.getElementById('vb-' + v);
  if (btn) btn.classList.toggle('on', addForm.vehicles.includes(v));
}

function getMarkerEmojisLocal(spot) {
  if (spot.spotType === 'accoglienza') return '🏠';
  const isCamping  = spot.spotType === 'camping';
  const hasTenda   = spot.vehicles && spot.vehicles.includes('tenda');
  const hasRooftop = spot.vehicles && spot.vehicles.includes('rooftop');
  let txt = '⛺';
  if (isCamping) txt += '💰';
  if (hasTenda && hasRooftop) txt += '🌲🚐';
  else if (hasTenda)          txt += '🌲';
  else if (hasRooftop)        txt += '🚐';
  return txt;
}

// ── STEP NAVIGATION ───────────────────────────────────────────
function s1next() {
  addForm.name   = (document.getElementById('f-name')?.value   || '').trim();
  addForm.region = (document.getElementById('f-region')?.value || '').trim();
  addForm.city   = (document.getElementById('f-city')?.value   || '').trim();
  if (!addForm.name || !addForm.region) {
    window.toast && window.toast('Nome e regione sono obbligatori', 'error'); return;
  }
  if (addForm.spotType !== 'accoglienza' && !addForm.vehicles.length) {
    window.toast && window.toast('Seleziona almeno un tipo di veicolo', 'error'); return;
  }
  addStep = 2; renderAddStep();
}

function s2next() {
  addForm.lat = document.getElementById('f-lat')?.value || '';
  addForm.lng = document.getElementById('f-lng')?.value || '';
  if (!addForm.lat || !addForm.lng) {
    window.toast && window.toast('Le coordinate GPS sono obbligatorie', 'error'); return;
  }
  addStep = 3; renderAddStep();
}

function s3next() {
  addForm.description = (document.getElementById('f-desc')?.value || '').trim();
  if (!addForm.description) {
    window.toast && window.toast('Aggiungi una descrizione', 'error'); return;
  }
  addStep = 4; renderAddStep();
}

function useGPSLocal() {
  const btn = document.getElementById('btn-gps');
  if (btn) { btn.textContent = '⏳ Rilevamento...'; btn.disabled = true; }

  const opts = { enableHighAccuracy: true, timeout: 10000 };
  navigator.geolocation.getCurrentPosition(
    async pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const latInput = document.getElementById('f-lat');
      const lngInput = document.getElementById('f-lng');
      if (latInput) latInput.value = lat.toFixed(6);
      if (lngInput) lngInput.value = lng.toFixed(6);
      addForm.lat = lat;
      addForm.lng = lng;
      if (btn) { btn.textContent = '📍 Usa il mio GPS'; btn.disabled = false; }
      window.toast && window.toast('Posizione rilevata! 📍');

      // Auto-fill region/city if not already set
      if (!addForm.region) {
        const geo = await reverseGeocode(lat, lng);
        if (geo) {
          if (!addForm.region && geo.region) {
            addForm.region = geo.region;
            // Try to update step 1 fields if visible
            const rInput = document.getElementById('f-region');
            if (rInput) rInput.value = geo.region;
          }
          if (!addForm.city && geo.city) {
            addForm.city = geo.city;
            const cInput = document.getElementById('f-city');
            if (cInput) cInput.value = geo.city;
          }
        }
      }
    },
    err => {
      if (btn) { btn.textContent = '📍 Usa il mio GPS'; btn.disabled = false; }
      const msgs = { 1: 'Permesso GPS negato', 2: 'Posizione non disponibile', 3: 'Timeout GPS' };
      window.toast && window.toast(msgs[err.code] || 'GPS non disponibile', 'error');
    },
    opts
  );
}

async function submitSpot() {
  const ns = {
    ...addForm,
    id: Date.now(),
    lat: parseFloat(addForm.lat),
    lng: parseFloat(addForm.lng)
  };
  const spots = getSpots();
  spots.push(ns);
  setSpots(spots);
  save(ns);
  if (!useFirebase) { renderMarkers(); renderList(); }

  addForm  = defaultForm();
  addStep  = 1;

  window.switchPanel && window.switchPanel('map');
  setTimeout(() => {
    window._map && window._map.setView([ns.lat, ns.lng], 13, { animate: true });
    selectSpot(ns.id);
  }, 150);
  window.toast && window.toast('Luogo aggiunto! 🏕️');
}

// Auto-load user GPS when entering add panel
export function onAddPanelOpen() {
  getUserLocation(pos => {
    if (pos && !addForm.lat) {
      addForm.lat = pos.lat.toFixed(6);
      addForm.lng = pos.lng.toFixed(6);
      // If we're already on step 2, update inputs
      const latInput = document.getElementById('f-lat');
      const lngInput = document.getElementById('f-lng');
      if (latInput) latInput.value = addForm.lat;
      if (lngInput) lngInput.value = addForm.lng;
    }
  });
}
