// src/hooks/usePremium.tsx
// Stato dei moduli premium sbloccati (RevenueCat) + refresh dopo un acquisto.

import { useCallback, useEffect, useState } from "react";
import { ModuloPremium, moduliSbloccati } from "../services/purchases";

export function usePremium() {
  const [sbloccati, setSbloccati] = useState<Set<ModuloPremium>>(new Set());
  const [caricato, setCaricato] = useState(false);

  const refresh = useCallback(async () => {
    setSbloccati(await moduliSbloccati());
    setCaricato(true);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { sbloccati, caricato, refresh };
}
