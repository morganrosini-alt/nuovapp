// src/hooks/useHousehold.tsx
//
// Simile a useAuth, ma per la household: tiene traccia in tempo reale
// di "questo utente ha già una household?" e se sì, quale.
// Usiamo onSnapshot (non una singola lettura) così se un giorno l'utente
// viene aggiunto a una household da un altro dispositivo, questo hook
// si aggiorna automaticamente senza bisogno di ricaricare l'app.

import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "./useAuth";
import { UserProfile } from "../types";
import { createUserProfile } from "../services/household";

type HouseholdContextType = {
  profile: UserProfile | null;
  isLoading: boolean;
};

const HouseholdContext = createContext<HouseholdContextType | undefined>(
  undefined
);

export function HouseholdProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      // Nessun utente loggato -> nessun profilo da ascoltare
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const userRef = doc(db, "users", user.uid);

    // onSnapshot ascolta i cambiamenti in tempo reale sul documento utente
    const unsubscribe = onSnapshot(userRef, async (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as UserProfile);
        setIsLoading(false);
      } else {
        // Rete di sicurezza: l'utente è autenticato (esiste in Firebase Auth)
        // ma non ha ancora un documento profilo su Firestore. Succede per
        // account creati prima che questa funzionalità esistesse, o se la
        // sessione era già salvata sul dispositivo (bypassando signIn/signUp,
        // che sono gli altri due punti in cui creiamo il profilo).
        // Lo creiamo qui al volo, così l'app si "auto-ripara".
        try {
          await createUserProfile(user.uid, user.email ?? "");
          // Non serve fare altro: onSnapshot scatterà di nuovo automaticamente
          // ora che il documento esiste, e isLoading verrà messo a false lì.
        } catch (error) {
          console.error("Errore nella creazione automatica del profilo:", error);
          setIsLoading(false);
        }
      }
    });

    return unsubscribe;
  }, [user]);

  return (
    <HouseholdContext.Provider value={{ profile, isLoading }}>
      {children}
    </HouseholdContext.Provider>
  );
}

export function useHousehold() {
  const context = useContext(HouseholdContext);
  if (context === undefined) {
    throw new Error("useHousehold deve essere usato dentro un <HouseholdProvider>");
  }
  return context;
}
