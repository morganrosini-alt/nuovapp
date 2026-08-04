// src/services/turni.ts
//
// Turni di lavoro della casa. Un turno = una persona + un giorno + una fascia.
//
// Una persona può avere PIÙ fasce nello stesso giorno (mattina + pomeriggio,
// il classico spezzato). Fanno eccezione libero, ferie e malattia: sono stati
// esclusivi, chi è in ferie non è anche di turno la mattina.
// Visibili a tutti i membri (vedi firestore.rules): servono proprio a
// coordinarsi quando si programma qualcosa insieme.

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { FasciaTurno, Turno } from "../types";
import { colors } from "../theme";

const COL = "turni";

export const FASCE: Array<{ key: FasciaTurno; label: string; colore: string; sigla: string }> = [
  { key: "mattina",    label: "Mattina",    colore: colors.turnoMattina,    sigla: "M" },
  { key: "pomeriggio", label: "Pomeriggio", colore: colors.turnoPomeriggio, sigla: "P" },
  { key: "notte",      label: "Notte",      colore: colors.turnoNotte,      sigla: "N" },
  { key: "libero",     label: "Libero",     colore: colors.turnoLibero,     sigla: "—" },
  { key: "ferie",      label: "Ferie",      colore: colors.turnoFerie,      sigla: "F" },
  { key: "malattia",   label: "Malattia",   colore: colors.turnoMalattia,   sigla: "+" },
];

/** Fasce che escludono tutte le altre nello stesso giorno. */
export const FASCE_ESCLUSIVE: FasciaTurno[] = ["libero", "ferie", "malattia"];

export function esclusiva(f: FasciaTurno): boolean {
  return FASCE_ESCLUSIVE.includes(f);
}

/**
 * Cosa va rimosso prima di aggiungere la fascia `nuova` a una persona.
 * - stato esclusivo  -> cancella tutto il resto del giorno
 * - fascia di lavoro -> cancella solo gli stati esclusivi
 * Le fasce di lavoro convivono fra loro.
 */
export function turniDaRimuovere(esistenti: Turno[], nuova: FasciaTurno): Turno[] {
  return esclusiva(nuova)
    ? esistenti
    : esistenti.filter((t) => esclusiva(t.fascia));
}

export function fascia(key: FasciaTurno) {
  return FASCE.find((f) => f.key === key) ?? FASCE[0];
}

/** Normalizza una data a mezzanotte: la chiave con cui confrontiamo i giorni. */
export function aMezzanotte(d: Date | number): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

export async function salvaTurno(dati: {
  householdId: string;
  utenteId: string;
  giorno: number;
  fascia: FasciaTurno;
  oraInizio?: string;
  oraFine?: string;
}): Promise<void> {
  await addDoc(collection(db, COL), { ...dati, createdAt: Date.now() });
}

export async function aggiornaTurno(
  id: string,
  dati: Partial<Pick<Turno, "fascia" | "oraInizio" | "oraFine">>
): Promise<void> {
  await updateDoc(doc(db, COL, id), dati);
}

export async function eliminaTurno(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

/** Tutti i turni della casa, in tempo reale. */
export function ascoltaTurni(householdId: string, onChange: (t: Turno[]) => void) {
  const q = query(collection(db, COL), where("householdId", "==", householdId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Turno)));
  });
}

/** Turni di un giorno specifico. */
export function turniDelGiorno(turni: Turno[], giorno: Date | number): Turno[] {
  const chiave = aMezzanotte(giorno);
  return turni.filter((t) => t.giorno === chiave);
}
