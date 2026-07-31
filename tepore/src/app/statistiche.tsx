// src/app/statistiche.tsx — modulo premium Statistiche
// Aggrega bollette + spese + abbonamenti già esistenti: andamento mensile
// (ultimi 6 mesi, barre native senza librerie), ripartizione per categoria,
// e condivisione di un riepilogo testuale (export PDF in roadmap migliorie).

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Share,
} from "react-native";
import { collection, getDocs, query, where } from "firebase/firestore";
import Icona from "../components/Icona";
import { db } from "../services/firebase";
import { useHousehold } from "../hooks/useHousehold";
import { Abbonamento, Bolletta, VoceSpesa } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import { colors, radius, shadow, fonts } from "../theme";

const euro = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

const CATEGORIE_LABEL: Record<string, string> = {
  spesa: "Spesa", casa: "Casa", salute: "Salute", svago: "Svago", altro: "Altro",
};

export default function StatisticheScreen() {
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [bollette, setBollette] = useState<Bolletta[]>([]);
  const [spese, setSpese] = useState<VoceSpesa[]>([]);
  const [abbonamenti, setAbbonamenti] = useState<Abbonamento[]>([]);

  useEffect(() => {
    if (!householdId) return;
    (async () => {
      const [b, s, a] = await Promise.all([
        getDocs(query(collection(db, "bollette"), where("householdId", "==", householdId))),
        // Nota: qui leggiamo solo le spese "household" (le personali/coppia
        // restano fuori dalle statistiche comuni — scelta di privacy).
        getDocs(query(collection(db, "spese"),
          where("householdId", "==", householdId),
          where("visibilita", "==", "household"))),
        getDocs(query(collection(db, "abbonamenti"), where("householdId", "==", householdId))),
      ]);
      setBollette(b.docs.map((d) => ({ id: d.id, ...d.data() } as Bolletta)));
      setSpese(s.docs.map((d) => ({ id: d.id, ...d.data() } as VoceSpesa)));
      setAbbonamenti(a.docs.map((d) => ({ id: d.id, ...d.data() } as Abbonamento)));
    })();
  }, [householdId]);

  // Ultimi 6 mesi: bollette (per scadenza) + spese (per data)
  const mesi = useMemo(() => {
    const out: Array<{ etichetta: string; totale: number }> = [];
    const adesso = new Date();
    for (let i = 5; i >= 0; i--) {
      const inizio = new Date(adesso.getFullYear(), adesso.getMonth() - i, 1).getTime();
      const fine = new Date(adesso.getFullYear(), adesso.getMonth() - i + 1, 1).getTime();
      const totBollette = bollette
        .filter((b) => b.dataScadenza >= inizio && b.dataScadenza < fine)
        .reduce((s, b) => s + b.importo, 0);
      const totSpese = spese
        .filter((v) => v.data >= inizio && v.data < fine)
        .reduce((s, v) => s + v.importo, 0);
      out.push({
        etichetta: new Date(inizio).toLocaleDateString("it-IT", { month: "short" }),
        totale: totBollette + totSpese,
      });
    }
    return out;
  }, [bollette, spese]);

  const massimo = Math.max(1, ...mesi.map((m) => m.totale));

  const perCategoria = useMemo(() => {
    const mappa = new Map<string, number>();
    for (const v of spese) mappa.set(v.categoria, (mappa.get(v.categoria) ?? 0) + v.importo);
    return [...mappa.entries()].sort((a, b) => b[1] - a[1]);
  }, [spese]);

  const abbonamentiMensili = abbonamenti.reduce(
    (s, a) => s + (a.ciclo === "mensile" ? a.importo : a.importo / 12), 0
  );

  async function condividi() {
    const righe = [
      "📊 Riepilogo Tepore — ultimi 6 mesi",
      ...mesi.map((m) => `${m.etichetta}: ${euro(m.totale)}`),
      "",
      `Abbonamenti: ${euro(abbonamentiMensili)}/mese stimati`,
      ...perCategoria.map(([c, t]) => `${CATEGORIE_LABEL[c] ?? c}: ${euro(t)}`),
    ];
    await Share.share({ message: righe.join("\n") });
  }

  return (
    <View style={styles.container}>
      <ModuloHeader
        titolo="Statistiche"
        destra={
          <TouchableOpacity style={styles.bottoneShare} onPress={condividi}>
            <Icona name="share-variant-outline" size={18} color="#fff" />
          </TouchableOpacity>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 4, gap: 14 }}>

        {/* Andamento mensile */}
        <View style={styles.cardGrande}>
          <Text style={styles.titoloCard}>Uscite per mese</Text>
          <Text style={styles.sottotitoloCard}>Bollette + spese di casa, ultimi 6 mesi</Text>
          <View style={styles.grafico}>
            {mesi.map((m, i) => (
              <View key={i} style={styles.colonna}>
                <Text style={styles.valoreBarra}>
                  {m.totale > 0 ? Math.round(m.totale) : ""}
                </Text>
                <View style={styles.barraContenitore}>
                  <View style={[styles.barra, { height: `${Math.max(3, (m.totale / massimo) * 100)}%` }]} />
                </View>
                <Text style={styles.etichettaBarra}>{m.etichetta}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Abbonamenti */}
        <View style={styles.cardRiga}>
          <Icona name="refresh" size={20} color={colors.accentDark} />
          <Text style={styles.cardRigaTesto}>Abbonamenti attivi</Text>
          <Text style={styles.cardRigaValore}>{euro(abbonamentiMensili)}/mese</Text>
        </View>

        {/* Categorie */}
        <View style={styles.cardGrande}>
          <Text style={styles.titoloCard}>Spese per categoria</Text>
          {perCategoria.length === 0 ? (
            <Text style={styles.sottotitoloCard}>
              Nessuna spesa registrata: aggiungile dal modulo Spese.
            </Text>
          ) : (
            perCategoria.map(([cat, tot]) => {
              const maxCat = perCategoria[0][1];
              return (
                <View key={cat} style={styles.rigaCategoria}>
                  <Text style={styles.nomeCategoria}>{CATEGORIE_LABEL[cat] ?? cat}</Text>
                  <View style={styles.barraCatSfondo}>
                    <View style={[styles.barraCat, { width: `${(tot / maxCat) * 100}%` }]} />
                  </View>
                  <Text style={styles.valoreCategoria}>{euro(tot)}</Text>
                </View>
              );
            })
          )}
        </View>

        <Text style={styles.nota}>
          Le statistiche includono solo i contenuti condivisi con tutta la casa;
          spese personali e di coppia restano private. Export PDF in arrivo.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bottoneShare: {
    backgroundColor: colors.accent, borderRadius: radius.sm,
    width: 38, height: 38, alignItems: "center", justifyContent: "center",
  },
  cardGrande: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 16, ...shadow.card,
  },
  titoloCard: { fontSize: 15, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink },
  sottotitoloCard: { fontSize: 12, color: colors.muted, marginTop: 2, marginBottom: 8 },
  grafico: { flexDirection: "row", height: 150, alignItems: "flex-end", gap: 8, marginTop: 8 },
  colonna: { flex: 1, alignItems: "center", height: "100%", justifyContent: "flex-end" },
  valoreBarra: { fontSize: 9, color: colors.muted, marginBottom: 2 },
  barraContenitore: { flex: 1, width: "70%", justifyContent: "flex-end" },
  barra: { backgroundColor: colors.accent, borderRadius: 6, width: "100%" },
  etichettaBarra: { fontSize: 11, color: colors.muted, marginTop: 4, textTransform: "capitalize" },
  cardRiga: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14, ...shadow.card,
  },
  cardRigaTesto: { flex: 1, fontSize: 14, fontFamily: fonts.semibold, fontWeight: "600", color: colors.ink },
  cardRigaValore: { fontSize: 14, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink },
  rigaCategoria: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 },
  nomeCategoria: { width: 60, fontSize: 12, fontFamily: fonts.semibold, fontWeight: "600", color: colors.ink },
  barraCatSfondo: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.chipNeutral, overflow: "hidden" },
  barraCat: { height: "100%", backgroundColor: colors.accent, borderRadius: 4 },
  valoreCategoria: { width: 76, textAlign: "right", fontSize: 12, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  nota: { fontSize: 11, color: colors.muted, textAlign: "center", lineHeight: 16, marginBottom: 20 },
});
