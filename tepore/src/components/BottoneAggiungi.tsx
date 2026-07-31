// src/components/BottoneAggiungi.tsx
//
// Il bottone "+" dell'app. Due scelte precise:
//
// 1. LA CROCE è disegnata con due barre, non presa da un set di icone: le
//    icone "plus" hanno il tratto sottile, mentre qui serviva la croce piena
//    e spessa in stile insegna di farmacia — riconoscibile a colpo d'occhio.
// 2. LA POSIZIONE è ancorata allo SCHERMO, non al contenuto: sta sopra la
//    tab bar, in basso a destra, dove non copre mai le attività del giorno.
//    (Prima era agganciato alla card dei promemoria e finiva sopra le voci.)

import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { colors, shadow } from "../theme";

type Props = {
  onPress: () => void;
  /** distanza dal fondo: più alta nelle schermate con tab bar */
  bottom?: number;
  colore?: string;
};

export default function BottoneAggiungi({ onPress, bottom = 100, colore = colors.accent }: Props) {
  return (
    <TouchableOpacity
      style={[styles.bottone, { bottom, backgroundColor: colore }]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Aggiungi"
    >
      <View style={styles.croce}>
        <View style={styles.barraOrizzontale} />
        <View style={styles.barraVerticale} />
      </View>
    </TouchableOpacity>
  );
}

const SPESSORE = 6;   // spessore delle barre: la croce da farmacia è piena
const LUNGHEZZA = 24;

const styles = StyleSheet.create({
  bottone: {
    position: "absolute",
    right: 18,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: "center",
    justifyContent: "center",
    ...shadow.alta,
  },
  croce: { width: LUNGHEZZA, height: LUNGHEZZA, alignItems: "center", justifyContent: "center" },
  barraOrizzontale: {
    position: "absolute",
    width: LUNGHEZZA,
    height: SPESSORE,
    borderRadius: SPESSORE / 2,
    backgroundColor: "#fff",
  },
  barraVerticale: {
    position: "absolute",
    width: SPESSORE,
    height: LUNGHEZZA,
    borderRadius: SPESSORE / 2,
    backgroundColor: "#fff",
  },
});
