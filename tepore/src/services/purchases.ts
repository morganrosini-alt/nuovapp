// src/services/purchases.ts
//
// Monetizzazione (portata da "Insieme", adattata a Tepore/Firebase).
// RevenueCat unifica App Store e Play Store: prodotti e prezzi si
// gestiscono dalla sua dashboard senza toccare il codice.
//
// Entitlements previsti (da creare identici nella dashboard RevenueCat):
//   veicoli · animali · piante · statistiche       (acquisti una tantum)
//   casa_completa                                   (abbonamento: implica tutti)
//
// Import "pigro" di react-native-purchases: finché le chiavi non sono nel
// .env (o il pacchetto non è installato), l'app funziona normalmente con
// tutti i moduli premium bloccati — nessun crash.
//
// NOTA PUBBLICITÀ: esclusa BY DESIGN (decisione architetturale documentata
// nel README): app a bassa permanenza + contenuti intimi = niente ads.

import { Platform } from "react-native";
import { FLAGS } from "../config/flags";

export type ModuloPremium = "veicoli" | "animali" | "piante" | "statistiche";
export const ENTITLEMENT_BUNDLE = "casa_completa";

let configured = false;

function getPurchases(): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require("react-native-purchases").default;
  } catch {
    return null;
  }
}

/** Da chiamare una volta al login. Best-effort: senza chiavi, non fa nulla. */
export async function initPurchases(uid: string): Promise<void> {
  const Purchases = getPurchases();
  const apiKey = Platform.select({
    ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY,
    android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY,
  });
  if (!Purchases || !apiKey) return;
  if (!configured) {
    Purchases.configure({ apiKey, appUserID: uid }); // uid Firebase = stesso utente su più device
    configured = true;
  } else {
    await Purchases.logIn(uid);
  }
}

const TUTTI: ModuloPremium[] = ["veicoli", "animali", "piante", "statistiche"];

/**
 * Set dei moduli sbloccati per l'utente corrente (bundle incluso).
 *
 * IN SVILUPPO SONO TUTTI SBLOCCATI. Motivo pratico: finché il negozio
 * RevenueCat non è configurato non esiste alcun acquisto possibile, quindi
 * Veicoli, Animali, Piante e Statistiche rimanderebbero sempre al paywall e
 * sembrerebbero "rotti" durante i test. In produzione (__DEV__ falso) vale
 * solo ciò che l'utente ha davvero acquistato.
 */
export async function moduliSbloccati(): Promise<Set<ModuloPremium>> {
  // __DEV__            = sviluppo (Expo Go / dev server)
  // FLAGS.SBLOCCA_TUTTO = build di collaudo, impostato da eas.json
  // In produzione entrambi sono falsi e vale solo ciò che è stato acquistato.
  if (__DEV__ || FLAGS.SBLOCCA_TUTTO) return new Set(TUTTI);

  const Purchases = getPurchases();
  if (!Purchases || !configured) return new Set();
  try {
    const info = await Purchases.getCustomerInfo();
    const attivi: string[] = Object.keys(info?.entitlements?.active ?? {});
    if (attivi.includes(ENTITLEMENT_BUNDLE)) return new Set(TUTTI);
    return new Set(attivi.filter((e): e is ModuloPremium => TUTTI.includes(e as ModuloPremium)));
  } catch {
    return new Set();
  }
}

/** Offerte correnti (pacchetti/prezzi) per il paywall. */
export async function getOfferte(): Promise<any | null> {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings?.current ?? null;
  } catch {
    return null;
  }
}

/** Acquisto di un pacchetto (dal paywall). Ritorna i moduli sbloccati dopo. */
export async function acquista(pkg: any): Promise<Set<ModuloPremium>> {
  const Purchases = getPurchases();
  if (!Purchases) throw new Error("PURCHASES_UNAVAILABLE");
  await Purchases.purchasePackage(pkg);
  return moduliSbloccati();
}

/** Ripristino acquisti (obbligatorio per le linee guida Apple). */
export async function ripristinaAcquisti(): Promise<Set<ModuloPremium>> {
  const Purchases = getPurchases();
  if (!Purchases || !configured) return new Set();
  await Purchases.restorePurchases();
  return moduliSbloccati();
}
