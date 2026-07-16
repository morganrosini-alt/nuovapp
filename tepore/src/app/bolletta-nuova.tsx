// src/app/bolletta-nuova.tsx

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { creaBolletta, modificaBolletta, ascoltaBolletta } from "../services/bollette";
import { TipoBolletta } from "../types";

const TIPI: { key: TipoBolletta; label: string; emoji: string }[] = [
  { key: "acqua", label: "Acqua", emoji: "💧" },
  { key: "luce", label: "Luce", emoji: "⚡" },
  { key: "gas", label: "Gas", emoji: "🔥" },
  { key: "internet", label: "Internet", emoji: "🌐" },
  { key: "telefono", label: "Telefono", emoji: "📱" },
  { key: "altro", label: "Altro", emoji: "📄" },
];

export default function BollettaFormScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = !!id;

  const [tipo, setTipo] = useState<TipoBolletta>("luce");
  const [nome, setNome] = useState("");
  const [importo, setImporto] = useState("");
  const [dataScadenza, setDataScadenza] = useState(new Date());
  const [giaPagata, setGiaPagata] = useState(false);
  const [ricorrenteMensile, setRicorrenteMensile] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEsistente, setIsLoadingEsistente] = useState(isEditMode);

  useEffect(() => {
    if (!id) return;

    const unsubscribe = ascoltaBolletta(id, (bolletta) => {
      if (bolletta) {
        setTipo(bolletta.tipo);
        setNome(bolletta.nome);
        setImporto(bolletta.importo.toString());
        setDataScadenza(new Date(bolletta.dataScadenza));
        setRicorrenteMensile(bolletta.ricorrenteMensile ?? false);
      }
      setIsLoadingEsistente(false);
    });

    return unsubscribe;
  }, [id]);

  async function handleSave() {
    setErrorMessage(null);

    if (!nome.trim()) {
      setErrorMessage("Dai un nome alla bolletta (es. \"Bolletta luce Giugno\").");
      return;
    }
    const importoNumerico = parseFloat(importo.replace(",", "."));
    if (isNaN(importoNumerico) || importoNumerico <= 0) {
      setErrorMessage("Inserisci un importo valido.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && id) {
        await modificaBolletta(id, {
          tipo,
          nome: nome.trim(),
          importo: importoNumerico,
          dataScadenza: dataScadenza.getTime(),
          ricorrenteMensile,
        });
      } else {
        if (!user || !profile?.householdId) {
          setErrorMessage("Errore: utente o casa non trovati. Riprova.");
          setIsSubmitting(false);
          return;
        }
        await creaBolletta({
          householdId: profile.householdId,
          tipo,
          nome: nome.trim(),
          importo: importoNumerico,
          dataScadenza: dataScadenza.getTime(),
          createdBy: user.uid,
          giaPagata,
          ricorrenteMensile,
        });
      }
      router.back();
    } catch (error) {
      setErrorMessage("Errore durante il salvataggio. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingEsistente) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#D97742" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>Annulla</Text>
        </TouchableOpacity>
        <Text style={styles.title}>
          {isEditMode ? "Modifica bolletta" : "Nuova bolletta"}
        </Text>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={handleSave}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.headerButtonText}>Salva</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Tipo</Text>
        <View style={styles.tipoGrid}>
          {TIPI.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tipoChip, tipo === t.key && styles.tipoChipActive]}
              onPress={() => setTipo(t.key)}
            >
              <Text style={styles.tipoEmoji}>{t.emoji}</Text>
              <Text style={[styles.tipoLabel, tipo === t.key && styles.tipoLabelActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          placeholder='Es. "Bolletta luce Giugno"'
          placeholderTextColor="#999"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>Importo (€)</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor="#999"
          keyboardType="decimal-pad"
          value={importo}
          onChangeText={setImporto}
        />

        <Text style={styles.label}>Data di scadenza</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {dataScadenza.toLocaleDateString("it-IT", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dataScadenza}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === "ios");
              if (selectedDate) setDataScadenza(selectedDate);
            }}
          />
        )}

        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setRicorrenteMensile(!ricorrenteMensile)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, ricorrenteMensile && styles.checkboxChecked]}>
            {ricorrenteMensile && <Text style={styles.checkboxTick}>✓</Text>}
          </View>
          <Text style={styles.checkboxLabel}>
            È un canone fisso mensile (es. abbonamento telefono/internet)
          </Text>
        </TouchableOpacity>

        {!isEditMode && (
          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setGiaPagata(!giaPagata)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, giaPagata && styles.checkboxChecked]}>
              {giaPagata && <Text style={styles.checkboxTick}>✓</Text>}
            </View>
            <Text style={styles.checkboxLabel}>
              L'ho già pagata (segnala subito come pagata)
            </Text>
          </TouchableOpacity>
        )}

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8F3",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#FFF8F3",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerButton: {
    backgroundColor: "#D97742",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 70,
    alignItems: "center",
  },
  headerButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3A2E28",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7A6A60",
    marginBottom: 8,
    marginTop: 16,
  },
  tipoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tipoChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  tipoChipActive: {
    backgroundColor: "#D97742",
    borderColor: "#D97742",
  },
  tipoEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  tipoLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#3A2E28",
  },
  tipoLabelActive: {
    color: "#fff",
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  dateButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  dateButtonText: {
    fontSize: 16,
    color: "#3A2E28",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#D97742",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#D97742",
  },
  checkboxTick: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 14,
    color: "#3A2E28",
    flex: 1,
  },
  errorText: {
    color: "#C0392B",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
});
