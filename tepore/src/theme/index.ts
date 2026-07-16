// src/theme/index.ts
//
// Design tokens di Tepore — un unico posto per colori, raggi e ombre.
// Base: il redesign "verde salvia su crema" (Claude Design, lug 2026).
// Le schermate storiche usano ancora la palette arancione precedente:
// verranno migrate a questi token nella fase di rifinitura UX, così il
// tema scuro futuro si implementerà toccando SOLO questo file.

export const colors = {
  // Fondamenta
  background: "#F9F7F4",     // bianco caldo
  card: "#FFFFFF",
  ink: "#1A1A1A",            // testo principale
  muted: "#7A7570",          // testo secondario

  // Accento (verde salvia)
  accent: "#5C8A62",
  accentSoft: "#E4EDE1",     // sfondo chip icone
  accentDark: "#38553D",     // contorno icone nei chip

  // Neutri
  chipNeutral: "#EFEDE9",
  chipNeutralInk: "#57524B",
  border: "#E8E4DE",

  // Stati
  danger: "#D14A3A",         // scaduto / azioni distruttive
  success: "#3E8E5A",        // pagato / completato

  // Zona Intima (accento dedicato, ereditato da "Insieme")
  intimate: "#E1735C",
  intimateSoft: "#FBEAE5",

  // Legacy (palette arancione delle schermate non ancora migrate)
  legacyAccent: "#D97742",
  legacyBackground: "#FFF8F3",
};

export const radius = { sm: 10, md: 14, lg: 20, xl: 22 };

export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 };
