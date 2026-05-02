// js/places.js — Posti salvati + drawer dettaglio

export function initPlaces(cfg) {
  renderPlaces(cfg);
  setupDetailDrawer(cfg);
}

// ── Posti salvati (localStorage) ──────────────────────────────────
function getSaved() {
  try { return JSON.parse(localStorage.getItem('rb_saved') || '[]'); }
  catch { return []; }
}
function toggleSave(id) {
  const saved = getSaved();
  const idx = saved.indexOf(id);
  if (idx >= 0) saved.splice(idx, 1); else saved.push(id);
  localStorage.setItem('rb_saved', JSON.stringify(saved));
  return idx < 0; // true = aggiunto
}
window.toggleSave = toggleSave;

function renderPlaces(cfg) {
  const container = document.getElementById('places-content');
  if (!container) return;

  const ids = getSaved();
  if (!ids.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="ico">🔖</div>
        <h3>Nessun posto salvato</h3>
        <p>Salva i tuoi posti preferiti per trovarli qui.</p>
      </div>`;
    return;
  }

  const spots = ids
    .map(id => window._markersData?.[id]?.spot)
    .filter(Boolean);

  if (!spots.length) {
    container.innerHTML = `<div class="spinner"></div>`;
    return;
  }

  const typeConf = (t) => cfg.spotTypes?.[t] || {};

  container.innerHTML = spots.map(spot => {
    const tc = typeConf(spot.type);
    return `
      <div class="spot-card" onclick="openDetail('${spot.id}')">
        <div class="spot-card-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.8rem;background:var(--surface2)">🔖</div>
        <div class="spot-card-body">
          <div class="spot-card-type" style="color:${tc.color||'#888'}">${tc.label||spot.type}</div>
          <div class="spot-card-name">${spot.name||'Senza nome'}</div>
          <div class="spot-card-meta">${spot.location||''}</div>
        </div>
      </div>`;
  }).join('');
}

// ── Drawer dettaglio ────────────────────────────────────────────── 
function setupDetailDrawer(cfg) {
  window.openSpotDetail = (spot) => {
    const drawer  = document.getElementById('drawer-detail');
    const overlay = document.getElementById('drawer-overlay');
    const body    = document.getElementById('detail-body');
    const title   = document.getElementById('detail-title');

    if (!spot) return;

    const tc      = cfg.spotTypes?.[spot.type] || {};
    const color   = tc.color || '#888';
    const label   = tc.label || spot.type || '?';
    const stars   = '★'.repeat(spot.rating || 0) + '☆'.repeat(5 - (spot.rating || 0));
    const saved   = getSaved().includes(spot.id);
    const svcs    = Object.entries(spot.services || {})
      .filter(([,v]) => v)
      .map(([k]) => `<span class="spot-svc-badge">${cfg.services?.[k] || k}</span>`)
      .join('');
    const tags    = (spot.tags || [])
      .map(t => `<span class="spot-popup-tag">${t}</span>`).join('');
    const photos  = (spot.photos || [])
      .map(u => `<img src="${u}" style="width:100%;border-radius:10px;margin-bottom:8px;object-fit:cover;max-height:220px" alt="">`)
      .join('');

    title.textContent = spot.name || 'Dettaglio';

    body.innerHTML = `
      <div style="border-left:4px solid ${color};padding-left:12px;margin-bottom:16px">
        <div style="font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:${color}">${label}</div>
        <div style="font-size:1.1rem;font-weight:800;color:var(--text)">${spot.name||'Senza nome'}</div>
        ${spot.location ? `<div style="font-size:.82rem;color:var(--text-muted);margin-top:2px">📍 ${spot.location}</div>` : ''}
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="color:var(--amber);font-size:1.1rem;letter-spacing:2px">${stars}</div>
        <button id="btn-save-spot" class="btn ${saved ? 'btn-amber' : 'btn-secondary'}" style="padding:7px 14px;font-size:.82rem">
          ${saved ? '🔖 Salvato' : '+ Salva'}
        </button>
      </div>

      ${photos ? `<div style="margin-bottom:16px">${photos}</div>` : ''}
      ${tags   ? `<div class="spot-popup-tags" style="margin-bottom:12px">${tags}</div>` : ''}
      ${svcs   ? `<div class="spot-popup-services" style="margin-bottom:12px">${svcs}</div>` : ''}

      ${spot.description ? `
        <div style="margin-bottom:16px">
          <div class="form-label">Descrizione</div>
          <p style="font-size:.9rem;color:var(--text);line-height:1.6">${spot.description}</p>
        </div>` : ''}

      <div style="display:flex;gap:8px">
        <button class="btn btn-primary" style="flex:1"
          onclick="window._map?.setView([${spot.lat},${spot.lng}],15);document.getElementById('drawer-detail').classList.remove('open');document.getElementById('drawer-overlay').classList.remove('open')">
          🗺 Vai sulla mappa
        </button>
        <button class="btn btn-secondary"
          onclick="if(navigator.share)navigator.share({title:'${spot.name}',text:'Posto su RunBase',url:location.href})">
          📤
        </button>
      </div>

      <div style="height:16px"></div>
    `;

    document.getElementById('btn-save-spot')?.addEventListener('click', function() {
      const isSaved = toggleSave(spot.id);
      this.className = `btn ${isSaved ? 'btn-amber' : 'btn-secondary'}`;
      this.innerHTML = isSaved ? '🔖 Salvato' : '+ Salva';
      window.showToast?.(isSaved ? 'Posto salvato!' : 'Rimosso dai salvati', 'info');
    });

    // Chiudi altri drawer e apri dettaglio
    document.querySelectorAll('.drawer').forEach(d => d.classList.remove('open'));
    drawer.classList.add('open');
    overlay.classList.add('open');
  };

  // Collega openDetail globale a openSpotDetail
  window.openDetail = (idOrSpot) => {
    const spot = typeof idOrSpot === 'string'
      ? window._markersData?.[idOrSpot]?.spot
      : idOrSpot;
    if (spot) window.openSpotDetail(spot);
  };
}
