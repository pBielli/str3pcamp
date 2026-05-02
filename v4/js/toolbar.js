// js/toolbar.js — Barra filtri dinamica da config

export function initToolbar(cfg) {
  const bar = document.getElementById('filter-bar');
  if (!bar) return;

  // Chip "Tutti" già presente nell'HTML
  const allChip = bar.querySelector('[data-filter="all"]');

  // Genera chip per ogni spotType da config
  Object.entries(cfg.spotTypes || {}).forEach(([key, type]) => {
    const chip = document.createElement('button');
    chip.className = 'filter-chip';
    chip.dataset.filter = key;
    chip.innerHTML = `<span class="dot" style="background:${type.color}"></span>${type.label}`;
    bar.appendChild(chip);
  });

  // Gestisci click filtri
  bar.addEventListener('click', e => {
    const chip = e.target.closest('.filter-chip');
    if (!chip) return;

    bar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    chip.classList.add('active');

    window.filterMarkers?.(chip.dataset.filter);
  });

  // Menu burger → strumenti admin
  document.getElementById('btn-menu')?.addEventListener('click', () => {
    const menu = document.getElementById('admin-menu');
    if (menu) {
      menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
      return;
    }
    // Crea menu al volo
    const m = document.createElement('div');
    m.id = 'admin-menu';
    m.style.cssText = `
      position:fixed;top:60px;right:12px;
      background:#fff;border:1px solid #dde3d8;
      border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.16);
      z-index:2000;overflow:hidden;min-width:200px;`;
    m.innerHTML = `
      <a href="tools/categories.html" style="display:flex;align-items:center;gap:10px;padding:14px 16px;text-decoration:none;color:#1a2415;font-size:.9rem;border-bottom:1px solid #eee">
        ⚙️ <span>Gestisci Categorie</span>
      </a>
      <a href="tools/seed-config.html" style="display:flex;align-items:center;gap:10px;padding:14px 16px;text-decoration:none;color:#1a2415;font-size:.9rem;border-bottom:1px solid #eee">
        🌱 <span>Inizializza Config</span>
      </a>
      <a href="tools/transfer.html" style="display:flex;align-items:center;gap:10px;padding:14px 16px;text-decoration:none;color:#1a2415;font-size:.9rem">
        🔄 <span>Trasferisci Dati</span>
      </a>`;
    document.body.appendChild(m);
    document.addEventListener('click', e => {
      if (!m.contains(e.target) && e.target.id !== 'btn-menu') m.remove();
    }, { once: true });
  });
}
