// src/app/esci-casa.tsx

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList, Alert } from "react-native";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { getHouseholdsByIds, leaveHousehold } from "../services/household";
import { Household } from "../types";

export default function EsciCasaScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [leavingId, setLeavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.householdIds || profile.householdIds.length === 0) {
      setHouseholds([]);
      setIsLoading(false);
      return;
    }
    getHouseholdsByIds(profile.householdIds).then((dati) => {
      setHouseholds(dati);
      setIsLoading(false);
    });
  }, [profile?.householdIds]);

  function handleSelectHousehold(household: Household) {
    Alert.alert(
      `Uscire da "${household.name}"?`,
      "Se esci, non potrai più vedere le sue bollette, scadenze e altri dati, e per rientrare ti servirà un nuovo codice invito.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Esci dalla casa",
          style: "destructive",
          onPress: async () => {
            if (!user) return;
            setLeavingId(household.id);
            try {
              await leaveHousehold(user.uid, household.id);
              router.back();
            } catch (error) {
              setLeavingId(null);
              Alert.alert("Errore", "Non è stato possibile uscire dalla casa. Riprova.");
            }
          },
        },
      ]
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>‹ Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Esci da una casa</Text>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      <Text style={styles.subtitle}>
        Seleziona la casa da cui vuoi uscire. L'azione richiede conferma.
      </Text>

      {isLoading ? (
        <ActivityIndicator color="#D97742" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={households}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.householdCard}
              onPress={() => handleSelectHousehold(item)}
              disabled={leavingId === item.id}
              activeOpacity={0.7}
            >
              <View>
                <Text style={styles.householdName}>{item.name}</Text>
                <Text style={styles.householdMembers}>
                  {item.memberIds.length} {item.memberIds.length === 1 ? "membro" : "membri"}
                </Text>
              </View>
              {leavingId === item.id ? (
                <ActivityIndicator color="#C0392B" />
              ) : (
                <Text style={styles.leaveLabel}>Esci</Text>
              )}
            </TouchableOpacity>
          )}
        />
      )}
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
    paddingBottom: 8,
  },
  headerButton: {
    backgroundColor: "#D97742",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonPlaceholder: {
    width: 90,
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
  subtitle: {
    fontSize: 13,
    color: "#9A8A80",
    textAlign: "center",
    paddingHorizontal: 30,
    marginBottom: 16,
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  householdCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F0C0C0",
  },
  householdName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#3A2E28",
  },
  householdMembers: {
    fontSize: 12,
    color: "#9A8A80",
    marginTop: 2,
  },
  leaveLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#C0392B",
  },
});
