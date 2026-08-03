// Seconda tornata: schermate con flusso di creazione diverso dal composer
// standard (bacheca, lista spesa, bollette, immondizia, calendario).
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import { TouchableOpacity, TextInput } from "react-native";

function apriECompila(vista: any, testi: string[]) {
  const bottoni = vista.UNSAFE_queryAllByType(TouchableOpacity);
  for (const b of bottoni.slice(0, 5)) {
    if (vista.UNSAFE_queryAllByType(TextInput).length > 0) break;
    fireEvent.press(b);
  }
  const campi = vista.UNSAFE_queryAllByType(TextInput);
  testi.forEach((v, i) => { if (campi[i]) fireEvent.changeText(campi[i], v); });
  return campi;
}

describe("Creazione — flussi particolari", () => {
  beforeEach(() => { (global as any).__SCRITTURE__ = []; });

  it("Bacheca: pubblica una nota", async () => {
    const S = require("../src/app/bacheca").default;
    const vista = render(<S />);
    const campi = apriECompila(vista, ["Nota di prova"]);
    expect(campi.length).toBeGreaterThan(0);
    const bottoni = vista.UNSAFE_queryAllByType(TouchableOpacity);
    for (const b of bottoni) {
      fireEvent.press(b);
      if ((global as any).__SCRITTURE__.length > 0) break;
    }
    await waitFor(() => expect((global as any).__SCRITTURE__.length).toBeGreaterThan(0));
    const crea = (global as any).__SCRITTURE__.find((x: any) => x.tipo === "crea");
    expect(crea.collezione).toBe("bacheca");
    expect(crea.dati.householdId).toBe("casa-1");
  });

  it("Lista spesa: aggiunge una voce", async () => {
    const S = require("../src/app/lista-spesa").default;
    const vista = render(<S />);
    apriECompila(vista, ["Latte"]);
    const bottoni = vista.UNSAFE_queryAllByType(TouchableOpacity);
    for (const b of bottoni) {
      fireEvent.press(b);
      if ((global as any).__SCRITTURE__.length > 0) break;
    }
    await waitFor(() => expect((global as any).__SCRITTURE__.length).toBeGreaterThan(0));
    expect((global as any).__SCRITTURE__[0].collezione).toBe("lista_spesa");
  });

  it("Le schermate principali si montano senza crash", () => {
    const moduli = [
      "../src/app/bollette", "../src/app/immondizia", "../src/app/immondizia-tipi",
      "../src/app/calendario", "../src/app/turni", "../src/app/salute",
      "../src/app/emergenza", "../src/app/profilo", "../src/app/impostazioni",
      "../src/app/partecipanti", "../src/app/statistiche", "../src/app/paywall",
      "../src/app/veicolo-dettaglio", "../src/app/animale-dettaglio",
      "../src/app/bolletta-nuova", "../src/app/raccolta-straordinaria-nuova",
      "../src/app/immondizia-tipo-form", "../src/app/immondizia-mensile",
      "../src/app/(tabs)/index", "../src/app/(tabs)/finanze",
      "../src/app/(tabs)/utilita", "../src/app/(tabs)/coppia",
      "../src/app/esci-casa", "../src/app/household-setup", "../src/app/login",
      "../src/app/abbonamenti", "../src/app/contatti-utili",
    ];
    const falliti: string[] = [];
    for (const m of moduli) {
      try { render(React.createElement(require(m).default)); }
      catch (e: any) { falliti.push(`${m}: ${e.message.split("\n")[0]}`); }
    }
    if (falliti.length) console.log("SCHERMATE CHE NON SI MONTANO:\n" + falliti.join("\n"));
    expect(falliti).toEqual([]);
  });
});
