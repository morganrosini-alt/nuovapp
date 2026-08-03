// src/app/login.tsx
//
// VERSIONE ESTESA: email/password (come prima) + bottoni social.
// Il bottone Apple compare solo su iOS (su Android non esiste il servizio);
// il bottone Facebook compare sempre ma mostra un avviso finché l'app Meta
// non è configurata (vedi guida).

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import Icona from "../components/Icona";
import { useAuth } from "../hooks/useAuth";
import { fonts, colors } from "../theme";

export default function LoginScreen() {
  const { signIn, signUp, signInWithGoogle, signInWithApple, signInWithFacebook } =
    useAuth();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  async function handleSubmit() {
    setErrorMessage(null);

    if (isRegisterMode && !nome.trim()) {
      setErrorMessage("Dicci come vuoi chiamarti (es. il tuo nome).");
      return;
    }
    if (!email.trim() || !password) {
      setErrorMessage("Inserisci email e password.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isRegisterMode) {
        await signUp(email.trim(), password, nome.trim());
      } else {
        await signIn(email.trim(), password);
      }
    } catch (error: any) {
      setErrorMessage(traduciErroreFirebase(error?.code));
    } finally {
      setIsSubmitting(false);
    }
  }

  // Gestore unico per i tre provider: stessa gestione errori/caricamento
  async function handleSocial(
    provider: "google" | "apple" | "facebook",
    fn: () => Promise<void>
  ) {
    setErrorMessage(null);
    setSocialLoading(provider);
    try {
      await fn();
    } catch (error: any) {
      // Se l'utente ha semplicemente chiuso il popup, nessun messaggio
      if (
        error?.code === "auth/popup-closed-by-user" ||
        error?.code === "ERR_REQUEST_CANCELED" ||
        error?.code === "SIGN_IN_CANCELLED"
      ) {
        return;
      }
      setErrorMessage(error?.message ?? traduciErroreFirebase(error?.code));
    } finally {
      setSocialLoading(null);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Tepore</Text>
        <Text style={styles.subtitle}>
          {isRegisterMode
            ? "Crea il tuo account per iniziare"
            : "Bentornato, accedi al tuo hub di casa"}
        </Text>

        {isRegisterMode && (
          <TextInput
            style={styles.input}
            placeholder="Il tuo nome"
            placeholderTextColor="#999"
            value={nome}
            onChangeText={setNome}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#999"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#999"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {isRegisterMode ? "Registrati" : "Accedi"}
            </Text>
          )}
        </TouchableOpacity>

        {/* ---------- Divisore ---------- */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>oppure</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* ---------- Bottoni social ---------- */}
        <TouchableOpacity
          style={styles.socialButton}
          onPress={() => handleSocial("google", signInWithGoogle)}
          disabled={socialLoading !== null}
        >
          {socialLoading === "google" ? (
            <ActivityIndicator color="#2F4858" />
          ) : (
            <>
              <Icona name="logo-google" size={20} color="#2F4858" weight="fill" />
              <Text style={styles.socialButtonText}>Continua con Google</Text>
            </>
          )}
        </TouchableOpacity>

        {Platform.OS === "ios" && (
          <TouchableOpacity
            style={[styles.socialButton, styles.appleButton]}
            onPress={() => handleSocial("apple", signInWithApple)}
            disabled={socialLoading !== null}
          >
            {socialLoading === "apple" ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icona name="logo-apple" size={20} color="#fff" weight="fill" />
                <Text style={[styles.socialButtonText, styles.appleButtonText]}>
                  Continua con Apple
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.socialButton, styles.facebookButton]}
          onPress={() => handleSocial("facebook", signInWithFacebook)}
          disabled={socialLoading !== null}
        >
          {socialLoading === "facebook" ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icona name="logo-facebook" size={20} color="#fff" weight="fill" />
              <Text style={[styles.socialButtonText, styles.facebookButtonText]}>
                Continua con Facebook
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchModeButton}
          onPress={() => {
            setErrorMessage(null);
            setIsRegisterMode(!isRegisterMode);
          }}
        >
          <Text style={styles.switchModeText}>
            {isRegisterMode
              ? "Hai già un account? Accedi"
              : "Non hai un account? Registrati"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

function traduciErroreFirebase(code?: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "L'indirizzo email non è valido.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Email o password non corretti.";
    case "auth/email-already-in-use":
      return "Esiste già un account con questa email.";
    case "auth/weak-password":
      return "La password deve avere almeno 6 caratteri.";
    case "auth/account-exists-with-different-credential":
      return "Esiste già un account con questa email, creato con un altro metodo di accesso. Prova con quello.";
    default:
      return "Si è verificato un errore. Riprova.";
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F8FA",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  title: {
    fontSize: 36,
    fontFamily: fonts.bold, fontWeight: "700",
    color: "#336699",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: "#6C7A85",
    textAlign: "center",
    marginBottom: 32,
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
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#E2E9EE",
  },
  dividerText: {
    color: "#6C7A85",
    fontSize: 13,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#E2E9EE",
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 10,
  },
  socialButtonText: {
    fontSize: 15,
    fontFamily: fonts.semibold, fontWeight: "600",
    color: "#2F4858",
  },
  appleButton: {
    backgroundColor: "#000",
    borderColor: "#000",
  },
  appleButtonText: {
    color: "#fff",
  },
  facebookButton: {
    backgroundColor: "#1877F2",
    borderColor: "#1877F2",
  },
  facebookButtonText: {
    color: "#fff",
  },
  // ⚠️ AGGIUNTI (31/07): erano referenziati dal bottone "Non hai un account?
  // Registrati" ma non definiti. React Native ignora uno stile undefined
  // senza errori, quindi il link appariva minuscolo e attaccato al bottone
  // sopra: un bug invisibile ai controlli automatici, evidente all'uso.
  switchModeButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  switchModeText: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: colors.accent,
    textAlign: "center",
  },

});
