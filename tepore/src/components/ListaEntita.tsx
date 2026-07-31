// src/components/ListaEntita.tsx
// Lista generica delle entità (veicoli o animali): nome + prossima scadenza,
// composer per aggiungerne, tap → dettaglio.

import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import Icona from "./Icona";
import { creaServizio } from "../services/crud";
import { useHousehold } from "../hooks/useHousehold";
import { ScadenzaEntita } from "../types";
import ModuloHeader from "./ModuloHeader";
import { colors, radius, shadow, fonts } from "../theme";

const GIORNO = 24 * 3600e3;

type EntitaBase = {
  id: string; householdId: string; nome: string;
  scadenze?: ScadenzaEntita[]; createdAt: number;
};

type Props = {
  collezione: "veicoli" | "animali";
  titolo: string;
  routeDettaglio: string;               // es. "/veicolo-dettaglio"
  tipiEntita: Array<{ key: string; label: string; icona: string }>;
  campoTipo: string;                    // "tipo" | "specie"
  placeholderNome: string;
  messaggioVuoto: string;
};

export default function ListaEntita({
  collezione, titolo, routeDettaglio, tipiEntita, campoTipo, placeholderNome, messaggioVuoto,
}: Props) {
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;
  const servizio = creaServizio<EntitaBase>(collezione);

  const [entita, setEntita] = useState<EntitaBase[]>([]);
  const [composerAperto, setComposerAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [tipoSel, setTipoSel] = useState(tipiEntita[0].key);

  useEffect(() => {
    if (!householdId) return;
    return servizio.ascolta(householdId, setEntita);
  }, [householdId]);

  async function crea() {
    if (!nome.trim() || !householdId) return;
    await servizio.crea({
      householdId, nome: nome.trim(), [campoTipo]: tipoSel,
      scadenze: [], spese: [],
    } as any);
    setNome(""); setComposerAperto(false);
  }

  function prossimaScadenza(e: EntitaBase): ScadenzaEntita | null {
    const future = (e.scadenze ?? []).filter((s) => s.data >= Date.now());
    const scadute = (e.scadenze ?? []).filter((s) => s.data < Date.now());
    if (scadute.length > 0) return scadute.sort((a, b) => a.data - b.data)[0];
    if (future.length > 0) return future.sort((a, b) => a.data - b.data)[0];
    return null;
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader
        titolo={titolo}
        destra={
          <TouchableOpacity style={styles.bottonePiu} onPress={() => setComposerAperto(!composerAperto)}>
            <Icona name={composerAperto ? "close" : "plus"} size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {composerAperto && (
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder={placeholderNome}
            placeholderTextColor={colors.muted} value={nome} onChangeText={setNome} />
          <View style={styles.rigaChips}>
            {tipiEntita.map((t) => (
              <TouchableOpacity key={t.key}
                style={[styles.chip, tipoSel === t.key && styles.chipAttivo]}
                onPress={() => setTipoSel(t.key)}>
                <Text style={[styles.chipTesto, tipoSel === t.key && styles.chipTestoAttivo]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={styles.bottoneSalva} onPress={crea}>
            <Text style={styles.bottoneSalvaTesto}>Aggiungi</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={[...entita].sort((a, b) => a.nome.localeCompare(b.nome))}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={<Text style={styles.vuoto}>{messaggioVuoto}</Text>}
        renderItem={({ item }) => {
          const icona = tipiEntita.find((t) => t.key === (item as any)[campoTipo])?.icona
            ?? tipiEntita[0].icona;
          const pross = prossimaScadenza(item);
          const scaduta = pross ? pross.data < Date.now() : false;
          const giorni = pross ? Math.ceil((pross.data - Date.now()) / GIORNO) : null;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`${routeDettaglio}?id=${item.id}` as any)}
              activeOpacity={0.8}
            >
              <View style={styles.iconChip}>
                <Icona name={icona} size={20} color={colors.accentDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.nomeEntita}>{item.nome}</Text>
                {pross ? (
                  <Text style={[styles.prossima, scaduta && styles.prossimaScaduta]}>
                    {scaduta ? "SCADENZA SUPERATA" : `Prossima scadenza tra ${giorni} gg`}
                  </Text>
                ) : (
                  <Text style={styles.prossima}>Nessuna scadenza impostata</Text>
                )}
              </View>
              <Icona name="chevron-right" size={22} color={colors.muted} />
            </TouchableOpacity>
          );
        }}
      />
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
  rigaChips: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14, backgroundColor: colors.chipNeutral },
  chipAttivo: { backgroundColor: colors.accent },
  chipTesto: { fontSize: 13, fontFamily: fonts.semibold, fontWeight: "600", color: colors.chipNeutralInk },
  chipTestoAttivo: { color: "#fff" },
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
  nomeEntita: { fontSize: 15, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  prossima: { fontSize: 13, color: colors.muted, marginTop: 2 },
  prossimaScaduta: { color: colors.danger, fontFamily: fonts.bold, fontWeight: "700" },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40, lineHeight: 20 },
});
