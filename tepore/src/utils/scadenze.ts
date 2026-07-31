// src/utils/scadenze.ts
//
// Calcoli di scadenza condivisi. Vivono qui e non dentro le schermate perché
// Expo Router tratta ogni file in src/app come una ROTTA: se una rotta
// esporta anche funzioni oltre al componente, il router segnala un errore.

import { InterventoManutenzione, Pianta } from "../types";

const GIORNO = 24 * 3600e3;

/** Data in cui una manutenzione ricorrente torna dovuta. */
export function prossimaManutenzione(m: InterventoManutenzione): number {
  const d = new Date(m.ultimaEsecuzione);
  d.setMonth(d.getMonth() + m.ricorrenzaMesi);
  return d.getTime();
}

/** Data in cui una pianta va annaffiata di nuovo. */
export function prossimaAnnaffiatura(p: Pianta): number {
  return p.ultimaAnnaffiatura + p.frequenzaGiorni * GIORNO;
}
