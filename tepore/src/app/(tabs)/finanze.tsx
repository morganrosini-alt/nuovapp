// src/app/(tabs)/finanze.tsx
// Indice della sezione economica: riepilogo del mese in corso e accesso ai
// moduli. Ogni riga mostra lo stato reale, così si capisce cosa serve
// senza entrare.

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import Icona from "../../components/Icona";
import { db } from "../../services/firebase";
import { useAuth } from "../../hooks/useAuth";
import { useHousehold } from "../../hooks/useHousehold";
import { ascoltaContenutiScoped } from "../../services/scoped";
import { ascoltaRelazioniCasa, miaRelazione } from "../../services/relationships";
import { usePremium } from "../../hooks/usePremium";
import { Abbonamento, Bolletta, Relationship, Salvadanaio, VoceSpesa } from "../../types";
import { colors, radius, shadow, fonts } from "../../theme";

const euro = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const GIORNO = 24 * 3600e3;

export default function FinanzeScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const { sbloccati } = usePremium();
  const householdId = profile?.householdId ?? null;

  const [bollette, setBollette] = useState<Bolletta[]>([]);
  const [spese, setSpese] = useState<VoceSpesa[]>([]);
  const [salvadanai, setSalvadanai] = useState<Salvadanaio[]>([]);
  const [abbonamenti, setAbbonamenti] = useState<Abbonamento[]>([]);
  const [relazioni, setRelazioni] = useState<Relationship[]>([]);

  const rel = user ? miaRelazione(relazioni, user.uid) : null;
  const relConfermata = rel?.stato === "confermata" ? rel : null;

  useEffect(() => {
    if (!householdId) return;
    const unsubs = [
      ascoltaRelazioniCasa(householdId, setRelazioni),
      onSnapshot(query(collection(db, "bollette"), where("householdId", "==", householdId)),
        (s) => setBollette(s.docs.map((d) => ({ id: d.id, ...d.data() } as Bolletta))), () => {}),
      onSnapshot(query(collection(db, "abbonamenti"), where("householdId", "==", householdId)),
        (s) => setAbbonamenti(s.docs.map((d) => ({ id: d.id, ...d.data() } as Abbonamento))), () => {}),
    ];
    return () => unsubs.forEach((u) => u());
  }, [householdId]);

  useEffect(() => {
    if (!householdId || !user) return;
    const a = ascoltaContenutiScoped<VoceSpesa>("spese", householdId, user.uid, relConfermata?.id ?? null, setSpese);
    const b = ascoltaContenutiScoped<Salvadanaio>("salvadanai", householdId, user.uid, relConfermata?.id ?? null, setSalvadanai);
    return () => { a(); b(); };
  }, [householdId, user?.uid, relConfermata?.id]);

  // ---- Riepilogo del mese in corso ----
  const riepilogo = useMemo(() => {
    const ora = new Date();
    const inizio = new Date(ora.getFullYear(), ora.getMonth(), 1).getTime();
    const fine = new Date(ora.getFullYear(), ora.getMonth() + 1, 1).getTime();
    const totBollette = bollette
      .filter((b) => b.dataScadenza >= inizio && b.dataScadenza < fine)
      .reduce((s, b) => s + b.importo, 0);
    const totSpese = spese
      .filter((v) => v.data >= inizio && v.data < fine)
      .reduce((s, v) => s + v.importo, 0);
    const totAbb = abbonamenti.reduce((s, a) => s + (a.ciclo === "mensile" ? a.importo : a.importo / 12), 0);
    return { totBollette, totSpese, totAbb, totale: totBollette + totSpese + totAbb };
  }, [bollette, spese, abbonamenti]);

  const nonPagate = bollette.filter((b) => !b.pagata).sort((a, b) => a.dataScadenza - b.dataScadenza);
  const prossima = nonPagate[0];
  const giorniProssima = prossima ? Math.ceil((prossima.dataScadenza - Date.now()) / GIORNO) : null;
  const prossimoRinnovo = [...abbonamenti].sort((a, b) => a.prossimoRinnovo - b.prossimoRinnovo)[0];
  const salvadanaioPrincipale = [...salvadanai].sort((a, b) => b.createdAt - a.createdAt)[0];
  const totaleSalvadanaio = salvadanaioPrincipale
    ? (salvadanaioPrincipale.contributi ?? []).reduce((s, c) => s + c.importo, 0) : 0;
  const meseCorrente = new Date().toLocaleDateString("it-IT", { month: "long" });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14, paddingTop: 56, paddingBottom: 30 }}>
      <Text style={styles.titolo}>Finanze</Text>
      <Text style={styles.sottotitolo}>I soldi della casa, in un posto solo</Text>

      <View style={styles.riepilogo}>
        <Text style={styles.rLabel}>Uscite di {meseCorrente}</Text>
        <Text style={styles.rValore}>{euro(riepilogo.totale)}</Text>
        <Text style={styles.rSotto}>
          Bollette {euro(riepilogo.totBollette)} · Spese {euro(riepilogo.totSpese)} · Abbonamenti {euro(riepilogo.totAbb)}
        </Text>
      </View>

      <Riga
        icona="lightning-bolt" nome="Bollette"
        stato={prossima
          ? (giorniProssima! < 0 ? `${prossima.nome} è scaduta!`
            : giorniProssima === 0 ? `${prossima.nome} scade oggi · ${euro(prossima.importo)}`
            : `${prossima.nome} tra ${giorniProssima} gg · ${euro(prossima.importo)}`)
          : "Nessuna bolletta da pagare"}
        urgente={prossima != null && giorniProssima! <= 2}
        badge={nonPagate.length > 0 ? nonPagate.length : undefined}
        onPress={() => router.push("/bollette")}
      />

      <Riga
        icona="receipt" nome="Spese e rate"
        stato={`${euro(riepilogo.totSpese)} questo mese · ${spese.length} ${spese.length === 1 ? "voce" : "voci"}`}
        onPress={() => router.push("/spese")}
      />

      <Riga
        icona="piggy-bank-outline" nome="Salvadanai"
        stato={salvadanaioPrincipale
          ? `${salvadanaioPrincipale.nome} · ${euro(totaleSalvadanaio)} di ${euro(salvadanaioPrincipale.importoTarget)}`
          : "Nessun obiettivo di risparmio"}
        progresso={salvadanaioPrincipale
          ? Math.min(1, totaleSalvadanaio / salvadanaioPrincipale.importoTarget) : undefined}
        onPress={() => router.push("/salvadanai")}
      />

      <Riga
        icona="autorenew" nome="Abbonamenti"
        stato={prossimoRinnovo
          ? `${euro(riepilogo.totAbb)}/mese · ${prossimoRinnovo.nome} il ${new Date(prossimoRinnovo.prossimoRinnovo).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}`
          : "Nessun abbonamento tracciato"}
        onPress={() => router.push("/abbonamenti")}
      />

      <Text style={styles.sezioncina}>Approfondisci</Text>
      <TouchableOpacity
        style={styles.rigaMin}
        onPress={() => router.push(sbloccati.has("statistiche") ? "/statistiche" : "/paywall")}
      >
        <Icona name="chart-bar" size={19} color={colors.chipNeutralInk} />
        <Text style={styles.rigaMinTesto}>Statistiche e andamento</Text>
        {!sbloccati.has("statistiche") && (
          <Icona name="lock-outline" size={15} color={colors.muted} />
        )}
        <Icona name="chevron-right" size={19} color="#C2CCD3" />
      </TouchableOpacity>
    </ScrollView>
  );
}

function Riga({ icona, nome, stato, urgente, badge, progresso, onPress }: {
  icona: string; nome: string; stato: string; urgente?: boolean;
  badge?: number; progresso?: number; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.riga} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.chipIcona}>
        <Icona name={icona} size={21} color={colors.accent} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rigaNome}>{nome}</Text>
        <Text style={[styles.rigaStato, urgente && styles.rigaStatoUrgente]}>{stato}</Text>
        {progresso !== undefined && (
          <View style={styles.barraSfondo}>
            <View style={[styles.barraPieno, { width: `${progresso * 100}%` }]} />
          </View>
        )}
      </View>
      {badge !== undefined && (
        <View style={styles.badge}><Text style={styles.badgeTesto}>{badge}</Text></View>
      )}
      <Icona name="chevron-right" size={20} color="#C2CCD3" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  titolo: { fontSize: 24, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink, letterSpacing: -0.4 },
  sottotitolo: { fontSize: 13, color: colors.muted, fontFamily: fonts.medium, fontWeight: "500", marginTop: 2, marginBottom: 16 },
  riepilogo: { backgroundColor: colors.accent, borderRadius: radius.xl, padding: 18, marginBottom: 15 },
  rLabel: { fontSize: 12, color: "#D6E4F0", fontFamily: fonts.semibold, fontWeight: "600" },
  rValore: { fontSize: 28, fontFamily: fonts.extrabold, fontWeight: "800", color: "#fff", letterSpacing: -0.6, marginTop: 3 },
  rSotto: { fontSize: 11.5, color: "#C7DAEA", marginTop: 7, lineHeight: 16 },
  riga: {
    flexDirection: "row", alignItems: "center", gap: 13,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14, marginBottom: 10, ...shadow.card,
  },
  chipIcona: {
    width: 42, height: 42, borderRadius: 13, backgroundColor: colors.accentSoft,
    alignItems: "center", justifyContent: "center",
  },
  rigaNome: { fontSize: 15, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  rigaStato: { fontSize: 12, color: colors.muted, marginTop: 2, fontFamily: fonts.medium, fontWeight: "500" },
  rigaStatoUrgente: { color: colors.danger, fontFamily: fonts.bold, fontWeight: "700" },
  barraSfondo: { height: 7, borderRadius: 4, backgroundColor: colors.chipNeutral, marginTop: 7, overflow: "hidden" },
  barraPieno: { height: "100%", backgroundColor: colors.accent, borderRadius: 4 },
  badge: { backgroundColor: colors.danger, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 },
  badgeTesto: { color: "#fff", fontSize: 10, fontFamily: fonts.extrabold, fontWeight: "800" },
  sezioncina: {
    fontSize: 12, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.muted, textTransform: "uppercase",
    letterSpacing: 0.7, marginTop: 18, marginBottom: 9, marginHorizontal: 2,
  },
  rigaMin: {
    flexDirection: "row", alignItems: "center", gap: 11,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14,
  },
  rigaMinTesto: { flex: 1, fontSize: 13.5, fontFamily: fonts.semibold, fontWeight: "600", color: colors.ink },
});
