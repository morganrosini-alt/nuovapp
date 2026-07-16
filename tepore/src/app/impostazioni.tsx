// src/app/impostazioni.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { updateDisplayName } from "../services/household";

export default function ImpostazioniScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const [nome, setNome] = useState(profile?.displayName ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [salvato, setSalvato] = useState(false);

  useEffect(() => {
    setNome(profile?.displayName ?? "");
  }, [profile?.displayName]);

  async function handleSaveNome() {
    if (!user || !nome.trim()) return;
    setIsSaving(true);
    setSalvato(false);
    try {
      await updateDisplayName(user.uid, nome);
      setSalvato(true);
      setTimeout(() => setSalvato(false), 2000);
    } catch (error) {
      Alert.alert("Errore", "Non è stato possibile salvare il nome. Riprova.");
    } finally {
      setIsSaving(false);
    }
  }

  function mostraPresto() {
    Alert.alert("Presto disponibile", "Questa funzione arriverà in un prossimo aggiornamento.");
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹ Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Impostazioni</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionLabel}>Nome profilo</Text>
        <Text style={styles.helperText}>
          Il tuo nome è visibile a tutte le persone con cui condividi una casa su Tepore.
        </Text>
        <View style={styles.nameRow}>
          <TextInput
            style={styles.nameInput}
            value={nome}
            onChangeText={setNome}
            placeholder="Il tuo nome"
            placeholderTextColor="#999"
          />
          <TouchableOpacity
            style={styles.saveNameButton}
            onPress={handleSaveNome}
            disabled={isSaving || !nome.trim()}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.saveNameButtonText}>{salvato ? "✓" : "Salva"}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingRow} onPress={mostraPresto}>
          <View>
            <Text style={styles.settingRowLabel}>Lingua</Text>
            <Text style={styles.settingRowValue}>Italiano</Text>
          </View>
          <Text style={styles.comingSoonBadge}>Presto</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.settingRow} onPress={mostraPresto}>
          <View>
            <Text style={styles.settingRowLabel}>Tema</Text>
            <Text style={styles.settingRowValue}>Chiaro</Text>
          </View>
          <Text style={styles.comingSoonBadge}>Presto</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F3",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  backButton: {
    backgroundColor: "#D97742",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonPlaceholder: {
    width: 90,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3A2E28",
  },
  content: {
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7A6A60",
    marginBottom: 4,
  },
  helperText: {
    fontSize: 12,
    color: "#9A8A80",
    marginBottom: 12,
    lineHeight: 17,
  },
  nameRow: {
    flexDirection: "row",
    gap: 8,
  },
  nameInput: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  saveNameButton: {
    backgroundColor: "#D97742",
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 70,
  },
  saveNameButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEE0D5",
    marginVertical: 20,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  settingRowLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3A2E28",
  },
  settingRowValue: {
    fontSize: 12,
    color: "#9A8A80",
    marginTop: 2,
  },
  comingSoonBadge: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97742",
    backgroundColor: "#FFE8D6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
});
