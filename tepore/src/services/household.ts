// src/services/household.ts

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db } from "./firebase";
import { getFunctions, httpsCallable } from "firebase/functions";

// Le Cloud Functions girano in Europa (GDPR): la regione DEVE combaciare
// con quella del deploy in functions/src/index.ts.
const functions = getFunctions(undefined, "europe-west1");
import { Household, UserProfile } from "../types";

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// displayName è opzionale qui per compatibilità con la "rete di sicurezza"
// in useAuth/useHousehold che crea un profilo al volo se manca (in quel
// caso non abbiamo un nome scelto dall'utente, quindi usiamo l'inizio
// dell'email come fallback).
export async function createUserProfile(
  uid: string,
  email: string,
  displayName?: string
): Promise<void> {
  const userRef = doc(db, "users", uid);
  const profile: UserProfile = {
    uid,
    email,
    displayName: displayName?.trim() || email.split("@")[0],
    householdId: null,
    householdIds: [],
    createdAt: Date.now(),
  };
  await setDoc(userRef, profile);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
}

// Crea una nuova household. La rende SUBITO la "casa attiva" dell'utente
// (householdId) e la aggiunge anche all'elenco di tutte le case di cui fa
// parte (householdIds) — un utente può appartenere a più case nel tempo,
// ma ne ha sempre esattamente una attiva alla volta.
export async function createHousehold(
  name: string,
  ownerId: string,
  inviteCodeVisibleToAll: boolean
): Promise<Household> {
  const householdRef = doc(collection(db, "households"));
  const household: Household = {
    id: householdRef.id,
    name: name.trim(),
    ownerId,
    memberIds: [ownerId],
    inviteCode: generateInviteCode(),
    inviteCodeVisibleToAll,
    createdAt: Date.now(),
  };

  await setDoc(householdRef, household);

  await updateDoc(doc(db, "users", ownerId), {
    householdId: household.id,
    householdIds: arrayUnion(household.id),
  });

  return household;
}

// Restituisce anche "giaMembro": true se l'utente faceva già parte di questa
// casa (in quel caso non lo riaggiungiamo, ma la impostiamo comunque come
// casa attiva — è comunque quello che l'utente probabilmente si aspetta
// inserendo di nuovo quel codice).
export async function joinHouseholdByInviteCode(
  inviteCode: string,
  userId: string
): Promise<{ household: Household; giaMembro: boolean }> {
  // SICUREZZA: la ricerca per codice avviene sul server (Cloud Function),
  // così nessun client può enumerare le case altrui. La function aggiorna
  // anche memberIds e il profilo utente in un colpo solo.
  void userId; // l'identità la mette Firebase Auth, non serve passarla
  const call = httpsCallable(functions, "joinHousehold");
  let res: any;
  try {
    res = await call({ inviteCode: inviteCode.trim().toUpperCase() });
  } catch (err: any) {
    if (err?.code === "functions/not-found") {
      throw new Error("INVITE_CODE_NOT_FOUND");
    }
    throw err;
  }
  const { householdId, alreadyMember } = res.data as {
    householdId: string;
    alreadyMember: boolean;
  };
  const household = await getHousehold(householdId);
  if (!household) throw new Error("INVITE_CODE_NOT_FOUND");
  return { household, giaMembro: alreadyMember };
}

export async function getHousehold(householdId: string): Promise<Household | null> {
  const ref = doc(db, "households", householdId);
  const snapshot = await getDoc(ref);
  return snapshot.exists() ? (snapshot.data() as Household) : null;
}

// Recupera i dati completi di più case a partire dai loro id (usato nella
// schermata Profilo per mostrare l'elenco di tutte le case dell'utente).
export async function getHouseholdsByIds(householdIds: string[]): Promise<Household[]> {
  const risultati = await Promise.all(householdIds.map((id) => getHousehold(id)));
  return risultati.filter((h): h is Household => h !== null);
}

// Cambia semplicemente quale, tra le case a cui l'utente appartiene già,
// è quella "attiva" in questo momento — non tocca l'elenco delle case,
// sposta solo il puntatore. Tutte le schermate dell'app (bollette, ecc.)
// leggono i dati in base a householdId, quindi cambiandolo qui l'intera
// app "si sposta" sulla nuova casa automaticamente.
export async function switchActiveHousehold(
  userId: string,
  householdId: string
): Promise<void> {
  await updateDoc(doc(db, "users", userId), { householdId });
}

// Recupera i profili di più utenti a partire dai loro uid (usato nella
// schermata Partecipanti per mostrare chi fa parte della casa).
export async function getUserProfilesByIds(uids: string[]): Promise<UserProfile[]> {
  const risultati = await Promise.all(uids.map((uid) => getUserProfile(uid)));
  return risultati.filter((p): p is UserProfile => p !== null);
}

// Fa uscire l'utente da una household: lo toglie dai membri della casa e
// dall'elenco delle sue case. Se quella era la casa attualmente attiva,
// ne sceglie automaticamente un'altra tra quelle rimaste (o nessuna, se
// non gliene restano — in quel caso l'utente tornerà alla schermata di
// creazione/adesione a una nuova casa, gestito automaticamente da _layout.tsx).
export async function leaveHousehold(userId: string, householdId: string): Promise<void> {
  // SICUREZZA: memberIds non è più modificabile dal client (Security Rules):
  // l'uscita passa dalla Cloud Function, che gestisce anche il cambio di
  // casa attiva e blocca il proprietario finché non trasferisce la proprietà.
  void userId;
  const call = httpsCallable(functions, "leaveHousehold");
  await call({ householdId });
}

// Aggiorna il nome visibile del profilo (mostrato agli altri membri delle
// case a cui l'utente partecipa).
export async function updateDisplayName(userId: string, nuovoNome: string): Promise<void> {
  await updateDoc(doc(db, "users", userId), { displayName: nuovoNome.trim() });
}
