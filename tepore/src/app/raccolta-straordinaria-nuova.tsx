// src/app/raccolta-straordinaria-nuova.tsx
//
// Form usato per creare (senza ?id) o modificare (?id=X) una raccolta
// straordinaria.

import React, { useEffect, useState } from "react";
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
import { useHousehold } from "../hooks/useHousehold";
import { fonts } from "../theme";
import {
  creaRaccoltaStraordinaria,
  aggiornaRaccoltaStraordinaria,
  ascoltaRaccoltaStraordinaria,
} from "../services/immondizia";

export default function RaccoltaStraordinariaFormScreen() {
  const { profile } = useHousehold();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditMode = !!id;

  const [nome, setNome] = useState("");
  const [data, setData] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEsistente, setIsLoadingEsistente] = useState(isEditMode);

  useEffect(() => {
    if (!id) return;
    const unsub = ascoltaRaccoltaStraordinaria(id, (raccolta) => {
      if (raccolta) {
        setNome(raccolta.nome);
        setData(new Date(raccolta.data));
      }
      setIsLoadingEsistente(false);
    });
    return unsub;
  }, [id]);

  async function handleSave() {
    setErrorMessage(null);
    if (!nome.trim()) {
      setErrorMessage('Dai un nome alla raccolta (es. "Ritiro ingombranti condominio").');
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode && id) {
        await aggiornaRaccoltaStraordinaria(id, { nome: nome.trim(), data: data.getTime() });
      } else {
        if (!profile?.householdId) {
          setErrorMessage("Errore: casa non trovata. Riprova.");
          setIsSubmitting(false);
          return;
        }
        await creaRaccoltaStraordinaria({
          householdId: profile.householdId,
          nome: nome.trim(),
          data: data.getTime(),
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
        <ActivityIndicator color="#336699" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>Annulla</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEditMode ? "Modifica raccolta" : "Raccolta straordinaria"}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleSave} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.headerButtonText}>Salva</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          placeholder='Es. "Ritiro ingombranti condominio"'
          placeholderTextColor="#999"
          value={nome}
          onChangeText={setNome}
        />

        <Text style={styles.label}>Data</Text>
        {Platform.OS === "ios" ? (
          <View style={styles.datePickerIosRow}>
            <DateTimePicker
              value={data}
              mode="date"
              display="compact"
              onChange={(event, selectedDate) => {
                if (selectedDate) setData(selectedDate);
              }}
            />
          </View>
        ) : (
          <>
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
              <Text style={styles.dateButtonText}>
                {data.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
              </Text>
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                value={data}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) setData(selectedDate);
                }}
              />
            )}
          </>
        )}

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FA" },
  loadingContainer: { flex: 1, backgroundColor: "#F5F8FA", justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerButton: {
    backgroundColor: "#336699",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 70,
    alignItems: "center",
  },
  headerButtonText: { color: "#fff", fontSize: 14, fontFamily: fonts.semibold, fontWeight: "600" },
  title: { fontSize: 15, fontFamily: fonts.bold, fontWeight: "700", color: "#2F4858" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  label: { fontSize: 13, fontFamily: fonts.semibold, fontWeight: "600", color: "#6C7A85", marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#E2E9EE",
  },
  dateButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E2E9EE",
  },
  datePickerIosRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E2E9EE",
    alignItems: "flex-start",
  },
  dateButtonText: { fontSize: 16, color: "#2F4858" },
  errorText: { color: "#D96A5B", fontSize: 13, marginTop: 16, textAlign: "center" },
});
