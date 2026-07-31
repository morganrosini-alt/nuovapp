// src/config/flags.ts
//
// Interruttori decisi al momento della BUILD, non a runtime.
// Il valore arriva dal campo "env" del profilo in eas.json (o dal .env locale
// quando si lavora con Expo Go).
//
// Default = bloccato. Se un domani qualcuno builda senza la variabile, l'app
// esce con i moduli premium chiusi. Mai il contrario.

export const FLAGS = {
  /**
   * Sblocca Veicoli, Animali, Piante e Statistiche senza acquisto.
   * SOLO per le build di collaudo (profilo "collaudo" in eas.json).
   * Letto da src/services/purchases.ts -> moduliSbloccati().
   */
  SBLOCCA_TUTTO: process.env.EXPO_PUBLIC_SBLOCCA_TUTTO === "true",
};
