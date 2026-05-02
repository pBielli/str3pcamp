# Str3pcamp 🏕️ v2.0

App per il tracciamento di spot per campeggio libero in Europa.

## Struttura del progetto

```
str3pcamp/
├── index.html          ← Entry point principale
├── config.json         ← Tutte le configurazioni (Firebase, layer mappa, tipi spot, ecc.)
├── css/
│   └── style.css       ← Tutti gli stili (mobile-first, CSS variables)
└── js/
    ├── firebase.js     ← Firebase, autenticazione, storage locale
    ├── map.js          ← Leaflet, marker, posizione utente, detail card
    ├── addform.js      ← Form aggiunta spot multi-step
    ├── list.js         ← Lista spot, modifica, elimina
    └── places.js       ← Ricerca luoghi via Nominatim (OpenStreetMap)
```

## Novità v2.0

### Funzionalità
- **Punto posizione utente sulla mappa** — marker pulsante blu visibile subito all'avvio
- **Importa spot da mappa** — nel form aggiunta, cerca qualsiasi luogo su OpenStreetMap e importa automaticamente nome, regione, città e coordinate
- **Auto-compilazione coordinate** — quando si entra nel pannello Aggiungi, la posizione GPS viene caricata automaticamente nelle coordinate
- **Reverse geocoding** — usando il GPS compila automaticamente anche regione e città
- **Campo Città** aggiunto agli spot

### Bug fix
- **Form che si svuota** — risolto completamente: le selezioni (tenda da tetto, tipo spot, ecc.) usano toggle DOM diretti senza re-render
- **GPS non funzionante** — riscritto con `enableHighAccuracy`, gestione errori con codici specifici (permesso negato, timeout, non disponibile)

### Configurazione
Modifica `config.json` per cambiare:
- `firebase.*` — credenziali Firebase
- `map.defaultCenter` e `map.defaultZoom` — centro iniziale della mappa
- `map.layers` — tile layer disponibili
- `defaultSpots` — spot precaricati
- `spotTypes`, `services`, `environmentTags` — categorie personalizzabili

## Utilizzo locale

Serve un server HTTP (non funziona aprendo il file direttamente per via dei moduli ES):

```bash
# Python
python3 -m http.server 8080

# Node
npx serve .
```

Poi apri `http://localhost:8080`

## Deploy

Carica tutti i file su qualsiasi hosting statico (Netlify, Vercel, GitHub Pages, Firebase Hosting).
