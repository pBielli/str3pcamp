# 🏕 RunBase v3

Mappa collaborativa dei posti segreti per campeggiatori.

---

## Setup rapido

### 1. Configura Firebase

Apri `config.json` e inserisci le credenziali del tuo progetto Firebase:

```json
"firebase": {
  "projectId": "il-tuo-project-id",
  "apiKey": "la-tua-api-key",
  "authDomain": "...",
  "storageBucket": "...",
  "messagingSenderId": "...",
  "appId": "..."
}
```

> Tutte le credenziali sono centralizzate in `config.json`.
> Per cedere l'app a terzi, basta sostituire questo file.

### 2. Regole Firestore

Nella console Firebase → Firestore → Regole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /spots/{id}   { allow read, write: if true; }
    match /tools/{id}   { allow read, write: if true; }
  }
}
```

### 3. Inizializza la config su Firestore

Apri `tools/seed-config.html` e clicca **Esegui Seed**.

Questo copia `spotTypes`, `vehicles`, `services` e `environmentTags`
da `config.json` nella collection `tools` di Firestore.

### 4. Lancia l'app

Serve un server HTTP (non funziona aprendo direttamente il file,
per via dei moduli ES e delle chiamate Firebase).

```bash
# Con npx
npx serve .

# Con Python
python3 -m http.server 8080
```

---

## Struttura file

```
v3/
├── config.json          ← Unico file da modificare per cedere l'app
├── index.html           ← App principale
├── css/style.css        ← Stili mobile-first
├── js/
│   ├── config.js        ← Carica config.json + override Firestore
│   ├── firebase-raw.js  ← Inizializzazione Firebase
│   ├── map.js           ← Mappa Leaflet (lingua IT, geocoding IT)
│   ├── toolbar.js       ← Filtri dinamici da config
│   ├── addform.js       ← Form aggiunta posto
│   ├── list.js          ← Lista posti
│   └── places.js        ← Posti salvati + drawer dettaglio
└── tools/
    ├── categories.html  ← Editor categorie (→ Firestore)
    ├── seed-config.html ← Inizializza config su Firestore
    └── transfer.html    ← Backup / ripristino dati
```

---

## Come funziona la config dinamica

1. L'app carica `config.json` (statico, locale)
2. Si connette a Firestore e legge la collection `tools`
3. I valori Firestore **sovrascrivono** quelli locali

Quindi puoi modificare categorie, servizi e tag dall'interfaccia
`tools/categories.html` senza toccare il codice.

---

## Cedere l'app a terzi

1. Il nuovo proprietario crea un progetto Firebase
2. Aggiorna `config.json` con le nuove credenziali
3. Esegue il seed (`tools/seed-config.html`)
4. Importa i dati se necessario (`tools/transfer.html`)
