// src/app/partecipanti.tsx
//
// Mostra chi fa parte della casa attualmente attiva. Per ora è una lista
// informativa; quando in futuro introdurremo i ruoli (amministratore/membro),
// questa sarà anche la schermata da cui un amministratore potrà rimuovere
// altri partecipanti.

import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, FlatList } from "react-native";
import * as Clipboard from "expo-clipboard";
import Icona from "../components/Icona";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { getHousehold, getUserProfilesByIds } from "../services/household";
import { Household, UserProfile } from "../types";
import { fonts } from "../theme";

export default function PartecipantiScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const [household, setHousehold] = useState<Household | null>(null);
  const [membri, setMembri] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiato, setCopiato] = useState(false);

  async function handleCopiaCodice() {
    if (!household) return;
    await Clipboard.setStringAsync(household.inviteCode);
    setCopiato(true);
    setTimeout(() => setCopiato(false), 1500);
  }

  useEffect(() => {
    if (!profile?.householdId) return;

    setIsLoading(true);
    getHousehold(profile.householdId).then((casa) => {
      setHousehold(casa);
      if (casa) {
        getUserProfilesByIds(casa.memberIds).then((profili) => {
          setMembri(profili);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });
  }, [profile?.householdId]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>‹ Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Partecipanti</Text>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      {household && (
        <>
          <Text style={styles.householdName}>{household.name}</Text>
          <View style={styles.inviteCodeCard}>
            {household.inviteCodeVisibleToAll || household.ownerId === user?.uid ? (
              <View style={styles.inviteCodeRow}>
                <View>
                  <Text style={styles.inviteCodeLabel}>Codice invito</Text>
                  <Text style={styles.inviteCodeValue}>{household.inviteCode}</Text>
                </View>
                <TouchableOpacity onPress={handleCopiaCodice} hitSlop={10}>
                  <Icona
                    name={copiato ? "check" : "content-copy"}
                    size={22}
                    color={copiato ? "#2E7D32" : "#2F4858"}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.inviteCodeRestricted}>
                🔒 Il codice della casa è visibile solo all'amministratore.
              </Text>
            )}
          </View>
        </>
      )}

      {isLoading ? (
        <ActivityIndicator color="#336699" style={{ marginTop: 30 }} />
      ) : (
        <FlatList
          data={membri}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>
                  {item.displayName}
                  {item.id === user?.uid ? " (tu)" : ""}
                </Text>
                <Text style={styles.memberEmail}>{item.email}</Text>
              </View>
              {household?.ownerId === item.id && (
                <View style={styles.ownerBadge}>
                  <Text style={styles.ownerBadgeText}>Proprietario</Text>
                </View>
              )}
            </View>
          )}
        />
      )}
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
    paddingBottom: 8,
  },
  headerButton: {
    backgroundColor: "#336699",
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
    fontFamily: fonts.semibold, fontWeight: "600",
  },
  title: {
    fontSize: 18,
    fontFamily: fonts.bold, fontWeight: "700",
    color: "#2F4858",
  },
  householdName: {
    fontSize: 13,
    color: "#6C7A85",
    textAlign: "center",
    marginBottom: 12,
  },
  inviteCodeCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E2E9EE",
  },
  inviteCodeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  copyIcon: {
    fontSize: 20,
  },
  inviteCodeLabel: {
    fontSize: 12,
    color: "#6C7A85",
    marginBottom: 4,
  },
  inviteCodeValue: {
    fontSize: 22,
    fontFamily: fonts.bold, fontWeight: "700",
    color: "#336699",
    letterSpacing: 4,
  },
  inviteCodeRestricted: {
    fontSize: 13,
    color: "#6C7A85",
    textAlign: "center",
    lineHeight: 18,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  memberCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E9EE",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#336699",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    color: "#fff",
    fontSize: 18,
    fontFamily: fonts.bold, fontWeight: "700",
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontFamily: fonts.semibold, fontWeight: "600",
    color: "#2F4858",
  },
  memberEmail: {
    fontSize: 12,
    color: "#6C7A85",
    marginTop: 2,
  },
  ownerBadge: {
    backgroundColor: "#DCEBF3",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  ownerBadgeText: {
    fontSize: 10,
    fontFamily: fonts.bold, fontWeight: "700",
    color: "#336699",
  },
});
