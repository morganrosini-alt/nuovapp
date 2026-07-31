// src/theme/index.ts
//
// Design token di Tepore — palette "Baltic" (blu/verde).
// Unico posto dove vivono i colori: il futuro tema scuro si farà qui.
//
// Nota di accessibilità: il verde chiaro (#9EE493) NON è usato per testo o
// bottoni pieni (contrasto insufficiente col bianco): serve per barre e
// stati positivi. Per testo/spunte su fondo chiaro si usa greenInk.

export const colors = {
  // Fondamenta
  background: "#F5F8FA",     // bianco freddo, intonato al blu
  card: "#FFFFFF",
  ink: "#2F4858",            // Charcoal Blue: più caldo del nero puro
  muted: "#6C7A85",
  border: "#E2E9EE",

  // Accento principale
  accent: "#336699",         // Baltic Blue
  accentDark: "#28527A",
  accentSoft: "#DCEBF3",     // sfondo chip icona (da Sky Reflection)
  sky: "#86BBD8",

  // Neutri
  chipNeutral: "#EEF2F5",
  chipNeutralInk: "#5A6B76",

  // Stati
  success: "#9EE493",        // barre/stati positivi (mai testo)
  successInk: "#2E7D32",     // spunte e testo su fondo chiaro
  successSoft: "#E7F7E4",
  danger: "#D96A5B",         // urgenze: mattone caldo, non allarmante
  dangerSoft: "#FBEBE8",
  dangerInk: "#A5402F",
  warning: "#E4A853",        // scadenze economiche
  warningSoft: "#FBF0DD",
  warningInk: "#8A5A18",

  // Coppia: unico accento caldo, marca il cambio di contesto
  intimate: "#E0736E",
  intimateSoft: "#FBE9E8",

  // Turni di lavoro
  turnoMattina: "#E4A853",
  turnoPomeriggio: "#336699",
  turnoNotte: "#5B4B8A",
  turnoLibero: "#9EAAB2",
  turnoFerie: "#2E7D32",
  turnoMalattia: "#D96A5B",
};

export const radius = { sm: 10, md: 14, lg: 18, xl: 22 };

// ---------------- Profondità ----------------
//
// Ombre STRATIFICATE e TINTE DI BLU: due livelli sovrapposti — uno stretto
// che definisce il bordo, uno largo e diffuso che dà aria — con il colore
// dell'accento al posto del nero. È il dettaglio che fa sembrare
// l'interfaccia disegnata invece che assemblata.
//
// Usiamo `boxShadow` (supportato su iOS e Android dalle versioni recenti di
// React Native con la New Architecture, attiva in questo progetto): è l'unico
// modo per avere DUE ombre e un colore tinto anche su Android, dove il
// vecchio `elevation` permetteva solo un'ombra grigia di sistema.

export const shadow = {
  /** Card, righe, tile: profondità standard. */
  card: {
    boxShadow:
      "0px 1px 3px rgba(51, 102, 153, 0.10), 0px 8px 22px rgba(51, 102, 153, 0.13)",
    // ripiego per build che non supportano boxShadow:
    elevation: 3,
  },
  /** Elementi che devono staccarsi di più (bottone flottante, popup). */
  alta: {
    boxShadow:
      "0px 2px 6px rgba(51, 102, 153, 0.14), 0px 14px 34px rgba(51, 102, 153, 0.20)",
    elevation: 8,
  },
  /** Appena accennata: per elementi già delimitati da un bordo. */
  bassa: {
    boxShadow: "0px 1px 2px rgba(51, 102, 153, 0.08), 0px 4px 12px rgba(51, 102, 153, 0.08)",
    elevation: 1,
  },
};

// ---------------- Tipografia ----------------
// Nunito: tondo, senza spigoli — il carattere dell'accoglienza.
// Le famiglie vengono applicate globalmente da theme/font.ts in base al
// fontWeight già presente negli stili, quindi qui servono solo come
// riferimento per gli usi espliciti.

export const fonts = {
  regular: "Nunito_400Regular",
  medium: "Nunito_500Medium",
  semibold: "Nunito_600SemiBold",
  bold: "Nunito_700Bold",
  extrabold: "Nunito_800ExtraBold",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
