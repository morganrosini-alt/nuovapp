/**
 * TEPORE — Cloud Functions (M0 + push)
 * File: functions/src/index.ts
 *
 * VERSIONE 2 — sostituisce integralmente la precedente. Novità:
 *  - helper sendExpoPush(): invio notifiche push tramite il servizio
 *    Expo Push (gratuito, nessuna configurazione FCM manuale)
 *  - joinHousehold ora avvisa con una push gli altri membri della casa
 *    quando qualcuno si unisce
 *
 * Deploy: `firebase deploy --only functions` (vedi guida, passo 7).
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

// Regione europea: coerente con la residenza dati GDPR del progetto.
const REGION = "europe-west1";

// ============================================================
// Helper push — invia tramite il servizio Expo Push
// ============================================================

type PushMessage = {
  to: string;      // token Expo (ExponentPushToken[...])
  title: string;
  body: string;
  data?: Record<string, string>;
};

/**
 * Invia una o più push. Best-effort: se Expo è irraggiungibile o un token
 * è scaduto, logga e prosegue — una push mancata non deve mai far fallire
 * l'operazione principale (es. il join).
 */
async function sendExpoPush(messages: PushMessage[]): Promise<void> {
  if (messages.length === 0) return;
  try {
    const res = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(messages),
    });
    if (!res.ok) {
      console.warn("[push] Expo ha risposto", res.status, await res.text());
    }
  } catch (err) {
    console.warn("[push] invio fallito:", err);
  }
}

/** Raccoglie i token push di una lista di utenti (escludendo uno, di solito l'autore dell'azione). */
async function tokensDiUtenti(uids: string[], escludi?: string): Promise<string[]> {
  const target = uids.filter((u) => u !== escludi);
  if (target.length === 0) return [];
  const snaps = await db.getAll(...target.map((u) => db.doc(`users/${u}`)));
  const tokens: string[] = [];
  for (const s of snaps) {
    const t: string[] = s.data()?.expoPushTokens ?? [];
    tokens.push(...t);
  }
  return tokens;
}

// ============================================================
// joinHousehold — ingresso in una casa tramite codice invito
// ============================================================

export const joinHousehold = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Devi essere loggato.");

  const inviteCode = String(request.data?.inviteCode ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(inviteCode)) {
    throw new HttpsError("invalid-argument", "Codice invito non valido.");
  }

  const snap = await db
    .collection("households")
    .where("inviteCode", "==", inviteCode)
    .limit(1)
    .get();

  if (snap.empty) {
    throw new HttpsError("not-found", "Nessuna casa trovata con questo codice.");
  }

  const householdDoc = snap.docs[0];
  const householdId = householdDoc.id;
  const householdName: string = householdDoc.data().name ?? "la casa";
  const memberIds: string[] = householdDoc.data().memberIds ?? [];
  const alreadyMember = memberIds.includes(uid);

  const batch = db.batch();
  if (!alreadyMember) {
    batch.update(householdDoc.ref, { memberIds: FieldValue.arrayUnion(uid) });
  }
  batch.update(db.doc(`users/${uid}`), {
    householdId,
    householdIds: FieldValue.arrayUnion(householdId),
  });
  await batch.commit();

  // Push agli altri membri: "X si è unito a NomeCasa" (solo su vero ingresso)
  if (!alreadyMember) {
    const nuovoSnap = await db.doc(`users/${uid}`).get();
    const nomeNuovo: string = nuovoSnap.data()?.displayName ?? "Un nuovo membro";
    const tokens = await tokensDiUtenti(memberIds, uid);
    await sendExpoPush(
      tokens.map((to) => ({
        to,
        title: householdName,
        body: `${nomeNuovo} si è appena unito alla casa 🏡`,
        data: { tipo: "nuovo_membro", householdId },
      }))
    );
  }

  return { householdId, alreadyMember };
});

// ============================================================
// leaveHousehold — uscita da una casa
// ============================================================

export const leaveHousehold = onCall({ region: REGION }, async (request) => {
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Devi essere loggato.");

  const householdId = String(request.data?.householdId ?? "");
  if (!householdId) throw new HttpsError("invalid-argument", "householdId mancante.");

  const ref = db.doc(`households/${householdId}`);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpsError("not-found", "Casa inesistente.");

  const data = snap.data()!;
  const memberIds: string[] = data.memberIds ?? [];
  if (!memberIds.includes(uid)) {
    throw new HttpsError("failed-precondition", "Non fai parte di questa casa.");
  }
  if (data.ownerId === uid && memberIds.length > 1) {
    throw new HttpsError(
      "failed-precondition",
      "Sei il proprietario: trasferisci la proprietà prima di uscire."
    );
  }

  const userRef = db.doc(`users/${uid}`);
  const userSnap = await userRef.get();
  const user = userSnap.data() ?? {};
  const remaining: string[] = (user.householdIds ?? []).filter(
    (h: string) => h !== householdId
  );
  const nextActiveId =
    user.householdId === householdId ? remaining[0] ?? null : user.householdId;

  const batch = db.batch();
  batch.update(ref, { memberIds: FieldValue.arrayRemove(uid) });
  batch.update(userRef, {
    householdIds: FieldValue.arrayRemove(householdId),
    householdId: nextActiveId,
  });
  await batch.commit();

  return { ok: true, nextActiveId };
});
