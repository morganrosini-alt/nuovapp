// src/app/bollette.tsx

import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useHousehold } from "../hooks/useHousehold";
import { ascoltaBollette } from "../services/bollette";
import { Bolletta, TipoBolletta } from "../types";

const TIPO_INFO: Record<TipoBolletta, { label: string; emoji: string }> = {
  acqua: { label: "Acqua", emoji: "💧" },
  luce: { label: "Luce", emoji: "⚡" },
  gas: { label: "Gas", emoji: "🔥" },
  internet: { label: "Internet", emoji: "🌐" },
  telefono: { label: "Telefono", emoji: "📱" },
  altro: { label: "Altro", emoji: "📄" },
};

type Vista = "da-pagare" | "storico";

export default function BolletteScreen() {
  const { profile } = useHousehold();
  const params = useLocalSearchParams<{ vista?: string }>();
  const [bollette, setBollette] = useState<Bolletta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [vista, setVista] = useState<Vista>(params.vista === "storico" ? "storico" : "da-pagare");
  const [filtroTipo, setFiltroTipo] = useState<TipoBolletta | "tutti">("tutti");

  useEffect(() => {
    if (!profile?.householdId) return;

    const unsubscribe = ascoltaBollette(profile.householdId, (dati) => {
      setBollette(dati);
      setIsLoading(false);
    });

    return unsubscribe;
  }, [profile?.householdId]);

  const bolletteFiltrate = useMemo(() => {
    let risultato = bollette.filter((b) =>
      vista === "da-pagare" ? !b.pagata : b.pagata
    );

    if (vista === "storico" && filtroTipo !== "tutti") {
      risultato = risultato.filter((b) => b.tipo === filtroTipo);
    }

    return risultato;
  }, [bollette, vista, filtroTipo]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.homeButton} onPress={() => router.back()}>
          <Text style={styles.homeButtonText}>‹ Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bollette</Text>
        <View style={styles.homeButtonPlaceholder} />
      </View>

      <View style={styles.tabSwitch}>
        <TouchableOpacity
          style={[styles.tabButton, vista === "da-pagare" && styles.tabButtonActive]}
          onPress={() => setVista("da-pagare")}
        >
          <Text style={[styles.tabText, vista === "da-pagare" && styles.tabTextActive]}>
            Da pagare
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabButton, vista === "storico" && styles.tabButtonActive]}
          onPress={() => setVista("storico")}
        >
          <Text style={[styles.tabText, vista === "storico" && styles.tabTextActive]}>
            Storico
          </Text>
        </TouchableOpacity>
      </View>

      {vista === "storico" && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterRow}
          contentContainerStyle={styles.filterRowContent}
          data={[{ key: "tutti", label: "Tutti", emoji: "📋" }, ...Object.entries(TIPO_INFO).map(([key, info]) => ({ key, ...info }))]}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, filtroTipo === item.key && styles.filterChipActive]}
              onPress={() => setFiltroTipo(item.key as TipoBolletta | "tutti")}
            >
              <Text
                style={[styles.filterChipText, filtroTipo === item.key && styles.filterChipTextActive]}
              >
                {item.emoji} {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#D97742" />
      ) : (
        <FlatList
          data={bolletteFiltrate}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {vista === "da-pagare"
                ? "Nessuna bolletta in scadenza. 🎉"
                : "Nessuna bolletta pagata ancora in questo filtro."}
            </Text>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.7}
              onPress={() => router.push(`/bolletta-dettaglio?id=${item.id}&vista=${vista}`)}
            >
              <View style={styles.cardLeft}>
                <Text style={styles.cardEmoji}>{TIPO_INFO[item.tipo].emoji}</Text>
                <View>
                  <Text style={styles.cardNome}>{item.nome}</Text>
                  <Text
                    style={[
                      styles.cardData,
                      item.pagata && styles.cardDataPagata,
                      !item.pagata && item.dataScadenza < Date.now() && styles.cardDataScaduta,
                    ]}
                  >
                    {item.pagata
                      ? `PAGATA ${item.dataPagamento ? capitalizza(formatMese(item.dataPagamento)) : ""}`
                      : item.dataScadenza < Date.now()
                      ? `SCADUTO il ${formatData(item.dataScadenza)}`
                      : `Scade il ${formatData(item.dataScadenza)}`}
                  </Text>
                </View>
              </View>
              <Text style={styles.cardImporto}>€ {item.importo.toFixed(2)}</Text>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push("/bolletta-nuova")}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

function formatData(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "short",
  });
}

function formatMese(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("it-IT", { month: "long" });
}

function capitalizza(testo: string): string {
  return testo.charAt(0).toUpperCase() + testo.slice(1);
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
    paddingBottom: 16,
  },
  homeButton: {
    backgroundColor: "#D97742",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  homeButtonPlaceholder: {
    width: 70,
  },
  homeButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3A2E28",
  },
  tabSwitch: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: "#F0E4D8",
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 9,
  },
  tabButtonActive: {
    backgroundColor: "#fff",
  },
  tabText: {
    fontSize: 14,
    color: "#9A8A80",
    fontWeight: "600",
  },
  tabTextActive: {
    color: "#D97742",
  },
  filterRow: {
    maxHeight: 44,
    marginBottom: 8,
  },
  filterRowContent: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 36,
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  filterChipActive: {
    backgroundColor: "#D97742",
    borderColor: "#D97742",
  },
  filterChipText: {
    fontSize: 13,
    color: "#3A2E28",
    fontWeight: "500",
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  filterChipTextActive: {
    color: "#fff",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  emptyText: {
    textAlign: "center",
    color: "#9A8A80",
    marginTop: 40,
    fontSize: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  cardEmoji: {
    fontSize: 26,
    marginRight: 12,
  },
  cardNome: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3A2E28",
  },
  cardData: {
    fontSize: 12,
    color: "#9A8A80",
    marginTop: 2,
  },
  cardDataScaduta: {
    color: "#C0392B",
    fontWeight: "700",
  },
  cardDataPagata: {
    color: "#4A9D6E",
    fontWeight: "700",
  },
  cardImporto: {
    fontSize: 15,
    fontWeight: "700",
    color: "#3A2E28",
  },
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
  fabText: {
    fontSize: 28,
    color: "#fff",
    fontWeight: "400",
    marginTop: -2,
  },
});
