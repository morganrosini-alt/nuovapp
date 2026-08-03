// Test di creazione: monta ogni schermata, apre il composer, compila i campi
// e preme il bottone di salvataggio. Verifica che non ci siano crash e che il
// documento scritto contenga i campi richiesti dalle regole di sicurezza.
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { TouchableOpacity, TextInput, Text as RNText } from "react-native";

const ETICHETTE_SALVA = ["Aggiungi", "Salva", "Crea", "Registra", "Pubblica", "Inserisci",
  "Aggiungi pianta", "Aggiungi garanzia", "Aggiungi intervento", "Aggiungi abbonamento",
  "Aggiungi contatto", "Registra spesa", "Crea salvadanaio", "Aggiungi attività"];

const schermate = [
  { nome: "Veicoli",      modulo: "../src/app/veicoli",        collezione: "veicoli",      testi: ["Panda"] },
  { nome: "Animali",      modulo: "../src/app/animali",        collezione: "animali",      testi: ["Fido"] },
  { nome: "Piante",       modulo: "../src/app/piante",         collezione: "piante",       testi: ["Basilico", "7"] },
  { nome: "Pulizie",      modulo: "../src/app/pulizie",        collezione: "pulizie",      testi: ["Bagno"] },
  { nome: "Garanzie",     modulo: "../src/app/garanzie",       collezione: "garanzie",     testi: ["Lavatrice"] },
  { nome: "Manutenzione", modulo: "../src/app/manutenzione",   collezione: "manutenzione", testi: ["Caldaia", "12"] },
  { nome: "Abbonamenti",  modulo: "../src/app/abbonamenti",    collezione: "abbonamenti",  testi: ["Netflix", "12"] },
  { nome: "Contatti",     modulo: "../src/app/contatti-utili", collezione: "contatti",     testi: ["Idraulico", "Ruolo", "3331234567"] },
  { nome: "Spese",        modulo: "../src/app/spese",          collezione: "spese",        testi: ["Spesa", "25"] },
  { nome: "Salvadanai",   modulo: "../src/app/salvadanai",     collezione: "salvadanai",   testi: ["Vacanza", "500"] },
];

describe("Creazione in ogni sezione", () => {
  beforeEach(() => { (global as any).__SCRITTURE__ = []; });

  for (const s of schermate) {
    it(`${s.nome}`, async () => {
      const Schermata = require(s.modulo).default;
      const vista = render(<Schermata />);

      // Apre il composer: prova i bottoni finché non compare un campo di testo.
      const bottoni = vista.UNSAFE_queryAllByType(TouchableOpacity);
      for (const b of bottoni.slice(0, 4)) {
        if (vista.UNSAFE_queryAllByType(TextInput).length > 0) break;
        fireEvent.press(b);
      }
      const campi = vista.UNSAFE_queryAllByType(TextInput);
      expect(campi.length).toBeGreaterThan(0); // il composer si è aperto

      s.testi.forEach((v, i) => { if (campi[i]) fireEvent.changeText(campi[i], v); });

      // Trova il bottone di salvataggio tra le etichette note.
      const testi = vista.UNSAFE_queryAllByType(RNText)
        .map((t: any) => (typeof t.props.children === "string" ? t.props.children : ""));
      const etichetta = ETICHETTE_SALVA.find((e) => testi.includes(e));
      expect(etichetta).toBeDefined();
      fireEvent.press(vista.getByText(etichetta as string));

      await waitFor(() => {
        expect((global as any).__SCRITTURE__.length).toBeGreaterThan(0);
      }, { timeout: 3000 });

      const crea = (global as any).__SCRITTURE__.find((x: any) => x.tipo === "crea");
      expect(crea).toBeDefined();
      expect(crea.collezione).toBe(s.collezione);
      expect(crea.dati.householdId).toBe("casa-1");
    });
  }
});
