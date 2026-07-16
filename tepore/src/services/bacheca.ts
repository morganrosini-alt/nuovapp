// src/services/bacheca.ts
//
// Bacheca condivisa (M3): la "lavagna sul frigo" digitale della casa.
// Note libere + checklist spuntabili, sincronizzate in tempo reale tra
// tutti i membri (Firestore onSnapshot). Le note fissate stanno in cima.

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { ChecklistItem, NotaBacheca, NotaBachecaTipo } from "../types";

const COL = "bacheca";

export async function creaNota(dati: {
  householdId: string;
  tipo: NotaBachecaTipo;
  autore: string;
  testo?: string;
  items?: ChecklistItem[];
  colore?: string;
}): Promise<void> {
  await addDoc(collection(db, COL), {
    ...dati,
    testo: dati.testo ?? "",
    items: dati.items ?? [],
    fissata: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
}

export async function aggiornaNota(
  id: string,
  dati: Partial<Pick<NotaBacheca, "testo" | "items" | "fissata" | "colore">>
): Promise<void> {
  await updateDoc(doc(db, COL, id), { ...dati, updatedAt: Date.now() });
}

export async function eliminaNota(id: string): Promise<void> {
  await deleteDoc(doc(db, COL, id));
}

/** Spunta/de-spunta un elemento di una checklist (registrando chi l'ha fatto). */
export async function toggleChecklistItem(
  nota: NotaBacheca,
  index: number,
  uid: string
): Promise<void> {
  const items = [...(nota.items ?? [])];
  const item = items[index];
  if (!item) return;
  items[index] = {
    ...item,
    fatto: !item.fatto,
    fattoDa: !item.fatto ? uid : undefined,
  };
  await aggiornaNota(nota.id, { items });
}

/** Tutte le note della casa in tempo reale: fissate prima, poi le più recenti. */
export function ascoltaBacheca(
  householdId: string,
  onChange: (note: NotaBacheca[]) => void
) {
  const q = query(collection(db, COL), where("householdId", "==", householdId));
  return onSnapshot(q, (snap) => {
    const note = snap.docs.map((d) => ({ id: d.id, ...d.data() } as NotaBacheca));
    note.sort((a, b) =>
      a.fissata === b.fissata ? b.updatedAt - a.updatedAt : a.fissata ? -1 : 1
    );
    onChange(note);
  });
}
