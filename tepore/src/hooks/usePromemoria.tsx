// src/hooks/usePromemoria.tsx
//
// Tiene i promemoria locali di QUESTO dispositivo allineati ai dati della
// casa attiva: ascolta bollette, tipi immondizia e straordinarie su Firestore
// e, a ogni cambiamento (fatto da chiunque, anche da un altro membro sul suo
// telefono), rilancia la risincronizzazione — con un debounce di 2,5 s per
// non rigenerare tutto a raffica durante modifiche multiple ravvicinate.

import { useEffect, useRef } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../services/firebase";
import { sincronizzaPromemoria } from "../services/promemoria";

const DEBOUNCE_MS = 2500;

export function usePromemoria(householdId: string | null | undefined, uid?: string) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!householdId) return;

    const pianifica = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        sincronizzaPromemoria(householdId, uid).catch(() => {
          // best-effort: offline o permessi negati non devono disturbare l'app
        });
      }, DEBOUNCE_MS);
    };

    const collezioni = [
      "bollette", "immondizia_tipi", "immondizia_straordinarie",
      "garanzie", "abbonamenti", "manutenzione",
      "veicoli", "animali", "piante", "turni",
    ];
    const unsubs = collezioni.map((nome) =>
      onSnapshot(
        query(collection(db, nome), where("householdId", "==", householdId)),
        pianifica,
        () => {} // errori listener ignorati (es. logout in corso)
      )
    );

    return () => {
      unsubs.forEach((u) => u());
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [householdId, uid]);
}
