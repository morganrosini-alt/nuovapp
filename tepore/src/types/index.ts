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

export type GiornoSettimana = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domenica (Date.getDay())

export type FrequenzaRaccolta = "settimanale" | "quindicinale";

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
