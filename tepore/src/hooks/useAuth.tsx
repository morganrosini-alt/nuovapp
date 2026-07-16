// src/hooks/useAuth.tsx
//
// VERSIONE ESTESA: email/password (come prima) + Google + Apple + Facebook.
// Tutti i provider convergono su Firebase Auth (signInWithCredential),
// quindi il resto dell'app non cambia: user, household, regole restano identici.
//
// RICHIEDE DEVELOPMENT BUILD (non funziona in Expo Go — vedi guida).
// Pacchetti: @react-native-google-signin/google-signin,
//            expo-apple-authentication, expo-crypto,
//            react-native-fbsdk-next (solo quando Facebook è configurato).

import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithCredential,
  GoogleAuthProvider,
  OAuthProvider,
  FacebookAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Crypto from "expo-crypto";
import { auth } from "../services/firebase";
import { createUserProfile, getUserProfile } from "../services/household";

// ID del client Web OAuth di Google (Firebase Console → Authentication →
// Google → Web client ID). Va nel file .env come:
// EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxxxx.apps.googleusercontent.com
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithFacebook: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Dopo un login social, l'utente potrebbe non avere ancora un profilo
// Firestore (primo accesso): lo creiamo al volo usando nome/email che il
// provider ci ha dato. Stessa "rete di sicurezza" già usata per email/password.
async function ensureProfile(user: User, displayNameHint?: string | null) {
  const existing = await getUserProfile(user.uid);
  if (!existing) {
    await createUserProfile(
      user.uid,
      user.email ?? "",
      displayNameHint ?? user.displayName ?? undefined
    );
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setIsLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signUp(email: string, password: string, displayName: string) {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await createUserProfile(credential.user.uid, email, displayName);
  }

  async function signIn(email: string, password: string) {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    await ensureProfile(credential.user);
  }

  // ---------- Google ----------
  async function signInWithGoogle() {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    // Dalla v13 la libreria restituisce { type, data }; l'utente può anche
    // annullare il popup: in quel caso usciamo in silenzio, nessun errore.
    if (result.type !== "success" || !result.data.idToken) return;
    const credential = GoogleAuthProvider.credential(result.data.idToken);
    const cred = await signInWithCredential(auth, credential);
    await ensureProfile(cred.user);
  }

  // ---------- Apple (solo iOS) ----------
  async function signInWithApple() {
    if (Platform.OS !== "ios") {
      throw new Error("Sign in with Apple è disponibile solo su iPhone/iPad.");
    }
    // Il nonce lega la richiesta Apple alla credenziale Firebase (anti-replay):
    // ad Apple va l'hash SHA-256, a Firebase il valore in chiaro.
    const rawNonce = Crypto.randomUUID();
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      rawNonce
    );

    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    if (!appleCredential.identityToken) {
      throw new Error("Apple non ha restituito un token valido.");
    }

    const provider = new OAuthProvider("apple.com");
    const credential = provider.credential({
      idToken: appleCredential.identityToken,
      rawNonce,
    });
    const cred = await signInWithCredential(auth, credential);

    // ATTENZIONE: Apple fornisce il nome SOLO al primissimo accesso —
    // se non lo salviamo ora, non lo rivedremo mai più.
    const nome = appleCredential.fullName?.givenName
      ? `${appleCredential.fullName.givenName} ${appleCredential.fullName.familyName ?? ""}`.trim()
      : null;
    await ensureProfile(cred.user, nome);
  }

  // ---------- Facebook ----------
  // Import "pigro": così l'app funziona anche PRIMA che l'SDK Facebook sia
  // configurato (richiede l'app Meta approvata — vedi guida). Quando la
  // configurazione Meta è pronta, questo codice funziona senza modifiche.
  async function signInWithFacebook() {
    let fbsdk: any;
    try {
      fbsdk = require("react-native-fbsdk-next");
    } catch {
      throw new Error(
        "Login Facebook non ancora configurato in questa build."
      );
    }
    const { LoginManager, AccessToken } = fbsdk;

    const result = await LoginManager.logInWithPermissions([
      "public_profile",
      "email",
    ]);
    if (result.isCancelled) return; // annullato dall'utente: nessun errore

    const tokenData = await AccessToken.getCurrentAccessToken();
    if (!tokenData?.accessToken) {
      throw new Error("Facebook non ha restituito un token valido.");
    }
    const credential = FacebookAuthProvider.credential(tokenData.accessToken);
    const cred = await signInWithCredential(auth, credential);
    await ensureProfile(cred.user);
  }

  async function signOut() {
    // Scolleghiamo anche la sessione Google locale, così al prossimo login
    // l'utente può scegliere un account diverso invece di rientrare in automatico.
    try {
      await GoogleSignin.signOut();
    } catch {}
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        signUp,
        signIn,
        signInWithGoogle,
        signInWithApple,
        signInWithFacebook,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth deve essere usato dentro un <AuthProvider>");
  }
  return context;
}
