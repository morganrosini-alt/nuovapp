// src/app/_layout.tsx
//
// Layout radice: provider, guardia di autenticazione e navigatore Stack.
// Le 4 sezioni principali vivono dentro il gruppo (tabs); ogni modulo
// (bollette, turni, salute…) è una schermata di stack che si apre sopra.

import React, { useEffect } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import {
  useFonts,
  Nunito_300Light, Nunito_400Regular, Nunito_500Medium,
  Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
} from "@expo-google-fonts/nunito";
import { applicaFontGlobale } from "../theme/font";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import { HouseholdProvider, useHousehold } from "../hooks/useHousehold";
import { registraPushToken } from "../services/notifications";
import { usePromemoria } from "../hooks/usePromemoria";
import { ensureKeypair } from "../services/crypto";
import { initPurchases } from "../services/purchases";
import { colors } from "../theme";

function RootNavigation() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isHouseholdLoading } = useHousehold();

  usePromemoria(profile?.householdId, user?.uid);
  const router = useRouter();
  const segments = useSegments();

  const isLoading = isAuthLoading || (user != null && isHouseholdLoading);

  // Al login: token push, identità E2E e acquisti. Best-effort: se una di
  // queste fallisce (offline, permesso negato), l'app prosegue comunque.
  useEffect(() => {
    if (!user) return;
    registraPushToken(user.uid).catch(() => {});
    ensureKeypair(user.uid).catch(() => {});
    initPurchases(user.uid).catch(() => {});
  }, [user?.uid]);

  useEffect(() => {
    if (isLoading) return;

    const primo = segments[0];
    const suLogin = primo === "login";
    const suSetup = primo === "household-setup";

    if (!user) {
      if (!suLogin) router.replace("/login");
      return;
    }
    const haCasa = profile?.householdId != null;
    if (!haCasa && !suSetup) {
      router.replace("/household-setup");
    } else if (haCasa && suLogin) {
      router.replace("/");
    }
  }, [user, profile, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={styles.caricamento}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="login" />
      <Stack.Screen name="household-setup" />
    </Stack>
  );
}

export default function RootLayout() {
  // Nunito: caricato una volta all'avvio. Finché non è pronto mostriamo lo
  // spinner, altrimenti il testo comparirebbe col font di sistema per un
  // istante e poi "salterebbe" — l'effetto è sgradevole.
  const [fontPronti] = useFonts({
    Nunito_300Light, Nunito_400Regular, Nunito_500Medium,
    Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
  });

  if (!fontPronti) {
    return (
      <View style={styles.caricamento}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  applicaFontGlobale();

  return (
    <AuthProvider>
      <HouseholdProvider>
        <RootNavigation />
      </HouseholdProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  caricamento: {
    flex: 1, justifyContent: "center", alignItems: "center",
    backgroundColor: colors.background,
  },
});
