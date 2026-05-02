// ── PLACES SEARCH MODULE ──────────────────────────────────────
// Uses Nominatim (OpenStreetMap) — no API key required

let searchTimeout = null;

export function createPlacesSearch({ onSelect, placeholder = '🔍 Cerca su mappa (es. Lago di Garda)...' }) {
  const wrap = document.createElement('div');
  wrap.className = 'places-search-wrap';

  const icon = document.createElement('span');
  icon.className = 'places-search-icon';
  icon.textContent = '🌍';

  const input = document.createElement('input');
  input.className = 'places-search-input';
  input.type = 'search';
  input.placeholder = placeholder;
  input.autocomplete = 'off';

  const dropdown = document.createElement('div');
  dropdown.className = 'places-dropdown';

  wrap.appendChild(icon);
  wrap.appendChild(input);
  wrap.appendChild(dropdown);

  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (!q || q.length < 2) { closeDropdown(); return; }
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => searchPlaces(q, dropdown, input, onSelect), 400);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeDropdown(); input.value = ''; }
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) closeDropdown();
  });

  function closeDropdown() { dropdown.classList.remove('open'); dropdown.innerHTML = ''; }

  return { element: wrap, input, closeDropdown, clearSearch: () => { input.value = ''; closeDropdown(); } };
}

async function searchPlaces(query, dropdown, input, onSelect) {
  dropdown.innerHTML = '<div class="places-loading">🔍 Ricerca in corso...</div>';
  dropdown.classList.add('open');

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=6&accept-language=it&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Str3pcamp/2.0' } });
    const data = await res.json();

    if (!data.length) {
      dropdown.innerHTML = '<div class="places-loading">Nessun risultato trovato</div>';
      return;
    }

    dropdown.innerHTML = '';
    data.forEach(place => {
      const item = document.createElement('div');
      item.className = 'places-item';

      const name = extractPlaceName(place);
      const detail = extractPlaceDetail(place);

      item.innerHTML = `
        <div class="places-item-name">${name}</div>
        <div class="places-item-detail">${detail}</div>
      `;

      item.addEventListener('click', () => {
        const result = {
          name: name,
          region: buildRegion(place),
          city: extractCity(place),
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon),
          displayName: place.display_name
        };
        input.value = name;
        dropdown.classList.remove('open');
        onSelect(result);
      });

      dropdown.appendChild(item);
    });

  } catch (err) {
    dropdown.innerHTML = '<div class="places-loading">Errore di rete</div>';
    console.error('Places search error:', err);
  }
}

function extractPlaceName(place) {
  const addr = place.address || {};
  return addr.tourism || addr.leisure || addr.natural || addr.amenity ||
         addr.village || addr.town || addr.city || addr.county ||
         place.display_name.split(',')[0].trim();
}

function extractCity(place) {
  const addr = place.address || {};
  return addr.city || addr.town || addr.village || addr.municipality || '';
}

function extractPlaceDetail(place) {
  const addr = place.address || {};
  const parts = [];
  if (addr.county || addr.state) parts.push(addr.county || addr.state);
  if (addr.country) parts.push(addr.country);
  return parts.join(' · ') || place.display_name.split(',').slice(1, 3).join(',').trim();
}

function buildRegion(place) {
  const addr = place.address || {};
  const parts = [];
  const state = addr.state || addr.county;
  const country = addr.country;
  if (state) parts.push(state);
  if (country) parts.push(country);
  return parts.join(' · ') || '';
}

// Reverse geocode: get place info from coordinates
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=it&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Str3pcamp/2.0' } });
    const data = await res.json();
    if (!data || data.error) return null;
    const addr = data.address || {};
    return {
      city: addr.city || addr.town || addr.village || '',
      region: (addr.state || addr.county || '') + (addr.country ? ' · ' + addr.country : ''),
      country: addr.country || ''
    };
  } catch {
    return null;
  }
}
