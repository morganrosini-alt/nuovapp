// src/app/piante.tsx — modulo premium Piante
// Annaffiatura e cura: "da annaffiare" quando è passato più tempo della
// frequenza, promemoria automatico alle 9:00 del giorno dovuto.

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import Icona from "../components/Icona";
import { creaServizio } from "../services/crud";
import { useHousehold } from "../hooks/useHousehold";
import { useAuth } from "../hooks/useAuth";
import { Pianta } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import { prossimaAnnaffiatura } from "../utils/scadenze";
import { colors, radius, shadow, fonts } from "../theme";

const servizio = creaServizio<Pianta>("piante");

/** "oggi", "ieri", "3 giorni fa" — più immediato di una data. */
function giorniDa(ts: number): string {
  const g = Math.floor((Date.now() - ts) / GIORNO);
  if (g <= 0) return "oggi";
  if (g === 1) return "ieri";
  return `${g} giorni fa`;
}
const GIORNO = 24 * 3600e3;

export default function PianteScreen() {
  const { profile } = useHousehold();
  const { user } = useAuth();
  const householdId = profile?.householdId ?? null;

  const [piante, setPiante] = useState<Pianta[]>([]);
  const [composerAperto, setComposerAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [giorni, setGiorni] = useState("3");

  useEffect(() => {
    if (!householdId) return;
    return servizio.ascolta(householdId, setPiante);
  }, [householdId]);

  const ordinate = useMemo(
    () => [...piante].sort((a, b) => prossimaAnnaffiatura(a) - prossimaAnnaffiatura(b)),
    [piante]
  );

  async function crea() {
    const g = parseInt(giorni, 10);
    if (!nome.trim() || !g || g <= 0 || !householdId) return;
    await servizio.crea({
      householdId, nome: nome.trim(), frequenzaGiorni: g, ultimaAnnaffiatura: Date.now(),
    } as any);
    setNome(""); setGiorni("3"); setComposerAperto(false);
  }

  async function annaffia(p: Pianta) {
    await servizio.aggiorna(p.id, {
      ultimaAnnaffiatura: Date.now(),
      ultimaAnnaffiaturaChi: user?.uid,
      ultimaAnnaffiaturaNome: profile?.displayName?.split(" ")[0] ?? "Qualcuno",
    } as any);
  }

  function chiediElimina(p: Pianta) {
    Alert.alert("Eliminare la pianta?", p.nome, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => servizio.elimina(p.id) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader
        titolo="Piante"
        destra={
          <TouchableOpacity style={styles.bottonePiu} onPress={() => setComposerAperto(!composerAperto)}>
            <Icona name={composerAperto ? "close" : "plus"} size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {composerAperto && (
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder="Pianta (es. Monstera del salotto)"
            placeholderTextColor={colors.muted} value={nome} onChangeText={setNome} />
          <View style={styles.rigaGiorni}>
            <Text style={styles.labelGiorni}>Annaffiare ogni</Text>
            <TextInput style={styles.inputGiorni} keyboardType="number-pad"
              value={giorni} onChangeText={setGiorni} maxLength={2} />
            <Text style={styles.labelGiorni}>giorni</Text>
          </View>
          <TouchableOpacity style={styles.bottoneSalva} onPress={crea}>
            <Text style={styles.bottoneSalvaTesto}>Aggiungi pianta</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={ordinate}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          <Text style={styles.vuoto}>Nessuna pianta. Il pollice verde inizia da un promemoria 🌱</Text>
        }
        renderItem={({ item }) => {
          const dovuta = prossimaAnnaffiatura(item);
          const daFare = dovuta <= Date.now();
          const giorniMancanti = Math.ceil((dovuta - Date.now()) / GIORNO);
          return (
            <TouchableOpacity style={styles.card} onLongPress={() => chiediElimina(item)} activeOpacity={0.9}>
              <View style={styles.iconChip}>
                <Icona name="sprout-outline" size={20}
                  color={daFare ? colors.danger : colors.accentDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomePianta}>{item.nome}</Text>
                <Text style={[styles.stato, daFare && styles.statoUrgente]}>
                  {daFare ? "Da annaffiare! 💧" : `Tra ${giorniMancanti} gg · ogni ${item.frequenzaGiorni}`}
                </Text>
                {/* Chi e quando: evita che due persone annaffino lo stesso
                    giorno pensando che l'altro se ne fosse dimenticato. */}
                {item.ultimaAnnaffiaturaNome && (
                  <Text style={styles.ultimaVolta}>
                    Ultima:{" "}
                    {item.ultimaAnnaffiaturaChi === user?.uid ? "tu" : item.ultimaAnnaffiaturaNome}
                    {" · "}
                    {giorniDa(item.ultimaAnnaffiatura)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.bottoneAcqua, !daFare && styles.bottoneAcquaSoft]}
                onPress={() => annaffia(item)}
              >
                <Icona name="water" size={18} color={daFare ? "#fff" : colors.accentDark} />
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
      />
      <Text style={styles.suggerimento}>Tocca la goccia dopo aver annaffiato · tieni premuto per eliminare</Text>
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
  rigaGiorni: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelGiorni: { fontSize: 15, color: colors.ink },
  inputGiorni: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: colors.ink,
    width: 60, textAlign: "center",
  },
  bottoneSalva: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  bottoneSalvaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700" },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14,
    marginBottom: 8, ...shadow.card,
  },
  iconChip: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft,
    alignItems: "center", justifyContent: "center",
  },
  nomePianta: { fontSize: 15, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  stato: { fontSize: 13, color: colors.muted, marginTop: 2 },
  statoUrgente: { color: colors.danger, fontFamily: fonts.bold, fontWeight: "700" },
  bottoneAcqua: {
    backgroundColor: colors.accent, borderRadius: radius.sm,
    width: 40, height: 40, alignItems: "center", justifyContent: "center",
  },
  bottoneAcquaSoft: { backgroundColor: colors.accentSoft },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40, lineHeight: 20 },
  ultimaVolta: { fontSize: 12, fontFamily: fonts.regular, color: colors.muted, marginTop: 2 },
  suggerimento: { color: colors.muted, fontSize: 11, textAlign: "center", paddingBottom: 12 },
});
