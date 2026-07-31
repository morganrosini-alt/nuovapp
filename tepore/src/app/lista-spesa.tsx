// src/app/lista-spesa.tsx — M7
// Lista della spesa condivisa in tempo reale: aggiungi, spunta (con nome di
// chi ha preso), svuota i presi. Ispirata al Carrello di "Insieme".

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform,
} from "react-native";
import Icona from "../components/Icona";
import { creaServizio } from "../services/crud";
import { getHousehold, getUserProfilesByIds } from "../services/household";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { UserProfile, VoceListaSpesa } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import { colors, radius, shadow, fonts } from "../theme";

const servizio = creaServizio<VoceListaSpesa>("lista_spesa");

export default function ListaSpesaScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [voci, setVoci] = useState<VoceListaSpesa[]>([]);
  const [membri, setMembri] = useState<UserProfile[]>([]);
  const [bozza, setBozza] = useState("");

  useEffect(() => {
    if (!householdId) return;
    const unsub = servizio.ascolta(householdId, setVoci);
    (async () => {
      const casa = await getHousehold(householdId);
      if (casa) setMembri(await getUserProfilesByIds(casa.memberIds));
    })();
    return unsub;
  }, [householdId]);

  const nomeDi = (uid?: string | null) =>
    membri.find((m) => m.id === uid)?.displayName ?? "";

  const ordinate = useMemo(
    () => [...voci].sort((a, b) => Number(a.preso) - Number(b.preso) || b.createdAt - a.createdAt),
    [voci]
  );
  const presi = voci.filter((v) => v.preso).length;

  async function aggiungi() {
    const nome = bozza.trim();
    if (!nome || !householdId) return;
    setBozza("");
    await servizio.crea({ householdId, nome, preso: false } as any);
  }

  async function svuotaPresi() {
    await Promise.all(voci.filter((v) => v.preso).map((v) => servizio.elimina(v.id)));
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader
        titolo="Lista Spesa"
        destra={
          presi > 0 ? (
            <TouchableOpacity style={styles.bottoneSvuota} onPress={svuotaPresi}>
              <Text style={styles.bottoneSvuotaTesto}>Svuota ✓</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <View style={styles.rigaInput}>
        <TextInput
          style={styles.input}
          placeholder="Aggiungi (es. Latte)…"
          placeholderTextColor={colors.muted}
          value={bozza}
          onChangeText={setBozza}
          onSubmitEditing={aggiungi}
          returnKeyType="done"
          blurOnSubmit={false}
        />
        <TouchableOpacity style={styles.bottonePiu} onPress={aggiungi}>
          <Icona name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={ordinate}
        keyExtractor={(v) => v.id}
        contentContainerStyle={{ padding: 16, paddingTop: 8 }}
        ListEmptyComponent={
          <Text style={styles.vuoto}>Lista vuota. Aggiungi qualcosa: la vedranno tutti in tempo reale 🛒</Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.riga}
            onPress={() =>
              servizio.aggiorna(item.id, {
                preso: !item.preso,
                presoDa: !item.preso ? user?.uid ?? null : null,
              } as any)
            }
            onLongPress={() => servizio.elimina(item.id)}
          >
            <Icona
              name={item.preso ? "checkbox-marked-outline" : "checkbox-blank-outline"}
              size={22}
              color={item.preso ? colors.success : colors.muted}
            />
            <Text style={[styles.nomeVoce, item.preso && styles.nomeVocePreso]}>{item.nome}</Text>
            {item.preso && item.presoDa ? (
              <Text style={styles.presoDa}>{nomeDi(item.presoDa)}</Text>
            ) : null}
          </TouchableOpacity>
        )}
      />
      <Text style={styles.suggerimento}>Tocca per spuntare · tieni premuto per eliminare</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bottoneSvuota: {
    backgroundColor: colors.chipNeutral, borderRadius: radius.sm,
    paddingVertical: 8, paddingHorizontal: 10,
  },
  bottoneSvuotaTesto: { color: colors.chipNeutralInk, fontFamily: fonts.bold, fontWeight: "700", fontSize: 12 },
  rigaInput: { flexDirection: "row", gap: 8, paddingHorizontal: 16, marginBottom: 4 },
  input: {
    flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.ink,
  },
  bottonePiu: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    width: 46, alignItems: "center", justifyContent: "center",
  },
  riga: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.card, borderRadius: radius.md,
    paddingVertical: 12, paddingHorizontal: 14, marginBottom: 6, ...shadow.card,
  },
  nomeVoce: { flex: 1, fontSize: 15, color: colors.ink },
  nomeVocePreso: { color: colors.muted, textDecorationLine: "line-through" },
  presoDa: { fontSize: 11, color: colors.muted },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40, lineHeight: 20 },
  suggerimento: { color: colors.muted, fontSize: 11, textAlign: "center", paddingBottom: 12 },
});
