// src/components/DettaglioEntita.tsx
//
// Motore condiviso dei moduli Veicoli e Animali: la struttura è identica
// (scadenze ricorrenti + registro spese per entità), cambiano solo etichette
// e icone. Un componente solo = un solo posto da mantenere.

import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { doc, onSnapshot, updateDoc, deleteDoc } from "firebase/firestore";
import { router } from "expo-router";
import Icona from "./Icona";
import { db } from "../services/firebase";
import { ScadenzaEntita, SpesaEntita } from "../types";
import ModuloHeader from "./ModuloHeader";
import CampoData from "./CampoData";
import { colors, radius, shadow, fonts } from "../theme";

const GIORNO = 24 * 3600e3;
const euro = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

type Props = {
  collezione: "veicoli" | "animali";
  id: string;
  tipiScadenza: Array<{ key: string; label: string }>;
  titoloModulo: string;
};

type Entita = {
  nome: string;
  scadenze?: ScadenzaEntita[];
  spese?: SpesaEntita[];
};

export default function DettaglioEntita({ collezione, id, tipiScadenza, titoloModulo }: Props) {
  const [entita, setEntita] = useState<Entita | null>(null);
  const [tipoNuova, setTipoNuova] = useState(tipiScadenza[0].key);
  const [dataNuova, setDataNuova] = useState(new Date(Date.now() + 30 * GIORNO));
  const [descSpesa, setDescSpesa] = useState("");
  const [importoSpesa, setImportoSpesa] = useState("");

  useEffect(() => {
    return onSnapshot(doc(db, collezione, id), (snap) => {
      setEntita(snap.exists() ? (snap.data() as Entita) : null);
    });
  }, [collezione, id]);

  if (!entita) return <View style={styles.container} />;

  const scadenze = [...(entita.scadenze ?? [])].sort((a, b) => a.data - b.data);
  const spese = [...(entita.spese ?? [])].sort((a, b) => b.data - a.data);
  const totaleSpese = spese.reduce((s, v) => s + v.importo, 0);
  const annoCorrente = new Date().getFullYear();
  const speseAnno = spese
    .filter((s) => new Date(s.data).getFullYear() === annoCorrente)
    .reduce((s, v) => s + v.importo, 0);

  const labelDi = (tipo: string, etichetta?: string) =>
    etichetta || tipiScadenza.find((t) => t.key === tipo)?.label || tipo;

  async function aggiungiScadenza() {
    await updateDoc(doc(db, collezione, id), {
      scadenze: [...(entita!.scadenze ?? []), { tipo: tipoNuova, data: dataNuova.getTime() }],
    });
  }

  async function aggiornaScadenza(indice: number, nuovaData: Date) {
    const nuove = [...(entita!.scadenze ?? [])];
    nuove[indice] = { ...nuove[indice], data: nuovaData.getTime() };
    await updateDoc(doc(db, collezione, id), { scadenze: nuove });
  }

  function eliminaScadenza(indice: number) {
    const s = scadenze[indice];
    Alert.alert("Eliminare la scadenza?", labelDi(s.tipo, s.etichetta), [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina", style: "destructive",
        onPress: () =>
          updateDoc(doc(db, collezione, id), {
            scadenze: (entita!.scadenze ?? []).filter((_, i) =>
              i !== (entita!.scadenze ?? []).indexOf(scadenze[indice])),
          }),
      },
    ]);
  }

  async function aggiungiSpesa() {
    const imp = parseFloat(importoSpesa.replace(",", "."));
    if (!descSpesa.trim() || !imp || imp <= 0) return;
    await updateDoc(doc(db, collezione, id), {
      spese: [...(entita!.spese ?? []), { descrizione: descSpesa.trim(), importo: imp, data: Date.now() }],
    });
    setDescSpesa(""); setImportoSpesa("");
  }

  function eliminaTutto() {
    Alert.alert(`Eliminare ${entita!.nome}?`, "Scadenze e spese registrate spariranno.", [
      { text: "Annulla", style: "cancel" },
      {
        text: "Elimina", style: "destructive",
        onPress: async () => { await deleteDoc(doc(db, collezione, id)); router.back(); },
      },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader
        titolo={entita.nome}
        backLabel={`‹ ${titoloModulo}`}
        destra={
          <TouchableOpacity onPress={eliminaTutto} hitSlop={10}>
            <Icona name="trash-can-outline" size={22} color={colors.danger} />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 14 }}>

        {/* Riepilogo costi */}
        <View style={styles.riepilogo}>
          <View style={styles.riepilogoCol}>
            <Text style={styles.riepilogoValore}>{euro(speseAnno)}</Text>
            <Text style={styles.riepilogoLabel}>spese {annoCorrente}</Text>
          </View>
          <View style={styles.riepilogoSep} />
          <View style={styles.riepilogoCol}>
            <Text style={styles.riepilogoValore}>{euro(totaleSpese)}</Text>
            <Text style={styles.riepilogoLabel}>totale storico</Text>
          </View>
        </View>

        {/* Scadenze */}
        <Text style={styles.sezione}>Scadenze</Text>
        {scadenze.length === 0 && (
          <Text style={styles.vuoto}>Nessuna scadenza. Aggiungine una qui sotto.</Text>
        )}
        {scadenze.map((s, i) => {
          const giorni = Math.ceil((s.data - Date.now()) / GIORNO);
          const scaduta = giorni < 0;
          return (
            <View key={`${s.tipo}-${s.data}-${i}`} style={styles.cardScadenza}>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomeScadenza}>{labelDi(s.tipo, s.etichetta)}</Text>
                <CampoData
                  label=""
                  valore={new Date(s.data)}
                  onChange={(d) => aggiornaScadenza(i, d)}
                />
              </View>
              <View style={{ alignItems: "flex-end", gap: 6 }}>
                {scaduta ? (
                  <Text style={styles.badgeScaduta}>SCADUTA</Text>
                ) : (
                  <Text style={[styles.badgeGiorni, giorni <= 14 && styles.badgeUrgente]}>
                    {giorni} gg
                  </Text>
                )}
                <TouchableOpacity onPress={() => eliminaScadenza(i)} hitSlop={8}>
                  <Icona name="close-circle-outline" size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        <View style={styles.composer}>
          <View style={styles.rigaChips}>
            {tipiScadenza.map((t) => (
              <TouchableOpacity key={t.key}
                style={[styles.chip, tipoNuova === t.key && styles.chipAttivo]}
                onPress={() => setTipoNuova(t.key)}>
                <Text style={[styles.chipTesto, tipoNuova === t.key && styles.chipTestoAttivo]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <CampoData label="Data" valore={dataNuova} onChange={setDataNuova} />
          <TouchableOpacity style={styles.bottone} onPress={aggiungiScadenza}>
            <Text style={styles.bottoneTesto}>Aggiungi scadenza</Text>
          </TouchableOpacity>
        </View>

        {/* Spese */}
        <Text style={styles.sezione}>Spese</Text>
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder="Descrizione (es. Cambio gomme)"
            placeholderTextColor={colors.muted} value={descSpesa} onChangeText={setDescSpesa} />
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="€"
              placeholderTextColor={colors.muted} keyboardType="decimal-pad"
              value={importoSpesa} onChangeText={setImportoSpesa} />
            <TouchableOpacity style={[styles.bottone, { paddingHorizontal: 18 }]} onPress={aggiungiSpesa}>
              <Text style={styles.bottoneTesto}>Registra</Text>
            </TouchableOpacity>
          </View>
        </View>
        {spese.map((s, i) => (
          <View key={`${s.data}-${i}`} style={styles.rigaSpesa}>
            <View style={{ flex: 1 }}>
              <Text style={styles.descSpesa}>{s.descrizione}</Text>
              <Text style={styles.dataSpesa}>
                {new Date(s.data).toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
              </Text>
            </View>
            <Text style={styles.importoSpesaTesto}>{euro(s.importo)}</Text>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  riepilogo: {
    flexDirection: "row", backgroundColor: colors.card, borderRadius: radius.lg,
    padding: 16, ...shadow.card,
  },
  riepilogoCol: { flex: 1, alignItems: "center" },
  riepilogoSep: { width: 1, backgroundColor: colors.border },
  riepilogoValore: { fontSize: 18, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink },
  riepilogoLabel: { fontSize: 12, color: colors.muted, marginTop: 2 },
  sezione: { fontSize: 15, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink, marginTop: 4 },
  vuoto: { fontSize: 13, color: colors.muted },
  cardScadenza: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.card, borderRadius: radius.md, padding: 12, ...shadow.card,
  },
  nomeScadenza: { fontSize: 14, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  badgeGiorni: {
    fontSize: 12, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.accentDark,
    backgroundColor: colors.accentSoft, borderRadius: 999,
    paddingVertical: 3, paddingHorizontal: 9, overflow: "hidden",
  },
  badgeUrgente: { color: "#fff", backgroundColor: colors.danger },
  badgeScaduta: { fontSize: 11, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.danger },
  composer: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 12,
    gap: 10, ...shadow.card,
  },
  rigaChips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12, backgroundColor: colors.chipNeutral },
  chipAttivo: { backgroundColor: colors.accent },
  chipTesto: { fontSize: 12, fontFamily: fonts.semibold, fontWeight: "600", color: colors.chipNeutralInk },
  chipTestoAttivo: { color: "#fff" },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink,
  },
  bottone: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 11, alignItems: "center", justifyContent: "center",
  },
  bottoneTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700", fontSize: 14 },
  rigaSpesa: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingVertical: 10, paddingHorizontal: 12, ...shadow.card,
  },
  descSpesa: { fontSize: 14, fontFamily: fonts.semibold, fontWeight: "600", color: colors.ink },
  dataSpesa: { fontSize: 12, color: colors.muted },
  importoSpesaTesto: { fontSize: 14, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink },
});
