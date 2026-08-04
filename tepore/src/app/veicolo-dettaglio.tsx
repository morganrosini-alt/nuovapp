// src/app/veicolo-dettaglio.tsx — scadenze e spese del singolo veicolo
import React from "react";
import { useLocalSearchParams } from "expo-router";
import DettaglioEntita from "../components/DettaglioEntita";

export default function VeicoloDettaglioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return (
    <DettaglioEntita
      collezione="veicoli"
      id={id}
      titoloModulo="Veicoli"
      tipiScadenza={[
        { key: "bollo", label: "Bollo" },
        { key: "assicurazione", label: "Assicurazione" },
        { key: "revisione", label: "Revisione" },
        { key: "tagliando", label: "Tagliando" },
        { key: "altro", label: "Altro" },
      ]}
      azioniRapide={["Rifornimento", "Lavato", "Olio controllato", "Gomme controllate", "Tagliando"]}
    />
  );
}
