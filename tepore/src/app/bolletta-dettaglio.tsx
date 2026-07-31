// src/app/bolletta-dettaglio.tsx

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ascoltaBolletta,
  eliminaBolletta,
  segnaBollettaPagata,
  segnaBollettaNonPagata,
} from "../services/bollette";
import { Bolletta, TipoBolletta } from "../types";
import { fonts } from "../theme";

const TIPO_INFO: Record<TipoBolletta, { label: string; emoji: string }> = {
  acqua: { label: "Acqua", emoji: "💧" },
  luce: { label: "Luce", emoji: "⚡" },
  gas: { label: "Gas", emoji: "🔥" },
  internet: { label: "Internet", emoji: "🌐" },
  telefono: { label: "Telefono", emoji: "📱" },
  altro: { label: "Altro", emoji: "📄" },
};

export default function BollettaDettaglioScreen() {
  const { id, vista } = useLocalSearchParams<{ id: string; vista?: string }>();
  const [bolletta, setBolletta] = useState<Bolletta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingPagata, setIsTogglingPagata] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsubscribe = ascoltaBolletta(id, (dati) => {
      setBolletta(dati);
      setIsLoading(false);
    });
    return unsubscribe;
  }, [id]);

  function handleElimina() {
    Alert.alert(
      "Eliminare la bolletta?",
      `Stai per eliminare definitivamente "${bolletta?.nome}". Questa azione non si può annullare.`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            setIsDeleting(true);
            try {
              await eliminaBolletta(id);
              router.replace(`/bollette?vista=${vista || "da-pagare"}`);
            } catch (error) {
              setIsDeleting(false);
              Alert.alert("Errore", "Non è stato possibile eliminare la bolletta. Riprova.");
            }
          },
        },
      ]
    );
  }

  // Segnare come PAGATA è un'azione a basso rischio (positiva, difficile
  // da rimpiangere) -> nessuna conferma, avviene subito.
  async function handleSegnaPagata() {
    if (!id) return;
    setIsTogglingPagata(true);
    try {
      const prossimaScadenza = await segnaBollettaPagata(id);
      if (prossimaScadenza) {
        Alert.alert(
          "Fatto! ✓",
          `Ho creato automaticamente la prossima bolletta, in scadenza il ${new Date(prossimaScadenza).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}.`,
          [{ text: "OK", onPress: () => router.replace(`/bollette?vista=${vista || "da-pagare"}`) }]
        );
      } else {
        router.replace(`/bollette?vista=${vista || "da-pagare"}`);
      }
    } catch (error) {
      Alert.alert("Errore", "Non è stato possibile aggiornare lo stato. Riprova.");
    } finally {
      setIsTogglingPagata(false);
    }
  }

  // Togliere il pagato è l'azione "rischiosa" (la bolletta torna tra quelle
  // da pagare) -> chiediamo conferma esplicita per evitare tap accidentali.
  function handleTogliPagata() {
    Alert.alert(
      "Segnare come NON pagata?",
      `"${bolletta?.nome}" tornerà nella lista "Da pagare". Confermi?`,
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Sì, togli il pagato",
          style: "destructive",
          onPress: async () => {
            if (!id) return;
            setIsTogglingPagata(true);
            try {
              await segnaBollettaNonPagata(id);
              router.replace(`/bollette?vista=${vista || "storico"}`);
            } catch (error) {
              Alert.alert("Errore", "Non è stato possibile aggiornare lo stato. Riprova.");
            } finally {
              setIsTogglingPagata(false);
            }
          },
        },
      ]
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#336699" />
      </View>
    );
  }

  if (!bolletta) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.notFoundText}>Bolletta non trovata.</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Torna indietro</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const info = TIPO_INFO[bolletta.tipo];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText} numberOfLines={1}>‹ Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Dettaglio</Text>
        <View style={styles.backButtonPlaceholder} />
      </View>

      <View style={styles.content}>
        <View style={styles.emojiCircle}>
          <Text style={styles.emoji}>{info.emoji}</Text>
        </View>

        <Text style={styles.nome}>{bolletta.nome}</Text>
        <Text style={styles.tipoLabel}>{info.label}</Text>

        <View
          style={[
            styles.statusBadge,
            bolletta.pagata ? styles.statusBadgePagata : styles.statusBadgeDaPagare,
          ]}
        >
          <Text style={styles.statusBadgeText}>
            {bolletta.pagata ? "✓ Pagata" : "Da pagare"}
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Importo</Text>
            <Text style={styles.detailValue}>€ {bolletta.importo.toFixed(2)}</Text>
          </View>
          <View style={styles.detailDivider} />
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Scadenza</Text>
            <Text style={styles.detailValue}>{formatDataCompleta(bolletta.dataScadenza)}</Text>
          </View>
          {bolletta.pagata && (
            <>
              <View style={styles.detailDivider} />
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Stato</Text>
                <Text style={styles.detailValuePagata}>Pagata</Text>
              </View>
            </>
          )}
        </View>

        {/* Azione pagata/non pagata: cambia completamente aspetto e testo
            a seconda della direzione, per rendere ovvio cosa succederà. */}
        {bolletta.pagata ? (
          <TouchableOpacity
            style={styles.toglipagataButton}
            onPress={handleTogliPagata}
            disabled={isTogglingPagata}
          >
            {isTogglingPagata ? (
              <ActivityIndicator color="#D96A5B" />
            ) : (
              <Text style={styles.toglipagataButtonText}>↩ Togli il pagato</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.segnapagataButton}
            onPress={handleSegnaPagata}
            disabled={isTogglingPagata}
          >
            {isTogglingPagata ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.segnapagataButtonText}>✓ Segna come pagata</Text>
            )}
          </TouchableOpacity>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => router.push(`/bolletta-nuova?id=${bolletta.id}`)}
          >
            <Text style={styles.editButtonText}>Modifica</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleElimina}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator color="#D96A5B" />
            ) : (
              <Text style={styles.deleteButtonText}>Elimina</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function formatDataCompleta(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("it-IT", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FA",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#F5F8FA",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  notFoundText: {
    fontSize: 15,
    color: "#6C7A85",
  },
  backLink: {
    color: "#336699",
    fontSize: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  backButton: {
    backgroundColor: "#336699",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  backButtonPlaceholder: {
    width: 90,
  },
  backText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold, fontWeight: "700",
    color: "#2F4858",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  emojiCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E9EE",
  },
  emoji: {
    fontSize: 34,
  },
  nome: {
    fontSize: 20,
    fontFamily: fonts.bold, fontWeight: "700",
    color: "#2F4858",
    textAlign: "center",
  },
  tipoLabel: {
    fontSize: 13,
    color: "#6C7A85",
    marginTop: 4,
    marginBottom: 12,
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 24,
  },
  statusBadgePagata: {
    backgroundColor: "#D4EDD4",
  },
  statusBadgeDaPagare: {
    backgroundColor: "#DCEBF3",
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: fonts.semibold, fontWeight: "600",
    color: "#2F4858",
  },
  detailsCard: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E9EE",
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  detailDivider: {
    height: 1,
    backgroundColor: "#EEF2F5",
  },
  detailLabel: {
    fontSize: 14,
    color: "#6C7A85",
  },
  detailValue: {
    fontSize: 14,
    fontFamily: fonts.semibold, fontWeight: "600",
    color: "#2F4858",
  },
  detailValuePagata: {
    fontSize: 14,
    fontFamily: fonts.bold, fontWeight: "700",
    color: "#2E7D32",
  },
  segnapagataButton: {
    width: "100%",
    backgroundColor: "#2E7D32",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 20,
  },
  segnapagataButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
  toglipagataButton: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F3C4BD",
  },
  toglipagataButtonText: {
    color: "#D96A5B",
    fontSize: 15,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
  actions: {
    width: "100%",
    gap: 10,
  },
  editButton: {
    backgroundColor: "#336699",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  editButtonText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
  deleteButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F3C4BD",
  },
  deleteButtonText: {
    color: "#D96A5B",
    fontSize: 15,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
});
