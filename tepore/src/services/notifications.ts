// src/services/notifications.ts
//
// Servizio notifiche di Tepore. Due mondi complementari:
//
//  1) PUSH (da server → telefono): eventi "sociali" — qualcuno si unisce
//     alla casa, richiesta di coppia, ecc. Il telefono si registra qui
//     e salva il proprio token nel profilo utente; a inviare è la
//     Cloud Function (vedi functions-index.ts).
//
//  2) LOCALI (schedulate sul telefono): promemoria scadenze — bollette,
//     immondizia, garanzie. Zero server, zero costi. Gli helper in fondo
//     sono la base del modulo M2.
//
// RICHIEDE DEVELOPMENT BUILD (le push non funzionano in Expo Go).
// Pacchetti: expo-notifications, expo-device, expo-constants.

import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./firebase";

// Come mostrare le notifiche quando l'app è APERTA in primo piano
// (di default il sistema le nasconderebbe).
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ============================================================
// PUSH — registrazione del dispositivo
// ============================================================

/**
 * Chiede il permesso notifiche, ottiene il token Expo Push del dispositivo
 * e lo salva nel profilo utente (array: un utente può avere più dispositivi).
 * Da chiamare una volta quando l'utente è loggato (es. nel layout root).
 * Restituisce il token, o null se permesso negato / emulatore.
 */
export async function registraPushToken(uid: string): Promise<string | null> {
  // Le push funzionano solo su dispositivi fisici
  if (!Device.isDevice) return null;

  // Android: il canale è obbligatorio da Android 8 in poi
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Notifiche Tepore",
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") return null;

  // Il projectId EAS viene iniettato in app.json da `eas build:configure`
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
  if (!projectId) {
    console.warn("[notifications] projectId EAS mancante: eseguire eas build:configure");
    return null;
  }

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;

  await updateDoc(doc(db, "users", uid), {
    expoPushTokens: arrayUnion(token),
  });

  return token;
}

/**
 * Da chiamare al logout: rimuove il token di QUESTO dispositivo dal profilo,
 * così l'ex-utente non riceve più push destinate all'account.
 */
export async function rimuoviPushToken(uid: string): Promise<void> {
  try {
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    if (!projectId || !Device.isDevice) return;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await updateDoc(doc(db, "users", uid), {
      expoPushTokens: arrayRemove(token),
    });
  } catch {
    // best-effort: se fallisce (offline), non blocchiamo il logout
  }
}

// ============================================================
// LOCALI — promemoria scadenze (base del modulo M2)
// ============================================================

/**
 * Schedula una notifica locale a una data/ora precisa.
 * Restituisce l'ID della notifica: va salvato insieme al dato
 * (es. sulla bolletta) per poterla annullare se la scadenza
 * viene modificata o eliminata.
 */
export async function schedulaPromemoria(
  data: Date,
  titolo: string,
  corpo: string
): Promise<string | null> {
  if (data.getTime() <= Date.now()) return null; // mai schedulare nel passato
  return Notifications.scheduleNotificationAsync({
    content: { title: titolo, body: corpo, sound: true },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: data },
  });
}

/** Annulla una notifica locale schedulata (per modifiche/eliminazioni). */
export async function annullaPromemoria(notificaId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(notificaId);
  } catch {
    // se era già scattata o non esiste più, nessun problema
  }
}
