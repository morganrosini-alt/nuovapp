// src/types/index.ts
//
// Le "forme" di tutti i dati di Tepore. Ricostruito fedelmente dal codice
// esistente (household, bollette, immondizia) ed esteso con i tipi dei nuovi
// moduli della fusione (relazioni/coppia, bacheca, calendario, salvadanai,
// zona intima).

// ---------------- Utenti e case ----------------

export type UserProfile = {
  id: string;
  email: string;
  displayName: string;
  householdId: string | null;   // casa attiva
  householdIds: string[];       // tutte le case di cui fa parte
  expoPushTokens?: string[];    // token push dei dispositivi (multi-device)
  publicKey?: string;           // chiave pubblica nacl.box per E2E (base64)
  createdAt: number;
};

export type Household = {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  inviteCode: string;
  inviteCodeVisibleToAll: boolean;
  createdAt: number;
};

// ---------------- Bollette ----------------

export type TipoBolletta =
  | "acqua"
  | "luce"
  | "gas"
  | "internet"
  | "telefono"
  | "altro";

export type Bolletta = {
  id: string;
  householdId: string;
  tipo: TipoBolletta;
  nome: string;
  importo: number;
  dataScadenza: number;         // timestamp ms
  pagata: boolean;
  dataPagamento: number | null;
  ricorrenteMensile: boolean;
  createdBy: string;
  createdAt: number;
};

// ---------------- Immondizia ----------------

// ⚠️ CORRETTO (31/07): questo tipo dichiarava numeri 0-6, ma il form salva su
// Firestore i nomi dei giorni ("lunedi", ...) e il servizio li confronta come
// stringhe. Il tipo era l'unico pezzo rimasto sull'altra convenzione, e questo
// nascondeva un bug reale: dashboard, Utilità e promemoria passavano
// getDay() (un numero) e il confronto `a.giorno === giorno` era sempre falso,
// quindi la raccolta di oggi non compariva mai. Ora la convenzione è una sola.
export type GiornoSettimana =
  | "domenica" | "lunedi" | "martedi" | "mercoledi"
  | "giovedi" | "venerdi" | "sabato";

export type FrequenzaRaccolta = "ogni-settimana" | "ogni-2-settimane";

export type AssegnazioneGiorno = {
  giorno: GiornoSettimana;
  frequenza: FrequenzaRaccolta;
  // Per le quindicinali: una data (ms) in cui la raccolta è avvenuta,
  // usata come riferimento per calcolare le settimane "giuste".
  dataRiferimento?: number;
};

export type TipoRifiutoPersonalizzato = {
  id: string;
  householdId: string;
  nome: string;
  lettera: string;              // sigla mostrata nei calendari (es. "P")
  colore: string;               // hex, scelto dall'utente o assegnato
  anno: number;                 // calendario di appartenenza (cambio annuale)
  assegnazioni: AssegnazioneGiorno[];
  createdAt: number;
};

export type RaccoltaStraordinaria = {
  id: string;
  householdId: string;
  nome: string;
  data: number;                 // timestamp ms
  createdAt: number;
};

// ---------------- Relazioni (coppia) — M1 ----------------

export type StatoRelazione = "in_attesa" | "confermata";

export type Relationship = {
  id: string;
  householdId: string;
  tipo: "coppia";
  membri: [string, string];     // sempre 2 uid
  stato: StatoRelazione;
  richiedente: string;          // chi ha inviato la richiesta
  // Chiave simmetrica di coppia per la Zona Intima, cifrata (nacl.box)
  // per ciascun partner con la sua chiave pubblica: { uid: base64 }
  wrappedKeys?: Record<string, string>;
  dataRichiesta: number;
  dataConferma?: number;
};

// ---------------- Bacheca — M3 ----------------

export type NotaBachecaTipo = "nota" | "checklist";

export type ChecklistItem = {
  testo: string;
  fatto: boolean;
  fattoDa?: string;             // uid di chi ha spuntato
};

export type NotaBacheca = {
  id: string;
  householdId: string;
  tipo: NotaBachecaTipo;
  testo?: string;               // per tipo "nota"
  items?: ChecklistItem[];      // per tipo "checklist"
  autore: string;
  fissata: boolean;             // in evidenza in cima
  colore?: string;              // colore del post-it
  createdAt: number;
  updatedAt: number;
};

// ---------------- Calendario — M4 ----------------

export type VisibilitaContenuto = "household" | "coppia" | "personale";

export type EventoCalendario = {
  id: string;
  householdId: string;
  titolo: string;
  inizio: number;
  fine?: number;
  luogo?: string;
  visibilita: VisibilitaContenuto;
  relationshipId?: string;      // obbligatorio se visibilita === "coppia"
  autore: string;
  assegnatari?: string[];
  createdAt: number;
};

// ---------------- Salvadanai — M5 ----------------

export type ContributoSalvadanaio = {
  uid: string;
  importo: number;
  data: number;
};

export type Salvadanaio = {
  id: string;
  householdId: string;
  nome: string;
  emoji?: string;
  importoTarget: number;
  contributi: ContributoSalvadanaio[];
  visibilita: Exclude<VisibilitaContenuto, "personale">;
  relationshipId?: string;
  autore: string;
  createdAt: number;
};

// ---------------- Zona Intima — M6 (contenuti SEMPRE cifrati E2E) ----------------

export type ContenutoIntimoTipo =
  | "nota"
  | "apprezzamento"
  | "ricorrenza"
  | "riparazione";

export type ContenutoIntimo = {
  id: string;
  householdId: string;
  relationshipId: string;
  tipo: ContenutoIntimoTipo;
  ciphertext: string;           // base64: nonce + secretbox — MAI testo in chiaro
  autore: string;
  createdAt: number;
};

// ---------------- Moduli M7 ----------------

export type Pulizia = {
  id: string;
  householdId: string;
  nome: string;
  frequenza: "giornaliera" | "settimanale" | "mensile";
  assegnatarioId?: string | null;
  ultimoCompletamento?: number | null;
  completataDa?: string | null;
  createdAt: number;
};

export type VoceListaSpesa = {
  id: string;
  householdId: string;
  nome: string;
  preso: boolean;
  presoDa?: string | null;
  createdAt: number;
};

export type VoceSpesa = {
  id: string;
  householdId: string;
  titolo: string;
  importo: number;
  categoria: "spesa" | "casa" | "salute" | "svago" | "altro";
  data: number;
  visibilita: VisibilitaContenuto;
  relationshipId?: string;
  autore: string;
  createdAt: number;
};

export type Garanzia = {
  id: string;
  householdId: string;
  nome: string;
  scadenza: number;
  note?: string;
  createdAt: number;
};

export type Abbonamento = {
  id: string;
  householdId: string;
  nome: string;
  importo: number;
  ciclo: "mensile" | "annuale";
  prossimoRinnovo: number;
  createdAt: number;
};

export type InterventoManutenzione = {
  id: string;
  householdId: string;
  nome: string;
  ricorrenzaMesi: number;
  ultimaEsecuzione: number;
  note?: string;
  createdAt: number;
};

export type ContattoUtile = {
  id: string;
  householdId: string;
  nome: string;
  ruolo?: string;
  telefono: string;
  createdAt: number;
};

// ---------------- Moduli Premium ----------------

export type ScadenzaEntita = {
  tipo: string;          // es. "bollo", "vaccino" — dipende dal modulo
  etichetta?: string;    // testo libero per tipo "altro"
  data: number;          // timestamp ms
};

export type SpesaEntita = {
  descrizione: string;
  importo: number;
  data: number;
};

/**
 * Una cosa che è stata fatta, e da chi.
 *
 * È il cuore di "L'ho fatto io": in una casa condivisa la domanda vera non è
 * "quando va data la pastiglia" ma "gliel'ha già data qualcuno stamattina?".
 * Il nome viene salvato insieme all'uid (denormalizzato) così lo storico
 * resta leggibile anche offline e anche se la persona lascia la casa.
 */
export type AzioneEntita = {
  cosa: string;          // "Antiparassitario", "Rifornimento", "Annaffiata"
  quando: number;        // timestamp ms
  chi: string;           // uid di chi l'ha fatto
  chiNome: string;       // nome al momento dell'azione
  note?: string;
};

export type Veicolo = {
  id: string;
  householdId: string;
  nome: string;
  tipo: "auto" | "moto" | "bici" | "altro";
  targa?: string;
  scadenze: ScadenzaEntita[];
  spese: SpesaEntita[];
  azioni?: AzioneEntita[];
  createdAt: number;
};

export type Animale = {
  id: string;
  householdId: string;
  nome: string;
  specie: "cane" | "gatto" | "altro";
  scadenze: ScadenzaEntita[];
  spese: SpesaEntita[];
  azioni?: AzioneEntita[];
  createdAt: number;
};

export type Pianta = {
  id: string;
  householdId: string;
  nome: string;
  frequenzaGiorni: number;       // ogni quanti giorni annaffiare
  ultimaAnnaffiatura: number;
  // Chi ha annaffiato l'ultima volta. In una casa condivisa è l'informazione
  // che evita la doppia annaffiatura — che per una pianta è più dannosa
  // di una saltata.
  ultimaAnnaffiaturaChi?: string;
  ultimaAnnaffiaturaNome?: string;
  note?: string;
  createdAt: number;
};

// ---------------- Turni di lavoro ----------------
// Visibili a tutta la casa (decisione di prodotto): servono a capire
// "chi c'è" quando si programma qualcosa insieme.

export type FasciaTurno =
  | "mattina" | "pomeriggio" | "notte" | "libero" | "ferie" | "malattia";

export type Turno = {
  id: string;
  householdId: string;
  utenteId: string;          // di chi è il turno
  giorno: number;            // timestamp ms normalizzato a mezzanotte
  fascia: FasciaTurno;
  oraInizio?: string;        // "06:00" — facoltativo
  oraFine?: string;          // "14:00"
  createdAt: number;
};

// ---------------- Salute ----------------
// DATI SANITARI = categoria particolare (GDPR art. 9). Per scelta di
// progetto sono PERSONALI: le Security Rules concedono lettura e scrittura
// SOLO all'utente proprietario, nessun altro membro della casa può vederli.

export type TipoVoceSalute = "controllo" | "farmaco" | "nota";

export type VoceSalute = {
  id: string;
  utenteId: string;          // unico criterio di accesso
  tipo: TipoVoceSalute;
  titolo: string;            // "Pulizia denti", "Vitamina D", "Allergia polline"
  prossimaData?: number;     // per i controlli
  ricorrenzaMesi?: number;   // 6 = ogni sei mesi
  ultimaData?: number;       // quando è stata fatta l'ultima volta
  completato?: boolean;      // voce una tantum archiviata
  note?: string;
  createdAt: number;
};
