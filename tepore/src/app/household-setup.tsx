// src/app/household-setup.tsx
//
// Due modalità d'uso:
// - Forzata: subito dopo la registrazione, l'utente non ha ancora nessuna
//   casa e questa schermata è l'unica raggiungibile (gestito da _layout.tsx)
// - Volontaria: l'utente ha già almeno una casa, ma vuole aggiungerne
//   un'altra (creata o su invito) tramite "+ Aggiungi Casa" dal Profilo

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { createHousehold, joinHouseholdByInviteCode } from "../services/household";
import { fonts } from "../theme";

type Mode = "choice" | "create" | "join";

export default function HouseholdSetupScreen() {
  const { user, signOut } = useAuth();
  const { profile } = useHousehold();
  const isVoluntary = profile?.householdId != null;

  const [mode, setMode] = useState<Mode>("choice");
  const [householdName, setHouseholdName] = useState("");
  const [codiceVisibileATutti, setCodiceVisibileATutti] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleCreate() {
    if (!user) return;
    if (!householdName.trim()) {
      setErrorMessage("Dai un nome alla tua casa (es. \"Casa di Mattia\").");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      await createHousehold(householdName, user.uid, codiceVisibileATutti);
      router.replace("/");
    } catch (error: any) {
      setErrorMessage("Errore durante la creazione. Riprova.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleJoin() {
    if (!user) return;
    if (!inviteCode.trim()) {
      setErrorMessage("Inserisci il codice invito.");
      return;
    }
    setErrorMessage(null);
    setIsSubmitting(true);
    try {
      const risultato = await joinHouseholdByInviteCode(inviteCode, user.uid);
      if (risultato.giaMembro) {
        Alert.alert(
          "Sei già dentro questa casa",
          `Fai già parte di "${risultato.household.name}".`,
          [{ text: "OK", onPress: () => router.replace("/") }]
        );
      } else {
        router.replace("/");
      }
    } catch (error: any) {
      if (error?.message === "INVITE_CODE_NOT_FOUND") {
        setErrorMessage("Codice invito non valido. Controllalo e riprova.");
      } else {
        setErrorMessage("Errore durante l'accesso. Riprova.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {isVoluntary && (
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <Text style={styles.headerButtonText}>‹ Indietro</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.content}>
        {mode === "choice" && (
          <>
            <Text style={styles.title}>
              {isVoluntary ? "Aggiungi una casa" : "Quasi fatto!"}
            </Text>
            <Text style={styles.subtitle}>
              Crea una nuova casa su Tepore, oppure unisciti a quella di
              qualcuno che ti ha invitato.
            </Text>

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setMode("create")}
            >
              <Text style={styles.primaryButtonText}>Crea una nuova casa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setMode("join")}
            >
              <Text style={styles.secondaryButtonText}>
                Ho un codice invito
              </Text>
            </TouchableOpacity>

            {!isVoluntary && (
              <TouchableOpacity style={styles.logoutLink} onPress={signOut}>
                <Text style={styles.logoutText}>Esci</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {mode === "create" && (
          <>
            <Text style={styles.title}>Dai un nome alla tua casa</Text>
            <Text style={styles.subtitle}>
              Es. "Casa di Mattia" o "Appartamento Mestre"
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Nome della casa"
              placeholderTextColor="#999"
              value={householdName}
              onChangeText={setHouseholdName}
            />

            <TouchableOpacity
              style={styles.checkboxRow}
              onPress={() => setCodiceVisibileATutti(!codiceVisibileATutti)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, codiceVisibileATutti && styles.checkboxChecked]}>
                {codiceVisibileATutti && <Text style={styles.checkboxTick}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>
                Rendi il codice invito visibile a tutti i partecipanti (altrimenti solo tu potrai vederlo)
              </Text>
            </TouchableOpacity>

            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleCreate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Crea</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => {
                setErrorMessage(null);
                setMode("choice");
              }}
            >
              <Text style={styles.backText}>Indietro</Text>
            </TouchableOpacity>
          </>
        )}

        {mode === "join" && (
          <>
            <Text style={styles.title}>Inserisci il codice invito</Text>
            <Text style={styles.subtitle}>
              Chiedi il codice a chi ti ha invitato nella sua casa
            </Text>

            <TextInput
              style={[styles.input, styles.inviteCodeInput]}
              placeholder="XXXXXX"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              maxLength={6}
              value={inviteCode}
              onChangeText={setInviteCode}
            />

            {errorMessage && (
              <Text style={styles.errorText}>{errorMessage}</Text>
            )}

            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleJoin}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryButtonText}>Unisciti</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => {
                setErrorMessage(null);
                setMode("choice");
              }}
            >
              <Text style={styles.backText}>Indietro</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FA",
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  headerButton: {
    backgroundColor: "#336699",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  headerButtonText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 26,
    fontFamily: fonts.bold, fontWeight: "700",
    color: "#2F4858",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6C7A85",
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 20,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E9EE",
  },
  inviteCodeInput: {
    textAlign: "center",
    fontSize: 22,
    letterSpacing: 4,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#336699",
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: "#336699",
  },
  checkboxTick: {
    color: "#fff",
    fontSize: 14,
    fontFamily: fonts.bold, fontWeight: "700",
  },
  checkboxLabel: {
    fontSize: 13,
    color: "#2F4858",
    flex: 1,
    lineHeight: 18,
  },
  errorText: {
    color: "#D96A5B",
    fontSize: 13,
    marginBottom: 12,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: "#336699",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#336699",
  },
  secondaryButtonText: {
    color: "#336699",
    fontSize: 16,
    fontFamily: fonts.semibold, fontWeight: "600",
  },
  backLink: {
    marginTop: 20,
    alignItems: "center",
  },
  backText: {
    color: "#6C7A85",
    fontSize: 14,
  },
  logoutLink: {
    marginTop: 32,
    alignItems: "center",
  },
  logoutText: {
    color: "#999",
    fontSize: 13,
  },
});
