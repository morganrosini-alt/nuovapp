// src/app/animale-dettaglio.tsx — scadenze e spese del singolo animale
import React from "react";
import { useLocalSearchParams } from "expo-router";
import DettaglioEntita from "../components/DettaglioEntita";

export default function AnimaleDettaglioScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!id) return null;
  return (
    <DettaglioEntita
      collezione="animali"
      id={id}
      titoloModulo="Animali"
      tipiScadenza={[
        { key: "vaccino", label: "Vaccino" },
        { key: "antiparassitario", label: "Antiparassitario" },
        { key: "visita", label: "Visita" },
        { key: "altro", label: "Altro" },
      ]}
      // Le azioni che in una casa condivisa vengono davvero rifatte due
      // volte per sbaglio: la pastiglia data due volte è un rischio reale.
      azioniRapide={["Pastiglia", "Cibo", "Passeggiata", "Antiparassitario", "Toelettatura"]}
    />
  );
}
