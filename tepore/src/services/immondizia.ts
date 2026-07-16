// src/services/immondizia.ts

import {
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  TipoRifiutoPersonalizzato,
  RaccoltaStraordinaria,
  GiornoSettimana,
  AssegnazioneGiorno,
} from "../types";

const TIPI_COLLECTION = "immondizia_tipi";
const STRAORDINARIE_COLLECTION = "immondizia_straordinarie";

export const PALETTE_COLORI = [
  "#3B7DD8", "#E0B400", "#4A9D6E", "#D97742",
  "#8B5E3C", "#9B59B6", "#16A085", "#C0392B",
  "#FFFFFF", "#000000",
];

// Calcola se un colore di sfondo è "chiaro" o "scuro" (formula di luminanza
// percepita) e restituisce il colore di testo giusto per restare sempre
// leggibile — testo scuro su sfondi chiari, testo bianco su sfondi scuri.
export function coloreTestoLeggibile(coloreSfondo: string): string {
  const r = parseInt(coloreSfondo.slice(1, 3), 16);
  const g = parseInt(coloreSfondo.slice(3, 5), 16);
  const b = parseInt(coloreSfondo.slice(5, 7), 16);
  const luminanza = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminanza > 0.6 ? "#3A2E28" : "#FFFFFF";
}

// ---- Tipi di rifiuto personalizzati (con assegnazioni incorporate) ----

export function ascoltaTipiRifiuto(
  householdId: string,
  onChange: (tipi: TipoRifiutoPersonalizzato[]) => void
): () => void {
  const q = query(collection(db, TIPI_COLLECTION), where("householdId", "==", householdId));
  return onSnapshot(q, (snapshot) => {
    const tipi = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as TipoRifiutoPersonalizzato))
      .sort((a, b) => a.createdAt - b.createdAt);
    onChange(tipi);
  });
}

export type DatiTipoRifiuto = {
  householdId: string;
  nome: string;
  lettera: string;
  assegnazioni: AssegnazioneGiorno[];
  anno: number;
  colore?: string; // se non specificato, ne viene assegnato uno automaticamente
};

export async function creaTipoRifiuto(dati: DatiTipoRifiuto, numeroEsistenti: number): Promise<void> {
  const { colore, ...resto } = dati;
  await addDoc(collection(db, TIPI_COLLECTION), {
    ...resto,
    nome: dati.nome.trim(),
    lettera: dati.lettera.trim().toUpperCase(),
    colore: colore ?? PALETTE_COLORI[numeroEsistenti % PALETTE_COLORI.length],
    createdAt: Date.now(),
  });
}

export async function aggiornaTipoRifiuto(
  id: string,
  dati: Omit<DatiTipoRifiuto, "householdId" | "anno">
): Promise<void> {
  await updateDoc(doc(db, TIPI_COLLECTION, id), {
    ...dati,
    nome: dati.nome.trim(),
    lettera: dati.lettera.trim().toUpperCase(),
  });
}

export async function eliminaTipoRifiuto(id: string): Promise<void> {
  await deleteDoc(doc(db, TIPI_COLLECTION, id));
}

// Copia tutti i tipi di un anno in un altro (es. da 2026 a 2027), utile
// come punto di partenza quando si prepara il calendario del nuovo anno
// e la maggior parte delle raccolte resta invariata rispetto a prima.
export async function duplicaTipiPerAnno(
  tipiSorgente: TipoRifiutoPersonalizzato[],
  householdId: string,
  annoDestinazione: number
): Promise<void> {
  await Promise.all(
    tipiSorgente.map((t, index) =>
      addDoc(collection(db, TIPI_COLLECTION), {
        householdId,
        nome: t.nome,
        lettera: t.lettera,
        colore: t.colore,
        assegnazioni: t.assegnazioni,
        anno: annoDestinazione,
        createdAt: Date.now() + index, // piccolo offset per mantenere l'ordine di creazione
      })
    )
  );
}

// Determina se una SINGOLA assegnazione (giorno+frequenza) è attiva in una
// certa data. Per quelle settimanali è sempre vero (il giorno combacia,
// controllato a parte). Per quelle quindicinali, calcoliamo quante
// settimane sono passate dalla dataRiferimento e verifichiamo che siano
// un numero pari.
function assegnazioneAttivaInData(assegnazione: AssegnazioneGiorno, data: Date): boolean {
  if (assegnazione.frequenza === "ogni-settimana") return true;

  const riferimento = new Date(assegnazione.dataRiferimento);
  const dataNorm = new Date(data.getFullYear(), data.getMonth(), data.getDate()).getTime();
  const riferimentoNorm = new Date(
    riferimento.getFullYear(),
    riferimento.getMonth(),
    riferimento.getDate()
  ).getTime();

  const msPerSettimana = 7 * 24 * 60 * 60 * 1000;
  const differenzaSettimane = Math.round((dataNorm - riferimentoNorm) / msPerSettimana);
  return differenzaSettimane % 2 === 0;
}

// Restituisce i tipi attivi (da portare fuori) per un giorno-della-
// settimana in una data specifica. Un tipo è incluso se ALMENO UNA delle
// sue assegnazioni combacia con quel giorno ed è attiva in quella data —
// così un tipo con giorni/frequenze diverse (es. Secco: Mar settimanale +
// Gio quindicinale) funziona correttamente su entrambi i giorni.
export function lettereAttiveInGiorno(
  tipi: TipoRifiutoPersonalizzato[],
  giorno: GiornoSettimana,
  data: Date
): TipoRifiutoPersonalizzato[] {
  return tipi
    .filter((t) => t.anno === data.getFullYear())
    .filter((t) => (t.assegnazioni ?? []).some((a) => a.giorno === giorno && assegnazioneAttivaInData(a, data)));
}

// ---- Raccolte straordinarie (ramaglie, ingombranti su prenotazione, ecc.) ----

export function ascoltaRaccolteStraordinarie(
  householdId: string,
  onChange: (raccolte: RaccoltaStraordinaria[]) => void
): () => void {
  const q = query(collection(db, STRAORDINARIE_COLLECTION), where("householdId", "==", householdId));
  return onSnapshot(q, (snapshot) => {
    const raccolte = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as RaccoltaStraordinaria))
      .sort((a, b) => a.data - b.data);
    onChange(raccolte);
  });
}

export type NuovaRaccoltaStraordinaria = {
  householdId: string;
  nome: string;
  data: number;
};

export async function creaRaccoltaStraordinaria(dati: NuovaRaccoltaStraordinaria): Promise<void> {
  await addDoc(collection(db, STRAORDINARIE_COLLECTION), { ...dati, createdAt: Date.now() });
}

export async function aggiornaRaccoltaStraordinaria(
  id: string,
  dati: Omit<NuovaRaccoltaStraordinaria, "householdId">
): Promise<void> {
  await updateDoc(doc(db, STRAORDINARIE_COLLECTION, id), { ...dati });
}

export function ascoltaRaccoltaStraordinaria(
  id: string,
  onChange: (raccolta: RaccoltaStraordinaria | null) => void
): () => void {
  return onSnapshot(doc(db, STRAORDINARIE_COLLECTION, id), (snapshot) => {
    onChange(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as RaccoltaStraordinaria) : null);
  });
}

export async function eliminaRaccoltaStraordinaria(id: string): Promise<void> {
  await deleteDoc(doc(db, STRAORDINARIE_COLLECTION, id));
}
