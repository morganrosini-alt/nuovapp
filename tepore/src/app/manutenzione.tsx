// src/app/manutenzione.tsx — M7
// Manutenzioni ricorrenti (caldaia, filtri condizionatore…): prossima
// scadenza calcolata da ultima esecuzione + ricorrenza in mesi.

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import Icona from "../components/Icona";
import { creaServizio } from "../services/crud";
import { useHousehold } from "../hooks/useHousehold";
import { InterventoManutenzione } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import { prossimaManutenzione } from "../utils/scadenze";
import { colors, radius, shadow, fonts } from "../theme";

const servizio = creaServizio<InterventoManutenzione>("manutenzione");

export default function ManutenzioneScreen() {
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [interventi, setInterventi] = useState<InterventoManutenzione[]>([]);
  const [composerAperto, setComposerAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [mesi, setMesi] = useState("12");

  useEffect(() => {
    if (!householdId) return;
    return servizio.ascolta(householdId, setInterventi);
  }, [householdId]);

  const ordinati = useMemo(
    () => [...interventi].sort((a, b) => prossimaManutenzione(a) - prossimaManutenzione(b)),
    [interventi]
  );

  async function crea() {
    const m = parseInt(mesi, 10);
    if (!nome.trim() || !m || m <= 0 || !householdId) return;
    await servizio.crea({
      householdId, nome: nome.trim(), ricorrenzaMesi: m, ultimaEsecuzione: Date.now(),
    } as any);
    setNome(""); setMesi("12"); setComposerAperto(false);
  }

  function chiediElimina(m: InterventoManutenzione) {
    Alert.alert("Eliminare l'intervento?", m.nome, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => servizio.elimina(m.id) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader
        titolo="Manutenzione"
        destra={
          <TouchableOpacity style={styles.bottonePiu} onPress={() => setComposerAperto(!composerAperto)}>
            <Icona name={composerAperto ? "close" : "plus"} size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {composerAperto && (
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder="Intervento (es. Controllo caldaia)"
            placeholderTextColor={colors.muted} value={nome} onChangeText={setNome} />
          <View style={styles.rigaMesi}>
            <Text style={styles.labelMesi}>Ogni</Text>
            <TextInput style={styles.inputMesi} keyboardType="number-pad"
              value={mesi} onChangeText={setMesi} maxLength={2} />
            <Text style={styles.labelMesi}>mesi</Text>
          </View>
          <Text style={styles.nota}>La prima scadenza parte da oggi.</Text>
          <TouchableOpacity style={styles.bottoneSalva} onPress={crea}>
            <Text style={styles.bottoneSalvaTesto}>Aggiungi intervento</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={ordinati}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          <Text style={styles.vuoto}>
            Nessuna manutenzione tracciata. Caldaia, filtri, grondaie: la casa ringrazia 🔧
          </Text>
        }
        renderItem={({ item }) => {
          const prossima = prossimaManutenzione(item);
          const inRitardo = prossima < Date.now();
          return (
            <TouchableOpacity style={styles.card} onLongPress={() => chiediElimina(item)} activeOpacity={0.9}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomeInt}>{item.nome}</Text>
                <Text style={[styles.prossima, inRitardo && styles.inRitardo]}>
                  {inRitardo ? "DA FARE — era prevista il " : "Prossima: "}
                  {new Date(prossima).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                </Text>
                <Text style={styles.dettagli}>Ogni {item.ricorrenzaMesi} mesi</Text>
              </View>
              <TouchableOpacity
                style={styles.bottoneFatta}
                onPress={() => servizio.aggiorna(item.id, { ultimaEsecuzione: Date.now() } as any)}
              >
                <Text style={styles.bottoneFattaTesto}>Fatta oggi</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
      <Text style={styles.suggerimento}>Tieni premuto un intervento per eliminarlo</Text>
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
  rigaMesi: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelMesi: { fontSize: 15, color: colors.ink },
  inputMesi: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: colors.ink,
    width: 60, textAlign: "center",
  },
  nota: { fontSize: 12, color: colors.muted },
  bottoneSalva: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  bottoneSalvaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700" },
  card: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14,
    marginBottom: 8, ...shadow.card,
  },
  nomeInt: { fontSize: 15, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  prossima: { fontSize: 13, color: colors.muted, marginTop: 2 },
  inRitardo: { color: colors.danger, fontFamily: fonts.bold, fontWeight: "700" },
  dettagli: { fontSize: 12, color: colors.muted, marginTop: 1 },
  bottoneFatta: {
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  bottoneFattaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700", fontSize: 12 },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40, lineHeight: 20 },
  suggerimento: { color: colors.muted, fontSize: 11, textAlign: "center", paddingBottom: 12 },
});
