# Modifiche del 31 luglio 2026 — allineamento pre-build

Pacchetto preparato a partire dallo ZIP del progetto. Nessuna funzionalità è
stata aggiunta o rimossa: sono correzioni di configurazione che servono a far
funzionare l'app **fuori da Expo Go**, cioè nell'APK di collaudo.

---

## 1. Un solo progetto Firebase (correzione più importante)

`src/services/firebase.ts` puntava a **tepore-96890**, mentre
`google-services.json`, `GoogleService-Info.plist`, `.firebaserc` e il client
ID di Google puntavano a **housekeep-9b194**.

L'app leggeva e scriveva su un progetto, mentre login Google, Cloud Functions
e regole di sicurezza vivevano sull'altro. Conseguenze che sarebbero comparse
solo nell'APK:

- login Google rifiutato (token emesso per il progetto sbagliato)
- ingresso/uscita casa non funzionanti (Cloud Functions su un altro progetto)
- regole Firestore pubblicate dove non ci sono i dati

Ora la sorgente unica è **housekeep-9b194**, confermato come il progetto che
contiene i dati reali. Valori ricavati da `google-services.json`.

> Verifica consigliata: se in Firebase Console → Impostazioni progetto → Le tue
> app esiste anche un'app **Web**, si possono sostituire `apiKey` e `appId` con
> quelli. Non è necessario: Auth e Firestore funzionano con questi.

## 2. `app.json` ripristinato

La versione precedente aveva perso pezzi di configurazione nativa. Rimessi:

- `googleServicesFile` per iOS e Android — senza, la build EAS fallisce con
  "google-services.json is missing"
- i plugin: `expo-secure-store`, `expo-apple-authentication`,
  `@react-native-google-signin/google-signin`, `expo-notifications`,
  `expo-localization`
- `newArchEnabled`, `edgeToEdgeEnabled`, `usesAppleSignIn`,
  `ITSAppUsesNonExemptEncryption`
- identificatore reale `com.tepore.app` (era rimasto il segnaposto
  `it.CAMBIAMI.tepore`)
- tolti i riferimenti a `assets/icon.png` e `assets/splash.png`: la cartella
  `assets/` è vuota e la build fallirebbe. Per ora vale l'icona predefinita
  di Expo; l'icona vera si aggiunge quando i file esistono.

## 3. Moduli premium sbloccati nell'APK di collaudo

`purchases.ts` sbloccava Veicoli, Animali, Piante e Statistiche solo con
`__DEV__`, che è vero **soltanto** da Expo Go. Nell'APK sarebbero risultati
bloccati dietro un paywall senza prodotti configurati.

Ora vale `__DEV__ || FLAGS.SBLOCCA_TUTTO`, con il flag impostato da `eas.json`:

- profilo `collaudo` → tutto aperto
- profilo `produzione` → valgono solo gli acquisti reali

Aggiunto `src/config/flags.ts` (prima esisteva solo nella cartella radice,
dove nessun import poteva raggiungerlo).

## 4. `eas.json` con le variabili di build

`.env` non è tracciato da git, quindi nelle build EAS non esiste.
`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` è ora dichiarato dentro `eas.json` in
entrambi i profili: senza, il login Google non funziona nell'APK.

## 5. Pulizia

Rimossi: `firestore (1).rules` (duplicato), `.env example.example`,
`LEGGIMI.md` (documentazione di un altro progetto), `flags.ts` e
`statistiche.tsx` rimasti nella cartella radice fuori posto,
`functions/lib/` e `functions/node_modules/` (si rigenerano),
`.expo/` (cache locale), `.env` (resta solo sul tuo PC).

---

## Verifiche eseguite su questo pacchetto

```
73 file TypeScript/TSX analizzati con parser Babel .... 0 errori di sintassi
40 rotte referenziate nel codice ...................... tutte esistenti
app.json / eas.json ................................... JSON validi
riferimenti residui a tepore-96890 .................... nessuno
```

## Cosa NON è ancora stato fatto

1. **SHA-1 del keystore EAS su Firebase** — va aggiunto dopo la prima build,
   altrimenti il login Google fallisce nell'APK anche con tutto il resto giusto.
2. **Deploy delle Cloud Functions** su housekeep-9b194.
3. **Pubblicazione delle regole Firestore** su housekeep-9b194.
4. **EAS Update (OTA)** — da aggiungere dopo la prima build riuscita.
5. **Icona e splash screen** — cartella `assets/` vuota.
