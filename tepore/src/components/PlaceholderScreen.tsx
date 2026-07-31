// src/components/PlaceholderScreen.tsx
//
// Schermata "segnaposto" riutilizzabile: la usiamo per tutti i moduli che
// non abbiamo ancora costruito davvero. Mostra solo un titolo e un messaggio,
// con un pulsante per tornare indietro. La sostituiremo modulo per modulo
// con la schermata vera (bollette, pulizie, ecc.) man mano che le costruiamo.

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { fonts } from "../theme";

type Props = {
  title: string;
  emoji: string;
};

export default function PlaceholderScreen({ title, emoji }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>
        Questa sezione è in costruzione. Torneremo presto a completarla!
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Torna alla Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FA",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontFamily: fonts.bold, fontWeight: "700",
    color: "#2F4858",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6C7A85",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  button: {
    backgroundColor: "#336699",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
});
