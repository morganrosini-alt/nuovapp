// src/services/crypto.ts
//
// Crittografia end-to-end della Zona Intima (portato da "Insieme" ed evoluto
// alla sua "roadmap v2": chiavi CONDIVISE di coppia via nacl.box).
//
// Modello:
//  1. Ogni utente ha una coppia di chiavi nacl.box: la PRIVATA vive solo in
//     SecureStore del dispositivo, la PUBBLICA nel profilo Firestore.
//  2. Alla conferma della coppia, il client di chi conferma genera una chiave
//     simmetrica casuale e la "avvolge" (nacl.box) per entrambi i partner:
//     i due risultati finiscono in relationships/{id}.wrappedKeys.
//  3. Ogni contenuto della Zona Intima è cifrato con nacl.secretbox usando
//     quella chiave: il server vede SOLO ciphertext.
//
// Limite dichiarato della vera E2E: se un utente perde il dispositivo (e la
// chiave privata), i contenuti non sono recuperabili dal server. Mitigazione
// futura: ri-wrapping dal dispositivo del partner ancora attivo.
//
// Pacchetti: tweetnacl, tweetnacl-util, expo-secure-store,
//            react-native-get-random-values (PRNG per nacl in React Native).

import "react-native-get-random-values"; // DEVE essere il primo import
import nacl from "tweetnacl";
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from "tweetnacl-util";
import * as SecureStore from "expo-secure-store";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

const SK_KEY = "tepore.e2e.secretKey.v1"; // chiave privata in Keychain/Keystore

// ---------- Identità E2E dell'utente ----------

/**
 * Garantisce che l'utente abbia una coppia di chiavi: se manca, la genera,
 * salva la privata in SecureStore e pubblica la pubblica nel profilo.
 * Da chiamare al login (best-effort: non deve bloccare l'accesso).
 */
export async function ensureKeypair(uid: string): Promise<string> {
  let secret = await SecureStore.getItemAsync(SK_KEY);
  if (!secret) {
    const kp = nacl.box.keyPair();
    secret = encodeBase64(kp.secretKey);
    await SecureStore.setItemAsync(SK_KEY, secret, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    const publicKey = encodeBase64(kp.publicKey);
    await updateDoc(doc(db, "users", uid), { publicKey });
    return publicKey;
  }
  const kp = nacl.box.keyPair.fromSecretKey(decodeBase64(secret));
  return encodeBase64(kp.publicKey);
}

async function mySecretKey(): Promise<Uint8Array> {
  const secret = await SecureStore.getItemAsync(SK_KEY);
  if (!secret) throw new Error("E2E_NO_KEYPAIR");
  return decodeBase64(secret);
}

// ---------- Chiave condivisa di coppia ----------

/**
 * Genera la chiave simmetrica di coppia e la avvolge per entrambi i partner.
 * Ritorna le wrappedKeys da salvare sulla relationship alla conferma.
 * Formato wrap: base64( ephemeralPublicKey(32) + nonce(24) + box ).
 */
export async function generateWrappedCoupleKeys(
  partnerPublicKeys: Record<string, string> // { uid: publicKeyBase64 } per ENTRAMBI
): Promise<Record<string, string>> {
  const coupleKey = nacl.randomBytes(nacl.secretbox.keyLength);
  const wrapped: Record<string, string> = {};
  for (const [uid, pk] of Object.entries(partnerPublicKeys)) {
    const eph = nacl.box.keyPair();
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const box = nacl.box(coupleKey, nonce, decodeBase64(pk), eph.secretKey);
    const blob = new Uint8Array(32 + 24 + box.length);
    blob.set(eph.publicKey, 0);
    blob.set(nonce, 32);
    blob.set(box, 56);
    wrapped[uid] = encodeBase64(blob);
  }
  return wrapped;
}

/** Recupera (scarta) la chiave di coppia dalla propria wrappedKey. */
export async function unwrapCoupleKey(wrappedBase64: string): Promise<Uint8Array> {
  const blob = decodeBase64(wrappedBase64);
  const ephPk = blob.slice(0, 32);
  const nonce = blob.slice(32, 56);
  const box = blob.slice(56);
  const opened = nacl.box.open(box, nonce, ephPk, await mySecretKey());
  if (!opened) throw new Error("E2E_UNWRAP_FAILED");
  return opened;
}

// ---------- Cifratura contenuti ----------

/** Cifra un oggetto/testo con la chiave di coppia → base64(nonce + box). */
export function encryptContent(coupleKey: Uint8Array, payload: unknown): string {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const msg = decodeUTF8(JSON.stringify(payload));
  const box = nacl.secretbox(msg, nonce, coupleKey);
  const blob = new Uint8Array(nonce.length + box.length);
  blob.set(nonce, 0);
  blob.set(box, nonce.length);
  return encodeBase64(blob);
}

/** Decifra un ciphertext base64 → oggetto originale (o null se corrotto). */
export function decryptContent<T = unknown>(
  coupleKey: Uint8Array,
  ciphertextBase64: string
): T | null {
  try {
    const blob = decodeBase64(ciphertextBase64);
    const nonce = blob.slice(0, nacl.secretbox.nonceLength);
    const box = blob.slice(nacl.secretbox.nonceLength);
    const opened = nacl.secretbox.open(box, nonce, coupleKey);
    if (!opened) return null;
    return JSON.parse(encodeUTF8(opened)) as T;
  } catch {
    return null;
  }
}
