// src/app/contatti-utili.tsx — M7
// Rubrica di casa (idraulico, elettricista, amministratore…) con copia
// del numero — stessa icona/pattern della sezione Emergenze.

import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import Icona from "../components/Icona";
import { creaServizio } from "../services/crud";
import { useHousehold } from "../hooks/useHousehold";
import { ContattoUtile } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import { colors, radius, shadow, fonts } from "../theme";

const servizio = creaServizio<ContattoUtile>("contatti");

export default function ContattiUtiliScreen() {
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [contatti, setContatti] = useState<ContattoUtile[]>([]);
  const [composerAperto, setComposerAperto] = useState(false);
  const [nome, setNome] = useState("");
  const [ruolo, setRuolo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [copiatoId, setCopiatoId] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) return;
    return servizio.ascolta(householdId, setContatti);
  }, [householdId]);

  async function crea() {
    if (!nome.trim() || !telefono.trim() || !householdId) return;
    await servizio.crea({
      householdId, nome: nome.trim(),
      ruolo: ruolo.trim() || undefined, telefono: telefono.trim(),
    } as any);
    setNome(""); setRuolo(""); setTelefono(""); setComposerAperto(false);
  }

  async function copia(c: ContattoUtile) {
    await Clipboard.setStringAsync(c.telefono);
    setCopiatoId(c.id);
    setTimeout(() => setCopiatoId(null), 1500);
  }

  function chiediElimina(c: ContattoUtile) {
    Alert.alert("Eliminare il contatto?", c.nome, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => servizio.elimina(c.id) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader
        titolo="Contatti Utili"
        destra={
          <TouchableOpacity style={styles.bottonePiu} onPress={() => setComposerAperto(!composerAperto)}>
            <Icona name={composerAperto ? "close" : "plus"} size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {composerAperto && (
        <View style={styles.composer}>
          <TextInput style={styles.input} placeholder="Nome (es. Mario Rossi)"
            placeholderTextColor={colors.muted} value={nome} onChangeText={setNome} />
          <TextInput style={styles.input} placeholder="Ruolo (es. Idraulico)"
            placeholderTextColor={colors.muted} value={ruolo} onChangeText={setRuolo} />
          <TextInput style={styles.input} placeholder="Telefono"
            placeholderTextColor={colors.muted} keyboardType="phone-pad"
            value={telefono} onChangeText={setTelefono} />
          <TouchableOpacity style={styles.bottoneSalva} onPress={crea}>
            <Text style={styles.bottoneSalvaTesto}>Aggiungi contatto</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={[...contatti].sort((a, b) => a.nome.localeCompare(b.nome))}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          <Text style={styles.vuoto}>
            Nessun contatto salvato. Idraulico, elettricista, amministratore: tutti a portata di casa ☎️
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onLongPress={() => chiediElimina(item)} activeOpacity={0.9}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nomeContatto}>{item.nome}</Text>
              {item.ruolo ? <Text style={styles.ruolo}>{item.ruolo}</Text> : null}
              <Text style={styles.telefono}>{item.telefono}</Text>
            </View>
            <TouchableOpacity onPress={() => copia(item)} hitSlop={10}>
              <Icona
                name={copiatoId === item.id ? "check" : "content-copy"}
                size={20}
                color={copiatoId === item.id ? colors.success : colors.muted}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
      <Text style={styles.suggerimento}>Tocca l'icona per copiare il numero · tieni premuto per eliminare</Text>
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
  bottoneSalva: { backgroundColor: colors.accent, borderRadius: radius.md, paddingVertical: 12, alignItems: "center" },
  bottoneSalvaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700" },
  card: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14,
    marginBottom: 8, ...shadow.card,
  },
  nomeContatto: { fontSize: 15, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  ruolo: { fontSize: 13, color: colors.accentDark, marginTop: 1 },
  telefono: { fontSize: 14, color: colors.muted, marginTop: 2 },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40, lineHeight: 20 },
  suggerimento: { color: colors.muted, fontSize: 11, textAlign: "center", paddingBottom: 12 },
});
