// src/app/immondizia-tipo-form.tsx
//
// Form per creare (senza ?id) o modificare (?id=X) un tipo di rifiuto.
// La parte più importante: invece di "giorni + una frequenza condivisa",
// qui si costruisce un elenco di ASSEGNAZIONI indipendenti (giorno +
// propria frequenza), così un tipo come "Secco" può uscire il martedì
// ogni settimana E il giovedì ogni 2 settimane, con impostazioni diverse
// per ciascun giorno.

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
  Keyboard,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useHousehold } from "../hooks/useHousehold";
import {
  ascoltaTipiRifiuto,
  creaTipoRifiuto,
  aggiornaTipoRifiuto,
  PALETTE_COLORI,
  coloreTestoLeggibile,
} from "../services/immondizia";
import { AssegnazioneGiorno, FrequenzaRaccolta, GiornoSettimana, TipoRifiutoPersonalizzato } from "../types";

const GIORNI: { key: GiornoSettimana; label: string }[] = [
  { key: "lunedi", label: "Lunedì" },
  { key: "martedi", label: "Martedì" },
  { key: "mercoledi", label: "Mercoledì" },
  { key: "giovedi", label: "Giovedì" },
  { key: "venerdi", label: "Venerdì" },
  { key: "sabato", label: "Sabato" },
  { key: "domenica", label: "Domenica" },
];

const GIORNO_LABEL: Record<GiornoSettimana, string> = {
  lunedi: "Lunedì", martedi: "Martedì", mercoledi: "Mercoledì",
  giovedi: "Giovedì", venerdi: "Venerdì", sabato: "Sabato", domenica: "Domenica",
};

// Dimensione fissa e compatta per i cerchi colore — la riga viene centrata
// nello schermo invece di occupare tutta la larghezza disponibile.
const SWATCH_SIZE = 32;

export default function ImmondiziaTipoFormScreen() {
  const { profile } = useHousehold();
  const { id, anno } = useLocalSearchParams<{ id?: string; anno?: string }>();
  const isEditMode = !!id;

  const [tuttiITipi, setTuttiITipi] = useState<TipoRifiutoPersonalizzato[]>([]);
  const [nome, setNome] = useState("");
  const [lettera, setLettera] = useState("");
  const [coloreSelezionato, setColoreSelezionato] = useState<string | null>(null);
  const [assegnazioni, setAssegnazioni] = useState<AssegnazioneGiorno[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingEsistente, setIsLoadingEsistente] = useState(isEditMode);

  // Stato del "mini form" per aggiungere una nuova assegnazione
  const [nuovoGiorno, setNuovoGiorno] = useState<GiornoSettimana | null>(null);
  const [nuovaFrequenza, setNuovaFrequenza] = useState<FrequenzaRaccolta>("ogni-settimana");
  const [nuovaData, setNuovaData] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    if (!profile?.householdId) return;
    return ascoltaTipiRifiuto(profile.householdId, setTuttiITipi);
  }, [profile?.householdId]);

  useEffect(() => {
    if (!id) return;
    const esistente = tuttiITipi.find((t) => t.id === id);
    if (esistente) {
      setNome(esistente.nome);
      setLettera(esistente.lettera);
      setColoreSelezionato(esistente.colore);
      setAssegnazioni(esistente.assegnazioni ?? []);
      setIsLoadingEsistente(false);
    }
  }, [id, tuttiITipi]);

  const giorniGiaAssegnati = assegnazioni.map((a) => a.giorno);
  const giorniDisponibili = GIORNI.filter((g) => !giorniGiaAssegnati.includes(g.key));

  function handleAggiungiAssegnazione() {
    if (!nuovoGiorno) return;
    setAssegnazioni((prev) => [
      ...prev,
      { giorno: nuovoGiorno, frequenza: nuovaFrequenza, dataRiferimento: nuovaData.getTime() },
    ]);
    setNuovoGiorno(null);
    setNuovaFrequenza("ogni-settimana");
    setNuovaData(new Date());
  }

  function handleRimuoviAssegnazione(giorno: GiornoSettimana) {
    setAssegnazioni((prev) => prev.filter((a) => a.giorno !== giorno));
  }

  async function handleSave() {
    Keyboard.dismiss();
    setErrorMessage(null);

    if (!nome.trim() || !lettera.trim()) {
      setErrorMessage('Inserisci sia il nome (es. "Secco") sia la sigla (es. "S").');
      return;
    }
    if (assegnazioni.length === 0) {
      setErrorMessage("Aggiungi almeno un giorno con la sua frequenza.");
      return;
    }
    if (!profile?.householdId) return;

    setIsSubmitting(true);
    try {
      if (isEditMode && id) {
        await aggiornaTipoRifiuto(id, {
          nome,
          lettera,
          assegnazioni,
          colore: coloreSelezionato ?? undefined,
        });
      } else {
        const annoNumerico = anno ? parseInt(anno, 10) : new Date().getFullYear();
        await creaTipoRifiuto(
          {
            householdId: profile.householdId,
            nome,
            lettera,
            assegnazioni,
            anno: annoNumerico,
            colore: coloreSelezionato ?? undefined,
          },
          tuttiITipi.length
        );
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
        <Text style={styles.title}>{isEditMode ? "Modifica tipo" : "Nuovo tipo"}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={handleSave} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.headerButtonText}>Salva</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
      >
        <Text style={styles.label}>Nome</Text>
        <TextInput
          style={styles.input}
          placeholder='Es. "Secco"'
          placeholderTextColor="#999"
          value={nome}
            onChangeText={setNome}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>Sigla (max 3 caratteri)</Text>
          <TextInput
            style={[styles.input, styles.inputSigla]}
            placeholder="Es. S"
            placeholderTextColor="#999"
            value={lettera}
            onChangeText={setLettera}
            maxLength={3}
            autoCapitalize="characters"
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          <Text style={styles.label}>Colore facoltativo</Text>
          <View style={styles.coloriGrid}>
            {PALETTE_COLORI.slice(0, 5).map((colore) => (
              <TouchableOpacity
                key={colore}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: colore },
                  colore === "#FFFFFF" && styles.colorSwatchBiancoBordo,
                  coloreSelezionato === colore && styles.colorSwatchSelected,
                ]}
                onPress={() => setColoreSelezionato(colore)}
              >
                {coloreSelezionato === colore && (
                  <Text style={[styles.colorSwatchCheck, { color: coloreTestoLeggibile(colore) }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.coloriGrid}>
            {PALETTE_COLORI.slice(5, 10).map((colore) => (
              <TouchableOpacity
                key={colore}
                style={[
                  styles.colorSwatch,
                  { backgroundColor: colore },
                  colore === "#FFFFFF" && styles.colorSwatchBiancoBordo,
                  coloreSelezionato === colore && styles.colorSwatchSelected,
                ]}
                onPress={() => setColoreSelezionato(colore)}
              >
                {coloreSelezionato === colore && (
                  <Text style={[styles.colorSwatchCheck, { color: coloreTestoLeggibile(colore) }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Giorni assegnati</Text>
          {assegnazioni.length === 0 ? (
            <Text style={styles.nessunGiornoText}>Nessun giorno ancora — aggiungine uno qui sotto.</Text>
          ) : (
            assegnazioni.map((a) => (
              <View key={a.giorno} style={styles.assegnazioneRow}>
                <View>
                  <Text style={styles.assegnazioneGiorno}>{GIORNO_LABEL[a.giorno]}</Text>
                  <Text style={styles.assegnazioneFrequenza}>
                    {a.frequenza === "ogni-settimana" ? "Ogni settimana" : "Ogni 2 settimane"}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRimuoviAssegnazione(a.giorno)} hitSlop={10}>
                  <Text style={styles.rimuoviText}>Rimuovi</Text>
                </TouchableOpacity>
              </View>
            ))
          )}

          {giorniDisponibili.length > 0 && (
            <View style={styles.nuovaAssegnazioneCard}>
              <Text style={styles.nuovaAssegnazioneTitle}>Aggiungi un giorno</Text>

              <View style={styles.giorniGrid}>
                {giorniDisponibili.map((giorno) => (
                  <TouchableOpacity
                    key={giorno.key}
                    style={[styles.giornoChip, nuovoGiorno === giorno.key && styles.giornoChipActive]}
                    onPress={() => setNuovoGiorno(giorno.key)}
                  >
                    <Text style={[styles.giornoChipText, nuovoGiorno === giorno.key && styles.giornoChipTextActive]}>
                      {giorno.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {nuovoGiorno && (
                <>
                  <View style={styles.frequenzaRow}>
                    <TouchableOpacity
                      style={[styles.frequenzaButton, nuovaFrequenza === "ogni-settimana" && styles.frequenzaButtonActive]}
                      onPress={() => setNuovaFrequenza("ogni-settimana")}
                    >
                      <Text style={[styles.frequenzaText, nuovaFrequenza === "ogni-settimana" && styles.frequenzaTextActive]}>
                        Ogni settimana
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.frequenzaButton, nuovaFrequenza === "ogni-2-settimane" && styles.frequenzaButtonActive]}
                      onPress={() => setNuovaFrequenza("ogni-2-settimane")}
                    >
                      <Text style={[styles.frequenzaText, nuovaFrequenza === "ogni-2-settimane" && styles.frequenzaTextActive]}>
                        Ogni 2 settimane
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {nuovaFrequenza === "ogni-2-settimane" && (
                    <>
                      <Text style={styles.helperText}>
                        Indica una data in cui sai che questa raccolta avviene, per calcolare le settimane giuste.
                      </Text>
                      {Platform.OS === "ios" ? (
                        <View style={styles.datePickerIosRow}>
                          <DateTimePicker
                            value={nuovaData}
                            mode="date"
                            display="compact"
                            onChange={(event, selectedDate) => {
                              if (selectedDate) setNuovaData(selectedDate);
                            }}
                          />
                        </View>
                      ) : (
                        <>
                          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
                            <Text style={styles.dateButtonText}>
                              {nuovaData.toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}
                            </Text>
                          </TouchableOpacity>
                          {showDatePicker && (
                            <DateTimePicker
                              value={nuovaData}
                              mode="date"
                              display="default"
                              onChange={(event, selectedDate) => {
                                setShowDatePicker(false);
                                if (selectedDate) setNuovaData(selectedDate);
                              }}
                            />
                          )}
                        </>
                      )}
                    </>
                  )}

                  <TouchableOpacity style={styles.confermaButton} onPress={handleAggiungiAssegnazione}>
                    <Text style={styles.confermaButtonText}>+ Aggiungi {GIORNO_LABEL[nuovoGiorno]}</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}
        </ScrollView>
      </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8F3" },
  loadingContainer: { flex: 1, backgroundColor: "#FFF8F3", justifyContent: "center", alignItems: "center" },
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
  headerButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  title: { fontSize: 15, fontWeight: "700", color: "#3A2E28" },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 60 },
  label: { fontSize: 13, fontWeight: "600", color: "#7A6A60", marginBottom: 8, marginTop: 16 },
  helperText: { fontSize: 12, color: "#9A8A80", marginBottom: 10, marginTop: 10, lineHeight: 17 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  inputSigla: { width: 100 },
  coloriGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 14, marginBottom: 12 },
  colorSwatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#EEE0D5",
  },
  colorSwatchSelected: {
    borderColor: "#3A2E28",
    borderWidth: 3,
  },
  colorSwatchBiancoBordo: {
    borderColor: "#3A2E28",
    borderWidth: 1.5,
  },
  colorSwatchCheck: {
    fontSize: 14,
    fontWeight: "700",
  },
  nessunGiornoText: { fontSize: 13, color: "#9A8A80", fontStyle: "italic" },
  assegnazioneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  assegnazioneGiorno: { fontSize: 14, fontWeight: "600", color: "#3A2E28" },
  assegnazioneFrequenza: { fontSize: 12, color: "#9A8A80", marginTop: 2 },
  rimuoviText: { fontSize: 12, color: "#C0392B", fontWeight: "600" },
  nuovaAssegnazioneCard: {
    backgroundColor: "#F5EDE4",
    borderRadius: 14,
    padding: 16,
    marginTop: 12,
  },
  nuovaAssegnazioneTitle: { fontSize: 13, fontWeight: "600", color: "#7A6A60", marginBottom: 10 },
  giorniGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  giornoChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  giornoChipActive: { backgroundColor: "#D97742", borderColor: "#D97742" },
  giornoChipText: { fontSize: 13, fontWeight: "500", color: "#3A2E28" },
  giornoChipTextActive: { color: "#fff" },
  frequenzaRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  frequenzaButton: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  frequenzaButtonActive: { backgroundColor: "#D97742", borderColor: "#D97742" },
  frequenzaText: { fontSize: 12, fontWeight: "600", color: "#3A2E28" },
  frequenzaTextActive: { color: "#fff" },
  dateButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  datePickerIosRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#EEE0D5",
    alignItems: "flex-start",
  },
  dateButtonText: { fontSize: 15, color: "#3A2E28" },
  confermaButton: {
    backgroundColor: "#3A2E28",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 12,
  },
  confermaButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  errorText: { color: "#C0392B", fontSize: 13, marginTop: 16, textAlign: "center" },
});
