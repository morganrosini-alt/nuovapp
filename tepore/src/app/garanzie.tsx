// src/app/garanzie.tsx — M7
// Garanzie di elettrodomestici/dispositivi: scadenza ben visibile,
// promemoria automatico 30 e 7 giorni prima (via motore promemoria).

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import Icona from "../components/Icona";
import { creaServizio } from "../services/crud";
import { useHousehold } from "../hooks/useHousehold";
import { Garanzia } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import CampoData from "../components/CampoData";
import { colors, radius, shadow, fonts } from "../theme";

const servizio = creaServizio<Garanzia>("garanzie");
const GIORNO = 24 * 3600e3;

export default function GaranzieScreen() {
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [garanzie, setGaranzie] = useState<Garanzia[]>([]);
  const [composerAperto, setComposerAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [scadenza, setScadenza] = useState(new Date(Date.now() + 365 * GIORNO));

  useEffect(() => {
    if (!householdId) return;
    return servizio.ascolta(householdId, setGaranzie);
  }, [householdId]);

  const ordinate = useMemo(
    () => [...garanzie].sort((a, b) => a.scadenza - b.scadenza),
    [garanzie]
  );

  async function crea() {
    if (!nome.trim() || !householdId) return;
    await servizio.crea({ householdId, nome: nome.trim(), scadenza: scadenza.getTime() } as any);
    setNome(""); setComposerAperto(false);
  }

  function chiediElimina(g: Garanzia) {
    Alert.alert("Eliminare la garanzia?", g.nome, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => servizio.elimina(g.id) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader
        titolo="Garanzie"
        destra={
          <TouchableOpacity style={styles.bottonePiu} onPress={() => setComposerAperto(!composerAperto)}>
            <Icona name={composerAperto ? "close" : "plus"} size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {composerAperto && (
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder="Dispositivo (es. Lavatrice Bosch)"
            placeholderTextColor={colors.muted} value={nome} onChangeText={setNome} />
          <CampoData label="Scadenza garanzia" valore={scadenza} onChange={setScadenza} />
          <TouchableOpacity style={styles.bottoneSalva} onPress={crea}>
            <Text style={styles.bottoneSalvaTesto}>Aggiungi garanzia</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={ordinate}
        keyExtractor={(g) => g.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          <Text style={styles.vuoto}>
            Nessuna garanzia salvata. Ti avviseremo 30 e 7 giorni prima della scadenza 🛡️
          </Text>
        }
        renderItem={({ item }) => {
          const giorni = Math.ceil((item.scadenza - Date.now()) / GIORNO);
          const scaduta = giorni < 0;
          const inScadenza = !scaduta && giorni <= 30;
          return (
            <TouchableOpacity style={styles.card} onLongPress={() => chiediElimina(item)} activeOpacity={0.9}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomeGaranzia}>{item.nome}</Text>
                <Text style={styles.dataScad}>
                  {new Date(item.scadenza).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                </Text>
              </View>
              {scaduta ? (
                <Text style={styles.badgeScaduta}>SCADUTA</Text>
              ) : (
                <Text style={[styles.badgeGiorni, inScadenza && styles.badgeUrgente]}>
                  {giorni} gg
                </Text>
              )}
            </TouchableOpacity>
          );
        }}
      />
      <Text style={styles.suggerimento}>Tieni premuta una garanzia per eliminarla</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bottonePiu: {
    backgroundColor: colors.accent, borderRadius: radius.sm,
    width: 38, height: 38, alignItems: "center", justifyContent: "center",
  },
  composer: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14,
    marginHorizontal: 16, marginBottom: 8, gap: 10, ...shadow.card,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink,
  },
  bottoneSalva: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  bottoneSalvaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700" },
  card: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14,
    marginBottom: 8, ...shadow.card,
  },
  nomeGaranzia: { fontSize: 15, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  dataScad: { fontSize: 13, color: colors.muted, marginTop: 2 },
  badgeGiorni: {
    fontSize: 13, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.accentDark,
    backgroundColor: colors.accentSoft, borderRadius: 999,
    paddingVertical: 4, paddingHorizontal: 10, overflow: "hidden",
  },
  badgeUrgente: { color: "#fff", backgroundColor: colors.danger },
  badgeScaduta: {
    fontSize: 12, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.danger,
  },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40, lineHeight: 20 },
  suggerimento: { color: colors.muted, fontSize: 11, textAlign: "center", paddingBottom: 12 },
});
