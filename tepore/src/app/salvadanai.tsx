// src/app/salvadanai.tsx — M5
// Obiettivi di risparmio condivisi (casa o coppia) con contributi per membro.

import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import Icona from "../components/Icona";
import { db } from "../services/firebase";
import { ascoltaContenutiScoped } from "../services/scoped";
import { ascoltaRelazioniCasa, miaRelazione } from "../services/relationships";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { Relationship, Salvadanaio } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import { colors, radius, shadow, fonts } from "../theme";

const euro = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

export default function SalvadanaiScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [salvadanai, setSalvadanai] = useState<Salvadanaio[]>([]);
  const [relazioni, setRelazioni] = useState<Relationship[]>([]);
  const [composerAperto, setComposerAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [target, setTarget] = useState("");
  const [perCoppia, setPerCoppia] = useState(false);
  const [importoContributo, setImportoContributo] = useState<Record<string, string>>({});

  const rel = user ? miaRelazione(relazioni, user.uid) : null;
  const relConfermata = rel?.stato === "confermata" ? rel : null;

  useEffect(() => {
    if (!householdId) return;
    return ascoltaRelazioniCasa(householdId, setRelazioni);
  }, [householdId]);

  useEffect(() => {
    if (!householdId || !user) return;
    return ascoltaContenutiScoped<Salvadanaio>(
      "salvadanai", householdId, user.uid, relConfermata?.id ?? null, setSalvadanai
    );
  }, [householdId, user?.uid, relConfermata?.id]);

  async function crea() {
    const t = parseFloat(target.replace(",", "."));
    if (!nome.trim() || !t || t <= 0 || !householdId || !user) return;
    await addDoc(collection(db, "salvadanai"), {
      householdId,
      nome: nome.trim(),
      importoTarget: t,
      contributi: [],
      visibilita: perCoppia && relConfermata ? "coppia" : "household",
      ...(perCoppia && relConfermata ? { relationshipId: relConfermata.id } : {}),
      autore: user.uid,
      createdAt: Date.now(),
    });
    setNome(""); setTarget(""); setPerCoppia(false); setComposerAperto(false);
  }

  async function contribuisci(s: Salvadanaio) {
    const raw = importoContributo[s.id] ?? "";
    const imp = parseFloat(raw.replace(",", "."));
    if (!imp || imp <= 0 || !user) return;
    await updateDoc(doc(db, "salvadanai", s.id), {
      contributi: [...(s.contributi ?? []), { uid: user.uid, importo: imp, data: Date.now() }],
    });
    setImportoContributo((m) => ({ ...m, [s.id]: "" }));
  }

  function chiediElimina(s: Salvadanaio) {
    if (s.autore !== user?.uid) return;
    Alert.alert("Eliminare il salvadanaio?", `"${s.nome}" e i suoi contributi registrati spariranno.`, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => deleteDoc(doc(db, "salvadanai", s.id)) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader
        titolo="Salvadanai"
        destra={
          <TouchableOpacity style={styles.bottonePiu} onPress={() => setComposerAperto(!composerAperto)}>
            <Icona name={composerAperto ? "close" : "plus"} size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {composerAperto && (
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder="Obiettivo (es. Vacanza 2027)"
            placeholderTextColor={colors.muted} value={nome} onChangeText={setNome} />
          <TextInput style={styles.input} placeholder="Traguardo in € (es. 3000)"
            placeholderTextColor={colors.muted} keyboardType="decimal-pad"
            value={target} onChangeText={setTarget} />
          {relConfermata && (
            <TouchableOpacity style={styles.rigaCheck} onPress={() => setPerCoppia(!perCoppia)}>
              <Icona
                name={perCoppia ? "checkbox-marked-outline" : "checkbox-blank-outline"}
                size={20} color={perCoppia ? colors.intimate : colors.muted} />
              <Text style={styles.rigaCheckTesto}>Solo per la coppia (invisibile agli altri membri)</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.bottoneSalva} onPress={crea}>
            <Text style={styles.bottoneSalvaTesto}>Crea salvadanaio</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={[...salvadanai].sort((a, b) => b.createdAt - a.createdAt)}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          <Text style={styles.vuoto}>
            Nessun salvadanaio. Creane uno per risparmiare insieme verso un obiettivo 🎯
          </Text>
        }
        renderItem={({ item }) => {
          const totale = (item.contributi ?? []).reduce((s, c) => s + c.importo, 0);
          const perc = Math.min(100, Math.round((totale / item.importoTarget) * 100));
          const mio = (item.contributi ?? [])
            .filter((c) => c.uid === user?.uid)
            .reduce((s, c) => s + c.importo, 0);
          return (
            <TouchableOpacity style={styles.card} onLongPress={() => chiediElimina(item)} activeOpacity={0.9}>
              <View style={styles.cardHeader}>
                <Text style={styles.nomeSalva}>{item.nome}</Text>
                {item.visibilita === "coppia" && (
                  <Icona name="heart" size={16} color={colors.intimate} />
                )}
              </View>
              <View style={styles.barraSfondo}>
                <View style={[styles.barraPieno, { width: `${perc}%` },
                  perc >= 100 && { backgroundColor: colors.success }]} />
              </View>
              <Text style={styles.progresso}>
                {euro(totale)} / {euro(item.importoTarget)} · {perc}%
                {mio > 0 ? `  (tu: ${euro(mio)})` : ""}
              </Text>
              <View style={styles.rigaContrib}>
                <TextInput
                  style={styles.inputContrib}
                  placeholder="€"
                  placeholderTextColor={colors.muted}
                  keyboardType="decimal-pad"
                  value={importoContributo[item.id] ?? ""}
                  onChangeText={(t) => setImportoContributo((m) => ({ ...m, [item.id]: t }))}
                />
                <TouchableOpacity style={styles.bottoneContrib} onPress={() => contribuisci(item)}>
                  <Text style={styles.bottoneContribTesto}>Aggiungi</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        }}
      />
      <Text style={styles.suggerimento}>Tieni premuto un tuo salvadanaio per eliminarlo</Text>
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
  rigaCheck: { flexDirection: "row", alignItems: "center", gap: 8 },
  rigaCheckTesto: { fontSize: 13, color: colors.ink, flex: 1 },
  bottoneSalva: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 12, alignItems: "center",
  },
  bottoneSalvaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700" },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14,
    marginBottom: 10, gap: 8, ...shadow.card,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nomeSalva: { fontSize: 16, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  barraSfondo: { height: 10, borderRadius: 5, backgroundColor: colors.chipNeutral, overflow: "hidden" },
  barraPieno: { height: "100%", backgroundColor: colors.accent, borderRadius: 5 },
  progresso: { fontSize: 13, color: colors.muted },
  rigaContrib: { flexDirection: "row", gap: 8 },
  inputContrib: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: colors.ink,
  },
  bottoneContrib: {
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingHorizontal: 16, justifyContent: "center",
  },
  bottoneContribTesto: { color: "#fff", fontFamily: fonts.semibold, fontWeight: "600", fontSize: 13 },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40, lineHeight: 20 },
  suggerimento: { color: colors.muted, fontSize: 11, textAlign: "center", paddingBottom: 12 },
});
