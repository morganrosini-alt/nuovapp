// src/app/abbonamenti.tsx — M7
// Tracker abbonamenti (Netflix, palestra…): costo mensile stimato totale,
// prossimo rinnovo con promemoria il giorno prima, bottone "Rinnovato"
// che sposta la data avanti di un ciclo.

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import Icona from "../components/Icona";
import { creaServizio } from "../services/crud";
import { useHousehold } from "../hooks/useHousehold";
import { Abbonamento } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import CampoData from "../components/CampoData";
import { colors, radius, shadow, fonts } from "../theme";

const servizio = creaServizio<Abbonamento>("abbonamenti");
const euro = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

function prossimoCiclo(data: number, ciclo: Abbonamento["ciclo"]): number {
  const d = new Date(data);
  if (ciclo === "mensile") d.setMonth(d.getMonth() + 1);
  else d.setFullYear(d.getFullYear() + 1);
  return d.getTime();
}

export default function AbbonamentiScreen() {
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [abbonamenti, setAbbonamenti] = useState<Abbonamento[]>([]);
  const [composerAperto, setComposerAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [importo, setImporto] = useState("");
  const [ciclo, setCiclo] = useState<Abbonamento["ciclo"]>("mensile");
  const [rinnovo, setRinnovo] = useState(new Date());

  useEffect(() => {
    if (!householdId) return;
    return servizio.ascolta(householdId, setAbbonamenti);
  }, [householdId]);

  const ordinati = useMemo(
    () => [...abbonamenti].sort((a, b) => a.prossimoRinnovo - b.prossimoRinnovo),
    [abbonamenti]
  );
  const mensileStimato = abbonamenti.reduce(
    (s, a) => s + (a.ciclo === "mensile" ? a.importo : a.importo / 12), 0
  );

  async function crea() {
    const imp = parseFloat(importo.replace(",", "."));
    if (!nome.trim() || !imp || imp <= 0 || !householdId) return;
    await servizio.crea({
      householdId, nome: nome.trim(), importo: imp, ciclo,
      prossimoRinnovo: rinnovo.getTime(),
    } as any);
    setNome(""); setImporto(""); setComposerAperto(false);
  }

  function chiediElimina(a: Abbonamento) {
    Alert.alert("Eliminare l'abbonamento?", a.nome, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => servizio.elimina(a.id) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader
        titolo="Abbonamenti"
        destra={
          <TouchableOpacity style={styles.bottonePiu} onPress={() => setComposerAperto(!composerAperto)}>
            <Icona name={composerAperto ? "close" : "plus"} size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {abbonamenti.length > 0 && (
        <View style={styles.riepilogo}>
          <Text style={styles.riepilogoTesto}>
            Costo mensile stimato: <Text style={styles.riepilogoImporto}>{euro(mensileStimato)}</Text>
          </Text>
        </View>
      )}

      {composerAperto && (
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder="Servizio (es. Netflix)"
            placeholderTextColor={colors.muted} value={nome} onChangeText={setNome} />
          <TextInput style={styles.input} placeholder="Costo in €"
            placeholderTextColor={colors.muted} keyboardType="decimal-pad"
            value={importo} onChangeText={setImporto} />
          <View style={styles.rigaChips}>
            {(["mensile", "annuale"] as const).map((c) => (
              <TouchableOpacity key={c}
                style={[styles.chip, ciclo === c && styles.chipAttivo]}
                onPress={() => setCiclo(c)}>
                <Text style={[styles.chipTesto, ciclo === c && styles.chipTestoAttivo]}>
                  {c === "mensile" ? "Mensile" : "Annuale"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <CampoData label="Prossimo rinnovo" valore={rinnovo} onChange={setRinnovo} />
          <TouchableOpacity style={styles.bottoneSalva} onPress={crea}>
            <Text style={styles.bottoneSalvaTesto}>Aggiungi abbonamento</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={ordinati}
        keyExtractor={(a) => a.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          <Text style={styles.vuoto}>
            Nessun abbonamento tracciato. Scoprire quanto spendi al mese può sorprendere 📺
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onLongPress={() => chiediElimina(item)} activeOpacity={0.9}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nomeAbb}>{item.nome}</Text>
              <Text style={styles.dettagli}>
                {euro(item.importo)} / {item.ciclo === "mensile" ? "mese" : "anno"} · rinnovo{" "}
                {new Date(item.prossimoRinnovo).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.bottoneRinnova}
              onPress={() =>
                servizio.aggiorna(item.id, {
                  prossimoRinnovo: prossimoCiclo(item.prossimoRinnovo, item.ciclo),
                } as any)
              }
            >
              <Text style={styles.bottoneRinnovaTesto}>Rinnovato</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
      <Text style={styles.suggerimento}>Tieni premuto un abbonamento per eliminarlo</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bottonePiu: {
    backgroundColor: colors.accent, borderRadius: radius.sm,
    width: 38, height: 38, alignItems: "center", justifyContent: "center",
  },
  riepilogo: {
    backgroundColor: colors.accentSoft, borderRadius: radius.md,
    marginHorizontal: 16, marginBottom: 8, paddingVertical: 10, paddingHorizontal: 14,
  },
  riepilogoTesto: { fontSize: 14, color: colors.ink },
  riepilogoImporto: { fontFamily: fonts.extrabold, fontWeight: "800" },
  composer: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14,
    marginHorizontal: 16, marginBottom: 8, gap: 10, ...shadow.card,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink,
  },
  rigaChips: { flexDirection: "row", gap: 8 },
  chip: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: colors.chipNeutral },
  chipAttivo: { backgroundColor: colors.accent },
  chipTesto: { fontSize: 13, fontFamily: fonts.semibold, fontWeight: "600", color: colors.chipNeutralInk },
  chipTestoAttivo: { color: "#fff" },
  bottoneSalva: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  bottoneSalvaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700" },
  card: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14,
    marginBottom: 8, ...shadow.card,
  },
  nomeAbb: { fontSize: 15, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  dettagli: { fontSize: 13, color: colors.muted, marginTop: 2 },
  bottoneRinnova: {
    backgroundColor: colors.chipNeutral, borderRadius: radius.sm,
    paddingVertical: 8, paddingHorizontal: 12,
  },
  bottoneRinnovaTesto: { color: colors.chipNeutralInk, fontFamily: fonts.bold, fontWeight: "700", fontSize: 12 },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40, lineHeight: 20 },
  suggerimento: { color: colors.muted, fontSize: 11, textAlign: "center", paddingBottom: 12 },
});
