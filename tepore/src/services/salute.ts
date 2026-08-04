// src/services/salute.ts
//
// Promemoria e note di salute. SCELTA DI PROGETTO IMPORTANTE: i dati
// sanitari sono strettamente PERSONALI — le Security Rules li legano
// all'utenteId, quindi nemmeno gli altri membri della casa possono
// leggerli. Nessuna condivisione, nessuna eccezione: è la categoria di
// dati più sensibile che l'app tratti (GDPR art. 9).

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { TipoVoceSalute, VoceSalute } from "../types";

const COL = "salute";

/** Controlli suggeriti: scorciatoie per non far digitare tutto a mano. */
export const CONTROLLI_SUGGERITI: Array<{ titolo: string; mesi: number; icona: string }> = [
  { titolo: "Pulizia denti", mesi: 6, icona: "tooth-outline" },
  { titolo: "Visita dentistica", mesi: 12, icona: "toothbrush" },
  { titolo: "Visita oculistica", mesi: 24, icona: "eye-outline" },
  { titolo: "Controllo dal medico", mesi: 12, icona: "stethoscope" },
  { titolo: "Analisi del sangue", mesi: 12, icona: "test-tube" },
  { titolo: "Visita dermatologica", mesi: 12, icona: "hand-back-right-outline" },
];

export async function creaVoce(dati: {
  utenteId: string;
  tipo: TipoVoceSalute;
  titolo: string;
  prossimaData?: number;
  ricorrenzaMesi?: number;
  note?: string;
}): Promise<void> {
  await addDoc(collection(db, COL), { ...dati, createdAt: Date.now() });
}

export async function aggiornaVoce(
  id: string,
  dati: Partial<Omit<VoceSalute, "id" | "utenteId">>
): Promise<void> {
  await updateDoc(doc(db, COL, id), dati);
}

export async function eliminaVoce(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

/** Sposta un controllo in avanti di una ricorrenza ("fatto oggi"). */
// ⚠️ CORRETTO: prima questa funzione spostava sempre la data avanti di 12
// mesi anche per le voci SENZA ricorrenza. Su una visita una tantum non
// cambiava nulla di percepibile e sembrava che il bottone fosse morto.
// Inoltre non teneva traccia di quando la visita era stata fatta davvero.
export async function segnaFatto(voce: VoceSalute): Promise<void> {
  const adesso = Date.now();

  if (voce.ricorrenzaMesi) {
    // Controllo periodico: registra la data di oggi e programma il prossimo.
    const prossima = new Date();
    prossima.setMonth(prossima.getMonth() + voce.ricorrenzaMesi);
    await aggiornaVoce(voce.id, {
      ultimaData: adesso,
      prossimaData: prossima.getTime(),
    });
  } else {
    // Voce una tantum: si archivia. Resta consultabile nello storico.
    await aggiornaVoce(voce.id, {
      ultimaData: adesso,
      prossimaData: undefined,
      completato: true,
    });
  }
}

/** Le MIE voci di salute, in tempo reale. */
export function ascoltaSalute(utenteId: string, onChange: (v: VoceSalute[]) => void) {
  const q = query(collection(db, COL), where("utenteId", "==", utenteId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VoceSalute)));
  });
}
