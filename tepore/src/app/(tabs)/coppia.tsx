// src/app/(tabs)/coppia.tsx
// Sezione Coppia: formazione della relazione (richiesta → conferma con
// scambio chiavi E2E) e, una volta confermata, accesso alla Zona Intima
// e alle "vostre cose" (salvadanai ed eventi di coppia).

import React, { useEffect, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import Icona from "../../components/Icona";
import { useAuth } from "../../hooks/useAuth";
import { useHousehold } from "../../hooks/useHousehold";
import { getHousehold, getUserProfilesByIds } from "../../services/household";
import {
  ascoltaRelazioniCasa, richiediCoppia, confermaCoppia, eliminaRelazione, miaRelazione,
} from "../../services/relationships";
import { ascoltaContenutiScoped } from "../../services/scoped";
import { EventoCalendario, Relationship, Salvadanaio, UserProfile } from "../../types";
import { colors, radius, shadow, fonts } from "../../theme";

const euro = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });

export default function CoppiaScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [membri, setMembri] = useState<UserProfile[]>([]);
  const [relazioni, setRelazioni] = useState<Relationship[]>([]);
  const [salvadanai, setSalvadanai] = useState<Salvadanaio[]>([]);
  const [eventi, setEventi] = useState<EventoCalendario[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [inCorso, setInCorso] = useState(false);

  const mia = user ? miaRelazione(relazioni, user.uid) : null;
  const confermata = mia?.stato === "confermata" ? mia : null;

  useEffect(() => {
    if (!householdId) return;
    (async () => {
      const casa = await getHousehold(householdId);
      if (casa) setMembri(await getUserProfilesByIds(casa.memberIds));
      setCaricamento(false);
    })();
    return ascoltaRelazioniCasa(householdId, setRelazioni);
  }, [householdId]);

  useEffect(() => {
    if (!householdId || !user || !confermata) return;
    const a = ascoltaContenutiScoped<Salvadanaio>("salvadanai", householdId, user.uid, confermata.id,
      (l) => setSalvadanai(l.filter((s) => s.visibilita === "coppia")));
    const b = ascoltaContenutiScoped<EventoCalendario>("calendario", householdId, user.uid, confermata.id,
      (l) => setEventi(l.filter((e) => e.visibilita === "coppia" && e.inizio >= Date.now())));
    return () => { a(); b(); };
  }, [householdId, user?.uid, confermata?.id]);

  const nomeDi = (uid: string) => membri.find((m) => m.id === uid)?.displayName ?? "Membro";
  const partner = confermata ? nomeDi(confermata.membri.find((m) => m !== user?.uid)!) : null;

  async function invia(partnerUid: string) {
    if (!householdId || !user) return;
    setInCorso(true);
    try { await richiediCoppia(householdId, user.uid, partnerUid); }
    catch { Alert.alert("Ops", "Non è stato possibile inviare la richiesta. Riprova."); }
    finally { setInCorso(false); }
  }

  async function conferma(rel: Relationship) {
    if (!user) return;
    setInCorso(true);
    try {
      await confermaCoppia(rel, user.uid);
      Alert.alert("💚", `Ora tu e ${nomeDi(rel.richiedente)} siete una coppia su Tepore.`);
    } catch (e: any) {
      Alert.alert("Quasi…", e?.message === "PARTNER_KEY_MISSING"
        ? "Il tuo partner deve aprire l'app almeno una volta con questa versione prima della conferma (serve a creare le chiavi della vostra zona riservata)."
        : "Conferma non riuscita. Riprova.");
    } finally { setInCorso(false); }
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
        <ActivityIndicator size="large" color={colors.intimate} />
      </View>
    );
  }

  const prossimoEvento = [...eventi].sort((a, b) => a.inizio - b.inizio)[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 14, paddingTop: 56, paddingBottom: 30 }}>

      <View style={styles.cuoreTesta}>
        <View style={styles.cuoreCerchio}>
          <Icona name={confermata ? "heart" : "heart-outline"} size={31} color={colors.intimate} />
        </View>
        <Text style={styles.titoloCoppia}>{confermata ? `Tu e ${partner}` : "Coppia"}</Text>
        <Text style={styles.sottotitoloCoppia}>
          {confermata
            ? `Insieme su Tepore dal ${new Date(confermata.dataConferma ?? confermata.dataRichiesta).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`
            : "Uno spazio riservato per chi vive la casa in due"}
        </Text>
      </View>

      {/* --- Coppia confermata --- */}
      {confermata && (
        <>
          <View style={[styles.card, styles.cardCoppia]}>
            <Text style={styles.cardTitolo}>La vostra Zona Intima</Text>
            <Text style={styles.cardSotto}>
              Note, ringraziamenti e ricorrenze che restano solo tra voi due.
            </Text>
            <TouchableOpacity style={styles.bottZona} onPress={() => router.push("/zona-intima")}>
              <Icona name="heart-plus-outline" size={19} color="#fff" />
              <Text style={styles.bottZonaTesto}>Apri la Zona Intima</Text>
            </TouchableOpacity>
            <View style={styles.e2e}>
              <Icona name="lock-check-outline" size={13} color={colors.muted} />
              <Text style={styles.e2eTesto}>Cifratura end-to-end: solo voi due potete leggere</Text>
            </View>
          </View>

          <Text style={styles.sezioncina}>Le vostre cose</Text>

          <RigaCoppia
            icona="piggy-bank-outline"
            nome={salvadanai[0]?.nome ?? "Salvadanaio di coppia"}
            stato={salvadanai[0]
              ? `${euro((salvadanai[0].contributi ?? []).reduce((s, c) => s + c.importo, 0))} di ${euro(salvadanai[0].importoTarget)}`
              : "Create un obiettivo da raggiungere insieme"}
            progresso={salvadanai[0]
              ? Math.min(1, (salvadanai[0].contributi ?? []).reduce((s, c) => s + c.importo, 0) / salvadanai[0].importoTarget)
              : undefined}
            onPress={() => router.push("/salvadanai")}
          />

          <RigaCoppia
            icona="calendar-heart"
            nome="Eventi di coppia"
            stato={prossimoEvento
              ? `${new Date(prossimoEvento.inizio).toLocaleDateString("it-IT", { weekday: "short", day: "numeric", month: "short" })} · ${prossimoEvento.titolo}`
              : "Nessun appuntamento in programma"}
            onPress={() => router.push("/calendario")}
          />

          <RigaCoppia
            icona="message-star-outline"
            nome="Diario di apprezzamento"
            stato="Scrivi un grazie: le piccole cose contano"
            onPress={() => router.push("/zona-intima")}
          />

          <TouchableOpacity
            onPress={() => sciogli(confermata, "Sciogliere la coppia?",
              "I contenuti della Zona Intima diventeranno definitivamente illeggibili, per entrambi.")}
          >
            <Text style={styles.linkPericolo}>Sciogli la coppia</Text>
          </TouchableOpacity>
        </>
      )}

      {/* --- Richiesta inviata da me --- */}
      {mia?.stato === "in_attesa" && mia.richiedente === user?.uid && (
        <View style={styles.card}>
          <Text style={styles.cardTesto}>
            Richiesta inviata a {nomeDi(mia.membri.find((m) => m !== user?.uid)!)} — in attesa di conferma.
          </Text>
          <TouchableOpacity onPress={() => sciogli(mia, "Annullare la richiesta?", "")}>
            <Text style={styles.linkPericolo}>Annulla richiesta</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* --- Richiesta ricevuta --- */}
      {mia?.stato === "in_attesa" && mia.richiedente !== user?.uid && (
        <View style={[styles.card, styles.cardCoppia]}>
          <Text style={styles.cardTitolo}>💌 {nomeDi(mia.richiedente)} ti chiede di formare una coppia</Text>
          <Text style={styles.cardSotto}>
            Accettando si creerà la vostra zona riservata, protetta da cifratura end-to-end.
          </Text>
          <View style={styles.rigaBottoni}>
            <TouchableOpacity style={styles.bottAccetta} onPress={() => conferma(mia)} disabled={inCorso}>
              {inCorso ? <ActivityIndicator color="#fff" /> : <Text style={styles.bottAccettaTesto}>Accetta</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.bottRifiuta}
              onPress={() => sciogli(mia, "Rifiutare la richiesta?", "Nessuna traccia resterà.")}>
              <Text style={styles.bottRifiutaTesto}>Rifiuta</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* --- Nessuna relazione --- */}
      {!mia && (
        <>
          <Text style={styles.spiegazione}>
            Scegli il tuo partner tra i membri della casa: riceverà una richiesta da confermare.
            Solo allora si sbloccherà la vostra zona riservata.
          </Text>
          {membri
            .filter((m) => m.id !== user?.uid && !relazioni.some((r) => r.membri.includes(m.id)))
            .map((m, i) => (
              <View key={m.id ?? `m-${i}`} style={styles.rigaMembro}>
                <View style={styles.avatarMembro}>
                  <Text style={styles.avatarMembroTesto}>
                    {(m.displayName ?? "?").charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text style={styles.nomeMembro}>{m.displayName}</Text>
                <TouchableOpacity style={styles.bottChiedi} onPress={() => invia(m.id)} disabled={inCorso}>
                  <Icona name="heart-outline" size={15} color="#fff" />
                  <Text style={styles.bottChiediTesto}>Chiedi</Text>
                </TouchableOpacity>
              </View>
            ))}
          {membri.filter((m) => m.id !== user?.uid && !relazioni.some((r) => r.membri.includes(m.id))).length === 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTesto}>
                Nessun membro disponibile: invita prima il tuo partner nella casa dalla schermata Partecipanti.
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

function RigaCoppia({ icona, nome, stato, progresso, onPress }: {
  icona: string; nome: string; stato: string; progresso?: number; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.riga} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.chipIcona}>
        <Icona name={icona} size={21} color={colors.intimate} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rigaNome}>{nome}</Text>
        <Text style={styles.rigaStato}>{stato}</Text>
        {progresso !== undefined && (
          <View style={styles.barraSfondo}>
            <View style={[styles.barraPieno, { width: `${progresso * 100}%` }]} />
          </View>
        )}
      </View>
      <Icona name="chevron-right" size={20} color="#C2CCD3" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centro: { alignItems: "center", justifyContent: "center" },
  cuoreTesta: { alignItems: "center", marginBottom: 18, marginTop: 4 },
  cuoreCerchio: {
    width: 66, height: 66, borderRadius: 33, backgroundColor: colors.intimateSoft,
    alignItems: "center", justifyContent: "center", marginBottom: 11,
  },
  titoloCoppia: { fontSize: 19, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink },
  sottotitoloCoppia: {
    fontSize: 12.5, color: colors.muted, marginTop: 3, fontFamily: fonts.medium, fontWeight: "500",
    textAlign: "center", paddingHorizontal: 20,
  },
  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 16, marginBottom: 10, ...shadow.card,
  },
  cardCoppia: { borderWidth: 1.5, borderColor: colors.intimate, backgroundColor: colors.intimateSoft },
  cardTitolo: { fontSize: 15, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink },
  cardSotto: { fontSize: 12.5, color: colors.muted, marginTop: 4, lineHeight: 18, fontFamily: fonts.medium, fontWeight: "500" },
  cardTesto: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  bottZona: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: colors.intimate, borderRadius: radius.md, paddingVertical: 14, marginTop: 12,
  },
  bottZonaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700", fontSize: 14.5 },
  e2e: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 9 },
  e2eTesto: { fontSize: 11, color: colors.muted, fontFamily: fonts.medium, fontWeight: "500" },
  sezioncina: {
    fontSize: 12, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.muted, textTransform: "uppercase",
    letterSpacing: 0.7, marginTop: 14, marginBottom: 9, marginHorizontal: 2,
  },
  riga: {
    flexDirection: "row", alignItems: "center", gap: 13,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14, marginBottom: 10, ...shadow.card,
  },
  chipIcona: {
    width: 42, height: 42, borderRadius: 13, backgroundColor: colors.intimateSoft,
    alignItems: "center", justifyContent: "center",
  },
  rigaNome: { fontSize: 15, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  rigaStato: { fontSize: 12, color: colors.muted, marginTop: 2, fontFamily: fonts.medium, fontWeight: "500" },
  barraSfondo: { height: 7, borderRadius: 4, backgroundColor: colors.chipNeutral, marginTop: 7, overflow: "hidden" },
  barraPieno: { height: "100%", backgroundColor: colors.intimate, borderRadius: 4 },
  linkPericolo: { color: colors.danger, fontFamily: fonts.semibold, fontWeight: "600", marginTop: 10, textAlign: "center", fontSize: 13 },
  rigaBottoni: { flexDirection: "row", gap: 10, marginTop: 12 },
  bottAccetta: {
    flex: 1, backgroundColor: colors.intimate, borderRadius: radius.md,
    paddingVertical: 13, alignItems: "center",
  },
  bottAccettaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700" },
  bottRifiuta: {
    flex: 1, borderWidth: 1.5, borderColor: colors.danger, borderRadius: radius.md,
    paddingVertical: 13, alignItems: "center", backgroundColor: colors.card,
  },
  bottRifiutaTesto: { color: colors.danger, fontFamily: fonts.bold, fontWeight: "700" },
  spiegazione: {
    fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 14,
    paddingHorizontal: 4, fontFamily: fonts.medium, fontWeight: "500",
  },
  rigaMembro: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 13, marginBottom: 9, ...shadow.card,
  },
  avatarMembro: {
    width: 38, height: 38, borderRadius: 19, backgroundColor: colors.accentSoft,
    alignItems: "center", justifyContent: "center",
  },
  avatarMembroTesto: { fontSize: 15, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.accent },
  nomeMembro: { flex: 1, fontSize: 15, fontFamily: fonts.semibold, fontWeight: "600", color: colors.ink },
  bottChiedi: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.intimate,
    borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14,
  },
  bottChiediTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700", fontSize: 13 },
});
