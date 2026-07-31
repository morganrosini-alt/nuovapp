// src/app/animali.tsx — modulo premium Animali (lista)
import React from "react";
import ListaEntita from "../components/ListaEntita";

export default function AnimaliScreen() {
  return (
    <ListaEntita
      collezione="animali"
      titolo="Animali"
      routeDettaglio="/animale-dettaglio"
      campoTipo="specie"
      tipiEntita={[
        { key: "cane", label: "Cane", icona: "dog" },
        { key: "gatto", label: "Gatto", icona: "cat" },
        { key: "altro", label: "Altro", icona: "paw-outline" },
      ]}
      placeholderNome="Nome (es. Luna)"
      messaggioVuoto={"Nessun animale. Aggiungi i tuoi amici pelosi: vaccini, antiparassitari e visite sotto controllo 🐾"}
    />
  );
}
