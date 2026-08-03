// src/app/(tabs)/utilita.tsx
// La gestione fisica della casa. Griglia di moduli con stato reale
// (pallino rosso = qualcosa richiede attenzione oggi) + le voci di
// consultazione in fondo.

import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { router } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import Icona from "../../components/Icona";
import { db } from "../../services/firebase";
import { useAuth } from "../../hooks/useAuth";
import { useHousehold } from "../../hooks/useHousehold";
import { usePremium } from "../../hooks/usePremium";
import { lettereAttiveInGiorno, giornoDaData } from "../../services/immondizia";
import { ascoltaTurni, turniDelGiorno, fascia } from "../../services/turni";
import {
  Garanzia, GiornoSettimana, Pianta, Pulizia, TipoRifiutoPersonalizzato,
  Turno, UserProfile, VoceListaSpesa,
} from "../../types";
import { getHousehold, getUserProfilesByIds } from "../../services/household";
import { colors, radius, shadow, fonts } from "../../theme";

const GIORNO = 24 * 3600e3;
const PERIODI: Record<Pulizia["frequenza"], number> = {
  giornaliera: GIORNO, settimanale: 7 * GIORNO, mensile: 30 * GIORNO,
};

export default function UtilitaScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const { sbloccati } = usePremium();
  const householdId = profile?.householdId ?? null;

  const [pulizie, setPulizie] = useState<Pulizia[]>([]);
  const [lista, setLista] = useState<VoceListaSpesa[]>([]);
  const [tipiRifiuto, setTipiRifiuto] = useState<TipoRifiutoPersonalizzato[]>([]);
  const [garanzie, setGaranzie] = useState<Garanzia[]>([]);
  const [piante, setPiante] = useState<Pianta[]>([]);
  const [turni, setTurni] = useState<Turno[]>([]);
  const [membri, setMembri] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (!householdId) return;
    const ascolta = <T,>(nome: string, set: (v: T[]) => void) =>
      onSnapshot(query(collection(db, nome), where("householdId", "==", householdId)),
        (s) => set(s.docs.map((d) => ({ id: d.id, ...d.data() } as T))), () => {});
    const unsubs = [
      ascolta<Pulizia>("pulizie", setPulizie),
      ascolta<VoceListaSpesa>("lista_spesa", setLista),
      ascolta<TipoRifiutoPersonalizzato>("immondizia_tipi", setTipiRifiuto),
      ascolta<Garanzia>("garanzie", setGaranzie),
      ascolta<Pianta>("piante", setPiante),
      ascoltaTurni(householdId, setTurni),
    ];
    (async () => {
      const casa = await getHousehold(householdId);
      if (casa) setMembri(await getUserProfilesByIds(casa.memberIds));
    })();
    return () => unsubs.forEach((u) => u());
  }, [householdId]);

  // ---- Stati calcolati per le tile ----
  const pulizieDaFare = pulizie.filter(
    (p) => !p.ultimoCompletamento || Date.now() - p.ultimoCompletamento > PERIODI[p.frequenza]
  ).length;
  const daPrendere = lista.filter((v) => !v.preso).length;
  const oggiRifiuti = lettereAttiveInGiorno(tipiRifiuto, giornoDaData(new Date()), new Date());
  const garanziaProssima = [...garanzie].sort((a, b) => a.scadenza - b.scadenza)[0];
  const pianteAssetate = piante.filter(
    (p) => p.ultimaAnnaffiatura + p.frequenzaGiorni * GIORNO <= Date.now()
  ).length;

  const turniOggi = useMemo(() => turniDelGiorno(turni, new Date()), [turni]);
  const riassuntoTurni = useMemo(() => {
    if (turniOggi.length === 0) return "Nessun turno segnato oggi";
    return turniOggi.slice(0, 2).map((t) => {
      const nome = membri.find((m) => m.id === t.utenteId)?.displayName?.split(" ")[0]
        ?? (t.utenteId === user?.uid ? "Tu" : "—");
      return `${nome}: ${fascia(t.fascia).label.toLowerCase()}`;
    }).join(" · ");
  }, [turniOggi, membri, user?.uid]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14, paddingTop: 56, paddingBottom: 30 }}>
      <Text style={styles.titolo}>Utilità</Text>
      <Text style={styles.sottotitolo}>La gestione quotidiana della casa</Text>

      <View style={styles.griglia}>
        <Tile icona="briefcase-outline" nome="Turni di lavoro" stato={riassuntoTurni}
          onPress={() => router.push("/turni")} />
        <Tile icona="spray-bottle" nome="Pulizie"
          stato={pulizieDaFare > 0 ? `${pulizieDaFare} da fare` : "Tutto in ordine"}
          urgente={pulizieDaFare > 0} onPress={() => router.push("/pulizie")} />
        <Tile icona="cart-outline" nome="Lista spesa"
          stato={daPrendere > 0 ? `${daPrendere} ${daPrendere === 1 ? "articolo" : "articoli"}` : "Lista vuota"}
          onPress={() => router.push("/lista-spesa")} />
        <Tile icona="trash-can-outline" nome="Immondizia"
          stato={oggiRifiuti.length > 0 ? `Stasera: ${oggiRifiuti.map((t) => t.nome).join(" + ")}` : "Niente stasera"}
          urgente={oggiRifiuti.length > 0} onPress={() => router.push("/immondizia")} />
        <Tile icona="shield-check-outline" nome="Garanzie"
          stato={garanziaProssima
            ? `${garanziaProssima.nome} · ${Math.max(0, Math.ceil((garanziaProssima.scadenza - Date.now()) / GIORNO))} gg`
            : "Nessuna registrata"}
          onPress={() => router.push("/garanzie")} />
        <Tile icona="wrench-outline" nome="Manutenzione" stato="Caldaia, filtri, controlli"
          onPress={() => router.push("/manutenzione")} />
        <Tile icona="heart-pulse" nome="Salute" stato="Privata · solo tua"
          onPress={() => router.push("/salute")} />
        <Tile icona="car-outline" nome="Veicoli" stato="Bollo, revisione, spese"
          bloccato={!sbloccati.has("veicoli")}
          onPress={() => router.push(sbloccati.has("veicoli") ? "/veicoli" : "/paywall")} />
        <Tile icona="paw-outline" nome="Animali" stato="Vaccini, visite, spese"
          bloccato={!sbloccati.has("animali")}
          onPress={() => router.push(sbloccati.has("animali") ? "/animali" : "/paywall")} />
        <Tile icona="sprout-outline" nome="Piante"
          stato={pianteAssetate > 0 ? `${pianteAssetate} da annaffiare` : "Annaffiatura e cura"}
          urgente={pianteAssetate > 0 && sbloccati.has("piante")}
          bloccato={!sbloccati.has("piante")}
          onPress={() => router.push(sbloccati.has("piante") ? "/piante" : "/paywall")} />
      </View>

      <Text style={styles.sezioncina}>Sempre a portata</Text>
      <RigaMin icona="card-account-phone-outline" testo="Contatti utili" onPress={() => router.push("/contatti-utili")} />
      <RigaMin icona="alarm-light-outline" testo="Numeri di emergenza" onPress={() => router.push("/emergenza")} />
      <RigaMin icona="cog-outline" testo="Impostazioni" onPress={() => router.push("/impostazioni")} />
    </ScrollView>
  );
}

function Tile({ icona, nome, stato, urgente, bloccato, onPress }: {
  icona: string; nome: string; stato: string; urgente?: boolean; bloccato?: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.tile, bloccato && styles.tileBloccata]} onPress={onPress} activeOpacity={0.85}>
      {urgente && <View style={styles.pallino} />}
      {bloccato && (
        <View style={styles.lucchetto}>
          <Icona name="lock-outline" size={11} color="#fff" />
        </View>
      )}
      <View style={[styles.chipIcona, bloccato && styles.chipIconaBloccata]}>
        <Icona name={icona} size={19} color={bloccato ? "#A9B4BC" : colors.accent} />
      </View>
      <Text style={[styles.tileNome, bloccato && styles.testoBloccato]}>{nome}</Text>
      <Text style={[styles.tileStato, urgente && styles.tileStatoUrgente, bloccato && styles.testoBloccato]}
        numberOfLines={2}>{stato}</Text>
    </TouchableOpacity>
  );
}

function RigaMin({ icona, testo, onPress }: { icona: string; testo: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.rigaMin} onPress={onPress}>
      <Icona name={icona} size={19} color={colors.chipNeutralInk} />
      <Text style={styles.rigaMinTesto}>{testo}</Text>
      <Icona name="chevron-right" size={19} color="#C2CCD3" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  titolo: { fontSize: 24, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink, letterSpacing: -0.4 },
  sottotitolo: { fontSize: 13, color: colors.muted, fontFamily: fonts.medium, fontWeight: "500", marginTop: 2, marginBottom: 16 },
  griglia: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48%", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 13, ...shadow.card,
  },
  tileBloccata: { backgroundColor: "#FAFBFC" },
  chipIcona: {
    width: 38, height: 38, borderRadius: 12, backgroundColor: colors.accentSoft,
    alignItems: "center", justifyContent: "center", marginBottom: 9,
  },
  chipIconaBloccata: { backgroundColor: colors.chipNeutral },
  tileNome: { fontSize: 14, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  tileStato: { fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 15, fontFamily: fonts.medium, fontWeight: "500" },
  tileStatoUrgente: { color: colors.danger, fontFamily: fonts.bold, fontWeight: "700" },
  testoBloccato: { color: "#A9B4BC" },
  pallino: {
    position: "absolute", top: 11, right: 11, width: 8, height: 8,
    borderRadius: 4, backgroundColor: colors.danger,
  },
  lucchetto: {
    position: "absolute", top: 9, right: 9, width: 18, height: 18, borderRadius: 9,
    backgroundColor: "#A9B4BC", alignItems: "center", justifyContent: "center",
  },
  sezioncina: {
    fontSize: 12, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.muted, textTransform: "uppercase",
    letterSpacing: 0.7, marginTop: 20, marginBottom: 9, marginHorizontal: 2,
  },
  rigaMin: {
    flexDirection: "row", alignItems: "center", gap: 11,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8,
  },
  rigaMinTesto: { flex: 1, fontSize: 13.5, fontFamily: fonts.semibold, fontWeight: "600", color: colors.ink },
});
