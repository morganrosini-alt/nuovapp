// src/services/bollette.ts

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { Bolletta, TipoBolletta } from "../types";

const BOLLETTE_COLLECTION = "bollette";

export type NuovaBolletta = {
  householdId: string;
  tipo: TipoBolletta;
  nome: string;
  importo: number;
  dataScadenza: number;
  createdBy: string;
  giaPagata?: boolean;
  ricorrenteMensile?: boolean;
};

export async function creaBolletta(dati: NuovaBolletta): Promise<void> {
  const { giaPagata, ricorrenteMensile, ...resto } = dati;
  await addDoc(collection(db, BOLLETTE_COLLECTION), {
    ...resto,
    pagata: giaPagata ?? false,
    dataPagamento: giaPagata ? Date.now() : null,
    ricorrenteMensile: ricorrenteMensile ?? false,
    createdAt: Date.now(),
  });
}

export type ModificaBolletta = {
  tipo: TipoBolletta;
  nome: string;
  importo: number;
  dataScadenza: number;
  ricorrenteMensile?: boolean;
};

export async function modificaBolletta(
  bollettaId: string,
  dati: ModificaBolletta
): Promise<void> {
  await updateDoc(doc(db, BOLLETTE_COLLECTION, bollettaId), { ...dati });
}

// Aggiunge esattamente un mese a un timestamp. Usiamo setMonth() di
// JavaScript, che gestisce da solo il passaggio all'anno successivo
// (es. Dicembre -> Gennaio). Nota: nei mesi con meno giorni (es. se la
// scadenza originale è il 31 e il mese dopo ha solo 30 giorni), JavaScript
// "scavalca" automaticamente al giorno corrispondente del mese successivo:
// è un comportamento standard e accettabile per un caso d'uso come questo.
function aggiungiUnMese(timestamp: number): number {
  const data = new Date(timestamp);
  data.setMonth(data.getMonth() + 1);
  return data.getTime();
}

// Segna una bolletta come pagata. Se quella bolletta era marcata come
// "canone fisso mensile", crea automaticamente la prossima occorrenza
// (stesso nome/tipo/importo, scadenza un mese dopo), così l'utente non deve
// reinserirla a mano ogni mese. Restituisce la data della prossima bolletta
// creata (o null se non era ricorrente), utile per mostrare un feedback.
export async function segnaBollettaPagata(bollettaId: string): Promise<number | null> {
  const ref = doc(db, BOLLETTE_COLLECTION, bollettaId);
  const snapshot = await getDoc(ref);
  const bollettaAttuale = snapshot.exists() ? (snapshot.data() as Bolletta) : null;

  await updateDoc(ref, {
    pagata: true,
    dataPagamento: Date.now(),
  });

  if (bollettaAttuale?.ricorrenteMensile) {
    const prossimaScadenza = aggiungiUnMese(bollettaAttuale.dataScadenza);
    await addDoc(collection(db, BOLLETTE_COLLECTION), {
      householdId: bollettaAttuale.householdId,
      tipo: bollettaAttuale.tipo,
      nome: bollettaAttuale.nome,
      importo: bollettaAttuale.importo,
      dataScadenza: prossimaScadenza,
      createdBy: bollettaAttuale.createdBy,
      pagata: false,
      dataPagamento: null,
      ricorrenteMensile: true,
      createdAt: Date.now(),
    });
    return prossimaScadenza;
  }

  return null;
}

export async function segnaBollettaNonPagata(bollettaId: string): Promise<void> {
  await updateDoc(doc(db, BOLLETTE_COLLECTION, bollettaId), {
    pagata: false,
    dataPagamento: null,
  });
}

export async function eliminaBolletta(bollettaId: string): Promise<void> {
  await deleteDoc(doc(db, BOLLETTE_COLLECTION, bollettaId));
}

// NOTA: la query usa SOLO "where" (nessun "orderBy"), apposta per evitare
// di dover creare un indice composito su Firestore. L'ordinamento per data
// di scadenza lo facciamo qui in locale con .sort(), che per liste di
// dimensioni normali (poche decine/centinaia di bollette) è comunque
// istantaneo e non pesa sulle prestazioni.
export function ascoltaBollette(
  householdId: string,
  onChange: (bollette: Bolletta[]) => void
): () => void {
  const q = query(
    collection(db, BOLLETTE_COLLECTION),
    where("householdId", "==", householdId)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const bollette = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() } as Bolletta))
        .sort((a, b) => a.dataScadenza - b.dataScadenza);
      onChange(bollette);
    },
    (error) => {
      // Se in futuro la query fallisce per qualsiasi motivo (permessi,
      // connessione, ecc.), questo lo stampa nel terminale invece di
      // lasciare la schermata bloccata a caricare senza spiegazioni.
      console.error("Errore ascoltando le bollette:", error);
    }
  );
}

export function ascoltaBolletta(
  bollettaId: string,
  onChange: (bolletta: Bolletta | null) => void
): () => void {
  return onSnapshot(
    doc(db, BOLLETTE_COLLECTION, bollettaId),
    (snapshot) => {
      if (snapshot.exists()) {
        onChange({ id: snapshot.id, ...snapshot.data() } as Bolletta);
      } else {
        onChange(null);
      }
    },
    (error) => {
      console.error("Errore ascoltando la bolletta:", error);
    }
  );
}
