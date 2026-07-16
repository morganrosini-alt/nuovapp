// src/app/immondizia.tsx

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert } from "react-native";
import { router } from "expo-router";
import { useHousehold } from "../hooks/useHousehold";
import {
  ascoltaTipiRifiuto,
  ascoltaRaccolteStraordinarie,
  eliminaRaccoltaStraordinaria,
  lettereAttiveInGiorno,
  coloreTestoLeggibile,
} from "../services/immondizia";
import { GiornoSettimana, RaccoltaStraordinaria, TipoRifiutoPersonalizzato } from "../types";

const GIORNI_LABEL: Record<GiornoSettimana, string> = {
  lunedi: "Lunedì",
  martedi: "Martedì",
  mercoledi: "Mercoledì",
  giovedi: "Giovedì",
  venerdi: "Venerdì",
  sabato: "Sabato",
  domenica: "Domenica",
};

const INDICE_JS_TO_GIORNO: GiornoSettimana[] = [
  "domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato",
];

export default function ImmondiziaScreen() {
  const { profile } = useHousehold();
  const [tipi, setTipi] = useState<TipoRifiutoPersonalizzato[]>([]);
  const [straordinarie, setStraordinarie] = useState<RaccoltaStraordinaria[]>([]);

  useEffect(() => {
    if (!profile?.householdId) return;
    const unsub1 = ascoltaTipiRifiuto(profile.householdId, setTipi);
    const unsub2 = ascoltaRaccolteStraordinarie(profile.householdId, setStraordinarie);
    return () => {
      unsub1();
      unsub2();
    };
  }, [profile?.householdId]);

  // Finestra mobile di 8 giorni: ieri, oggi, e i prossimi 6 — così anche di
  // domenica si vede subito cosa tocca lunedì, invece di un fisso Lun-Dom
  // che di weekend nasconderebbe il giorno successivo.
  const finestraOttoGiorni = [-1, 0, 1, 2, 3, 4, 5, 6].map((offset) => {
    const data = new Date(Date.now() + offset * 24 * 60 * 60 * 1000);
    const giorno = INDICE_JS_TO_GIORNO[data.getDay()];
    let etichetta = "";
    if (offset === -1) etichetta = "ieri";
    else if (offset === 0) etichetta = "oggi";
    else if (offset === 1) etichetta = "domani";
    return { data, giorno, etichetta, evidenzia: offset === 0 };
  });

  const oggi = new Date();
  const giornoOggi = INDICE_JS_TO_GIORNO[oggi.getDay()];
  const tipiOggi = lettereAttiveInGiorno(tipi, giornoOggi, oggi);

  function handleEliminaStraordinaria(raccolta: RaccoltaStraordinaria) {
    Alert.alert("Eliminare la raccolta?", `Rimuovere "${raccolta.nome}"?`, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => eliminaRaccoltaStraordinaria(raccolta.id) },
    ]);
  }

  const nessunTipoCreato = tipi.length === 0;

  // Da dicembre in poi, se il calendario dell'anno prossimo non è ancora
  // stato preparato, mostriamo un piccolo avviso — meglio di un bottone
  // fisso visibile tutto l'anno che sarebbe inutile per 10 mesi su 12.
  const oraCorrente = new Date();
  const annoCorrente = oraCorrente.getFullYear();
  const siamoADicembre = oraCorrente.getMonth() === 11; // 0-indicizzato, 11 = dicembre
  const tipiAnnoProssimoEsistono = tipi.some((t) => t.anno === annoCorrente + 1);
  const mostraAvvisoCambioAnno = siamoADicembre && !tipiAnnoProssimoEsistono && !nessunTipoCreato;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>‹ Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Immondizia {new Date().getFullYear()}</Text>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.push("/immondizia-tipi")}>
          <Text style={styles.headerButtonText}>Tipi</Text>
        </TouchableOpacity>
      </View>

      {nessunTipoCreato ? (
        <View style={styles.onboardingCard}>
          <Text style={styles.onboardingEmoji}>🗑️</Text>
          <Text style={styles.onboardingTitle}>Prima crea i tuoi tipi di rifiuto</Text>
          <Text style={styles.onboardingText}>
            Ogni comune organizza la differenziata in modo diverso — definisci tu le categorie
            (es. "Plastica e Vetro" con sigla "P") e assegna subito i giorni e la frequenza.
          </Text>
          <TouchableOpacity style={styles.onboardingButton} onPress={() => router.push("/immondizia-tipi")}>
            <Text style={styles.onboardingButtonText}>Crea il primo tipo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={straordinarie}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              <View style={styles.oggiCard}>
                <Text style={styles.oggiLabel}>Stasera porta fuori</Text>
                {tipiOggi.length > 0 ? (
                  <>
                    <View style={styles.oggiBadgeRow}>
                      {tipiOggi.map((t) => (
                        <View key={t.id} style={[styles.oggiBadge, { backgroundColor: t.colore }]}>
                          <Text style={[styles.oggiBadgeText, { color: coloreTestoLeggibile(t.colore) }]}>
                            {t.lettera}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Text style={styles.oggiNomi}>{tipiOggi.map((t) => t.nome).join(", ")}</Text>
                  </>
                ) : (
                  <Text style={styles.oggiValueVuoto}>Nessuna raccolta stasera</Text>
                )}
              </View>

              {mostraAvvisoCambioAnno && (
                <TouchableOpacity
                  style={styles.avvisoAnnoCard}
                  onPress={() => router.push("/immondizia-tipi")}
                >
                  <Text style={styles.avvisoAnnoText}>
                    📅 Il calendario del {annoCorrente + 1} non è ancora pronto — tocca qui per prepararlo.
                  </Text>
                </TouchableOpacity>
              )}

              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>Calendario</Text>
                <TouchableOpacity
                  style={styles.mensileButton}
                  onPress={() => router.push("/immondizia-mensile")}
                >
                  <Text style={styles.mensileButtonText}>Mensile</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.sectionSubtitle}>
                Solo visualizzazione — per modificare vai su "Tipi" in alto.
              </Text>
              <View style={styles.weekCard}>
                {finestraOttoGiorni.map((giornoInfo, index) => {
                  const tipiDelGiorno = lettereAttiveInGiorno(tipi, giornoInfo.giorno, giornoInfo.data);
                  return (
                    <View
                      key={index}
                      style={[
                        styles.dayRow,
                        index < finestraOttoGiorni.length - 1 && styles.dayRowBorder,
                        giornoInfo.evidenzia && styles.dayRowOggi,
                      ]}
                    >
                      <Text style={[styles.dayLabel, giornoInfo.evidenzia && styles.dayLabelOggi]}>
                        {GIORNI_LABEL[giornoInfo.giorno]}
                        {giornoInfo.etichetta ? ` · ${giornoInfo.etichetta}` : ""}
                      </Text>
                      <View style={styles.dayValueRow}>
                        {tipiDelGiorno.length > 0 ? (
                          tipiDelGiorno.map((t) => (
                            <View key={t.id} style={[styles.dayBadge, { backgroundColor: t.colore }]}>
                              <Text style={[styles.dayBadgeText, { color: coloreTestoLeggibile(t.colore) }]}>
                                {t.lettera}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={styles.dayValueVuoto}>—</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>

              <Text style={styles.sectionTitle}>Raccolte straordinarie</Text>
              <Text style={styles.sectionSubtitle}>
                Ramaglie, ingombranti e altre raccolte su prenotazione, senza giorno fisso.
              </Text>
            </>
          }
          ListEmptyComponent={
            <Text style={styles.emptyText}>Nessuna raccolta straordinaria in programma.</Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.straordinariaCard}
              activeOpacity={0.7}
              onPress={() => router.push(`/raccolta-straordinaria-nuova?id=${item.id}`)}
            >
              <View>
                <Text style={styles.straordinariaNome}>{item.nome}</Text>
                <Text style={styles.straordinariaData}>{formatData(item.data)}</Text>
              </View>
              <TouchableOpacity onPress={() => handleEliminaStraordinaria(item)} hitSlop={10}>
                <Text style={styles.straordinariaElimina}>Elimina</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {!nessunTipoCreato && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push("/raccolta-straordinaria-nuova")}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function formatData(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("it-IT", { day: "numeric", month: "long" });
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
  headerButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "700", color: "#3A2E28" },
  onboardingCard: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  onboardingEmoji: { fontSize: 40, marginBottom: 12 },
  onboardingTitle: { fontSize: 17, fontWeight: "700", color: "#3A2E28", marginBottom: 8, textAlign: "center" },
  onboardingText: { fontSize: 13, color: "#9A8A80", textAlign: "center", lineHeight: 19, marginBottom: 20 },
  onboardingButton: { backgroundColor: "#D97742", borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  onboardingButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  list: { paddingHorizontal: 20, paddingBottom: 100 },
  oggiCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#D97742",
    alignItems: "center",
    marginBottom: 20,
  },
  oggiLabel: { fontSize: 13, color: "#9A8A80", marginBottom: 8 },
  oggiBadgeRow: { flexDirection: "row", gap: 8 },
  oggiBadge: {
    minWidth: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    borderWidth: 0.75,
    borderColor: "#3A2E28",
  },
  oggiBadgeText: { fontSize: 18, fontWeight: "700" },
  oggiLettere: { fontSize: 30, fontWeight: "700", color: "#3A2E28" },
  oggiNomi: { fontSize: 12, color: "#9A8A80", marginTop: 4, textAlign: "center" },
  oggiValueVuoto: { fontSize: 16, color: "#9A8A80", fontStyle: "italic" },
  avvisoAnnoCard: {
    backgroundColor: "#FFF3E9",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F0C89A",
  },
  avvisoAnnoText: { fontSize: 13, color: "#7A6A60", lineHeight: 18 },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#3A2E28", marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: "#9A8A80", marginBottom: 12, lineHeight: 17 },
  sectionTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  mensileButton: { backgroundColor: "#D97742", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  mensileButtonText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  weekCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEE0D5",
    marginBottom: 24,
    overflow: "hidden",
  },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  dayRowBorder: { borderBottomWidth: 1, borderBottomColor: "#F5EDE4" },
  dayRowOggi: { backgroundColor: "#FFF3E9" },
  dayLabel: { fontSize: 14, color: "#3A2E28", fontWeight: "500" },
  dayLabelOggi: { fontWeight: "700", color: "#D97742" },
  dayValueRow: { flexDirection: "row", gap: 4 },
  dayBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 0.75,
    borderColor: "#3A2E28",
  },
  dayBadgeText: { fontSize: 12, fontWeight: "700" },
  dayValue: { fontSize: 14, fontWeight: "700", color: "#3A2E28" },
  dayValueVuoto: { fontSize: 14, color: "#C9BBAE" },
  emptyText: { textAlign: "center", color: "#9A8A80", fontSize: 14, marginTop: 8 },
  straordinariaCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  straordinariaNome: { fontSize: 14, fontWeight: "600", color: "#3A2E28" },
  straordinariaData: { fontSize: 12, color: "#9A8A80", marginTop: 2 },
  straordinariaElimina: { fontSize: 12, color: "#C0392B", fontWeight: "600" },
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
