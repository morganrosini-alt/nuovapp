// src/components/PlaceholderScreen.tsx
//
// Schermata "segnaposto" riutilizzabile: la usiamo per tutti i moduli che
// non abbiamo ancora costruito davvero. Mostra solo un titolo e un messaggio,
// con un pulsante per tornare indietro. La sostituiremo modulo per modulo
// con la schermata vera (bollette, pulizie, ecc.) man mano che le costruiamo.

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";

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
    backgroundColor: "#FFF8F3",
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
    fontWeight: "700",
    color: "#3A2E28",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#9A8A80",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  button: {
    backgroundColor: "#D97742",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
