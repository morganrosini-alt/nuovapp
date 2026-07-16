// src/app/immondizia-tipi.tsx
//
// Lista dei tipi di rifiuto, con un selettore per passare tra il calendario
// dell'anno corrente e quello dell'anno prossimo (utile a dicembre, quando
// arriva il nuovo calendario del comune e va preparato in anticipo).

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, ActivityIndicator } from "react-native";
import { router } from "expo-router";
import { useHousehold } from "../hooks/useHousehold";
import { ascoltaTipiRifiuto, eliminaTipoRifiuto, duplicaTipiPerAnno, coloreTestoLeggibile } from "../services/immondizia";
import { TipoRifiutoPersonalizzato } from "../types";

const GIORNO_BREVE: Record<string, string> = {
  lunedi: "Lun",
  martedi: "Mar",
  mercoledi: "Mer",
  giovedi: "Gio",
  venerdi: "Ven",
  sabato: "Sab",
  domenica: "Dom",
};

const ORDINE_GIORNI = ["lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato", "domenica"];

export default function ImmondiziaTipiScreen() {
  const { profile } = useHousehold();
  const [tuttiITipi, setTuttiITipi] = useState<TipoRifiutoPersonalizzato[]>([]);
  const [isCopiando, setIsCopiando] = useState(false);

  const annoCorrente = new Date().getFullYear();
  const annoProssimo = annoCorrente + 1;
  const [annoSelezionato, setAnnoSelezionato] = useState(annoCorrente);

  useEffect(() => {
    if (!profile?.householdId) return;
    return ascoltaTipiRifiuto(profile.householdId, setTuttiITipi);
  }, [profile?.householdId]);

  const tipiAnnoCorrente = tuttiITipi.filter((t) => t.anno === annoCorrente);
  const tipiAnnoProssimo = tuttiITipi.filter((t) => t.anno === annoProssimo);
  const tipiVisualizzati = annoSelezionato === annoCorrente ? tipiAnnoCorrente : tipiAnnoProssimo;

  function handleElimina(tipo: TipoRifiutoPersonalizzato) {
    Alert.alert(`Eliminare "${tipo.nome}"?`, "Sparirà anche dal calendario.", [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => eliminaTipoRifiuto(tipo.id) },
    ]);
  }

  async function handleCopiaDaAnnoCorrente() {
    if (!profile?.householdId) return;
    setIsCopiando(true);
    try {
      await duplicaTipiPerAnno(tipiAnnoCorrente, profile.householdId, annoProssimo);
    } catch (error) {
      Alert.alert("Errore", "Non è stato possibile copiare il calendario. Riprova.");
    } finally {
      setIsCopiando(false);
    }
  }

  function riepilogoAssegnazioni(tipo: TipoRifiutoPersonalizzato): string {
    const assegnazioni = tipo.assegnazioni ?? [];
    if (assegnazioni.length === 0) return "Nessun giorno assegnato";
    return assegnazioni
      .slice()
      .sort((a, b) => ORDINE_GIORNI.indexOf(a.giorno) - ORDINE_GIORNI.indexOf(b.giorno))
      .map((a) => `${GIORNO_BREVE[a.giorno]} (${a.frequenza === "ogni-settimana" ? "sett." : "2 sett."})`)
      .join(", ");
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>‹ Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tipi di rifiuto</Text>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      <View style={styles.annoSwitch}>
        <TouchableOpacity
          style={[styles.annoButton, annoSelezionato === annoCorrente && styles.annoButtonActive]}
          onPress={() => setAnnoSelezionato(annoCorrente)}
        >
          <Text style={[styles.annoButtonText, annoSelezionato === annoCorrente && styles.annoButtonTextActive]}>
            {annoCorrente}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.annoButton, annoSelezionato === annoProssimo && styles.annoButtonActive]}
          onPress={() => setAnnoSelezionato(annoProssimo)}
        >
          <Text style={[styles.annoButtonText, annoSelezionato === annoProssimo && styles.annoButtonTextActive]}>
            {annoProssimo}
          </Text>
        </TouchableOpacity>
      </View>

      {annoSelezionato === annoProssimo && tipiAnnoProssimo.length === 0 && tipiAnnoCorrente.length > 0 && (
        <View style={styles.copiaCard}>
          <Text style={styles.copiaText}>
            Non hai ancora preparato il calendario per il {annoProssimo}. Puoi partire da una copia di
            quello del {annoCorrente} e modificare solo ciò che cambia.
          </Text>
          <TouchableOpacity style={styles.copiaButton} onPress={handleCopiaDaAnnoCorrente} disabled={isCopiando}>
            {isCopiando ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.copiaButtonText}>Copia da {annoCorrente}</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={tipiVisualizzati}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Nessun tipo creato ancora per il {annoSelezionato}. Tocca "+" per crearne uno.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tipoCard}
            onPress={() => router.push(`/immondizia-tipo-form?id=${item.id}`)}
            onLongPress={() => handleElimina(item)}
          >
            <View style={[styles.letteraBadge, { backgroundColor: item.colore }]}>
              <Text style={[styles.letteraBadgeText, { color: coloreTestoLeggibile(item.colore) }]}>
                {item.lettera}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.tipoNome}>{item.nome}</Text>
              <Text style={styles.tipoDettaglio}>{riepilogoAssegnazioni(item)}</Text>
            </View>
            <TouchableOpacity onPress={() => handleElimina(item)} hitSlop={10}>
              <Text style={styles.eliminaText}>Elimina</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push(`/immondizia-tipo-form?anno=${annoSelezionato}`)}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFF8F3" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerButton: {
    backgroundColor: "#D97742",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonPlaceholder: { width: 90 },
  headerButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "700", color: "#3A2E28" },
  annoSwitch: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#F0E4D8",
    borderRadius: 12,
    padding: 4,
    marginBottom: 14,
  },
  annoButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  annoButtonActive: { backgroundColor: "#fff" },
  annoButtonText: { fontSize: 14, color: "#9A8A80", fontWeight: "600" },
  annoButtonTextActive: { color: "#D97742" },
  copiaCard: {
    backgroundColor: "#FFF3E9",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#F0C89A",
  },
  copiaText: { fontSize: 13, color: "#7A6A60", lineHeight: 19, marginBottom: 12 },
  copiaButton: {
    backgroundColor: "#D97742",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  copiaButtonText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  emptyText: { textAlign: "center", color: "#9A8A80", fontSize: 13, lineHeight: 19, marginTop: 20 },
  tipoCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  letteraBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    borderWidth: 0.75,
    borderColor: "#3A2E28",
  },
  letteraBadgeText: { fontSize: 15, fontWeight: "700" },
  tipoNome: { fontSize: 14, fontWeight: "600", color: "#3A2E28" },
  tipoDettaglio: { fontSize: 12, color: "#9A8A80", marginTop: 3 },
  eliminaText: { fontSize: 12, color: "#C0392B", fontWeight: "600", marginLeft: 8 },
  fab: {
    position: "absolute",
    bottom: 30,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#D97742",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  fabText: { fontSize: 28, color: "#fff", fontWeight: "400", marginTop: -2 },
});
