// src/services/crud.ts
//
// Factory CRUD per i moduli "semplici" (pulizie, lista spesa, garanzie,
// abbonamenti, manutenzione, contatti): stessa forma — documenti top-level
// con householdId, accesso ai soli membri (vedi firestore.rules).
// Evita di duplicare 6 volte lo stesso servizio.

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  query, where, onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";

export function creaServizio<T extends { id: string; householdId: string }>(
  nomeCollezione: string
) {
  return {
    async crea(dati: Omit<T, "id" | "createdAt"> & { createdAt?: number }): Promise<string> {
      const ref = await addDoc(collection(db, nomeCollezione), {
        ...dati,
        createdAt: dati.createdAt ?? Date.now(),
      });
      return ref.id;
    },

    async aggiorna(id: string, dati: Partial<Omit<T, "id" | "householdId">>): Promise<void> {
      await updateDoc(doc(db, nomeCollezione, id), dati as any);
    },

    async elimina(id: string): Promise<void> {
      await deleteDoc(doc(db, nomeCollezione, id));
    },

    /** Tutti i documenti della casa, in tempo reale. */
    ascolta(householdId: string, onChange: (items: T[]) => void) {
      const q = query(collection(db, nomeCollezione), where("householdId", "==", householdId));
      return onSnapshot(q, (snap) => {
        onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as T)));
      });
    },
  };
}
