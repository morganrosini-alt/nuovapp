// src/services/scoped.ts
//
// Lettura dei contenuti a visibilità multipla (calendario, spese, salvadanai).
//
// PERCHÉ ESISTE: le Security Rules concedono la lettura documento per
// documento in base a `visibilita`. Una query "dammi tutto della casa" NON è
// dimostrabile dalle regole (Firestore la rifiuterebbe in blocco). La lettura
// corretta è quindi in 2-3 query parallele, ciascuna vincolata a un livello
// che le regole possono verificare:
//   1. visibilita == "household"                       (tutti i membri)
//   2. visibilita == "personale" AND autore == me      (solo io)
//   3. visibilita == "coppia" AND relationshipId == X  (solo se ho una coppia)
// I risultati vengono fusi e riconsegnati come lista unica.

import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";

export function ascoltaContenutiScoped<T extends { id: string }>(
  nomeCollezione: string,
  householdId: string,
  mioUid: string,
  relationshipId: string | null,
  onChange: (items: T[]) => void
): () => void {
  const buckets: Record<string, T[]> = {};

  const emetti = () => {
    const mappa = new Map<string, T>();
    for (const lista of Object.values(buckets)) {
      for (const item of lista) mappa.set(item.id, item);
    }
    onChange([...mappa.values()]);
  };

  const base = collection(db, nomeCollezione);
  const listeners: Array<() => void> = [];

  const attacca = (chiave: string, q: ReturnType<typeof query>) => {
    listeners.push(
      onSnapshot(
        q,
        (snap) => {
          buckets[chiave] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as T));
          emetti();
        },
        () => {} // errori (es. permessi durante logout) ignorati
      )
    );
  };

  attacca("household", query(base,
    where("householdId", "==", householdId),
    where("visibilita", "==", "household")));

  attacca("personale", query(base,
    where("householdId", "==", householdId),
    where("visibilita", "==", "personale"),
    where("autore", "==", mioUid)));

  if (relationshipId) {
    attacca("coppia", query(base,
      where("householdId", "==", householdId),
      where("visibilita", "==", "coppia"),
      where("relationshipId", "==", relationshipId)));
  }

  return () => listeners.forEach((u) => u());
}
