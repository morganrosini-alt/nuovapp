// src/app/_layout.tsx
//
// Layout radice: provider, guardia di autenticazione e navigatore Stack.
// Le 4 sezioni principali vivono dentro il gruppo (tabs); ogni modulo
// (bollette, turni, salute…) è una schermata di stack che si apre sopra.
//
// ⚠️ RISCRITTO (31/07) — causa della schermata "Unmatched Route · tepore:///".
//
// Prima, durante il caricamento dei font e dell'autenticazione, questo file
// restituiva una <View> con uno spinner AL POSTO del navigatore. Ma Expo
// Router risolve l'URL iniziale dell'app al primo render: se in quel momento
// nessun navigatore è montato non esiste ancora nessuna rotta con cui
// confrontare l'URL, e il router ripiega su "Unmatched Route". Per lo stesso
// motivo i router.replace() dentro l'effetto potevano partire prima che il
// navigatore esistesse.
//
// Ora il navigatore è montato SEMPRE, dal primo render. Lo spinner è
// diventato un velo sopra al navigatore, e i redirect aspettano che il
// router sia pronto (useRootNavigationState).

import React, { useEffect } from "react";
import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
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

// Applicata subito, non dentro un componente: la patch va installata prima
// che il primo <Text> venga renderizzato, altrimenti i testi già montati
// resterebbero col font di sistema.
applicaFontGlobale();

function RootNavigation({ fontPronti }: { fontPronti: boolean }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { profile, isLoading: isHouseholdLoading } = useHousehold();

  usePromemoria(profile?.householdId, user?.uid);
  const router = useRouter();
  const segments = useSegments();
  // undefined finché il navigatore non ha finito di montarsi: navigare prima
  // di questo momento non ha effetto (o lancia un errore).
  const navigationState = useRootNavigationState();

  const isLoading = isAuthLoading || (user != null && isHouseholdLoading) || !fontPronti;

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
    if (!navigationState?.key) return; // router non ancora pronto

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
  }, [user, profile, isLoading, segments, navigationState?.key]);

  return (
    <View style={styles.riempi}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" />
        <Stack.Screen name="household-setup" />
      </Stack>

      {/* Velo di caricamento: copre il navigatore senza smontarlo. */}
      {isLoading && (
        <View style={[StyleSheet.absoluteFill, styles.caricamento]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}
    </View>
  );
}

export default function RootLayout() {
  const [fontPronti] = useFonts({
    Nunito_300Light, Nunito_400Regular, Nunito_500Medium,
    Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, Nunito_900Black,
  });

  return (
    <AuthProvider>
      <HouseholdProvider>
        <RootNavigation fontPronti={fontPronti} />
      </HouseholdProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  riempi: { flex: 1, backgroundColor: colors.background },
  caricamento: {
    justifyContent: "center", alignItems: "center",
    backgroundColor: colors.background,
  },
});
