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

## Struttura di navigazione

Quattro sezioni principali (tab bar), i moduli si aprono sopra come schermate:

- **Home** — calendario unificato: eventi, scadenze bollette, raccolta
  immondizia e turni di lavoro nello stesso mese; sotto, i promemoria della
  bacheca condivisa.
- **Finanze** — riepilogo uscite del mese + Bollette, Spese/rate, Salvadanai,
  Abbonamenti, Statistiche.
- **Utilità** — Turni, Pulizie, Lista spesa, Immondizia, Garanzie,
  Manutenzione, Salute, Veicoli, Animali, Piante + Contatti utili,
  Emergenze, Impostazioni.
- **Coppia** — formazione della coppia, Zona Intima E2E, salvadanai ed
  eventi condivisi solo tra i due partner.

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
| Notifiche locali scadenze (bollette, immondizia, garanzie, abbonamenti, manutenzione) | ✅ Completo — M2 |
| Calendario condiviso (household/coppia/personale) | ✅ Completo — M4 |
| Spese (categorie, visibilità, totali mensili) | ✅ Completo — M5 |
| Salvadanai (obiettivi + contributi) | ✅ Completo — M5 |
| Zona Intima (contenuti E2E) | ✅ Completo — M6 |
| Pulizie, Lista Spesa, Garanzie, Abbonamenti, Manutenzione, Contatti | ✅ Completi — M7 |
| Paywall + acquisti (RevenueCat) | ✅ UI pronta — manca solo la configurazione dashboard RevenueCat + prodotti store |
| Moduli premium: Veicoli e Animali (scadenze+spese per entità), Piante (annaffiatura), Statistiche (grafici+condivisione) | ✅ Completi |
| Navigazione a 4 tab + Home-calendario unificata | ✅ Completo |
| Turni di lavoro (settimanale, visibili a tutta la casa, nel calendario) | ✅ Completo |
| Salute (controlli ricorrenti, farmaci, note — **strettamente personali**) | ✅ Completo |
| Migrazione UI completa ai design token + tema scuro | 🔁 Fase migliorie |

## Palette e UI

Palette "Baltic" (blu/verde) centralizzata in `src/theme`:
Baltic Blue `#336699` accento · Charcoal Blue `#2F4858` testo ·
Sky `#86BBD8` · verde `#9EE493` per stati positivi (mai come testo:
contrasto insufficiente — per testo/spunte si usa `successInk` `#2E7D32`) ·
corallo `#E0736E` riservato alla sezione Coppia, per marcare il cambio di
contesto.

Tutte le schermate leggono da questi token (le storiche sono state
armonizzate automaticamente), quindi il tema scuro sarà un lavoro su un
solo file. Restano da rifinire a mano alcune schermate legacy (bollette,
immondizia, profilo) che usano ancora spaziature e componenti propri.

## Privacy dei dati per modulo

| Dato | Visibilità |
|---|---|
| Bollette, immondizia, pulizie, lista spesa, bacheca, turni… | Tutti i membri della casa |
| Calendario, spese, salvadanai | Scelta per voce: casa / coppia / solo io |
| Zona Intima | Solo i due partner — cifrata end-to-end |
| **Salute** | **Solo il proprietario** — nessuno, nemmeno il partner |
