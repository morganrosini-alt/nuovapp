// src/theme/font.ts
//
// Nunito ovunque, senza dover toccare ogni singolo <Text> dell'app.
//
// PERCHÉ SERVE QUESTO FILE: in React Native il font NON si eredita come sul
// web, e con i font personalizzati il `fontWeight` da solo non basta —
// su Android ogni peso è una famiglia a sé ("Nunito_700Bold"). Qui
// intercettiamo il render di Text/TextInput una volta sola e scegliamo la
// famiglia giusta in base al peso già scritto negli stili esistenti.

import React from "react";
import { Text, TextInput, StyleSheet } from "react-native";

/** peso numerico/parola -> famiglia reale caricata da expo-google-fonts */
const FAMIGLIA: Record<string, string> = {
  "300": "Nunito_300Light",
  "400": "Nunito_400Regular",
  normal: "Nunito_400Regular",
  "500": "Nunito_500Medium",
  "600": "Nunito_600SemiBold",
  "700": "Nunito_700Bold",
  bold: "Nunito_700Bold",
  "800": "Nunito_800ExtraBold",
  "900": "Nunito_900Black",
};

function famigliaPerStile(style: any): string {
  const piatto = StyleSheet.flatten(style) || {};
  // se qualcuno ha già indicato un font specifico, lo rispettiamo
  if (piatto.fontFamily) return piatto.fontFamily;
  const peso = String(piatto.fontWeight ?? "400");
  return FAMIGLIA[peso] ?? FAMIGLIA["400"];
}

let applicato = false;

/**
 * Da chiamare UNA volta, dopo che i font sono stati caricati.
 * Se in futuro questa tecnica dovesse rompersi con un aggiornamento di
 * React Native, il ripiego è aggiungere `fontFamily` negli StyleSheet.
 */
export function applicaFontGlobale() {
  if (applicato) return;
  applicato = true;

  for (const Componente of [Text, TextInput] as any[]) {
    const renderOriginale = Componente.render;
    if (typeof renderOriginale !== "function") continue;
    Componente.render = function (...args: any[]) {
      const elemento = renderOriginale.apply(this, args);
      return React.cloneElement(elemento, {
        style: [{ fontFamily: famigliaPerStile(elemento.props?.style) }, elemento.props?.style],
      });
    };
  }
}
