// src/app/spese.tsx — M5/M7
// Portfolio spese della casa: voci con categoria e visibilità (casa/coppia/
// solo io), raggruppate per mese con totale. Lettura via query scoped.

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, SectionList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { addDoc, collection, deleteDoc, doc } from "firebase/firestore";
import Icona from "../components/Icona";
import { db } from "../services/firebase";
import { ascoltaContenutiScoped } from "../services/scoped";
import { ascoltaRelazioniCasa, miaRelazione } from "../services/relationships";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { Relationship, VisibilitaContenuto, VoceSpesa } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import { colors, radius, shadow, fonts } from "../theme";

const CATEGORIE: Array<{ key: VoceSpesa["categoria"]; label: string; icona: string }> = [
  { key: "spesa", label: "Spesa", icona: "cart-outline" },
  { key: "casa", label: "Casa", icona: "home-outline" },
  { key: "salute", label: "Salute", icona: "medical-bag" },
  { key: "svago", label: "Svago", icona: "party-popper" },
  { key: "altro", label: "Altro", icona: "dots-horizontal" },
];
const VISIBILITA: Record<VisibilitaContenuto, string> = {
  household: "Casa", coppia: "Coppia", personale: "Solo io",
};
const euro = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

export default function SpeseScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [voci, setVoci] = useState<VoceSpesa[]>([]);
  const [relazioni, setRelazioni] = useState<Relationship[]>([]);
  const [composerAperto, setComposerAperto] = useState(false);
  const [titolo, setTitolo] = useState("");
  const [importo, setImporto] = useState("");
  const [categoria, setCategoria] = useState<VoceSpesa["categoria"]>("spesa");
  const [visibilita, setVisibilita] = useState<VisibilitaContenuto>("household");

  const rel = user ? miaRelazione(relazioni, user.uid) : null;
  const relConfermata = rel?.stato === "confermata" ? rel : null;

  useEffect(() => {
    if (!householdId) return;
    return ascoltaRelazioniCasa(householdId, setRelazioni);
  }, [householdId]);

  useEffect(() => {
    if (!householdId || !user) return;
    return ascoltaContenutiScoped<VoceSpesa>(
      "spese", householdId, user.uid, relConfermata?.id ?? null, setVoci
    );
  }, [householdId, user?.uid, relConfermata?.id]);

  const sezioni = useMemo(() => {
    const ordinate = [...voci].sort((a, b) => b.data - a.data);
    const gruppi = new Map<string, VoceSpesa[]>();
    for (const v of ordinate) {
      const chiave = new Date(v.data).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
      gruppi.set(chiave, [...(gruppi.get(chiave) ?? []), v]);
    }
    return [...gruppi.entries()].map(([mese, data]) => ({
      title: `${mese} — ${euro(data.reduce((s, v) => s + v.importo, 0))}`,
      data,
    }));
  }, [voci]);

  async function salva() {
    const imp = parseFloat(importo.replace(",", "."));
    if (!titolo.trim() || !imp || imp <= 0 || !householdId || !user) return;
    await addDoc(collection(db, "spese"), {
      householdId,
      titolo: titolo.trim(),
      importo: imp,
      categoria,
      data: Date.now(),
      visibilita,
      ...(visibilita === "coppia" && relConfermata ? { relationshipId: relConfermata.id } : {}),
      autore: user.uid,
      createdAt: Date.now(),
    });
    setTitolo(""); setImporto(""); setComposerAperto(false);
  }

  function chiediElimina(v: VoceSpesa) {
    if (v.autore !== user?.uid) return;
    Alert.alert("Eliminare la spesa?", `${v.titolo} — ${euro(v.importo)}`, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => deleteDoc(doc(db, "spese", v.id)) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader
        titolo="Spese"
        destra={
          <TouchableOpacity style={styles.bottonePiu} onPress={() => setComposerAperto(!composerAperto)}>
            <Icona name={composerAperto ? "close" : "plus"} size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {composerAperto && (
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder="Cosa (es. Spesa Esselunga)"
            placeholderTextColor={colors.muted} value={titolo} onChangeText={setTitolo} />
          <TextInput style={styles.input} placeholder="Importo in €"
            placeholderTextColor={colors.muted} keyboardType="decimal-pad"
            value={importo} onChangeText={setImporto} />
          <View style={styles.rigaChips}>
            {CATEGORIE.map((c) => (
              <TouchableOpacity key={c.key}
                style={[styles.chip, categoria === c.key && styles.chipAttivo]}
                onPress={() => setCategoria(c.key)}>
                <Text style={[styles.chipTesto, categoria === c.key && styles.chipTestoAttivo]}>
                  {c.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.rigaChips}>
            {(Object.keys(VISIBILITA) as VisibilitaContenuto[]).map((v) => {
              const disabilitato = v === "coppia" && !relConfermata;
              return (
                <TouchableOpacity key={v} disabled={disabilitato}
                  style={[styles.chip, visibilita === v && styles.chipAttivo, disabilitato && { opacity: 0.4 }]}
                  onPress={() => setVisibilita(v)}>
                  <Text style={[styles.chipTesto, visibilita === v && styles.chipTestoAttivo]}>
                    {VISIBILITA[v]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity style={styles.bottoneSalva} onPress={salva}>
            <Text style={styles.bottoneSalvaTesto}>Registra spesa</Text>
          </TouchableOpacity>
        </View>
      )}

      <SectionList
        sections={sezioni}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          <Text style={styles.vuoto}>Nessuna spesa registrata. Tocca + per iniziare 💶</Text>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sezione}>{section.title}</Text>
        )}
        renderItem={({ item }) => {
          const cat = CATEGORIE.find((c) => c.key === item.categoria) ?? CATEGORIE[4];
          return (
            <TouchableOpacity style={styles.card} onLongPress={() => chiediElimina(item)} activeOpacity={0.9}>
              <View style={styles.iconChip}>
                <Icona name={cat.icona} size={18} color={colors.accentDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.titoloVoce}>{item.titolo}</Text>
                <View style={styles.rigaMeta}>
                  <Text style={styles.dettagli}>
                    {new Date(item.data).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                  </Text>
                  {/* Badge di visibilità: prima era testo grigio in coda alla
                      data e si perdeva nella lista. Ora è una pastiglia
                      colorata — blu per "Solo io", rosa per "Coppia" — così
                      si distingue con un'occhiata. */}
                  {item.visibilita !== "household" && (
                    <View style={[
                      styles.badgeVis,
                      item.visibilita === "personale" ? styles.badgePersonale : styles.badgeCoppia,
                    ]}>
                      <Icona
                        name={item.visibilita === "personale" ? "lock-outline" : "heart-outline"}
                        size={11}
                        color={item.visibilita === "personale" ? "#1B6CA8" : "#B5446E"}
                      />
                      <Text style={[
                        styles.badgeVisTesto,
                        item.visibilita === "personale" ? styles.badgeTestoPersonale : styles.badgeTestoCoppia,
                      ]}>
                        {VISIBILITA[item.visibilita]}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.importoVoce}>{euro(item.importo)}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <Text style={styles.suggerimento}>Tieni premuta una tua spesa per eliminarla</Text>
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
  rigaChips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: colors.chipNeutral },

  rigaMeta: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 2, flexWrap: "wrap" },
  badgeVis: {
    flexDirection: "row", alignItems: "center", gap: 3,
    borderRadius: 999, paddingVertical: 2, paddingHorizontal: 7,
    borderWidth: 1,
  },
  badgePersonale: { backgroundColor: "#E4F1FB", borderColor: "#A9D3F0" },
  badgeCoppia:    { backgroundColor: "#FBE9F0", borderColor: "#F0C0D3" },
  badgeVisTesto:  { fontSize: 11, fontFamily: fonts.bold, fontWeight: "700" },
  badgeTestoPersonale: { color: "#1B6CA8" },
  badgeTestoCoppia:    { color: "#B5446E" },
  chipAttivo: { backgroundColor: colors.accent },
  chipTesto: { fontSize: 12, fontFamily: fonts.semibold, fontWeight: "600", color: colors.chipNeutralInk },
  chipTestoAttivo: { color: "#fff" },
  bottoneSalva: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  bottoneSalvaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700" },
  sezione: {
    fontSize: 13, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.muted,
    textTransform: "capitalize", marginTop: 12, marginBottom: 6,
  },
  card: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.card, borderRadius: radius.md, padding: 12,
    marginBottom: 6, ...shadow.card,
  },
  iconChip: {
    width: 34, height: 34, borderRadius: 10, backgroundColor: colors.accentSoft,
    alignItems: "center", justifyContent: "center",
  },
  titoloVoce: { fontSize: 15, fontFamily: fonts.semibold, fontWeight: "600", color: colors.ink },
  dettagli: { fontSize: 12, color: colors.muted, marginTop: 1 },
  importoVoce: { fontSize: 15, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40 },
  suggerimento: { color: colors.muted, fontSize: 11, textAlign: "center", paddingBottom: 12 },
});
