// js/list.js — Lista posti con card

export function initList(cfg) {
  const container = document.getElementById('list-content');
  if (!container) return;

  container.innerHTML = `<div class="spinner"></div>`;

  window._onSpotsUpdate = () => renderList(cfg, container);
}

function renderList(cfg, container) {
  const spots = Object.values(window._markersData || {}).map(d => d.spot);

  if (!spots.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="ico">🗺️</div>
        <h3>Nessun posto ancora</h3>
        <p>Aggiungi il tuo primo posto segreto!</p>
      </div>`;
    return;
  }

  // Ordina per data decrescente
  spots.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

  container.innerHTML = spots.map(spot => {
    const typeConf = cfg.spotTypes?.[spot.type] || {};
    const color    = typeConf.color || '#888';
    const label    = typeConf.label || spot.type || '?';
    const stars    = '⭐'.repeat(spot.rating || 0);
    const thumb    = spot.photos?.[0] || '';
    const tagList  = (spot.tags || []).slice(0, 2).join(' · ');

    return `
      <div class="spot-card" onclick="openDetail('${spot.id}')">
        ${thumb
          ? `<img class="spot-card-thumb" src="${thumb}" alt="${spot.name}">`
          : `<div class="spot-card-thumb" style="display:flex;align-items:center;justify-content:center;font-size:1.8rem;background:var(--surface2)">🏕</div>`
        }
        <div class="spot-card-body">
          <div class="spot-card-type" style="color:${color}">${label}</div>
          <div class="spot-card-name">${spot.name || 'Senza nome'}</div>
          <div class="spot-card-meta">
            ${spot.location ? `📍 ${spot.location}` : ''}
            ${tagList ? ` · ${tagList}` : ''}
          </div>
          ${stars ? `<div class="spot-card-stars">${stars}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}
