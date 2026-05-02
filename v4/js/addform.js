// js/addform.js — Form aggiunta posto, costruito da config

import { db, stor, collection, addDoc, serverTimestamp, ref, uploadBytes, getDownloadURL }
  from './firebase-raw.js';

export function initAddForm(cfg) {
  const body = document.getElementById('add-form-body');
  if (!body) return;

  let selectedLat = null, selectedLng = null;
  let selectedType = null;
  let selectedVehicles = new Set();
  let selectedTags = new Set();
  let selectedServices = new Set();
  let rating = 0;
  let photos = [];

  // Selezione punto su mappa
  window._map?.on('click', e => {
    if (!document.getElementById('drawer-add').classList.contains('open')) return;
    selectedLat = e.latlng.lat;
    selectedLng = e.latlng.lng;
    const el = document.getElementById('coords-display');
    if (el) el.textContent = `📍 ${selectedLat.toFixed(5)}, ${selectedLng.toFixed(5)}`;
    reverseGeocode(selectedLat, selectedLng);
  });

  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=it`
      );
      const d = await res.json();
      const name = d.address?.town || d.address?.village || d.address?.city || d.address?.county || '';
      const region = d.address?.state || '';
      const nameEl = document.getElementById('form-name');
      if (nameEl && !nameEl.value) nameEl.value = name;
      const locEl = document.getElementById('form-location');
      if (locEl) locEl.value = [name, region].filter(Boolean).join(', ');
    } catch(e) { /* silenzioso */ }
  }

  body.innerHTML = `
    <p style="font-size:.82rem;color:var(--text-muted);margin-bottom:16px;padding:10px;background:var(--green-faded);border-radius:8px">
      📌 Tocca la mappa per posizionare il posto, poi compila i dettagli.
    </p>
    <div id="coords-display" style="font-size:.82rem;color:var(--green);font-weight:600;margin-bottom:16px;min-height:20px"></div>

    <div class="form-section">
      <label class="form-label">Nome posto</label>
      <input id="form-name" class="form-input" type="text" placeholder="Es. Cascata del Lupo">
    </div>

    <div class="form-section">
      <label class="form-label">Luogo / Regione</label>
      <input id="form-location" class="form-input" type="text" placeholder="Rilevato automaticamente">
    </div>

    <div class="form-section">
      <label class="form-label">Tipo posto</label>
      <div class="chip-group" id="type-chips">
        ${Object.entries(cfg.spotTypes || {}).map(([key, t]) => `
          <button class="chip chip-type-${key}" data-type="${key}"
            style="border-color:${t.color}">
            ${t.label}
          </button>`).join('')}
      </div>
    </div>

    <div class="form-section">
      <label class="form-label">Veicolo</label>
      <div class="chip-group" id="vehicle-chips">
        ${Object.entries(cfg.vehicles || {}).map(([key, v]) => `
          <button class="chip" data-vehicle="${key}">${v.emoji} ${v.label}</button>`).join('')}
      </div>
    </div>

    <div class="form-section">
      <label class="form-label">Ambiente</label>
      <div class="chip-group" id="tag-chips">
        ${(cfg.environmentTags || []).map(t => `
          <button class="chip" data-tag="${t}">${t}</button>`).join('')}
      </div>
    </div>

    <div class="form-section">
      <label class="form-label">Servizi disponibili</label>
      <div class="chip-group" id="service-chips">
        ${Object.entries(cfg.services || {}).map(([key, label]) => `
          <button class="chip" data-service="${key}">${label}</button>`).join('')}
      </div>
    </div>

    <div class="form-section">
      <label class="form-label">Valutazione</label>
      <div class="rating-stars" id="rating-stars">
        ${[1,2,3,4,5].map(n => `<span class="star" data-n="${n}">★</span>`).join('')}
      </div>
    </div>

    <div class="form-section">
      <label class="form-label">Descrizione</label>
      <textarea id="form-desc" class="form-textarea" placeholder="Accesso, consigli, orari…"></textarea>
    </div>

    <div class="form-section">
      <label class="form-label">Foto</label>
      <div class="photo-upload-area" id="photo-drop">
        <div class="ico">📷</div>
        <p>Tocca per aggiungere foto</p>
      </div>
      <input type="file" id="photo-input" accept="image/*" multiple style="display:none">
      <div class="photo-preview-grid" id="photo-preview"></div>
    </div>

    <div class="form-section">
      <label class="form-label">Note private</label>
      <textarea id="form-notes" class="form-textarea" placeholder="Visibili solo a te"></textarea>
    </div>

    <div style="display:flex;gap:8px;margin-top:4px">
      <button class="btn btn-secondary" id="form-cancel" style="flex:1">Annulla</button>
      <button class="btn btn-primary" id="form-submit" style="flex:2">💾 Salva posto</button>
    </div>
    <div style="height:24px"></div>
  `;

  // ── Type chips
  document.getElementById('type-chips').addEventListener('click', e => {
    const btn = e.target.closest('[data-type]');
    if (!btn) return;
    document.querySelectorAll('#type-chips .chip').forEach(c => c.classList.remove('selected'));
    btn.classList.add('selected');
    selectedType = btn.dataset.type;
  });

  // ── Vehicle chips (multi)
  document.getElementById('vehicle-chips').addEventListener('click', e => {
    const btn = e.target.closest('[data-vehicle]');
    if (!btn) return;
    btn.classList.toggle('selected');
    const v = btn.dataset.vehicle;
    selectedVehicles.has(v) ? selectedVehicles.delete(v) : selectedVehicles.add(v);
  });

  // ── Tag chips (multi)
  document.getElementById('tag-chips').addEventListener('click', e => {
    const btn = e.target.closest('[data-tag]');
    if (!btn) return;
    btn.classList.toggle('selected');
    const t = btn.dataset.tag;
    selectedTags.has(t) ? selectedTags.delete(t) : selectedTags.add(t);
  });

  // ── Service chips (multi)
  document.getElementById('service-chips').addEventListener('click', e => {
    const btn = e.target.closest('[data-service]');
    if (!btn) return;
    btn.classList.toggle('selected');
    const s = btn.dataset.service;
    selectedServices.has(s) ? selectedServices.delete(s) : selectedServices.add(s);
  });

  // ── Rating stars
  const stars = document.querySelectorAll('#rating-stars .star');
  stars.forEach(star => {
    star.addEventListener('click', () => {
      rating = +star.dataset.n;
      stars.forEach(s => s.classList.toggle('on', +s.dataset.n <= rating));
    });
  });

  // ── Foto
  document.getElementById('photo-drop').addEventListener('click', () =>
    document.getElementById('photo-input').click()
  );
  document.getElementById('photo-input').addEventListener('change', e => {
    photos = [...photos, ...Array.from(e.target.files)];
    renderPhotoPreviews();
  });

  function renderPhotoPreviews() {
    const grid = document.getElementById('photo-preview');
    grid.innerHTML = photos.map((f, i) => `
      <div style="position:relative">
        <img src="${URL.createObjectURL(f)}" alt="foto">
        <button onclick="this.parentElement.remove();photos.splice(${i},1)"
          style="position:absolute;top:2px;right:2px;background:rgba(0,0,0,.6);color:#fff;
                 border:none;border-radius:50%;width:20px;height:20px;cursor:pointer;font-size:.7rem">✕</button>
      </div>`).join('');
  }

  // ── Cancel
  document.getElementById('form-cancel').addEventListener('click', () => {
    document.getElementById('drawer-add').classList.remove('open');
    document.getElementById('drawer-overlay').classList.remove('open');
  });

  // ── Submit
  document.getElementById('form-submit').addEventListener('click', async () => {
    const name = document.getElementById('form-name').value.trim();
    if (!name)        return window.showToast?.('Inserisci un nome', 'error');
    if (!selectedLat) return window.showToast?.('Seleziona un punto sulla mappa', 'error');
    if (!selectedType)return window.showToast?.('Seleziona il tipo di posto', 'error');

    const btn = document.getElementById('form-submit');
    btn.textContent = '⏳ Salvataggio…';
    btn.disabled = true;

    try {
      // Upload foto
      const photoUrls = [];
      for (const file of photos) {
        const path = `spots/${Date.now()}_${file.name}`;
        const storRef = ref(stor, path);
        await uploadBytes(storRef, file);
        photoUrls.push(await getDownloadURL(storRef));
      }

      const services = {};
      selectedServices.forEach(s => { services[s] = true; });

      await addDoc(collection(db, 'spots'), {
        name,
        location:  document.getElementById('form-location').value.trim(),
        type:      selectedType,
        vehicles:  [...selectedVehicles],
        tags:      [...selectedTags],
        services,
        rating,
        description: document.getElementById('form-desc').value.trim(),
        notes:     document.getElementById('form-notes').value.trim(),
        photos:    photoUrls,
        lat:       selectedLat,
        lng:       selectedLng,
        createdAt: serverTimestamp()
      });

      window.showToast?.('✅ Posto salvato!', 'success');
      document.getElementById('drawer-add').classList.remove('open');
      document.getElementById('drawer-overlay').classList.remove('open');

      // Reset form
      resetForm();

    } catch(e) {
      console.error(e);
      window.showToast?.('Errore durante il salvataggio', 'error');
    } finally {
      btn.textContent = '💾 Salva posto';
      btn.disabled = false;
    }
  });

  function resetForm() {
    selectedLat = null; selectedLng = null;
    selectedType = null;
    selectedVehicles.clear(); selectedTags.clear(); selectedServices.clear();
    rating = 0; photos = [];
    document.getElementById('form-name').value = '';
    document.getElementById('form-location').value = '';
    document.getElementById('form-desc').value = '';
    document.getElementById('form-notes').value = '';
    document.getElementById('coords-display').textContent = '';
    document.getElementById('photo-preview').innerHTML = '';
    document.querySelectorAll('#add-form-body .chip').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('#rating-stars .star').forEach(s => s.classList.remove('on'));
  }
}
