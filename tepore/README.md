# Tepore 🏡

**L'hub completo per la vita di casa** — bollette, immondizia, pulizie, spese,
bacheca condivisa in tempo reale, e (per chi vive in coppia) una zona riservata
protetta da crittografia end-to-end. Una sola app per famiglie, coinquilini,
coppie e chi vive da solo.

App mobile iOS + Android · React Native + Expo (SDK 54) + Firebase.
Fusione dei progetti "Tepore" (hub casa) e "Insieme" (app di coppia).

---

## Setup dopo il clone

```powershell
npm install --legacy-peer-deps
npx expo install --fix        # allinea le versioni esatte a SDK 54

# File segreti (NON sono nel repo — chiedili a chi ha accesso a Firebase):
#   .env                       -> copia .env.example e compila
#   google-services.json       -> Firebase Console, app Android
#   GoogleService-Info.plist   -> Firebase Console, app iOS
```

**Sviluppo quotidiano** (serve la Development Build installata sul telefono,
NON Expo Go — i moduli nativi di login social e push non girano in Expo Go):

```powershell
npx expo start
```

**Prima Development Build** (una tantum, e quando cambiano i moduli nativi):

```powershell
npm install -g eas-cli
eas login
eas init
eas credentials -p android    # copia la SHA-1 in Firebase, riscarica google-services.json
eas build --profile development --platform android
```

**Backend** (Cloud Functions + Security Rules — piano Blaze richiesto):

```powershell
npm install -g firebase-tools
firebase login
cd functions && npm install && cd ..
firebase deploy --only functions
firebase deploy --only firestore:rules
```
⚠️ Ordine importante: prima le functions, POI le rules (il join per codice
invito passa dalle functions; con le rules attive il vecchio flusso client è
giustamente bloccato).

---

## Architettura in breve

- **Una sola household condivisa** per casa (famiglia/coinquilini/coppia);
  ogni utente può appartenere a più case e cambiare quella attiva.
- **La coppia è una relazione opzionale** tra due membri (richiesta+conferma),
  non una "modalità" dell'app. Sblocca la Zona Intima. Più coppie possono
  coesistere nella stessa casa.
- **3 livelli di visibilità** dei contenuti — household / coppia / personale —
  applicati **lato server** dalle Security Rules, mai solo nella UI.
- **Zona Intima cifrata end-to-end** (tweetnacl): chiave simmetrica di coppia
  scambiata via nacl.box, privata in Keychain/Keystore. Il server vede solo
  ciphertext. Coppia sciolta ⇒ contenuti irrecuperabili per chiunque, noi inclusi.
- **Notifiche ibride**: locali (scadenze, zero costi) + push via Expo Push e
  Cloud Functions (eventi sociali: nuovo membro, richiesta di coppia…).
- **Login**: email/password, Google, Apple, Facebook (Firebase Auth).
  Su iOS "Sign in with Apple" è obbligatorio per policy Apple: già incluso.
- **Monetizzazione** (RevenueCat): moduli una tantum — Veicoli 1,99 € ·
  Animali 1,99 € · Piante 0,99 € · Statistiche 2,99 € — e abbonamento
  "Casa Completa" 1,99 €/mese o 14,99 €/anno (tutto + widget + OCR a tetto).
- **Pubblicità: NESSUNA, by design.** App a bassa permanenza + contenuti
  intimi: le ads sono state valutate ed escluse deliberatamente.
- **GDPR**: dati in regione europea (eur3 / europe-west1), export dati
  gratuito in roadmap, cancellazione account con anonimizzazione.

## Struttura del repo

```
firestore.rules        Security Rules (default deny, 3 livelli di visibilità)
firebase.json          Config deploy rules+functions
functions/             Cloud Functions (join/uscita casa, invio push)
src/
  app/                 Schermate (Expo Router, file-based routing)
  components/          Componenti riutilizzabili
  data/                Dati statici (numeri emergenza per paese)
  hooks/               useAuth (multi-provider), useHousehold
  services/            firebase, household, bollette, immondizia,
                       bacheca, relationships, crypto (E2E),
                       notifications (push+locali), purchases (RevenueCat)
  theme/               Design token (palette verde salvia — vedi nota UI)
  types/               Tipi TypeScript di tutti i dati
```

## Stato dei moduli

| Modulo | Stato |
|---|---|
| Auth (email + Google/Apple/Facebook) | ✅ Completo |
| Household multi-casa, inviti, partecipanti | ✅ Completo (join/uscita via Cloud Functions) |
| Bollette (CRUD, ricorrenti, storico) | ✅ Completo |
| Immondizia (tipi personalizzati, calendari, anno) | ✅ Completo |
| Emergenze (numeri per paese) | ✅ Completo |
| Bacheca condivisa (note + checklist realtime) | ✅ Completo — M3 |
| Coppia (richiesta/conferma + chiavi E2E) | ✅ Completo — M1 |
| Push (infrastruttura + "nuovo membro") | ✅ Base attiva |
| Notifiche locali scadenze | 🔜 M2 (helper già pronti in notifications.ts) |
| Calendario condiviso | 🔜 M4 |
| Portfolio spese + Salvadanai | 🔜 M5 |
| Zona Intima (contenuti E2E) | 🔜 M6 (crypto pronta) |
| Pulizie, Lista Spesa, Garanzie, Abbonamenti, Manutenzione, Contatti | 🔜 M7 (placeholder) |
| Paywall + acquisti | 🔜 M8 (servizio purchases pronto, manca UI + dashboard RevenueCat) |

## Nota UI

Le schermate storiche usano ancora la palette arancione originale; Bacheca e
Coppia usano già i design token nuovi (`src/theme`: verde salvia su crema, dal
redesign Claude Design). La migrazione completa delle schermate ai token è
parte della fase di rifinitura UX — e renderà il futuro tema scuro un lavoro
su un solo file.
