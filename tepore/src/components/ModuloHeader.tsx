// src/components/ModuloHeader.tsx
// Header standard dei moduli: bottone indietro, titolo centrato, slot destro.

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { router } from "expo-router";
import { colors, radius, fonts } from "../theme";

type Props = {
  titolo: string;
  destra?: React.ReactNode;   // es. bottone "+" o "Tipi"
  backLabel?: string;
};

export default function ModuloHeader({ titolo, destra, backLabel = "‹ Indietro" }: Props) {
  return (
    <View style={styles.header}>
      <TouchableOpacity style={styles.bottone} onPress={() => router.back()}>
        <Text style={styles.bottoneTesto}>{backLabel}</Text>
      </TouchableOpacity>
      <Text style={styles.titolo} numberOfLines={1}>{titolo}</Text>
      <View style={styles.destra}>{destra ?? null}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12, gap: 8,
  },
  bottone: {
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingVertical: 8, paddingHorizontal: 12, width: 90, alignItems: "center",
  },
  bottoneTesto: { color: "#fff", fontFamily: fonts.semibold, fontWeight: "600", fontSize: 14 },
  titolo: { flex: 1, fontSize: 20, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink, textAlign: "center" },
  destra: { width: 90, alignItems: "flex-end" },
});
