// src/app/veicoli.tsx — modulo premium Veicoli (lista)
import React from "react";
import ListaEntita from "../components/ListaEntita";

export default function VeicoliScreen() {
  return (
    <ListaEntita
      collezione="veicoli"
      titolo="Veicoli"
      routeDettaglio="/veicolo-dettaglio"
      campoTipo="tipo"
      tipiEntita={[
        { key: "auto", label: "Auto", icona: "car-outline" },
        { key: "moto", label: "Moto", icona: "motorbike" },
        { key: "bici", label: "Bici", icona: "bike" },
        { key: "altro", label: "Altro", icona: "truck-outline" },
      ]}
      placeholderNome="Nome (es. Panda di casa)"
      messaggioVuoto={"Nessun veicolo. Aggiungi auto, moto o bici: bollo, assicurazione e revisione non ti sfuggiranno più 🚗"}
    />
  );
}
