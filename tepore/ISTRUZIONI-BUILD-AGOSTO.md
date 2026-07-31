# Tepore · APK di collaudo per agosto — istruzioni operative

Obiettivo: avere **Tepore installata sul telefono Android**, con tutti i moduli
sbloccati, utilizzabile offline per tutto agosto, e con la possibilità di
ricevere le correzioni via aggiornamento **OTA** senza reinstallare nulla.

Tempo: ~60 minuti di lavoro tuo + ~20 minuti di attesa build.

---

## Contenuto di questa cartella

| File | Dove va nel progetto |
|---|---|
| `app.json` | root del progetto (sostituisce l'attuale — **cambia `it.CAMBIAMI.tepore`**) |
| `eas.json` | root del progetto (nuovo) |
| `src/config/flags.ts` | nuovo file |
| `src/app/statistiche.tsx` | nuovo file (tappa la rotta mancante) |
| `.env.example` | root del progetto |
| `firestore.rules` | **non** va nel progetto: si incolla in Firebase Console |

Va inoltre modificato a mano `src/app/index.tsx` (vedi passo 4).

---

## Passo 1 · Regole Firestore (fallo per primo, è un blocco)

Firebase Console → progetto `tepore-96890` → **Firestore Database → Regole**.

Se vedi una riga con `request.time < timestamp.date(...)`, sei in **modalità
test**: quelle regole scadono e l'app smetterebbe di funzionare a metà agosto,
senza messaggi d'errore chiari. Anche se non fossero scadute, oggi chiunque
può leggere tutti i dati.

Incolla il contenuto di `firestore.rules` → **Pubblica**.

Poi verifica subito, ancora da Expo Go: login, apri Bollette, creane una,
apri Immondizia, entra in una casa con il codice invito. Se qualcosa dà
"Missing or insufficient permissions", scrivimelo e sistemiamo la regola
prima di buildare.

---

## Passo 2 · Identificatori dell'app

Apri `app.json` e sostituisci **entrambe** le occorrenze di
`it.CAMBIAMI.tepore` con il tuo identificatore definitivo, ad esempio
`it.mariorossi.tepore` o `com.tepore.app`.

⚠️ Dopo la prima pubblicazione sugli store questo valore **non è più
modificabile**. Sceglilo pensando che ci sarà anche la versione iOS.

Servono anche gli asset (se non li hai già in `assets/`):
- `icon.png` — 1024×1024, senza trasparenza, senza angoli arrotondati
- `adaptive-icon.png` — 1024×1024, il soggetto dentro il cerchio centrale
- `splash.png` — 1284×2778 va benissimo

---

## Passo 3 · File di configurazione

Copia nel progetto `eas.json`, `src/config/flags.ts`, `src/app/statistiche.tsx`
e `.env.example`. Poi crea il tuo `.env` locale:

```bash
cp .env.example .env
```

Controlla che `.env` sia in `.gitignore`.

---

## Passo 4 · Sblocco dei moduli in `src/app/index.tsx`

Aggiungi in cima al file:

```ts
import { FLAGS } from "../config/flags";
```

e sostituisci il blocco "Moduli aggiuntivi — bloccati" (~riga 256) con la
versione che condiziona lock e navigazione al flag. Verifica che i nomi
`styles.iconChip` e `styles.tileLabel` corrispondano a quelli usati dalle
tile normali nel tuo StyleSheet.

Prova subito in Expo Go: con `.env` a `true` le quattro tile devono essere
colorate, senza lucchetto, e portare alle rispettive schermate placeholder.

---

## Passo 5 · EAS: account, progetto, aggiornamenti OTA

```bash
npm install -g eas-cli
eas login                 # account gratuito su expo.dev
eas init                  # scrive extra.eas.projectId dentro app.json

npx expo install expo-updates
eas update:configure      # aggiunge la sezione "updates" ad app.json
```

---

## Passo 6 · Build

```bash
eas build --platform android --profile collaudo
```

Non serve Android Studio: la build gira nel cloud di Expo (piano gratuito:
build in coda, di solito 10–25 minuti). Alla fine ricevi un link con QR code.

---

## Passo 7 · Installazione sul telefono

1. Apri il link EAS **dal telefono Android** (o inquadra il QR).
2. Scarica l'APK.
3. Android chiederà di autorizzare l'installazione da origini sconosciute per
   il browser: concedi.
4. Installa e apri.

L'APK **non scade**. Funziona senza PC, senza Metro, senza connessione (salvo
i dati Firestore, che richiedono rete alla prima sincronizzazione).

---

## Passo 8 · Correzioni durante agosto (il workflow quotidiano)

```bash
# dopo aver corretto qualcosa nel codice TypeScript/React:
eas update --branch collaudo --message "sistemato totale bollette"
```

**Come arriva sul telefono:** all'apertura l'app scarica l'aggiornamento in
background e lo applica **al riavvio successivo**. Quindi: apri l'app,
chiudila davvero (swipe via dai recenti), riaprila → vedi la modifica.
Se non la vedi, aspetta 30 secondi e ripeti: significa che il download non
era ancora finito.

**Quando invece serve ribuildare** (`eas build` di nuovo):
- installi un pacchetto con codice nativo
- cambi permessi, icona, splash, nome o `version` in `app.json`
- aggiorni l'SDK Expo

---

## Passo 9 · Il diario dei bug (la parte che vale davvero)

Tieni un'unica nota condivisa. Per ogni problema, cinque campi:

```
DATA · SCHERMATA · COSA STAVO FACENDO · COSA MI ASPETTAVO · COS'È SUCCESSO
```

Annota anche gli attriti che non sono bug: "ho impiegato tre tap per segnare
una bolletta pagata", "non ricordavo dove fosse il codice invito". A settembre
questa lista, ordinata per quante volte si ripete, è la roadmap — costruita
sull'uso reale invece che sulle supposizioni.

---

## E l'iPhone?

Niente di quanto fatto qui va perso: `eas.json` ha già il profilo iOS pronto.
Quando attiverai l'Apple Developer Program bastano due comandi
(`eas device:create` e `eas build -p ios --profile collaudo`) e l'iPhone si
allinea. L'unica decisione irreversibile che stai prendendo ora è il
**bundle identifier** del passo 2: sceglilo pensando anche a iOS.
