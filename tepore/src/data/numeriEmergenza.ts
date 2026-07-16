// src/data/numeriEmergenza.ts
//
// Elenco curato a mano dei numeri di emergenza per i paesi europei più
// probabili per chi usa quest'app (base Italia + destinazioni comuni).
// Non è esaustivo per tutto il mondo di proposito: meglio un elenco corto
// e affidabile che uno lungo e impreciso su un argomento delicato come
// questo. Il 112 funziona come numero unico in quasi tutta Europa, quindi
// lo teniamo sempre in evidenza come primo numero per ogni paese.

export type NumeroEmergenza = {
  label: string;
  numero: string;
};

export type PaeseEmergenza = {
  codice: string; // codice regione ISO, usato per il rilevamento automatico (expo-localization)
  nome: string;
  bandiera: string; // emoji bandiera, per riconoscimento visivo veloce
  numeri: NumeroEmergenza[];
};

export const PAESI_EMERGENZA: PaeseEmergenza[] = [
  {
    codice: "IT",
    nome: "Italia",
    bandiera: "🇮🇹",
    numeri: [
      { label: "Emergenza generale", numero: "112" },
      { label: "Polizia", numero: "113" },
      { label: "Vigili del Fuoco", numero: "115" },
      { label: "Ambulanza", numero: "118" },
    ],
  },
  {
    codice: "FR",
    nome: "Francia",
    bandiera: "🇫🇷",
    numeri: [
      { label: "Emergenza generale", numero: "112" },
      { label: "Polizia", numero: "17" },
      { label: "Vigili del Fuoco", numero: "18" },
      { label: "Ambulanza (SAMU)", numero: "15" },
    ],
  },
  {
    codice: "DE",
    nome: "Germania",
    bandiera: "🇩🇪",
    numeri: [
      { label: "Emergenza generale", numero: "112" },
      { label: "Polizia", numero: "110" },
    ],
  },
  {
    codice: "ES",
    nome: "Spagna",
    bandiera: "🇪🇸",
    numeri: [{ label: "Emergenza generale", numero: "112" }],
  },
  {
    codice: "GB",
    nome: "Regno Unito",
    bandiera: "🇬🇧",
    numeri: [
      { label: "Emergenza generale", numero: "999" },
      { label: "Emergenza (alternativo, UE)", numero: "112" },
    ],
  },
  {
    codice: "CH",
    nome: "Svizzera",
    bandiera: "🇨🇭",
    numeri: [
      { label: "Emergenza generale", numero: "112" },
      { label: "Polizia", numero: "117" },
      { label: "Vigili del Fuoco", numero: "118" },
      { label: "Ambulanza", numero: "144" },
    ],
  },
  {
    codice: "AT",
    nome: "Austria",
    bandiera: "🇦🇹",
    numeri: [
      { label: "Emergenza generale", numero: "112" },
      { label: "Polizia", numero: "133" },
      { label: "Vigili del Fuoco", numero: "122" },
      { label: "Ambulanza", numero: "144" },
    ],
  },
  {
    codice: "PT",
    nome: "Portogallo",
    bandiera: "🇵🇹",
    numeri: [{ label: "Emergenza generale", numero: "112" }],
  },
  {
    codice: "NL",
    nome: "Paesi Bassi",
    bandiera: "🇳🇱",
    numeri: [{ label: "Emergenza generale", numero: "112" }],
  },
  {
    codice: "BE",
    nome: "Belgio",
    bandiera: "🇧🇪",
    numeri: [{ label: "Emergenza generale", numero: "112" }],
  },
];

// Usato quando il paese rilevato/selezionato non è nell'elenco sopra.
export const PAESE_FALLBACK: PaeseEmergenza = {
  codice: "XX",
  nome: "Altro paese",
  bandiera: "🌍",
  numeri: [{ label: "Emergenza generale (valido in gran parte d'Europa)", numero: "112" }],
};

export function trovaPaeseByCodice(codice: string | null | undefined): PaeseEmergenza {
  if (!codice) return PAESE_FALLBACK;
  return PAESI_EMERGENZA.find((p) => p.codice === codice.toUpperCase()) ?? PAESE_FALLBACK;
}
