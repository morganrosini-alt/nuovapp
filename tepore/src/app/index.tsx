// src/app/index.tsx
//
// Dashboard ridisegnata su specifica Claude Design: tema chiaro con un
// solo colore d'accento (verde salvia), griglia bento a pesi variabili
// per le sezioni, filo decorativo SVG come elemento firma.

import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { ascoltaBollette } from "../services/bollette";
import { getHousehold, getUserProfilesByIds } from "../services/household";
import { Bolletta } from "../types";

// ---- Palette (specifica Claude Design) ----
const COLORI = {
  sfondo: "#F9F7F4",
  testo: "#1A1A1A",
  muted: "#7A7570",
  accento: "#5C8A62",
  accentoChiaro: "#E4EDE1",
  accentoIcona: "#38553D",
  neutroChip: "#EFEDE9",
  neutroIcona: "#57524B",
  card: "#FFFFFF",
  rosso: "#D14A3A",
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PADDING_ORIZZONTALE = 20;
const GAP_GRIGLIA = 10;
const TILE_WIDTH =
  (SCREEN_WIDTH - PADDING_ORIZZONTALE * 2 - GAP_GRIGLIA) / 2;

// Genera il path SVG del "filo" decorativo: una curva a S che oscilla tra
// x=8 e x=46, ripetuta ogni ~150px in verticale, per tutta l'altezza
// indicata. È dietro ai contenuti (renderizzato per primo, con pointerEvents
// disattivati) e non deve mai sovrapporsi visivamente al testo.
function generaPathFilo(altezza: number): string {
  const PERIODO = 150;
  const X_MIN = 8;
  const X_MAX = 46;
  let path = `M ${(X_MIN + X_MAX) / 2} 0`;
  let y = 0;
  let direzione = 1;
  while (y < altezza) {
    const yNext = Math.min(y + PERIODO, altezza);
    const xTarget = direzione === 1 ? X_MAX : X_MIN;
    const xControllo = direzione === 1 ? X_MIN : X_MAX;
    path += ` C ${xControllo} ${y + PERIODO / 3}, ${xControllo} ${y + (PERIODO * 2) / 3}, ${xTarget} ${yNext}`;
    y = yNext;
    direzione *= -1;
  }
  return path;
}
const ALTEZZA_FILO = 2600; // copre l'intera lunghezza tipica della dashboard
const PATH_FILO = generaPathFilo(ALTEZZA_FILO);

type Modulo = {
  key: string;
  label: string;
  icona: keyof typeof MaterialCommunityIcons.glyphMap;
  route: string;
  inEvidenza?: boolean;
};

// Ordine e raggruppamento a coppie per costruire la griglia bento:
// le sezioni "inEvidenza" occupano una tile larga (2 colonne), le altre
// sono quadrate e vengono accoppiate 2 per riga.
const MODULI: Modulo[] = [
  { key: "bacheca", label: "Bacheca", icona: "clipboard-text-outline", route: "/bacheca", inEvidenza: true },
  { key: "bollette", label: "Bollette", icona: "lightbulb-outline", route: "/bollette", inEvidenza: true },
  { key: "immondizia", label: "Immondizia", icona: "trash-can-outline", route: "/immondizia" },
  { key: "pulizie", label: "Pulizie", icona: "broom", route: "/pulizie" },
  { key: "lista-spesa", label: "Lista Spesa", icona: "cart-outline", route: "/lista-spesa", inEvidenza: true },
  { key: "spese", label: "Spese / Rate", icona: "credit-card-outline", route: "/spese" },
  { key: "abbonamenti", label: "Abbonamenti", icona: "refresh", route: "/abbonamenti" },
  { key: "garanzie", label: "Garanzie", icona: "shield-outline", route: "/garanzie" },
  { key: "manutenzione", label: "Manutenzione", icona: "wrench-outline", route: "/manutenzione" },
  { key: "contatti-utili", label: "Contatti Utili", icona: "phone-outline", route: "/contatti-utili" },
  { key: "emergenza", label: "Emergenze", icona: "alarm-light-outline", route: "/emergenza" },
  { key: "coppia", label: "Coppia", icona: "heart-outline", route: "/coppia" },
];

const MODULI_AGGIUNTIVI: Modulo[] = [
  { key: "veicoli", label: "Veicoli", icona: "car-outline", route: "/veicoli" },
  { key: "animali", label: "Animali", icona: "paw-outline", route: "/animali" },
  { key: "piante", label: "Piante", icona: "sprout-outline", route: "/piante" },
  { key: "statistiche", label: "Statistiche", icona: "chart-bar", route: "/statistiche" },
];

export default function DashboardScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const [bollette, setBollette] = useState<Bolletta[]>([]);

  useEffect(() => {
    if (!profile?.householdId) return;
    const unsubscribe = ascoltaBollette(profile.householdId, setBollette);
    return unsubscribe;
  }, [profile?.householdId]);

  // Controllo "nuovo membro nella casa" — invariato dalla versione precedente.
  useEffect(() => {
    if (!profile?.householdId || !user) return;

    async function controllaNuoviMembri() {
      const household = await getHousehold(profile!.householdId!);
      if (!household) return;

      const puoVedereCodice = household.inviteCodeVisibleToAll || household.ownerId === user!.uid;
      if (!puoVedereCodice) return;

      const storageKey = `tepore:seenMembers:${household.id}`;
      const stored = await AsyncStorage.getItem(storageKey);

      if (stored === null) {
        await AsyncStorage.setItem(storageKey, JSON.stringify(household.memberIds));
        return;
      }

      const idsGiaVisti: string[] = JSON.parse(stored);
      const nuoviIds = household.memberIds.filter(
        (id) => !idsGiaVisti.includes(id) && id !== user!.uid
      );

      if (nuoviIds.length > 0) {
        const nuoviProfili = await getUserProfilesByIds(nuoviIds);
        const nomi = nuoviProfili.map((p) => p.displayName).join(", ");
        Alert.alert("Nuovo membro nella casa 🎉", `${nomi} si è unito/a a "${household.name}".`);
      }

      await AsyncStorage.setItem(storageKey, JSON.stringify(household.memberIds));
    }

    controllaNuoviMembri();
  }, [profile?.householdId, user]);

  // Scadenze imminenti: scadute (sempre) + entro i prossimi 7 giorni.
  const scadenzeImminenti = useMemo(() => {
    const traSetteGiorni = Date.now() + 7 * 24 * 60 * 60 * 1000;
    return bollette.filter((b) => !b.pagata).filter((b) => b.dataScadenza <= traSetteGiorni);
  }, [bollette]);

  const numeroBolletteInScadenza = scadenzeImminenti.length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Filo decorativo: dietro a tutto, non intercetta i tocchi */}
        <Svg
          width={60}
          height={ALTEZZA_FILO}
          viewBox={`0 0 60 ${ALTEZZA_FILO}`}
          style={styles.filoDecorativo}
          pointerEvents="none"
        >
          <Path
            d={PATH_FILO}
            stroke={COLORI.accento}
            strokeWidth={2.5}
            strokeOpacity={0.5}
            fill="none"
          />
        </Svg>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerLeft} onPress={() => router.push("/profilo")}>
            <View style={styles.headerTitleRow}>
              <View style={styles.puntinoVerde} />
              <Text style={styles.titoloApp}>Tepore</Text>
            </View>
            <Text style={styles.sottotitoloHeader}>
              {profile?.displayName || "Utente"} · {user?.email}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottonePartecipanti} onPress={() => router.push("/partecipanti")}>
            <MaterialCommunityIcons name="account-group-outline" size={20} color={COLORI.testo} />
          </TouchableOpacity>
        </View>

        {/* Scadenze imminenti */}
        <Text style={styles.sectionTitle}>Scadenze imminenti</Text>
        {scadenzeImminenti.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>
              Nessuna scadenza per ora. Aggiungi qualcosa dai moduli qui sotto!
            </Text>
          </View>
        ) : (
          scadenzeImminenti.map((bolletta) => {
            const scaduta = bolletta.dataScadenza < Date.now();
            return (
              <TouchableOpacity
                key={bolletta.id}
                style={styles.scadenzaCard}
                onPress={() => router.push(`/bolletta-dettaglio?id=${bolletta.id}`)}
              >
                <View style={styles.scadenzaLeft}>
                  <View style={styles.iconChipAccento}>
                    <MaterialCommunityIcons name="lightning-bolt-outline" size={18} color={COLORI.accentoIcona} />
                  </View>
                  <View>
                    <Text style={styles.scadenzaNome}>{bolletta.nome}</Text>
                    <Text style={scaduta ? styles.scadenzaStatoRosso : styles.scadenzaStatoMuted}>
                      {scaduta ? `Scaduto il ${formatData(bolletta.dataScadenza)}` : `Scade il ${formatData(bolletta.dataScadenza)}`}
                    </Text>
                  </View>
                </View>
                <Text style={styles.scadenzaImporto}>€ {bolletta.importo.toFixed(2)}</Text>
              </TouchableOpacity>
            );
          })
        )}

        {/* Le tue sezioni — griglia bento */}
        <Text style={styles.sectionTitle}>Le tue sezioni</Text>
        <View style={styles.griglia}>
          {costruisciRigheGriglia(MODULI).map((riga, indiceRiga) => (
            <View key={indiceRiga} style={styles.rigaGriglia}>
              {riga.map((modulo) => (
                <TouchableOpacity
                  key={modulo.key}
                  style={[styles.tile, modulo.inEvidenza ? styles.tileLarga : styles.tileQuadrata]}
                  onPress={() => router.push(modulo.route as any)}
                  activeOpacity={0.7}
                >
                  <View style={modulo.inEvidenza ? styles.iconChipAccentoGrande : styles.iconChipNeutro}>
                    <MaterialCommunityIcons
                      name={modulo.icona}
                      size={modulo.inEvidenza ? 22 : 18}
                      color={modulo.inEvidenza ? COLORI.accentoIcona : COLORI.neutroIcona}
                    />
                  </View>
                  <Text style={styles.tileLabel}>{modulo.label}</Text>
                  {modulo.key === "bollette" && numeroBolletteInScadenza > 0 && (
                    <Text style={styles.tileSottotitolo}>{numeroBolletteInScadenza} in scadenza</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {/* Moduli aggiuntivi — bloccati */}
        <Text style={styles.sectionTitle}>Moduli aggiuntivi</Text>
        <View style={styles.griglia}>
          {costruisciRigheGriglia(MODULI_AGGIUNTIVI, true).map((riga, indiceRiga) => (
            <View key={indiceRiga} style={styles.rigaGriglia}>
              {riga.map((modulo) => (
                <TouchableOpacity
                  key={modulo.key}
                  style={[styles.tile, styles.tileQuadrata, styles.tileBloccata]}
                  onPress={() =>
                    Alert.alert(
                      "Modulo aggiuntivo 🔒",
                      `"${modulo.label}" sarà sbloccabile presto con un piccolo acquisto in-app.`
                    )
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.lockBadge}>
                    <MaterialCommunityIcons name="lock-outline" size={12} color="#fff" />
                  </View>
                  <View style={styles.iconChipBloccato}>
                    <MaterialCommunityIcons name={modulo.icona} size={18} color="#B0AAA2" />
                  </View>
                  <Text style={styles.tileLabelBloccata}>{modulo.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Costruisce le righe della griglia: le tile "inEvidenza" occupano una riga
// intera da sole, le altre vengono accoppiate 2 per riga.
function costruisciRigheGriglia(moduli: Modulo[], tutteQuadrate = false): Modulo[][] {
  const righe: Modulo[][] = [];
  let coppiaCorrente: Modulo[] = [];

  for (const modulo of moduli) {
    if (!tutteQuadrate && modulo.inEvidenza) {
      if (coppiaCorrente.length > 0) {
        righe.push(coppiaCorrente);
        coppiaCorrente = [];
      }
      righe.push([modulo]);
    } else {
      coppiaCorrente.push(modulo);
      if (coppiaCorrente.length === 2) {
        righe.push(coppiaCorrente);
        coppiaCorrente = [];
      }
    }
  }
  if (coppiaCorrente.length > 0) righe.push(coppiaCorrente);
  return righe;
}

function formatData(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("it-IT", { day: "numeric", month: "short" });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORI.sfondo },
  content: { paddingHorizontal: PADDING_ORIZZONTALE, paddingTop: 60, paddingBottom: 50 },
  filoDecorativo: { position: "absolute", top: 64, left: 4, zIndex: -1 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
  },
  headerLeft: { flex: 1 },
  headerTitleRow: { flexDirection: "row", alignItems: "center" },
  puntinoVerde: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: COLORI.accento,
    marginRight: 8,
  },
  titoloApp: { fontSize: 24, fontWeight: "800", color: COLORI.testo, letterSpacing: -0.3 },
  sottotitoloHeader: { fontSize: 13, color: COLORI.muted, marginTop: 4, marginLeft: 17 },
  bottonePartecipanti: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },

  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORI.testo, marginBottom: 12 },

  emptyCard: {
    backgroundColor: COLORI.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  emptyCardText: { fontSize: 14, color: COLORI.muted, textAlign: "center", lineHeight: 20 },

  scadenzaCard: {
    backgroundColor: COLORI.card,
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  scadenzaLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  iconChipAccento: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: COLORI.accentoChiaro,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  scadenzaNome: { fontSize: 15, fontWeight: "700", color: COLORI.testo },
  scadenzaStatoRosso: { fontSize: 12, color: COLORI.rosso, fontWeight: "600", marginTop: 2 },
  scadenzaStatoMuted: { fontSize: 12, color: COLORI.muted, marginTop: 2 },
  scadenzaImporto: { fontSize: 16, fontWeight: "700", color: COLORI.testo },

  griglia: { marginBottom: 28 },
  rigaGriglia: { flexDirection: "row", gap: GAP_GRIGLIA, marginBottom: GAP_GRIGLIA },
  tile: {
    backgroundColor: COLORI.card,
    borderRadius: 20,
    padding: 16,
    minHeight: 76,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  tileLarga: { width: "100%", flexDirection: "row", alignItems: "center" },
  tileQuadrata: { width: TILE_WIDTH },
  tileBloccata: { position: "relative" },
  iconChipAccentoGrande: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORI.accentoChiaro,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  iconChipNeutro: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORI.neutroChip,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  iconChipBloccato: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "#EEEBE6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  tileLabel: { fontSize: 14, fontWeight: "700", color: COLORI.testo },
  tileLabelBloccata: { fontSize: 14, fontWeight: "700", color: "#B0AAA2" },
  tileSottotitolo: { fontSize: 12, color: COLORI.muted, marginTop: 2 },
  lockBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#B0AAA2",
    alignItems: "center",
    justifyContent: "center",
  },
});
