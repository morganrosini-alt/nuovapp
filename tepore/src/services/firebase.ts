// src/services/firebase.ts
//
// Punto centrale di inizializzazione di Firebase per Tepore.
// Ogni altro file del progetto che ha bisogno di leggere/scrivere dati,
// gestire login, o caricare allegati, importa `auth`, `db` o `storage` da qui
// invece di re-inizializzare Firebase più volte.

import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Configurazione del progetto Firebase "housekeep-9b194".
//
// ⚠️ ALLINEAMENTO (31/07): prima qui c'era il progetto "tepore-96890", mentre
// google-services.json, GoogleService-Info.plist, .firebaserc e il client ID
// di Google puntavano tutti a "housekeep-9b194". Il risultato era che l'app
// leggeva e scriveva su un progetto, mentre login Google, Cloud Functions e
// regole di sicurezza vivevano sull'altro. Ora la sorgente unica di verità è
// housekeep-9b194, cioè il progetto che contiene davvero i dati.
//
// I valori qui sotto sono ricavati da google-services.json. La apiKey non è
// un segreto: la sicurezza è affidata alle regole Firestore, non a nasconderla.
const firebaseConfig = {
  apiKey: "AIzaSyAo5jcBSbfrR5SqZZaGy84Yn_MDocRNcqA",
  authDomain: "housekeep-9b194.firebaseapp.com",
  projectId: "housekeep-9b194",
  storageBucket: "housekeep-9b194.firebasestorage.app",
  messagingSenderId: "623187342308",
  appId: "1:623187342308:android:ba8a6e14d6c70093268df1",
};

// Evita di inizializzare Firebase più volte durante l'hot-reload in sviluppo
// (Metro ricarica i moduli spesso mentre scriviamo codice).
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Auth con persistenza su AsyncStorage: senza questo, ogni volta che l'app
// viene chiusa e riaperta l'utente dovrebbe rifare il login da capo.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});

// Firestore: il database condiviso della household (bollette, scadenze, ecc.)
export const db = getFirestore(app);

// Storage: per allegati come PDF bollette, foto scontrini, foto libretto veicolo.
export const storage = getStorage(app);

export default app;
