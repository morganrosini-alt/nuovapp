// src/services/promemoria.ts
//
// M2 — Motore dei promemoria locali (scadenze bollette + immondizia).
//
// ARCHITETTURA: risincronizzazione completa, non "un ID notifica salvato sul
// dato". Gli ID delle notifiche locali valgono solo sul telefono che le ha
// schedulate, ma la casa è multi-utente: se un altro membro modifica una
// bolletta dal SUO telefono, il TUO deve comunque aggiornare le TUE notifiche.
// Quindi ogni dispositivo, quando i dati cambiano (vedi usePromemoria):
//   1. cancella tutte le notifiche marchiate con il proprio tag
//   2. le rigenera da zero dallo stato attuale di Firestore
// Idempotente, niente notifiche fantasma, funziona per qualsiasi membro.
//
// Cosa viene schedulato:
//   BOLLETTE (non pagate)  → giorno prima h 9:00 + giorno stesso h 9:00
//   IMMONDIZIA (calendario)→ sera prima h 20:00 ("Stasera porta fuori: …"),
//                            finestra dei prossimi 14 giorni
//   STRAORDINARIE          → sera prima h 20:00
// Limite iOS: max 64 notifiche pendenti per app → tetto prudente a 60.

import * as Notifications from "expo-notifications";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { lettereAttiveInGiorno, giornoDaData } from "./immondizia";
import {
  Abbonamento, Animale, Bolletta, Garanzia, GiornoSettimana,
  InterventoManutenzione, Pianta, RaccoltaStraordinaria,
  TipoRifiutoPersonalizzato, Veicolo, Turno, VoceSalute,
} from "../types";

const TAG = "tepore-promemoria";       // marchio: tocchiamo SOLO le nostre notifiche
const ORA_BOLLETTE = 9;                // 9:00 del mattino
const ORA_IMMONDIZIA = 20;             // 20:00 della sera prima
const FINESTRA_IMMONDIZIA_GIORNI = 14; // quanto avanti guardare nel calendario
const MAX_NOTIFICHE = 60;              // sotto il limite iOS di 64

type PromemoriaDesiderato = { data: Date; titolo: string; corpo: string };

function alle(base: Date, ora: number): Date {
  const d = new Date(base);
  d.setHours(ora, 0, 0, 0);
  return d;
}

function giornoPrima(ms: number): Date {
  const d = new Date(ms);
  d.setDate(d.getDate() - 1);
  return d;
}

const euro = (n: number) =>
  n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

/**
 * Rigenera TUTTI i promemoria locali di questo dispositivo per la casa attiva.
 * Sicura da chiamare quante volte si vuole (idempotente).
 */
export async function sincronizzaPromemoria(
  householdId: string,
  uid?: string
): Promise<void> {
  // Senza permesso notifiche non c'è nulla da fare (lo chiede registraPushToken)
  const perm = await Notifications.getPermissionsAsync();
  if (perm.status !== "granted") return;

  const desiderati: PromemoriaDesiderato[] = [];
  const adesso = Date.now();

  // ---------- 1. Bollette non pagate ----------
  const bolletteSnap = await getDocs(
    query(
      collection(db, "bollette"),
      where("householdId", "==", householdId),
      where("pagata", "==", false)
    )
  );
  const bollette = bolletteSnap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Bolletta))
    .sort((a, b) => a.dataScadenza - b.dataScadenza);

  for (const b of bollette) {
    const vigilia = alle(giornoPrima(b.dataScadenza), ORA_BOLLETTE);
    const giornoStesso = alle(new Date(b.dataScadenza), ORA_BOLLETTE);
    if (vigilia.getTime() > adesso) {
      desiderati.push({
        data: vigilia,
        titolo: "Scadenza in arrivo",
        corpo: `Domani scade: ${b.nome} — ${euro(b.importo)}`,
      });
    }
    if (giornoStesso.getTime() > adesso) {
      desiderati.push({
        data: giornoStesso,
        titolo: "Scade oggi",
        corpo: `${b.nome} — ${euro(b.importo)}. Ricordati di pagarla!`,
      });
    }
  }

  // ---------- 2. Calendario immondizia (prossimi 14 giorni) ----------
  const tipiSnap = await getDocs(
    query(collection(db, "immondizia_tipi"), where("householdId", "==", householdId))
  );
  const tipi = tipiSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as TipoRifiutoPersonalizzato)
  );

  if (tipi.length > 0) {
    for (let i = 0; i < FINESTRA_IMMONDIZIA_GIORNI; i++) {
      const giornoRaccolta = new Date();
      giornoRaccolta.setDate(giornoRaccolta.getDate() + i);
      giornoRaccolta.setHours(12, 0, 0, 0);
      const attivi = lettereAttiveInGiorno(
        tipi,
        giornoDaData(giornoRaccolta),
        giornoRaccolta
      );
      if (attivi.length === 0) continue;
      const seraPrima = alle(giornoPrima(giornoRaccolta.getTime()), ORA_IMMONDIZIA);
      if (seraPrima.getTime() <= adesso) continue;
      const nomi = attivi.map((t) => t.nome).join(" + ");
      desiderati.push({
        data: seraPrima,
        titolo: "Immondizia 🗑️",
        corpo: `Stasera porta fuori: ${nomi}`,
      });
    }
  }

  // ---------- 3. Raccolte straordinarie future ----------
  const straSnap = await getDocs(
    query(
      collection(db, "immondizia_straordinarie"),
      where("householdId", "==", householdId)
    )
  );
  const straordinarie = straSnap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as RaccoltaStraordinaria)
  );
  for (const s of straordinarie) {
    const seraPrima = alle(giornoPrima(s.data), ORA_IMMONDIZIA);
    if (seraPrima.getTime() > adesso) {
      desiderati.push({
        data: seraPrima,
        titolo: "Raccolta straordinaria",
        corpo: `Domani: ${s.nome}`,
      });
    }
  }

  // ---------- 4. Garanzie: 30 e 7 giorni prima della scadenza ----------
  const garSnap = await getDocs(
    query(collection(db, "garanzie"), where("householdId", "==", householdId))
  );
  for (const d of garSnap.docs) {
    const g = { id: d.id, ...d.data() } as Garanzia;
    for (const giorniPrima of [30, 7]) {
      const quando = alle(new Date(g.scadenza - giorniPrima * 24 * 3600e3), ORA_BOLLETTE);
      if (quando.getTime() > adesso) {
        desiderati.push({
          data: quando,
          titolo: "Garanzia in scadenza",
          corpo: `${g.nome}: la garanzia scade tra ${giorniPrima} giorni`,
        });
      }
    }
  }

  // ---------- 5. Abbonamenti: il giorno prima del rinnovo ----------
  const abbSnap = await getDocs(
    query(collection(db, "abbonamenti"), where("householdId", "==", householdId))
  );
  for (const d of abbSnap.docs) {
    const a = { id: d.id, ...d.data() } as Abbonamento;
    const vigilia = alle(giornoPrima(a.prossimoRinnovo), ORA_BOLLETTE);
    if (vigilia.getTime() > adesso) {
      desiderati.push({
        data: vigilia,
        titolo: "Rinnovo in arrivo",
        corpo: `Domani si rinnova: ${a.nome} — ${euro(a.importo)}`,
      });
    }
  }

  // ---------- 6. Manutenzioni: il giorno della scadenza calcolata ----------
  const manSnap = await getDocs(
    query(collection(db, "manutenzione"), where("householdId", "==", householdId))
  );
  for (const d of manSnap.docs) {
    const m = { id: d.id, ...d.data() } as InterventoManutenzione;
    const dovuta = new Date(m.ultimaEsecuzione);
    dovuta.setMonth(dovuta.getMonth() + m.ricorrenzaMesi);
    const quando = alle(dovuta, ORA_BOLLETTE);
    if (quando.getTime() > adesso) {
      desiderati.push({
        data: quando,
        titolo: "Manutenzione di casa",
        corpo: `\u00c8 il momento di: ${m.nome}`,
      });
    }
  }

  // ---------- 7. Veicoli: 14 e 3 giorni prima di ogni scadenza ----------
  const veiSnap = await getDocs(
    query(collection(db, "veicoli"), where("householdId", "==", householdId))
  );
  for (const d of veiSnap.docs) {
    const v = { id: d.id, ...d.data() } as Veicolo;
    for (const sc of v.scadenze ?? []) {
      for (const gg of [14, 3]) {
        const quando = alle(new Date(sc.data - gg * 24 * 3600e3), ORA_BOLLETTE);
        if (quando.getTime() > adesso) {
          desiderati.push({
            data: quando,
            titolo: `${v.nome} \ud83d\ude97`,
            corpo: `${sc.etichetta ?? sc.tipo} in scadenza tra ${gg} giorni`,
          });
        }
      }
    }
  }

  // ---------- 8. Animali: 7 e 1 giorno prima di ogni scadenza ----------
  const aniSnap = await getDocs(
    query(collection(db, "animali"), where("householdId", "==", householdId))
  );
  for (const d of aniSnap.docs) {
    const a = { id: d.id, ...d.data() } as Animale;
    for (const sc of a.scadenze ?? []) {
      for (const gg of [7, 1]) {
        const quando = alle(new Date(sc.data - gg * 24 * 3600e3), ORA_BOLLETTE);
        if (quando.getTime() > adesso) {
          desiderati.push({
            data: quando,
            titolo: `${a.nome} \ud83d\udc3e`,
            corpo: `${sc.etichetta ?? sc.tipo}: ${gg === 1 ? "domani" : "tra 7 giorni"}`,
          });
        }
      }
    }
  }

  // ---------- 9. Piante: il giorno in cui va annaffiata ----------
  const piaSnap = await getDocs(
    query(collection(db, "piante"), where("householdId", "==", householdId))
  );
  for (const d of piaSnap.docs) {
    const p = { id: d.id, ...d.data() } as Pianta;
    const dovuta = alle(
      new Date(p.ultimaAnnaffiatura + p.frequenzaGiorni * 24 * 3600e3), ORA_BOLLETTE
    );
    if (dovuta.getTime() > adesso) {
      desiderati.push({
        data: dovuta,
        titolo: "Piante \ud83c\udf31",
        corpo: `\u00c8 il giorno di annaffiare: ${p.nome}`,
      });
    }
  }

  // ---------- 10. Turni: promemoria la sera prima di un turno mattutino ----------
  const turSnap = await getDocs(
    query(collection(db, "turni"), where("householdId", "==", householdId))
  );
  for (const d of turSnap.docs) {
    const t = { id: d.id, ...d.data() } as Turno;
    if (t.fascia !== "mattina") continue;          // solo i turni "scomodi"
    const seraPrima = alle(giornoPrima(t.giorno), ORA_IMMONDIZIA);
    if (seraPrima.getTime() > adesso) {
      desiderati.push({
        data: seraPrima,
        titolo: "Domani si lavora presto",
        corpo: t.oraInizio ? `Turno mattina, ingresso alle ${t.oraInizio}` : "Turno di mattina",
      });
    }
  }

  // ---------- 11. Salute: controlli in scadenza (solo i MIEI) ----------
  if (uid) {
    const salSnap = await getDocs(
      query(collection(db, "salute"), where("utenteId", "==", uid))
    );
    for (const d of salSnap.docs) {
      const v = { id: d.id, ...d.data() } as VoceSalute;
      if (v.tipo !== "controllo" || !v.prossimaData) continue;
      for (const gg of [14, 1]) {
        const quando = alle(new Date(v.prossimaData - gg * 24 * 3600e3), ORA_BOLLETTE);
        if (quando.getTime() > adesso) {
          desiderati.push({
            data: quando,
            titolo: "Promemoria salute",
            corpo: gg === 1 ? `Domani: ${v.titolo}` : `${v.titolo} tra due settimane`,
          });
        }
      }
    }
  }

  // ---------- 12. Cancella le vecchie (solo le NOSTRE) e rischedula ----------
  const pendenti = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    pendenti
      .filter((n) => (n.content.data as any)?.tag === TAG)
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );

  const daSchedulare = desiderati
    .sort((a, b) => a.data.getTime() - b.data.getTime())
    .slice(0, MAX_NOTIFICHE); // le più vicine hanno la priorità

  await Promise.all(
    daSchedulare.map((p) =>
      Notifications.scheduleNotificationAsync({
        content: { title: p.titolo, body: p.corpo, sound: true, data: { tag: TAG } },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: p.data,
        },
      })
    )
  );
}
