# Progetto “Rilievi e Perizie”

Una soluzione per la gestione e archiviazione digitale delle perizie, composta da:
- **Web App Admin** (supervisione e gestione utenti/perizie)
- **App Mobile Android** (upload rilievi sul campo)

## 🎯 Obiettivo
Consentire a un’azienda di archiviare in tempo reale su un server le fotografie e i dati di rilievi/perizie eseguite dai propri dipendenti.

## 🚀 Funzionalità Principali

### Web App Admin
- **Tecnologie:** Node.js, Express, MongoDB Atlas, Render.com, MapLibre
- Creazione e gestione utenti (ruoli ADMIN/USER)  
- Login con password iniziale
- Dashboard con mappa (MapLibre) di tutte le perizie  
- Filtro per operatore, modifica descrizioni e commenti  

### App Mobile Android
- **Tecnologie:** Angular, Ionic, Capacitor  
- Login operatore con JWT  
- Scatto o selezione di foto (Capacitor Camera)  
- Acquisizione automatica di coordinate GPS e data/ora  
- Upload perizia (descrizione, foto, coordinate, token)  
- Archiviazione immagini su Cloudinary  

## 🔧 Setup e Installazione

### Backend
1. Utilizzare questa repository come progetto su render.com
2. Crea `.env` con:
   ```
   MONGODB_URI=<uri_mongo_atlas>
   DBNAME=RILIEVI
   HTTP_PORT=3000
   JWT_SECRET=<chiave_jwt>
   PRIVATE_KEY=<chiave_privata>
   CERTIFICATE=<certificato>
   CLOUDINARY_CLOUD_NAME=<cloud_name>
   CLOUDINARY_API_KEY=<api_key>
   CLOUDINARY_API_SECRET=<api_secret>
   ```
3. Installa dipendenze e avvia (per farlo in locale):
   ```bash
   npm install
   npm start
   ```

### Mobile (Ionic)
1. Unzippare AppRilievi.zip
2. Installa dipendenze:
   ```bash
   npm install
   ```
3. Per sviluppo web:
   ```bash
   ionic serve
   ```
4. Per build Android:
   ```bash
   ionic build
   npx cap add android
   npx cap copy android
   npx cap open android
   ```
   Attiva **Debug USB** sul dispositivo e premi ▶️ in Android Studio.

## 🌍 Note Importanti
- Per debug su device: `adb logcat`.

## Immagini
![Dashboard Admin](https://github.com/AlessandriaElia/RilieviPerizie/blob/main/dashboardAdmin.png)

Dashboard Admin.

![Dashboard Utente](https://github.com/AlessandriaElia/RilieviPerizie/blob/main/dashboardUtente.jpeg)

Dashboard Utente.
---

**License:** Progetto didattico privato, non commerciale.
