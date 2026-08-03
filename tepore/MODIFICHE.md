# Tepore — correzioni al 1 agosto 2026

Verificato con dipendenze reali installate, test di render eseguiti e bundle
di produzione generato. Nessuna funzionalità aggiunta o rimossa.

---

## Verifiche eseguite

| Verifica | Esito |
|---|---|
| Compilatore TypeScript su tutto `src/` | 0 errori (erano 52) |
| Bundle Metro di produzione (4415 moduli) | riuscito |
| Test di creazione su 12 sezioni (render reale + clic reali) | 15 su 15 |
| Montaggio di 27 schermate | tutte, senza crash |
| Test unitari logica immondizia | 10 su 10 |
| Icone: nomi mappati esistenti in Phosphor | 74 su 74 |
| Listener Firestore senza cleanup | nessuno |
| `parseFloat`/`parseInt` senza guardia NaN | nessuno |
| `Alert.alert` con più di 3 bottoni (Android ne mostra 3) | nessuno |
| Rotte referenziate ma inesistenti | nessuna |

**Non verificato:** le regole Firestore non sono state eseguite in emulatore
(non scaricabile nell'ambiente di analisi). Sono state controllate a mano
contro ogni query del codice.

---

## I due bug che facevano crashare la creazione

### A. Crash aprendo il composer — "Element type is invalid"

`src/components/Icona.tsx`

**Questo era il crash dei Veicoli.** Il bottone "+" in alto diventa una "X"
quando il composer è aperto, e chiede l'icona `"close"`. Quel nome non era
nella tabella di traduzione, quindi si ripiegava sul nome di riserva
`"Circle"` — che in phosphor-react-native 3.0.6 **non esiste**. React
riceveva `undefined` al posto di un componente e l'app moriva.

Colpiva l'apertura del composer di Veicoli, Animali, Piante, Spese, Pulizie,
Garanzie, Manutenzione, Abbonamenti, Contatti, Salvadanai e Lista spesa —
cioè quasi ogni "aggiungi" dell'app.

Corretto su tre livelli: aggiunti i nomi mancanti (`close`, `checkmark`,
`copy-outline`); la risoluzione prova sia `Nome` sia `NomeIcon` (Phosphor
espone entrambe le forme, ma non sempre entrambe); e se proprio non trova
nulla il componente restituisce uno spazio vuoto invece di far cadere l'app.

### B. Campi opzionali vuoti rifiutati da Firestore

`src/services/firebase.ts`

Firestore lancia un errore se un campo vale `undefined`
("Unsupported field value"). Succedeva in tre punti: **un contatto salvato
senza ruolo**, una voce di salute senza note, e la spunta di un elemento
della bacheca. In tutti e tre la creazione falliva.

Attivata `ignoreUndefinedProperties`: i campi non valorizzati vengono
semplicemente omessi dal documento. È una correzione unica e definitiva —
vale anche per i campi opzionali che aggiungerai in futuro.

---

## Correzioni della tornata precedente

### 1. Il giorno della settimana non combaciava mai — bug silenzioso

`src/types/index.ts`, `src/services/immondizia.ts`, `src/services/promemoria.ts`,
`src/app/(tabs)/index.tsx`, `src/app/(tabs)/utilita.tsx`

Il tipo `GiornoSettimana` dichiarava numeri (0-6), ma il form salva i nomi
dei giorni e il servizio li confronta come stringhe. Tre punti passavano
`getDay()`, cioè un numero: `"lunedi" === 1` è sempre falso.

Conseguenza: **la raccolta del giorno non compariva mai in dashboard né in
Utilità, e il promemoria della sera prima non partiva mai.** Nessun errore a
schermo. Stessa incoerenza su `FrequenzaRaccolta`.

Unificata la convenzione e centralizzata la conversione in `giornoDaData()`.

### 2. Schermata "Unmatched Route · tepore:///"

`src/app/_layout.tsx` (riscritto)

Durante il caricamento, il layout radice mostrava lo spinner **al posto** del
navigatore. Expo Router risolve l'indirizzo iniziale al primo render: senza
navigatore montato non ci sono rotte da confrontare. Ora il navigatore è
sempre montato, lo spinner è un velo sopra, e i redirect attendono
`useRootNavigationState()`.

### 3. "Missing or insufficient permissions"

`firestore.rules` (riscritto)

Le regole coprivano 6 collezioni su 22. Ora le coprono tutte, con tre livelli
di accesso: casa, personale, coppia. Salute leggibile solo dal proprietario,
Zona Intima solo dai due membri della relazione. `memberIds` non modificabile
dal client: entrare e uscire da una casa passa dalle Cloud Functions.

### 4. Profilo utente: `id` contro `uid`

`src/services/household.ts`, `src/hooks/useHousehold.tsx`, `src/app/partecipanti.tsx`

I documenti salvavano `uid`, il codice leggeva `id`. In Partecipanti il badge
"Proprietario" non appariva mai. Corretto ricavando l'identificatore dal nome
del documento: funziona anche sui dati già salvati.

### 5. Raccolta quindicinale senza data di riferimento

`src/services/immondizia.ts` — `new Date(undefined)` dava una data non valida
e il tipo spariva dal calendario in silenzio. Ora viene mostrato ogni
settimana: un promemoria di troppo è un fastidio, uno mancato è un bidone non
portato fuori.

### 6. Import `shadow` mancante

`bollette.tsx`, `immondizia.tsx`, `immondizia-tipi.tsx` — l'app andava in
errore all'avvio ("Property 'shadow' doesn't exist").

### 7. Stili mancanti nel login

`src/app/login.tsx` — `switchModeButton` e `switchModeText` erano
referenziati ma mai definiti: il link "Non hai un account? Registrati" usciva
minuscolo e attaccato al bottone sopra.

### 8. Moduli premium bloccati nell'APK

`src/services/purchases.ts`, `src/config/flags.ts` — lo sblocco dipendeva solo
da `__DEV__`, vero soltanto in Expo Go. Ora vale anche `FLAGS.SBLOCCA_TUTTO`,
impostato dal profilo di build in `eas.json`.

### 9. Un solo progetto Firebase

`src/services/firebase.ts` puntava a `tepore-96890` mentre tutta la
configurazione nativa puntava a `housekeep-9b194`. Ora converge tutto su
**housekeep-9b194**.

### 10. Manutenibilità

`src/components/ListaEntita.tsx` — il servizio CRUD veniva ricreato a ogni
render. Non faceva danni oggi, ma sarebbe bastato aggiungerlo alle dipendenze
dell'effetto per innescare un ciclo infinito di listener. Stabilizzato con
`useMemo`.

Più correzioni di tipo minori in `scoped.ts`, `immondizia-mensile.tsx`,
`firebase.ts`.

---

## Test automatici inclusi

Nel progetto trovi ora `__test__/` e `jest.config.js`. Si eseguono con:

```bash
npx jest
```

Montano davvero le schermate, premono davvero i bottoni e controllano che il
documento scritto contenga i campi richiesti dalle regole. Sono gli stessi
test che hanno trovato il crash delle icone. Aggiungerne uno per ogni bug che
incontri ad agosto significa che quel bug non tornerà più.

---

## Cosa resta da fare prima dell'APK

1. **Pubblicare `firestore.rules`** su housekeep-9b194.
2. **Deploy delle Cloud Functions** — senza, il codice invito non funziona.
3. **SHA-1 del keystore EAS** su Firebase — senza, il login Google fallisce
   nell'APK.
4. **Icona e splash screen** — la cartella `assets/` è vuota.
