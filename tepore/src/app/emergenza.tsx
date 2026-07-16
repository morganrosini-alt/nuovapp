// src/app/emergenza.tsx
//
// Modulo gratuito con i numeri di emergenza dei principali paesi europei.
// Il paese viene rilevato automaticamente dalle impostazioni regione del
// telefono, ma resta sempre possibile cambiarlo manualmente (utile in
// viaggio, o se il rilevamento sbaglia). Volutamente NON è tap-to-call:
// solo copia negli appunti, per evitare chiamate accidentali a numeri di
// emergenza veri.

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import * as Localization from "expo-localization";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  PAESI_EMERGENZA,
  PAESE_FALLBACK,
  trovaPaeseByCodice,
  PaeseEmergenza,
} from "../data/numeriEmergenza";

const STORAGE_KEY = "tepore:paeseEmergenzaSelezionato";

export default function EmergenzaScreen() {
  const [paeseSelezionato, setPaeseSelezionato] = useState<PaeseEmergenza>(PAESE_FALLBACK);
  const [copiatoNumero, setCopiatoNumero] = useState<string | null>(null);

  useEffect(() => {
    async function inizializza() {
      // Prima controlla se l'utente aveva già scelto un paese manualmente
      // in passato (es. perché in viaggio) — se sì, rispetta quella scelta.
      const salvato = await AsyncStorage.getItem(STORAGE_KEY);
      if (salvato) {
        setPaeseSelezionato(trovaPaeseByCodice(salvato));
        return;
      }
      // Altrimenti rileva automaticamente dalle impostazioni del telefono.
      const regioni = Localization.getLocales();
      const regioneRilevata = regioni[0]?.regionCode;
      setPaeseSelezionato(trovaPaeseByCodice(regioneRilevata));
    }
    inizializza();
  }, []);

  async function handleSelezionaPaese(paese: PaeseEmergenza) {
    setPaeseSelezionato(paese);
    await AsyncStorage.setItem(STORAGE_KEY, paese.codice);
  }

  async function handleCopiaNumero(numero: string) {
    await Clipboard.setStringAsync(numero);
    setCopiatoNumero(numero);
    setTimeout(() => setCopiatoNumero(null), 1500);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>‹ Home</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Emergenze</Text>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      <Text style={styles.sectionLabel}>Paese</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.countryRow}
        contentContainerStyle={styles.countryRowContent}
        data={PAESI_EMERGENZA}
        keyExtractor={(item) => item.codice}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.countryChip,
              paeseSelezionato.codice === item.codice && styles.countryChipActive,
            ]}
            onPress={() => handleSelezionaPaese(item)}
          >
            <Text
              style={[
                styles.countryChipText,
                paeseSelezionato.codice === item.codice && styles.countryChipTextActive,
              ]}
            >
              {item.bandiera} {item.nome}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={paeseSelezionato.numeri}
        keyExtractor={(item) => item.label}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <Text style={styles.currentCountryLabel}>
            Numeri per: <Text style={styles.currentCountryName}>{paeseSelezionato.nome}</Text>
          </Text>
        }
        renderItem={({ item }) => (
          <View style={styles.numberCard}>
            <View>
              <Text style={styles.numberLabel}>{item.label}</Text>
              <Text style={styles.numberValue}>{item.numero}</Text>
            </View>
            <TouchableOpacity onPress={() => handleCopiaNumero(item.numero)} hitSlop={10}>
              <Ionicons
                name={copiatoNumero === item.numero ? "checkmark" : "copy-outline"}
                size={22}
                color={copiatoNumero === item.numero ? "#4A9D6E" : "#3A2E28"}
              />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
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
    paddingBottom: 16,
  },
  headerButton: {
    backgroundColor: "#D97742",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonPlaceholder: {
    width: 70,
  },
  headerButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3A2E28",
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#7A6A60",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  countryRow: {
    maxHeight: 44,
    marginBottom: 16,
  },
  countryRowContent: {
    paddingHorizontal: 20,
  },
  countryChip: {
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 38,
    justifyContent: "center",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#EEE0D5",
  },
  countryChipActive: {
    backgroundColor: "#D97742",
    borderColor: "#D97742",
  },
  countryChipText: {
    fontSize: 13,
    color: "#3A2E28",
    fontWeight: "500",
    lineHeight: 16,
    includeFontPadding: false,
    textAlignVertical: "center",
  },
  countryChipTextActive: {
    color: "#fff",
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  currentCountryLabel: {
    fontSize: 13,
    color: "#9A8A80",
    marginBottom: 12,
  },
  currentCountryName: {
    fontWeight: "700",
    color: "#3A2E28",
  },
  numberCard: {
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
  numberLabel: {
    fontSize: 13,
    color: "#9A8A80",
    marginBottom: 4,
  },
  numberValue: {
    fontSize: 22,
    fontWeight: "700",
    color: "#D97742",
  },
});
