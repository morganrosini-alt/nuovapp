// src/app/_layout.tsx

import React, { useEffect } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import { HouseholdProvider, useHousehold } from "../hooks/useHousehold";
import { registraPushToken } from "../services/notifications";
import { ensureKeypair } from "../services/crypto";
import { initPurchases } from "../services/purchases";

function RootNavigation() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isHouseholdLoading } = useHousehold();
  const router = useRouter();
  const segments = useSegments();

  const isLoading = isAuthLoading || (user != null && isHouseholdLoading);

  // Al login: registra il token push, garantisce l'identità E2E (chiavi
  // per la Zona Intima) e inizializza gli acquisti. Tutto best-effort:
  // se una di queste fallisce (offline, permesso negato), l'app va avanti.
  useEffect(() => {
    if (!user) return;
    registraPushToken(user.uid).catch(() => {});
    ensureKeypair(user.uid).catch(() => {});
    initPurchases(user.uid).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (isLoading) return;

    const currentScreen = segments[0];
    const isOnLoginScreen = currentScreen === "login";
    const isOnHouseholdSetupScreen = currentScreen === "household-setup";

    if (!user) {
      if (!isOnLoginScreen) {
        router.replace("/login");
      }
      return;
    }

    const hasHousehold = profile?.householdId != null;

    if (!hasHousehold && !isOnHouseholdSetupScreen) {
      // Primo accesso: nessuna casa ancora -> portalo alla creazione forzata
      router.replace("/household-setup");
    } else if (hasHousehold && isOnLoginScreen) {
      // Già loggato con una casa attiva, ma finito sul login -> vai alla home
      router.replace("/");
    }
    // NOTA: qui prima c'era anche "hasHousehold && isOnHouseholdSetupScreen
    // -> replace('/')", che rimandava sempre alla home chi aveva già una
    // household. L'abbiamo tolto apposta: ora household-setup è anche una
    // schermata raggiungibile volontariamente (es. "Aggiungi Casa" dal
    // profilo) e gestisce da sola la navigazione di uscita dopo il successo.
  }, [user, profile, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#D97742" />
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <HouseholdProvider>
        <RootNavigation />
      </HouseholdProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFF8F3",
  },
});
