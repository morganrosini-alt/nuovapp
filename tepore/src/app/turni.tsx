// src/app/turni.tsx
// Turni di lavoro della casa, vista settimanale. Visibili a tutti i membri:
// servono a capire "chi c'è" quando si programma qualcosa insieme.
// I turni compaiono anche nel calendario della Home, come pallini colorati.

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert,
} from "react-native";
import Icona from "../components/Icona";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { getHousehold, getUserProfilesByIds } from "../services/household";
import {
  ascoltaTurni, salvaTurno, eliminaTurno, turniDelGiorno, FASCE, fascia, aMezzanotte,
} from "../services/turni";
import { FasciaTurno, Turno, UserProfile } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import { colors, radius, shadow, fonts } from "../theme";

const GIORNO = 24 * 3600e3;
const NOMI_GIORNO = ["Domenica", "Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato"];

/** Lunedì della settimana che contiene la data indicata. */
function lunedìDi(d: Date): Date {
  const x = new Date(d);
  const offset = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - offset);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function TurniScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [turni, setTurni] = useState<Turno[]>([]);
  const [membri, setMembri] = useState<UserProfile[]>([]);
  const [inizioSettimana, setInizioSettimana] = useState(() => lunedìDi(new Date()));
  const [giornoAperto, setGiornoAperto] = useState<number | null>(null);
  const [chiSel, setChiSel] = useState<string | null>(null);

  useEffect(() => {
    if (!householdId) return;
    (async () => {
      const casa = await getHousehold(householdId);
      if (casa) setMembri(await getUserProfilesByIds(casa.memberIds));
    })();
    return ascoltaTurni(householdId, setTurni);
  }, [householdId]);

  useEffect(() => { if (user && !chiSel) setChiSel(user.uid); }, [user?.uid]);

  const giorni = useMemo(() => {
    const out: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(inizioSettimana);
      d.setDate(d.getDate() + i);
      out.push(d);
    }
    return out;
  }, [inizioSettimana]);

  const nomeDi = (uid: string) =>
    membri.find((m) => m.id === uid)?.displayName ?? (uid === user?.uid ? "Tu" : "Membro");
  const inizialeDi = (uid: string) => (nomeDi(uid) ?? "?").charAt(0).toUpperCase();

  async function aggiungi(giorno: Date, f: FasciaTurno) {
    if (!householdId || !chiSel) return;
    const esistente = turniDelGiorno(turni, giorno).find((t) => t.utenteId === chiSel);
    if (esistente) await eliminaTurno(esistente.id);   // un turno per persona al giorno
    await salvaTurno({
      householdId, utenteId: chiSel, giorno: aMezzanotte(giorno), fascia: f,
    });
    setGiornoAperto(null);
  }

  function chiediElimina(t: Turno) {
    Alert.alert("Rimuovere il turno?", `${nomeDi(t.utenteId)} · ${fascia(t.fascia).label}`, [
      { text: "Annulla", style: "cancel" },
      { text: "Rimuovi", style: "destructive", onPress: () => eliminaTurno(t.id) },
    ]);
  }

  // Giorni in cui nessuno lavora (tutti liberi o senza turno): buoni per organizzare
  const giorniLiberi = giorni.filter((g) => {
    const t = turniDelGiorno(turni, g);
    return t.length > 0 && t.every((x) => x.fascia === "libero" || x.fascia === "ferie");
  });

  const fineSettimana = new Date(inizioSettimana);
  fineSettimana.setDate(fineSettimana.getDate() + 6);

  return (
    <View style={styles.container}>
      <ModuloHeader titolo="Turni di lavoro" />
      <ScrollView contentContainerStyle={{ padding: 14, paddingTop: 2, paddingBottom: 30 }}>

        <Text style={styles.intro}>Chi lavora quando, per organizzare la casa senza chiedersi in giro.</Text>

        <View style={styles.legenda}>
          {FASCE.map((f) => (
            <View key={f.key} style={styles.legItem}>
              <View style={[styles.legDot, { backgroundColor: f.colore }]} />
              <Text style={styles.legTesto}>{f.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.navSettimana}>
          <TouchableOpacity style={styles.navBtn}
            onPress={() => setInizioSettimana((d) => new Date(d.getTime() - 7 * GIORNO))}>
            <Icona name="chevron-left" size={20} color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.navTesto}>
            {inizioSettimana.getDate()} – {fineSettimana.getDate()} {fineSettimana.toLocaleDateString("it-IT", { month: "long" })}
          </Text>
          <TouchableOpacity style={styles.navBtn}
            onPress={() => setInizioSettimana((d) => new Date(d.getTime() + 7 * GIORNO))}>
            <Icona name="chevron-right" size={20} color={colors.accent} />
          </TouchableOpacity>
        </View>

        {giorni.map((g) => {
          const chiave = aMezzanotte(g);
          const delGiorno = turniDelGiorno(turni, g);
          const isOggi = chiave === aMezzanotte(new Date());
          const aperto = giornoAperto === chiave;
          return (
            <View key={chiave} style={styles.cardGiorno}>
              <View style={styles.testaGiorno}>
                <Text style={[styles.dataGiorno, isOggi && styles.dataOggi]}>
                  {NOMI_GIORNO[g.getDay()]} {g.getDate()}{isOggi ? " · oggi" : ""}
                </Text>
                <TouchableOpacity style={styles.btnAggiungi}
                  onPress={() => setGiornoAperto(aperto ? null : chiave)}>
                  <Text style={styles.btnAggiungiTesto}>{aperto ? "chiudi" : "+ turno"}</Text>
                </TouchableOpacity>
              </View>

              {delGiorno.length === 0 && !aperto && (
                <Text style={styles.nessunTurno}>Nessun turno segnato</Text>
              )}

              {delGiorno.map((t) => {
                const f = fascia(t.fascia);
                return (
                  <TouchableOpacity key={t.id} style={styles.rigaPersona} onLongPress={() => chiediElimina(t)}>
                    <View style={[styles.avatarP, { backgroundColor: t.utenteId === user?.uid ? colors.accent : colors.chipNeutralInk }]}>
                      <Text style={styles.avatarPTesto}>{inizialeDi(t.utenteId)}</Text>
                    </View>
                    <Text style={styles.nomeP}>{t.utenteId === user?.uid ? "Tu" : nomeDi(t.utenteId)}</Text>
                    <View style={[styles.chipFascia, { backgroundColor: f.colore }]}>
                      <Text style={styles.chipFasciaTesto}>{f.label}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {aperto && (
                <View style={styles.selettore}>
                  {membri.length > 1 && (
                    <>
                      <Text style={styles.labelSel}>Per chi</Text>
                      <View style={styles.rigaChips}>
                        {membri.map((m) => (
                          <TouchableOpacity key={m.id}
                            style={[styles.chipMembro, chiSel === m.id && styles.chipMembroAttivo]}
                            onPress={() => setChiSel(m.id)}>
                            <Text style={[styles.chipMembroTesto, chiSel === m.id && styles.chipMembroTestoAttivo]}>
                              {m.id === user?.uid ? "Tu" : m.displayName?.split(" ")[0]}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}
                  <Text style={styles.labelSel}>Fascia</Text>
                  <View style={styles.rigaChips}>
                    {FASCE.map((f) => (
                      <TouchableOpacity key={f.key}
                        style={[styles.chipFasciaSel, { borderColor: f.colore }]}
                        onPress={() => aggiungi(g, f.key)}>
                        <View style={[styles.legDot, { backgroundColor: f.colore }]} />
                        <Text style={styles.chipFasciaSelTesto}>{f.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
            </View>
          );
        })}

        {giorniLiberi.length > 0 && (
          <View style={styles.suggerimento}>
            <Icona name="lightbulb-on-outline" size={19} color={colors.accent} />
            <Text style={styles.suggerimentoTesto}>
              {giorniLiberi.length === 1
                ? `${NOMI_GIORNO[giorniLiberi[0].getDay()]} ${giorniLiberi[0].getDate()} siete tutti liberi: buon giorno per organizzare qualcosa.`
                : `Ci sono ${giorniLiberi.length} giorni in cui siete tutti liberi questa settimana.`}
            </Text>
          </View>
        )}

        <Text style={styles.piePagina}>Tieni premuto un turno per rimuoverlo</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  intro: { fontSize: 13, color: colors.muted, lineHeight: 19, marginBottom: 12, fontFamily: fonts.medium, fontWeight: "500" },
  legenda: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  legItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  legDot: { width: 11, height: 11, borderRadius: 6 },
  legTesto: { fontSize: 11, fontFamily: fonts.semibold, fontWeight: "600", color: colors.muted },
  navSettimana: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  navBtn: {
    width: 34, height: 34, borderRadius: 11, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center",
  },
  navTesto: { fontSize: 15, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink, textTransform: "capitalize" },
  cardGiorno: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 13, marginBottom: 9, ...shadow.card,
  },
  testaGiorno: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  dataGiorno: { fontSize: 13.5, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  dataOggi: { color: colors.accent },
  btnAggiungi: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 11 },
  btnAggiungiTesto: { fontSize: 11, fontFamily: fonts.bold, fontWeight: "700", color: colors.accentDark },
  nessunTurno: { fontSize: 12, color: colors.muted, fontFamily: fonts.medium, fontWeight: "500", paddingVertical: 3 },
  rigaPersona: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 5 },
  avatarP: { width: 27, height: 27, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  avatarPTesto: { fontSize: 11, fontFamily: fonts.extrabold, fontWeight: "800", color: "#fff" },
  nomeP: { flex: 1, fontSize: 13, fontFamily: fonts.semibold, fontWeight: "600", color: colors.ink },
  chipFascia: { borderRadius: 999, paddingVertical: 3, paddingHorizontal: 11 },
  chipFasciaTesto: { fontSize: 11.5, fontFamily: fonts.bold, fontWeight: "700", color: "#fff" },
  selettore: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 8, paddingTop: 10, gap: 7 },
  labelSel: { fontSize: 11, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  rigaChips: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chipMembro: { borderRadius: 999, paddingVertical: 6, paddingHorizontal: 13, backgroundColor: colors.chipNeutral },
  chipMembroAttivo: { backgroundColor: colors.accent },
  chipMembroTesto: { fontSize: 12.5, fontFamily: fonts.semibold, fontWeight: "600", color: colors.chipNeutralInk },
  chipMembroTestoAttivo: { color: "#fff" },
  chipFasciaSel: {
    flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 12, borderWidth: 1.5, backgroundColor: colors.card,
  },
  chipFasciaSelTesto: { fontSize: 12.5, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  suggerimento: {
    flexDirection: "row", gap: 10, alignItems: "center", backgroundColor: colors.accentSoft,
    borderRadius: radius.lg, padding: 14, marginTop: 6,
  },
  suggerimentoTesto: { flex: 1, fontSize: 12.5, color: colors.accentDark, lineHeight: 18, fontFamily: fonts.semibold, fontWeight: "600" },
  piePagina: { fontSize: 11, color: colors.muted, textAlign: "center", marginTop: 14 },
});
