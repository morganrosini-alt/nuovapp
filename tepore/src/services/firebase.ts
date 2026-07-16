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

// Configurazione presa dalla console Firebase (progetto "Tepore").
// La apiKey non è un segreto: Firebase è progettato per essere sicuro
// tramite le regole di Firestore/Storage, non nascondendo questa chiave.
const firebaseConfig = {
  apiKey: "AIzaSyCf1GB93KX7NNvuXQAw4t3R2q8SVOHYqoA",
  authDomain: "tepore-96890.firebaseapp.com",
  projectId: "tepore-96890",
  storageBucket: "tepore-96890.firebasestorage.app",
  messagingSenderId: "468316700272",
  appId: "1:468316700272:web:8b7121b616472185957eb5",
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
