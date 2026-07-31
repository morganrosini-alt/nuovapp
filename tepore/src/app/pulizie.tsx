// src/app/pulizie.tsx — M7
// Attività ricorrenti con frequenza e assegnatario: "da fare" quando è
// passato più tempo della frequenza dall'ultimo completamento.

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import Icona from "../components/Icona";
import { creaServizio } from "../services/crud";
import { getHousehold, getUserProfilesByIds } from "../services/household";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { Pulizia, UserProfile } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import { colors, radius, shadow, fonts } from "../theme";

const servizio = creaServizio<Pulizia>("pulizie");

const PERIODI: Record<Pulizia["frequenza"], number> = {
  giornaliera: 24 * 3600e3,
  settimanale: 7 * 24 * 3600e3,
  mensile: 30 * 24 * 3600e3,
};
const ETICHETTE: Record<Pulizia["frequenza"], string> = {
  giornaliera: "Ogni giorno", settimanale: "Ogni settimana", mensile: "Ogni mese",
};

export default function PulizieScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [attivita, setAttivita] = useState<Pulizia[]>([]);
  const [membri, setMembri] = useState<UserProfile[]>([]);
  const [composerAperto, setComposerAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [frequenza, setFrequenza] = useState<Pulizia["frequenza"]>("settimanale");
  const [assegnatario, setAssegnatario] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) return;
    const unsub = servizio.ascolta(householdId, setAttivita);
    (async () => {
      const casa = await getHousehold(householdId);
      if (casa) setMembri(await getUserProfilesByIds(casa.memberIds));
    })();
    return unsub;
  }, [householdId]);

  const nomeDi = (uid?: string | null) =>
    membri.find((m) => m.id === uid)?.displayName ?? null;

  const daFare = (p: Pulizia) =>
    !p.ultimoCompletamento || Date.now() - p.ultimoCompletamento > PERIODI[p.frequenza];

  const ordinate = useMemo(
    () => [...attivita].sort((a, b) => Number(daFare(b)) - Number(daFare(a)) || a.nome.localeCompare(b.nome)),
    [attivita]
  );

  async function crea() {
    if (!nome.trim() || !householdId) return;
    await servizio.crea({
      householdId, nome: nome.trim(), frequenza,
      assegnatarioId: assegnatario, ultimoCompletamento: null, completataDa: null,
    } as any);
    setNome(""); setAssegnatario(null); setComposerAperto(false);
  }

  function chiediElimina(p: Pulizia) {
    Alert.alert("Eliminare l'attività?", p.nome, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => servizio.elimina(p.id) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader
        titolo="Pulizie"
        destra={
          <TouchableOpacity style={styles.bottonePiu} onPress={() => setComposerAperto(!composerAperto)}>
            <Icona name={composerAperto ? "close" : "plus"} size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {composerAperto && (
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder="Attività (es. Pulire il bagno)"
            placeholderTextColor={colors.muted} value={nome} onChangeText={setNome} />
          <View style={styles.rigaChips}>
            {(Object.keys(ETICHETTE) as Pulizia["frequenza"][]).map((f) => (
              <TouchableOpacity key={f}
                style={[styles.chip, frequenza === f && styles.chipAttivo]}
                onPress={() => setFrequenza(f)}>
                <Text style={[styles.chipTesto, frequenza === f && styles.chipTestoAttivo]}>
                  {ETICHETTE[f]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.labelPiccola}>Assegnata a (facoltativo)</Text>
          <View style={styles.rigaChips}>
            {membri.map((m) => (
              <TouchableOpacity key={m.id}
                style={[styles.chip, assegnatario === m.id && styles.chipAttivo]}
                onPress={() => setAssegnatario(assegnatario === m.id ? null : m.id)}>
                <Text style={[styles.chipTesto, assegnatario === m.id && styles.chipTestoAttivo]}>
                  {m.displayName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.bottoneSalva} onPress={crea}>
            <Text style={styles.bottoneSalvaTesto}>Aggiungi attività</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={ordinate}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          <Text style={styles.vuoto}>Nessuna attività. Aggiungi le faccende ricorrenti della casa 🧹</Text>
        }
        renderItem={({ item }) => {
          const scaduta = daFare(item);
          return (
            <TouchableOpacity style={styles.card} onLongPress={() => chiediElimina(item)} activeOpacity={0.9}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomeAttivita}>{item.nome}</Text>
                <Text style={styles.dettagli}>
                  {ETICHETTE[item.frequenza]}
                  {nomeDi(item.assegnatarioId) ? ` · ${nomeDi(item.assegnatarioId)}` : ""}
                </Text>
                {item.ultimoCompletamento ? (
                  <Text style={styles.ultimo}>
                    Ultima volta: {new Date(item.ultimoCompletamento).toLocaleDateString("it-IT")}
                    {nomeDi(item.completataDa) ? ` (${nomeDi(item.completataDa)})` : ""}
                  </Text>
                ) : null}
              </View>
              {scaduta ? (
                <TouchableOpacity
                  style={styles.bottoneFatto}
                  onPress={() =>
                    servizio.aggiorna(item.id, {
                      ultimoCompletamento: Date.now(),
                      completataDa: user?.uid ?? null,
                    } as any)
                  }
                >
                  <Text style={styles.bottoneFattoTesto}>Fatta ✓</Text>
                </TouchableOpacity>
              ) : (
                <Icona name="check-circle-outline" size={26} color={colors.successInk} />
              )}
            </TouchableOpacity>
          );
        }}
      />
      <Text style={styles.suggerimento}>Tieni premuta un'attività per eliminarla</Text>
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
  labelPiccola: { fontSize: 12, color: colors.muted, fontFamily: fonts.semibold, fontWeight: "600" },
  rigaChips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: colors.chipNeutral },
  chipAttivo: { backgroundColor: colors.accent },
  chipTesto: { fontSize: 13, fontFamily: fonts.semibold, fontWeight: "600", color: colors.chipNeutralInk },
  chipTestoAttivo: { color: "#fff" },
  bottoneSalva: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  bottoneSalvaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700" },
  card: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14,
    marginBottom: 10, ...shadow.card,
  },
  nomeAttivita: { fontSize: 15, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  dettagli: { fontSize: 13, color: colors.muted, marginTop: 2 },
  ultimo: { fontSize: 12, color: colors.muted, marginTop: 2 },
  bottoneFatto: {
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  bottoneFattoTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700", fontSize: 13 },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40, lineHeight: 20 },
  suggerimento: { color: colors.muted, fontSize: 11, textAlign: "center", paddingBottom: 12 },
});
