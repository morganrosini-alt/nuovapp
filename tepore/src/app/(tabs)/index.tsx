// src/app/(tabs)/index.tsx — HOME
//
// Il cuore dell'app: un calendario che unisce in un colpo d'occhio tutto
// ciò che riguarda la casa — eventi, scadenze economiche, raccolta
// immondizia e turni di lavoro di ciascun membro. Tocchi un giorno e sotto
// leggi il dettaglio; sotto ancora, i promemoria della bacheca.

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet, Pressable,
} from "react-native";
import { router } from "expo-router";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import Icona from "../../components/Icona";
import Svg, { Path } from "react-native-svg";
import { db } from "../../services/firebase";
import { useAuth } from "../../hooks/useAuth";
import { useHousehold } from "../../hooks/useHousehold";
import { getHousehold, getUserProfilesByIds } from "../../services/household";
import { ascoltaBacheca, toggleChecklistItem } from "../../services/bacheca";
import { ascoltaContenutiScoped } from "../../services/scoped";
import { ascoltaRelazioniCasa, miaRelazione } from "../../services/relationships";
import { lettereAttiveInGiorno, coloreTestoLeggibile } from "../../services/immondizia";
import { ascoltaTurni, turniDelGiorno, fascia, aMezzanotte } from "../../services/turni";
import {
  Bolletta, EventoCalendario, GiornoSettimana, NotaBacheca, Relationship,
  TipoRifiutoPersonalizzato, Turno, UserProfile,
} from "../../types";
import { colors, radius, shadow, fonts } from "../../theme";
import BottoneAggiungi from "../../components/BottoneAggiungi";

const NOMI_GIORNO = ["domenica", "lunedì", "martedì", "mercoledì", "giovedì", "venerdì", "sabato"];
const euro = (n: number) => n.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
const iniziali = (nome?: string) =>
  (nome ?? "?").trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

export default function HomeScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [nomeCasa, setNomeCasa] = useState("");
  const [membri, setMembri] = useState<UserProfile[]>([]);
  const [eventi, setEventi] = useState<EventoCalendario[]>([]);
  const [bollette, setBollette] = useState<Bolletta[]>([]);
  const [tipiRifiuto, setTipiRifiuto] = useState<TipoRifiutoPersonalizzato[]>([]);
  const [turni, setTurni] = useState<Turno[]>([]);
  const [note, setNote] = useState<NotaBacheca[]>([]);
  const [relazioni, setRelazioni] = useState<Relationship[]>([]);
  const [meseMostrato, setMeseMostrato] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d;
  });
  const [giornoScelto, setGiornoScelto] = useState(() => aMezzanotte(new Date()));

  const rel = user ? miaRelazione(relazioni, user.uid) : null;
  const relConfermata = rel?.stato === "confermata" ? rel : null;

  useEffect(() => {
    if (!householdId) return;
    (async () => {
      const casa = await getHousehold(householdId);
      if (!casa) return;
      setNomeCasa(casa.name);
      setMembri(await getUserProfilesByIds(casa.memberIds));
    })();

    const unsubs = [
      ascoltaRelazioniCasa(householdId, setRelazioni),
      ascoltaTurni(householdId, setTurni),
      ascoltaBacheca(householdId, setNote),
      onSnapshot(
        query(collection(db, "bollette"), where("householdId", "==", householdId), where("pagata", "==", false)),
        (s) => setBollette(s.docs.map((d) => ({ id: d.id, ...d.data() } as Bolletta))),
        () => {}
      ),
      onSnapshot(
        query(collection(db, "immondizia_tipi"), where("householdId", "==", householdId)),
        (s) => setTipiRifiuto(s.docs.map((d) => ({ id: d.id, ...d.data() } as TipoRifiutoPersonalizzato))),
        () => {}
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [householdId]);

  useEffect(() => {
    if (!householdId || !user) return;
    return ascoltaContenutiScoped<EventoCalendario>(
      "calendario", householdId, user.uid, relConfermata?.id ?? null, setEventi
    );
  }, [householdId, user?.uid, relConfermata?.id]);

  const nomeDi = (uid: string) => membri.find((m) => m.id === uid)?.displayName ?? "Membro";

  // ---- Costruzione griglia del mese (lunedì come primo giorno) ----
  const celle = useMemo(() => {
    const anno = meseMostrato.getFullYear();
    const mese = meseMostrato.getMonth();
    const primo = new Date(anno, mese, 1);
    const offset = (primo.getDay() + 6) % 7;          // lun=0 … dom=6
    const giorniNelMese = new Date(anno, mese + 1, 0).getDate();
    const out: Array<{ data: Date; fuori: boolean }> = [];
    for (let i = offset; i > 0; i--) out.push({ data: new Date(anno, mese, 1 - i), fuori: true });
    for (let g = 1; g <= giorniNelMese; g++) out.push({ data: new Date(anno, mese, g), fuori: false });
    while (out.length % 7 !== 0) {
      const ultimo = out[out.length - 1].data;
      out.push({ data: new Date(ultimo.getFullYear(), ultimo.getMonth(), ultimo.getDate() + 1), fuori: true });
    }
    return out;
  }, [meseMostrato]);

  // ---- Cosa c'è in un dato giorno ----
  function contenutiDi(data: Date) {
    const chiave = aMezzanotte(data);
    const ev = eventi.filter((e) => aMezzanotte(e.inizio) === chiave);
    const sc = bollette.filter((b) => aMezzanotte(b.dataScadenza) === chiave);
    const rif = lettereAttiveInGiorno(tipiRifiuto, data.getDay() as GiornoSettimana, data);
    const tur = turniDelGiorno(turni, data);
    return { ev, sc, rif, tur };
  }

  const oggi = aMezzanotte(new Date());
  const dettaglio = useMemo(() => contenutiDi(new Date(giornoScelto)),
    [giornoScelto, eventi, bollette, tipiRifiuto, turni]);

  const noteAperte = note.filter((n) =>
    n.tipo === "nota" ? true : (n.items ?? []).some((i) => !i.fatto)
  ).slice(0, 3);

  function cambiaMese(delta: number) {
    setMeseMostrato((m) => new Date(m.getFullYear(), m.getMonth() + delta, 1));
  }

  const dataScelta = new Date(giornoScelto);
  const etichettaGiorno =
    (giornoScelto === oggi ? "Oggi — " : "") +
    `${NOMI_GIORNO[dataScelta.getDay()]} ${dataScelta.getDate()} ` +
    dataScelta.toLocaleDateString("it-IT", { month: "long" });

  return (
    <View style={styles.container}>
    <ScrollView contentContainerStyle={{ padding: 14, paddingTop: 56, paddingBottom: 90 }}>

      {/* ---- Testata ---- */}
      <View style={styles.testata}>
        <TouchableOpacity style={styles.avatar} onPress={() => router.push("/profilo")}>
          <Text style={styles.avatarTesto}>{iniziali(profile?.displayName)}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1 }} onPress={() => router.push("/profilo")}>
          <Text style={styles.saluto}>Ciao, {profile?.displayName?.split(" ")[0] ?? ""}</Text>
          <Text style={styles.casa}>
            {nomeCasa}{membri.length > 0 ? ` · ${membri.length} ${membri.length === 1 ? "persona" : "persone"}` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnTondo} onPress={() => router.push("/partecipanti")}>
          <Icona name="account-group-outline" size={20} color={colors.accent} />
        </TouchableOpacity>
      </View>

      <Svg width={130} height={10} viewBox="0 0 130 10" style={{ marginBottom: 12 }}>
        <Path d="M2 6 C 20 -2, 38 12, 56 5 S 92 -1, 110 6 S 126 9, 128 4"
          stroke={colors.sky} strokeWidth={1.8} strokeLinecap="round" fill="none" />
      </Svg>

      {/* ---- Calendario ---- */}
      <View style={styles.card}>
        <View style={styles.calTesta}>
          <TouchableOpacity onPress={() => cambiaMese(-1)} hitSlop={10}>
            <Icona name="chevron-left" size={24} color={colors.accent} />
          </TouchableOpacity>
          <Text style={styles.calMese}>
            {meseMostrato.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}
          </Text>
          <TouchableOpacity onPress={() => cambiaMese(1)} hitSlop={10}>
            <Icona name="chevron-right" size={24} color={colors.accent} />
          </TouchableOpacity>
        </View>

        <View style={styles.rigaGiorni}>
          {["L", "M", "M", "G", "V", "S", "D"].map((g, i) => (
            <Text key={i} style={styles.nomeGiorno}>{g}</Text>
          ))}
        </View>

        <View style={styles.griglia}>
          {celle.map(({ data, fuori }, i) => {
            const chiave = aMezzanotte(data);
            const { ev, sc, rif, tur } = contenutiDi(data);
            const isOggi = chiave === oggi;
            const isScelto = chiave === giornoScelto;
            return (
              <Pressable
                key={i}
                style={[styles.cella, isOggi && styles.cellaOggi, isScelto && styles.cellaScelta]}
                onPress={() => setGiornoScelto(chiave)}
              >
                <Text style={[styles.numero, fuori && styles.numeroFuori, isOggi && styles.numeroOggi]}>
                  {data.getDate()}
                </Text>
                {ev.length > 0 && <View style={[styles.barra, { backgroundColor: colors.success }]} />}
                {sc.length > 0 && <View style={[styles.barra, { backgroundColor: colors.warning }]} />}
                {rif.length > 0 && (
                  <View style={styles.rigaLettere}>
                    {rif.slice(0, 3).map((t) => (
                      <View key={t.id} style={[styles.quadratino, { backgroundColor: t.colore }]}>
                        <Text style={[styles.lettera, { color: coloreTestoLeggibile(t.colore) }]}>
                          {t.lettera}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                {tur.length > 0 && (
                  <View style={styles.rigaTurni}>
                    {tur.slice(0, 3).map((t) => (
                      <View key={t.id} style={[styles.pallinoTurno, { backgroundColor: fascia(t.fascia).colore }]}>
                        <Text style={styles.inizialeTurno}>{iniziali(nomeDi(t.utenteId))[0]}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* ---- Dettaglio del giorno scelto ---- */}
        <View style={styles.dettaglio}>
          <Text style={styles.dettaglioTitolo}>{etichettaGiorno}</Text>

          {dettaglio.ev.map((e) => (
            <TouchableOpacity key={e.id} style={[styles.voce, styles.voceEvento]} onPress={() => router.push("/calendario")}>
              <Icona name="calendar-star" size={16} color={colors.successInk} />
              <Text style={[styles.voceTesto, { color: colors.successInk }]} numberOfLines={1}>
                {new Date(e.inizio).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} · {e.titolo}
              </Text>
            </TouchableOpacity>
          ))}

          {dettaglio.sc.map((b) => (
            <TouchableOpacity key={b.id} style={[styles.voce, styles.voceScadenza]} onPress={() => router.push("/bollette")}>
              <Icona name="lightning-bolt" size={16} color={colors.warningInk} />
              <Text style={[styles.voceTesto, { color: colors.warningInk }]} numberOfLines={1}>
                Scade: {b.nome} · {euro(b.importo)}
              </Text>
            </TouchableOpacity>
          ))}

          {dettaglio.rif.length > 0 && (
            <TouchableOpacity style={[styles.voce, styles.voceRifiuti]} onPress={() => router.push("/immondizia")}>
              <Icona name="trash-can-outline" size={16} color={colors.dangerInk} />
              <Text style={[styles.voceTesto, { color: colors.dangerInk }]} numberOfLines={1}>
                Raccolta: {dettaglio.rif.map((t) => t.nome).join(" + ")}
              </Text>
            </TouchableOpacity>
          )}

          {dettaglio.tur.map((t) => (
            <TouchableOpacity key={t.id} style={[styles.voce, styles.voceTurno]} onPress={() => router.push("/turni")}>
              <View style={[styles.puntoFascia, { backgroundColor: fascia(t.fascia).colore }]} />
              <Text style={[styles.voceTesto, { color: colors.ink }]} numberOfLines={1}>
                {nomeDi(t.utenteId)} · {fascia(t.fascia).label}
                {t.oraInizio ? ` (${t.oraInizio}${t.oraFine ? `–${t.oraFine}` : ""})` : ""}
              </Text>
            </TouchableOpacity>
          ))}

          {dettaglio.ev.length + dettaglio.sc.length + dettaglio.rif.length + dettaglio.tur.length === 0 && (
            <View style={[styles.voce, styles.voceVuota]}>
              <Icona name="emoticon-happy-outline" size={16} color={colors.muted} />
              <Text style={[styles.voceTesto, { color: colors.muted, fontFamily: fonts.medium, fontWeight: "500" }]}>
                Giornata libera, niente in programma
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* ---- Promemoria (bacheca) ---- */}
      <View style={[styles.card, { marginTop: 12 }]}>
        <View style={styles.promTesta}>
          <Text style={styles.promTitolo}>Promemoria</Text>
          <TouchableOpacity style={styles.tagBacheca} onPress={() => router.push("/bacheca")}>
            <Text style={styles.tagBachecaTesto}>bacheca</Text>
          </TouchableOpacity>
        </View>

        {noteAperte.length === 0 ? (
          <Text style={styles.promVuoto}>
            Niente da ricordare. Tocca + per lasciare un appunto a chi vive con te.
          </Text>
        ) : (
          noteAperte.map((n) => {
            if (n.tipo === "nota") {
              return (
                <TouchableOpacity key={n.id} style={styles.promRiga} onPress={() => router.push("/bacheca")}>
                  <Icona name="pin-outline" size={17} color={colors.accent} />
                  <Text style={styles.promTesto} numberOfLines={1}>{n.testo}</Text>
                  <Text style={styles.promAutore}>{nomeDi(n.autore).split(" ")[0]}</Text>
                </TouchableOpacity>
              );
            }
            const primo = (n.items ?? []).findIndex((i) => !i.fatto);
            const item = (n.items ?? [])[primo];
            if (!item) return null;
            return (
              <TouchableOpacity
                key={n.id}
                style={styles.promRiga}
                onPress={() => user && toggleChecklistItem(n, primo, user.uid)}
              >
                <Icona name="checkbox-blank-outline" size={17} color={colors.accent} />
                <Text style={styles.promTesto} numberOfLines={1}>{item.testo}</Text>
                <Text style={styles.promAutore}>{nomeDi(n.autore).split(" ")[0]}</Text>
              </TouchableOpacity>
            );
          })
        )}

      </View>
    </ScrollView>

    {/* Ancorato allo schermo, sopra la tab bar: non copre mai i promemoria */}
    <BottoneAggiungi onPress={() => router.push("/bacheca")} bottom={100} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  testata: { flexDirection: "row", alignItems: "center", gap: 11, marginBottom: 6 },
  avatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center",
  },
  avatarTesto: { color: "#fff", fontFamily: fonts.extrabold, fontWeight: "800", fontSize: 15 },
  saluto: { fontSize: 18, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  casa: { fontSize: 12, color: colors.muted, fontFamily: fonts.medium, fontWeight: "500", marginTop: 1 },
  btnTondo: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center",
  },

  card: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.xl, padding: 15, ...shadow.card,
  },
  calTesta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  calMese: { fontSize: 16, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink, textTransform: "capitalize" },
  rigaGiorni: { flexDirection: "row", marginBottom: 4 },
  nomeGiorno: { flex: 1, textAlign: "center", fontSize: 10, fontFamily: fonts.bold, fontWeight: "700", color: colors.muted },
  griglia: { flexDirection: "row", flexWrap: "wrap" },
  cella: {
    width: `${100 / 7}%`, minHeight: 50, borderRadius: 10, paddingTop: 3,
    paddingHorizontal: 2, borderWidth: 1.5, borderColor: "transparent", alignItems: "center",
  },
  cellaOggi: { backgroundColor: colors.accentSoft },
  cellaScelta: { borderColor: colors.accent },
  numero: { fontSize: 11, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  numeroFuori: { color: "#C2CCD3" },
  numeroOggi: { color: colors.accentDark },
  barra: { height: 3.5, borderRadius: 2, alignSelf: "stretch", marginTop: 2, marginHorizontal: 3 },
  rigaLettere: { flexDirection: "row", gap: 1.5, marginTop: 2 },
  quadratino: {
    width: 12, height: 12, borderRadius: 3, alignItems: "center", justifyContent: "center",
    borderWidth: 0.75, borderColor: "#000",
  },
  lettera: { fontSize: 7.5, fontFamily: fonts.extrabold, fontWeight: "800" },
  rigaTurni: { flexDirection: "row", gap: 1.5, marginTop: 2 },
  pallinoTurno: { width: 13, height: 13, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  inizialeTurno: { fontSize: 7.5, fontFamily: fonts.extrabold, fontWeight: "800", color: "#fff" },

  dettaglio: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: 11, paddingTop: 11 },
  dettaglioTitolo: {
    fontSize: 13, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.muted, marginBottom: 8, textTransform: "capitalize",
  },
  voce: {
    flexDirection: "row", alignItems: "center", gap: 9,
    borderRadius: 11, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 5,
  },
  voceTesto: { flex: 1, fontSize: 12.5, fontFamily: fonts.semibold, fontWeight: "600" },
  voceEvento: { backgroundColor: colors.successSoft },
  voceScadenza: { backgroundColor: colors.warningSoft },
  voceRifiuti: { backgroundColor: colors.dangerSoft },
  voceTurno: { backgroundColor: colors.chipNeutral },
  voceVuota: { backgroundColor: colors.chipNeutral },
  puntoFascia: { width: 12, height: 12, borderRadius: 6 },

  promTesta: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  promTitolo: { fontSize: 16, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink },
  tagBacheca: { backgroundColor: colors.accentSoft, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12 },
  tagBachecaTesto: { fontSize: 11, fontFamily: fonts.bold, fontWeight: "700", color: colors.accentDark },
  promRiga: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 6 },
  promTesto: { flex: 1, fontSize: 13.5, color: colors.ink, fontFamily: fonts.medium, fontWeight: "500" },
  promAutore: { fontSize: 10.5, color: colors.muted, fontFamily: fonts.semibold, fontWeight: "600" },
  promVuoto: { fontSize: 13, color: colors.muted, lineHeight: 19, paddingRight: 50 },
});
