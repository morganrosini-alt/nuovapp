// src/app/coppia.tsx
//
// Sistema Relazioni (M1): richiesta → conferma della coppia dentro la casa.
// Alla conferma vengono generate le chiavi E2E condivise (vedi crypto.ts):
// da lì la Zona Intima (M6) risulterà sbloccata per i due partner.

import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, FlatList, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { getHousehold, getUserProfilesByIds } from "../services/household";
import {
  ascoltaRelazioniCasa, richiediCoppia, confermaCoppia, eliminaRelazione, miaRelazione,
} from "../services/relationships";
import { Relationship, UserProfile } from "../types";
import { colors, radius, shadow } from "../theme";

export default function CoppiaScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [membri, setMembri] = useState<UserProfile[]>([]);
  const [relazioni, setRelazioni] = useState<Relationship[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    if (!householdId) return;
    (async () => {
      const casa = await getHousehold(householdId);
      if (casa) setMembri(await getUserProfilesByIds(casa.memberIds));
      setCaricamento(false);
    })();
    const unsub = ascoltaRelazioniCasa(householdId, setRelazioni);
    return unsub;
  }, [householdId]);

  const mia = user ? miaRelazione(relazioni, user.uid) : null;
  const nomeDi = (uid: string) =>
    membri.find((m) => m.id === uid)?.displayName ?? "Membro";

  async function invia(partnerUid: string) {
    if (!householdId || !user) return;
    setInCorso(true);
    try {
      await richiediCoppia(householdId, user.uid, partnerUid);
    } catch {
      Alert.alert("Ops", "Non è stato possibile inviare la richiesta. Riprova.");
    } finally {
      setInCorso(false);
    }
  }

  async function conferma(rel: Relationship) {
    if (!user) return;
    setInCorso(true);
    try {
      await confermaCoppia(rel, user.uid);
      Alert.alert("💚", `Ora tu e ${nomeDi(rel.richiedente)} siete una coppia su Tepore.`);
    } catch (e: any) {
      if (e?.message === "PARTNER_KEY_MISSING") {
        Alert.alert(
          "Quasi…",
          "Il tuo partner deve aprire l'app almeno una volta con questa versione prima della conferma (serve per creare le chiavi private della vostra zona riservata)."
        );
      } else {
        Alert.alert("Ops", "Conferma non riuscita. Riprova.");
      }
    } finally {
      setInCorso(false);
    }
  }

  function sciogli(rel: Relationship, titolo: string, msg: string) {
    Alert.alert(titolo, msg, [
      { text: "Annulla", style: "cancel" },
      { text: "Conferma", style: "destructive", onPress: () => eliminaRelazione(rel.id) },
    ]);
  }

  if (caricamento) {
    return (
      <View style={[styles.container, styles.centro]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.bottoneHeader} onPress={() => router.back()}>
          <Text style={styles.bottoneHeaderTesto}>‹ Home</Text>
        </TouchableOpacity>
        <Text style={styles.titolo}>Coppia</Text>
        <View style={{ width: 90 }} />
      </View>

      {/* Stato attuale */}
      {mia?.stato === "confermata" && (
        <View style={[styles.card, styles.cardCoppia]}>
          <MaterialCommunityIcons name="heart" size={28} color={colors.intimate} />
          <Text style={styles.testoCoppia}>
            Tu e {nomeDi(mia.membri.find((m) => m !== user?.uid)!)} siete una coppia
          </Text>
          <Text style={styles.sottotesto}>
            La vostra Zona Intima è protetta con crittografia end-to-end: nemmeno noi possiamo leggerla.
          </Text>
          <TouchableOpacity
            onPress={() =>
              sciogli(mia, "Sciogliere la coppia?",
                "I contenuti della Zona Intima diventeranno definitivamente irrecuperabili, per entrambi.")
            }
          >
            <Text style={styles.linkPericolo}>Sciogli la coppia</Text>
          </TouchableOpacity>
        </View>
      )}

      {mia?.stato === "in_attesa" && mia.richiedente === user?.uid && (
        <View style={styles.card}>
          <Text style={styles.testoCard}>
            Richiesta inviata a {nomeDi(mia.membri.find((m) => m !== user?.uid)!)} — in attesa di conferma.
          </Text>
          <TouchableOpacity onPress={() => sciogli(mia, "Annullare la richiesta?", "")}>
            <Text style={styles.linkPericolo}>Annulla richiesta</Text>
          </TouchableOpacity>
        </View>
      )}

      {mia?.stato === "in_attesa" && mia.richiedente !== user?.uid && (
        <View style={[styles.card, styles.cardCoppia]}>
          <Text style={styles.testoCoppia}>
            💌 {nomeDi(mia.richiedente)} ti chiede di formare una coppia
          </Text>
          <View style={styles.rigaBottoni}>
            <TouchableOpacity
              style={styles.bottoneConferma}
              onPress={() => conferma(mia)}
              disabled={inCorso}
            >
              {inCorso
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.bottoneConfermaTesto}>Accetta</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bottoneRifiuta}
              onPress={() => sciogli(mia, "Rifiutare la richiesta?", "Nessuna traccia resterà.")}
            >
              <Text style={styles.bottoneRifiutaTesto}>Rifiuta</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Nessuna relazione: scegli il partner tra i membri */}
      {!mia && (
        <>
          <Text style={styles.spiegazione}>
            Scegli il tuo partner tra i membri della casa. Riceverà una richiesta da confermare —
            solo allora si sbloccherà la vostra zona riservata di coppia.
          </Text>
          <FlatList
            data={membri.filter(
              (m) => m.id !== user?.uid &&
                     !relazioni.some((r) => r.membri.includes(m.id)) // già in coppia con altri
            )}
            keyExtractor={(m) => m.id}
            contentContainerStyle={{ padding: 16 }}
            ListEmptyComponent={
              <Text style={styles.vuoto}>
                Nessun membro disponibile: invita prima il tuo partner nella casa
                (Partecipanti → codice invito).
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.rigaMembro}>
                <Text style={styles.nomeMembro}>{item.displayName}</Text>
                <TouchableOpacity
                  style={styles.bottoneChiedi}
                  onPress={() => invia(item.id)}
                  disabled={inCorso}
                >
                  <MaterialCommunityIcons name="heart-outline" size={16} color="#fff" />
                  <Text style={styles.bottoneChiediTesto}>Chiedi</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centro: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12,
  },
  bottoneHeader: {
    backgroundColor: colors.accent, borderRadius: radius.sm,
    paddingVertical: 8, paddingHorizontal: 12, width: 90, alignItems: "center",
  },
  bottoneHeaderTesto: { color: "#fff", fontWeight: "600", fontSize: 14 },
  titolo: { fontSize: 20, fontWeight: "800", color: colors.ink },
  spiegazione: { color: colors.muted, paddingHorizontal: 16, lineHeight: 20 },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 16,
    margin: 16, gap: 10, ...shadow.card,
  },
  cardCoppia: { borderWidth: 1.5, borderColor: colors.intimate, backgroundColor: colors.intimateSoft },
  testoCoppia: { fontSize: 16, fontWeight: "700", color: colors.ink },
  testoCard: { fontSize: 15, color: colors.ink },
  sottotesto: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  linkPericolo: { color: colors.danger, fontWeight: "600", marginTop: 4 },
  rigaBottoni: { flexDirection: "row", gap: 10 },
  bottoneConferma: {
    flex: 1, backgroundColor: colors.intimate, borderRadius: radius.md,
    paddingVertical: 12, alignItems: "center",
  },
  bottoneConfermaTesto: { color: "#fff", fontWeight: "700" },
  bottoneRifiuta: {
    flex: 1, borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.md,
    paddingVertical: 12, alignItems: "center", backgroundColor: colors.card,
  },
  bottoneRifiutaTesto: { color: colors.danger, fontWeight: "700" },
  rigaMembro: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.card, borderRadius: radius.md, padding: 14,
    marginBottom: 8, ...shadow.card,
  },
  nomeMembro: { fontSize: 15, fontWeight: "600", color: colors.ink },
  bottoneChiedi: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: colors.intimate, borderRadius: 999,
    paddingVertical: 8, paddingHorizontal: 14,
  },
  bottoneChiediTesto: { color: "#fff", fontWeight: "600", fontSize: 13 },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 30, lineHeight: 20 },
});
