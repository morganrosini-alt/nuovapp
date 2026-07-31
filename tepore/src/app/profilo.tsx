// src/app/profilo.tsx

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { getHouseholdsByIds, switchActiveHousehold } from "../services/household";
import { Household } from "../types";
import { fonts } from "../theme";

export default function ProfiloScreen() {
  const { user, signOut } = useAuth();
  const { profile } = useHousehold();
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.householdIds || profile.householdIds.length === 0) {
      setHouseholds([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    getHouseholdsByIds(profile.householdIds).then((dati) => {
      setHouseholds(dati);
      setIsLoading(false);
    });
  }, [profile?.householdIds]);

  async function handleSwitch(household: Household) {
    if (!user || household.id === profile?.householdId) return;
    setSwitchingId(household.id);
    try {
      await switchActiveHousehold(user.uid, household.id);
      router.back();
    } catch (error) {
      setSwitchingId(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>‹ Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profilo</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={() => router.push("/impostazioni")}>
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile?.displayName || "U").charAt(0).toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile?.displayName || "Utente"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Le tue case</Text>
      </View>

      <TouchableOpacity
        style={styles.addHouseholdButton}
        onPress={() => router.push("/household-setup")}
      >
        <Text style={styles.addHouseholdButtonText}>+ Aggiungi Casa</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.leaveHouseholdButton}
        onPress={() => router.push("/esci-casa")}
      >
        <Text style={styles.leaveHouseholdButtonText}>Esci da una casa</Text>
      </TouchableOpacity>

      {isLoading ? (
        <ActivityIndicator color="#336699" style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={households}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isActive = item.id === profile?.householdId;
            return (
              <TouchableOpacity
                style={[styles.householdCard, isActive && styles.householdCardActive]}
                onPress={() => handleSwitch(item)}
                disabled={switchingId === item.id}
                activeOpacity={0.7}
              >
                <View>
                  <Text style={styles.householdName}>{item.name}</Text>
                  <Text style={styles.householdMembers}>
                    {item.memberIds.length} {item.memberIds.length === 1 ? "membro" : "membri"}
                  </Text>
                </View>
                {switchingId === item.id ? (
                  <ActivityIndicator color="#336699" />
                ) : isActive ? (
                  <Text style={styles.activeLabel}>✓ Attiva</Text>
                ) : null}
              </TouchableOpacity>
            );
          }}
        />
      )}

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Esci dall'account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FA",
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
    width: 90,
    alignItems: "center",
  },
  backButtonPlaceholder: {
    width: 90,
  },
  settingsButton: {
    width: 90,
    alignItems: "flex-end",
    padding: 6,
  },
  settingsButtonText: {
    fontSize: 22,
  },
  backButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold, fontWeight: "700",
    color: "#2F4858",
  },
  profileCard: {
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#336699",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: {
    color: "#fff",
    fontSize: 26,
    fontFamily: fonts.bold, fontWeight: "700",
  },
  name: {
    fontSize: 19,
    fontFamily: fonts.bold, fontWeight: "700",
    color: "#2F4858",
  },
  email: {
    fontSize: 13,
    color: "#6C7A85",
    marginTop: 2,
  },
  sectionHeader: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.semibold, fontWeight: "600",
    color: "#2F4858",
    marginBottom: 12,
  },
  addHouseholdButton: {
    marginHorizontal: 20,
    backgroundColor: "#336699",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 16,
  },
  addHouseholdButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
  leaveHouseholdButton: {
    marginHorizontal: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#F3C4BD",
  },
  leaveHouseholdButtonText: {
    color: "#D96A5B",
    fontSize: 14,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    borderColor: "#E2E9EE",
  },
  householdCardActive: {
    borderColor: "#336699",
    borderWidth: 2,
  },
  householdName: {
    fontSize: 15,
    fontFamily: fonts.semibold, fontWeight: "600",
    color: "#2F4858",
  },
  householdMembers: {
    fontSize: 12,
    color: "#6C7A85",
    marginTop: 2,
  },
  activeLabel: {
    fontSize: 12,
    fontFamily: fonts.bold, fontWeight: "700",
    color: "#2E7D32",
  },
  signOutButton: {
    marginHorizontal: 20,
    marginBottom: 30,
    alignItems: "center",
    paddingVertical: 12,
  },
  signOutText: {
    color: "#D96A5B",
    fontSize: 14,
    fontFamily: fonts.medium, fontWeight: "500",
  },
});
