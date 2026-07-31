// src/app/paywall.tsx — M8
// Sblocco dei Moduli Aggiuntivi via RevenueCat. Se le chiavi non sono ancora
// configurate (dashboard RevenueCat + .env + variabili EAS), la schermata lo
// dice con garbo invece di rompersi. Include il "Ripristina acquisti"
// (obbligatorio per le linee guida Apple).

import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import Icona from "../components/Icona";
import { getOfferte, acquista, ripristinaAcquisti } from "../services/purchases";
import { usePremium } from "../hooks/usePremium";
import ModuloHeader from "../components/ModuloHeader";
import { colors, radius, shadow, fonts } from "../theme";

const MODULI_INFO = [
  { icona: "car-outline", nome: "Veicoli", desc: "Bollo, assicurazione, revisione, tagliandi — per auto, moto e bici" },
  { icona: "paw-outline", nome: "Animali", desc: "Vaccini, antiparassitari, visite e spese dei tuoi animali" },
  { icona: "sprout-outline", nome: "Piante", desc: "Promemoria di annaffiatura e cura" },
  { icona: "chart-bar", nome: "Statistiche", desc: "Andamento spese, grafici e report esportabili" },
];

export default function PaywallScreen() {
  const { sbloccati, refresh } = usePremium();
  const [offerta, setOfferta] = useState<any | null>(null);
  const [caricamento, setCaricamento] = useState(true);
  const [inAcquisto, setInAcquisto] = useState(false);

  useEffect(() => {
    (async () => {
      setOfferta(await getOfferte());
      setCaricamento(false);
    })();
  }, []);

  async function compra(pkg: any) {
    setInAcquisto(true);
    try {
      await acquista(pkg);
      await refresh();
      Alert.alert("Fatto! 🎉", "Modulo sbloccato. Buon divertimento!");
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert("Ops", "Acquisto non riuscito. Riprova.");
    } finally {
      setInAcquisto(false);
    }
  }

  async function ripristina() {
    setInAcquisto(true);
    try {
      await ripristinaAcquisti();
      await refresh();
      Alert.alert("Ripristino completato", "Gli acquisti precedenti sono stati recuperati.");
    } finally {
      setInAcquisto(false);
    }
  }

  return (
    <View style={styles.container}>
      <ModuloHeader titolo="Moduli Aggiuntivi" />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 10 }}>
        <Text style={styles.intro}>
          Tepore è gratis per tutto ciò che conta ogni giorno. I moduli qui sotto
          sono extra una tantum — li paghi una volta, tuoi per sempre.
        </Text>

        {MODULI_INFO.map((m) => (
          <View key={m.nome} style={styles.cardModulo}>
            <View style={styles.iconChip}>
              <Icona name={m.icona as any} size={20} color={colors.accentDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nomeModulo}>{m.nome}</Text>
              <Text style={styles.descModulo}>{m.desc}</Text>
            </View>
            {sbloccati.has(m.nome.toLowerCase() as any) && (
              <Icona name="check-circle" size={22} color={colors.successInk} />
            )}
          </View>
        ))}

        {caricamento ? (
          <ActivityIndicator size="large" color={colors.accent} style={{ marginTop: 20 }} />
        ) : offerta?.availablePackages?.length ? (
          <>
            <Text style={styles.sezioneAcquisti}>Scegli cosa sbloccare</Text>
            {offerta.availablePackages.map((pkg: any) => (
              <TouchableOpacity
                key={pkg.identifier}
                style={styles.bottoneAcquisto}
                onPress={() => compra(pkg)}
                disabled={inAcquisto}
              >
                <Text style={styles.bottoneAcquistoNome}>
                  {pkg.product?.title?.replace(/\s*\(.*\)$/, "") ?? pkg.identifier}
                </Text>
                <Text style={styles.bottoneAcquistoPrezzo}>{pkg.product?.priceString ?? ""}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <View style={styles.avvisoConfig}>
            <Icona name="storefront-outline" size={22} color={colors.muted} />
            <Text style={styles.avvisoConfigTesto}>
              Gli acquisti saranno disponibili a breve — il negozio è in fase di
              configurazione. Tutti i moduli gratuiti sono già completamente attivi.
            </Text>
          </View>
        )}

        <TouchableOpacity onPress={ripristina} disabled={inAcquisto}>
          <Text style={styles.linkRipristina}>Ripristina acquisti precedenti</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  intro: { fontSize: 14, color: colors.muted, lineHeight: 20 },
  cardModulo: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, ...shadow.card,
  },
  iconChip: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft,
    alignItems: "center", justifyContent: "center",
  },
  nomeModulo: { fontSize: 15, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  descModulo: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 },
  sezioneAcquisti: { fontSize: 14, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink, marginTop: 10 },
  bottoneAcquisto: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 14, paddingHorizontal: 16,
  },
  bottoneAcquistoNome: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700", fontSize: 15 },
  bottoneAcquistoPrezzo: { color: "#fff", fontFamily: fonts.extrabold, fontWeight: "800", fontSize: 15 },
  avvisoConfig: {
    flexDirection: "row", gap: 10, alignItems: "center",
    backgroundColor: colors.chipNeutral, borderRadius: radius.md, padding: 14, marginTop: 10,
  },
  avvisoConfigTesto: { flex: 1, fontSize: 13, color: colors.muted, lineHeight: 18 },
  linkRipristina: {
    color: colors.accentDark, fontFamily: fonts.semibold, fontWeight: "600", textAlign: "center",
    marginTop: 14, marginBottom: 30, fontSize: 13,
  },
});
