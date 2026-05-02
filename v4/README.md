# Str3pcamp 🏕️ v2.1

App per il tracciamento di spot per campeggio libero in Europa.

## Struttura del progetto

```
str3pcamp/
├── index.html              ← Entry point principale
├── config.json             ← Configurazione centralizzata (Firebase, mappa, categorie, lingue, Firestore paths)
├── css/
│   └── style.css           ← Tutti gli stili (mobile-first, CSS variables)
├── js/
│   ├── firebase.js         ← Firebase, autenticazione, storage, listener remoto config
│   ├── map.js              ← Leaflet, marker, posizione utente, detail card
│   ├── addform.js          ← Form aggiunta spot multi-step con locale dinamico
│   ├── list.js             ← Lista spot, modifica, elimina
│   ├── toolbar.js          ← Toolbar condivisa per tool pages
│   └── places.js           ← Ricerca luoghi via Nominatim (OpenStreetMap)
└── tools/
    ├── index.html          ← Dashboard principale tools (NEW)
    ├── categories.html     ← Gestione dinamica categorie (aggiornato per tags/config)
    ├── seed-config.html    ← Sincronizza default da config.json → Firebase appConfig
    ├── transfer.html       ← Trasferimento DB tra vecchio e nuovo
    └── pushcat.html        ← Upload manuale tag a Firebase (refactored per config centralizzata)
```

## Novità v2.1

### ✨ Miglioramenti architetturali
- **Centralizzazione configurazione**: Tutte le configurazioni (Firebase, mappa, categorie, lingue) ora in `config.json`
- **Remote config loading**: Le categorie (tipi di posto, veicoli, ambienti, servizi) si caricano dinamicamente da Firestore `tags/config`
- **Fallback automatico**: Se Firestore non è disponibile, l'app usa i valori di default da `config.json`
- **Tool dashboard**: Nuova pagina `tools/index.html` come punto di accesso a tutti gli admin tools

### 🌐 Internazionalizzazione
- **Language selector**: Selettore lingue in header con supporto per IT e EN
- **Locale persistence**: La scelta della lingua si salva in localStorage
- **Dynamic UI**: La UI (label bottoni, placeholder, legende) si aggiorna in base alla lingua scelta
- **Map/Place search**: Localizzazione della ricerca geografica

### 🛠️ Tools & Admin
- **Categorie sincronizzate**: `categories.html` ora legge/scrive da `tags/config` invece di `appConfig/main`
- **Upload Tags centralizzato**: `pushcat.html` usa `config.json` per credenziali e path Firestore
- **Seed Config**: Sincronizza default da `config.json` → `appConfig/main` (compatibilità legacy)
- **Transfer DB**: Migrazione spot tra vecchio e nuovo database

### 📍 Miglioramenti form
- **Form completamente localizzato**: Placeholder, label, messaggi di validazione in IT/EN
- **Configurazione dinamica**: Tipi di posto e veicoli si caricano da remote config
- **Reverse geocoding**: Auto-compila regione/città quando usi il GPS

## Novità v2.0

- **Punto posizione utente**: Marker pulsante blu subito all'avvio della mappa
- **Importa spot da mappa**: Cerca qualsiasi luogo su OpenStreetMap e importa automaticamente nome, regione, città e coordinate
- **Auto-compilazione coordinate**: Quando entri nel pannello Aggiungi, il GPS carica automaticamente le coordinate
- **Reverse geocoding**: Compila automaticamente regione e città usando il GPS
- **Campo Città**: Aggiunto agli spot per migliore geolocalizzazione
- **Bug fix GPS**: GPS riscritto con `enableHighAccuracy`, gestione errori con codici specifici

## Configurazione

Modifica `config.json` per:

```json
{
  "app": {
    "name": "Str3pcamp",
    "locale": "it",
    "languages": { "it": "Italiano", "en": "English" },
    "themeColor": "#1f3a23",
    "backgroundColor": "#081006"
  },
  "firebase": {
    "apiKey": "...",
    "projectId": "strepcamp",
    "...": "..."
  },
  "remoteTags": {
    "collection": "tags",
    "doc": "config"
  },
  "defaultTags": {
    "spotTypes": { "accoglienza": {...}, "libero": {...}, "camping": {...} },
    "vehicles": { "tenda": {...}, "rooftop": {...} },
    "environmentTags": ["🌊 Mare", "⛰ Montagna", ...],
    "services": { "acqua": "💧 Acqua", ... }
  },
  "map": {
    "defaultCenter": [45.5, 12],
    "defaultZoom": 5,
    "layers": { "street": {...}, "satellite": {...}, "topo": {...} }
  },
  "placesApi": {
    "nominatimUrl": "https://nominatim.openstreetmap.org/search",
    "nominatimReverse": "https://nominatim.openstreetmap.org/reverse"
  }
}
```

### Flusso di configurazione

1. **Local**: Leggi default da `config.json`
2. **Remote override**: Se `tags/config` esiste su Firestore, usa quello
3. **Listener**: L'app rimane in ascolto su `tags/config` e aggiorna la UI se cambia

## Utilizzo locale

Serve un server HTTP:

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Poi apri `http://localhost:8080`

## Deploy

Carica tutti i file su qualsiasi hosting statico (Netlify, Vercel, GitHub Pages, Firebase Hosting).

### Setup Firestore (primo avvio)

1. Apri `http://localhost:8080/tools/index.html`
2. Seleziona **Seed Config** e carica i default da `config.json`
3. Oppure seleziona **Upload Tags** per caricare manualmente
4. L'app sincronizzerà automaticamente da `tags/config` al prossimo caricamento

## Workflow Admin

```
CATEGORIA MANAGEMENT
┌─────────────────────────────────────────┐
│ tools/categories.html                   │ ← Modifica categorie live
│ Legge/scrive da: tags/config            │
└─────────────────────────────────────────┘
           ↓
       Salva su Firebase
       (tags/config risorsa Firestore)
           ↓
┌─────────────────────────────────────────┐
│ App principale (index.html)             │
│ Firebase listener su tags/config        │
│ Aggiorna legend, filtri, form           │
└─────────────────────────────────────────┘

ALTERNATIVA: Upload manuale
┌─────────────────────────────────────────┐
│ tools/pushcat.html                      │
│ Upload tags da config.json              │
│ Destinazione: tags/config               │
└─────────────────────────────────────────┘
           ↓
       Carica su Firebase
           ↓
┌─────────────────────────────────────────┐
│ App principale                          │
│ Ascolta listener, aggiorna              │
└─────────────────────────────────────────┘

RESET DEFAULTS
┌─────────────────────────────────────────┐
│ tools/seed-config.html                  │
│ Carica defaults da config.json          │
│ Destinazione: appConfig/main (legacy)   │
└─────────────────────────────────────────┘
```

## Linguaggi supportati

- 🇮🇹 **Italiano** (default)
- 🇬🇧 **English**

Aggiungi nuove lingue in `config.json` `app.languages` e in `index.html` `LOCALES`.

## Feature future

- [ ] Supporto offline completo (service workers)
- [ ] Editor geometrie avanzato
- [ ] Sincronizzazione cloud per spot personali
- [ ] Raccolta foto
- [ ] Valutazioni e commenti community

