// src/services/relationships.ts
//
// Sistema Relazioni (M1): la "coppia" dentro una household.
// Flusso: A invia richiesta → B conferma (o rifiuta = elimina).
// Alla conferma, il client di B genera la chiave E2E condivisa e la
// avvolge per entrambi (vedi crypto.ts) — da quel momento la Zona
// Intima è sbloccata per i due partner.

import {
  collection, doc, addDoc, updateDoc, deleteDoc, getDoc,
  query, where, onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import { Relationship, UserProfile } from "../types";
import { generateWrappedCoupleKeys, ensureKeypair } from "./crypto";

const COL = "relationships";

/** Richiesta di coppia: da me (richiedente) verso un altro membro della casa. */
export async function richiediCoppia(
  householdId: string,
  mioUid: string,
  partnerUid: string
): Promise<string> {
  if (mioUid === partnerUid) throw new Error("SELF_RELATIONSHIP");
  const ref = await addDoc(collection(db, COL), {
    householdId,
    tipo: "coppia",
    membri: [mioUid, partnerUid].sort(),
    stato: "in_attesa",
    richiedente: mioUid,
    dataRichiesta: Date.now(),
  });
  return ref.id;
}

/**
 * Conferma della richiesta (solo il partner NON richiedente).
 * Genera qui la chiave E2E condivisa: servono le chiavi pubbliche di
 * entrambi (se una manca, l'altro deve aprire l'app almeno una volta).
 */
export async function confermaCoppia(rel: Relationship, mioUid: string): Promise<void> {
  if (rel.richiedente === mioUid) throw new Error("CONFIRM_OWN_REQUEST");
  await ensureKeypair(mioUid); // la mia publicKey deve esistere prima del wrap

  const profili = await Promise.all(
    rel.membri.map(async (uid) => {
      const snap = await getDoc(doc(db, "users", uid));
      return { uid, ...(snap.data() as UserProfile) };
    })
  );
  const publicKeys: Record<string, string> = {};
  for (const p of profili) {
    if (!p.publicKey) throw new Error("PARTNER_KEY_MISSING");
    publicKeys[p.uid] = p.publicKey;
  }

  const wrappedKeys = await generateWrappedCoupleKeys(publicKeys);
  await updateDoc(doc(db, COL, rel.id), {
    stato: "confermata",
    dataConferma: Date.now(),
    wrappedKeys,
  });
}

/** Rifiuto (di chi riceve) o scioglimento (di chiunque dei due): il documento sparisce. */
export async function eliminaRelazione(relId: string): Promise<void> {
  await deleteDoc(doc(db, COL, relId));
}

/** Tutte le relazioni della casa in tempo reale (per Partecipanti/Coppia). */
export function ascoltaRelazioniCasa(
  householdId: string,
  onChange: (rels: Relationship[]) => void
) {
  const q = query(collection(db, COL), where("householdId", "==", householdId));
  return onSnapshot(q, (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Relationship)));
  });
}

/** La MIA relazione in questa casa (attiva o in attesa), se esiste. */
export function miaRelazione(rels: Relationship[], mioUid: string): Relationship | null {
  return rels.find((r) => r.membri.includes(mioUid)) ?? null;
}
