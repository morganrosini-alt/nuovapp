// src/app/bacheca.tsx
//
// Bacheca condivisa (M3): la lavagna sul frigo della casa.
// Note + checklist in tempo reale tra tutti i membri. Primo modulo
// costruito con i design token del tema nuovo (src/theme).

import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import {
  ascoltaBacheca, creaNota, eliminaNota, aggiornaNota, toggleChecklistItem,
} from "../services/bacheca";
import { NotaBacheca } from "../types";
import { colors, radius, shadow } from "../theme";

export default function BachecaScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [note, setNote] = useState<NotaBacheca[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [bozza, setBozza] = useState("");
  const [modalita, setModalita] = useState<"nota" | "checklist">("nota");

  useEffect(() => {
    if (!householdId) return;
    const unsub = ascoltaBacheca(householdId, (n) => {
      setNote(n);
      setCaricamento(false);
    });
    return unsub;
  }, [householdId]);

  async function aggiungi() {
    const testo = bozza.trim();
    if (!testo || !householdId || !user) return;
    setBozza("");
    if (modalita === "nota") {
      await creaNota({ householdId, tipo: "nota", autore: user.uid, testo });
    } else {
      // Checklist rapida: ogni riga scritta separata da virgola diventa un elemento
      const items = testo.split(",").map((t) => ({ testo: t.trim(), fatto: false }))
        .filter((i) => i.testo.length > 0);
      await creaNota({ householdId, tipo: "checklist", autore: user.uid, testo: "", items });
    }
  }

  function chiediElimina(nota: NotaBacheca) {
    Alert.alert("Eliminare?", "La nota sparirà per tutti i membri della casa.", [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => eliminaNota(nota.id) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.bottoneHeader} onPress={() => router.back()}>
          <Text style={styles.bottoneHeaderTesto}>‹ Home</Text>
        </TouchableOpacity>
        <Text style={styles.titolo}>Bacheca</Text>
        <View style={{ width: 90 }} />
      </View>

      {/* Composer */}
      <View style={styles.composer}>
        <View style={styles.switchTipo}>
          {(["nota", "checklist"] as const).map((m) => (
            <TouchableOpacity
              key={m}
              style={[styles.chipTipo, modalita === m && styles.chipTipoAttivo]}
              onPress={() => setModalita(m)}
            >
              <Text style={[styles.chipTipoTesto, modalita === m && styles.chipTipoTestoAttivo]}>
                {m === "nota" ? "Nota" : "Checklist"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.rigaInput}>
          <TextInput
            style={styles.input}
            placeholder={modalita === "nota" ? "Scrivi un appunto per la casa…" : "Voci separate da virgola…"}
            placeholderTextColor={colors.muted}
            value={bozza}
            onChangeText={setBozza}
            onSubmitEditing={aggiungi}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.bottoneAggiungi} onPress={aggiungi}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={note}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          caricamento ? null : (
            <Text style={styles.vuoto}>
              La bacheca è vuota. Scrivi il primo appunto: lo vedranno tutti in casa, in tempo reale.
            </Text>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.card, item.fissata && styles.cardFissata]}>
            <View style={styles.cardHeader}>
              <TouchableOpacity onPress={() => aggiornaNota(item.id, { fissata: !item.fissata })}>
                <MaterialCommunityIcons
                  name={item.fissata ? "pin" : "pin-outline"}
                  size={18}
                  color={item.fissata ? colors.accent : colors.muted}
                />
              </TouchableOpacity>
              {item.autore === user?.uid && (
                <TouchableOpacity onPress={() => chiediElimina(item)}>
                  <MaterialCommunityIcons name="trash-can-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              )}
            </View>

            {item.tipo === "nota" ? (
              <Text style={styles.testoNota}>{item.testo}</Text>
            ) : (
              (item.items ?? []).map((el, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.rigaCheck}
                  onPress={() => user && toggleChecklistItem(item, i, user.uid)}
                >
                  <MaterialCommunityIcons
                    name={el.fatto ? "checkbox-marked-outline" : "checkbox-blank-outline"}
                    size={20}
                    color={el.fatto ? colors.success : colors.muted}
                  />
                  <Text style={[styles.testoCheck, el.fatto && styles.testoCheckFatto]}>
                    {el.testo}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
  },
  bottoneHeader: {
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingVertical: 8, paddingHorizontal: 12, width: 90, alignItems: "center",
  },
  bottoneHeaderTesto: { color: "#fff", fontWeight: "600", fontSize: 14 },
  titolo: { fontSize: 20, fontWeight: "800", color: colors.ink },
  composer: { paddingHorizontal: 16, paddingBottom: 8 },
  switchTipo: { flexDirection: "row", gap: 8, marginBottom: 8 },
  chipTipo: {
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: colors.chipNeutral,
  },
  chipTipoAttivo: { backgroundColor: colors.accent },
  chipTipoTesto: { color: colors.chipNeutralInk, fontSize: 13, fontWeight: "600" },
  chipTipoTestoAttivo: { color: "#fff" },
  rigaInput: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1, backgroundColor: colors.card, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.ink,
  },
  bottoneAggiungi: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    width: 46, alignItems: "center", justifyContent: "center",
  },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40, lineHeight: 20 },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14,
    marginBottom: 10, ...shadow.card,
  },
  cardFissata: { borderWidth: 1.5, borderColor: colors.accent },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  testoNota: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  rigaCheck: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 4 },
  testoCheck: { fontSize: 15, color: colors.ink },
  testoCheckFatto: { color: colors.muted, textDecorationLine: "line-through" },
});
