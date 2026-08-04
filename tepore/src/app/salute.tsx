// src/app/salute.tsx
//
// Promemoria di prevenzione e note personali di salute.
//
// SCELTA DI PROGETTO — PRIVACY: i dati sanitari sono la categoria più
// sensibile che l'app tratti (GDPR art. 9). Qui NON esiste condivisione:
// le Security Rules legano ogni voce all'utenteId, quindi nemmeno gli
// altri membri della casa (né il partner) possono leggerle. La schermata
// lo dichiara esplicitamente, così la promessa è visibile e non implicita.

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import Icona from "../components/Icona";
import { useAuth } from "../hooks/useAuth";
import {
  ascoltaSalute, creaVoce, eliminaVoce, segnaFatto, CONTROLLI_SUGGERITI,
} from "../services/salute";
import { TipoVoceSalute, VoceSalute } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import { colors, radius, shadow, fonts } from "../theme";

const GIORNO = 24 * 3600e3;
const MESE = 30 * GIORNO;

export default function SaluteScreen() {
  const { user } = useAuth();
  const [voci, setVoci] = useState<VoceSalute[]>([]);
  const [composer, setComposer] = useState<TipoVoceSalute | null>(null);
  const [titolo, setTitolo] = useState("");
  const [mesi, setMesi] = useState("12");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!user) return;
    return ascoltaSalute(user.uid, setVoci);
  }, [user?.uid]);

  const controlli = useMemo(
    () => voci.filter((v) => v.tipo === "controllo" && !v.completato)
      .sort((a, b) => (a.prossimaData ?? 0) - (b.prossimaData ?? 0)),
    [voci]
  );
  // Storico: le visite una tantum già fatte. Restano consultabili senza
  // ingombrare l'elenco di ciò che c'è ancora da fare.
  const storico = useMemo(
    () => voci.filter((v) => v.tipo === "controllo" && v.completato)
      .sort((a, b) => (b.ultimaData ?? 0) - (a.ultimaData ?? 0)),
    [voci]
  );
  const altre = useMemo(
    () => voci.filter((v) => v.tipo !== "controllo").sort((a, b) => b.createdAt - a.createdAt),
    [voci]
  );

  // ⚠️ Prima l'onPress lanciava segnaFatto() senza attenderla e senza
  // gestire gli errori: se la scrittura falliva non compariva nulla, e
  // sembrava che il bottone non funzionasse.
  async function handleFatto(voce: VoceSalute) {
    try {
      await segnaFatto(voce);
      if (voce.ricorrenzaMesi) {
        const prossima = new Date();
        prossima.setMonth(prossima.getMonth() + voce.ricorrenzaMesi);
        Alert.alert(
          "Segnato come fatto ✓",
          `Ti ricorderò il prossimo controllo intorno al ${prossima.toLocaleDateString("it-IT", { month: "long", year: "numeric" })}.`
        );
      } else {
        Alert.alert("Segnato come fatto ✓", "Lo trovi ora nello storico qui sotto.");
      }
    } catch (e: any) {
      Alert.alert("Non è stato possibile salvare", e?.message ?? "Riprova tra un momento.");
    }
  }

  async function aggiungiControllo(titoloVoce: string, mesiRicorrenza: number) {
    if (!user) return;
    const prossima = new Date();
    prossima.setMonth(prossima.getMonth() + mesiRicorrenza);
    await creaVoce({
      utenteId: user.uid, tipo: "controllo", titolo: titoloVoce,
      ricorrenzaMesi: mesiRicorrenza, prossimaData: prossima.getTime(),
    });
  }

  async function salvaDaComposer() {
    if (!user || !composer || !titolo.trim()) return;
    if (composer === "controllo") {
      const m = parseInt(mesi, 10) || 12;
      await aggiungiControllo(titolo.trim(), m);
    } else {
      await creaVoce({
        utenteId: user.uid, tipo: composer, titolo: titolo.trim(),
        note: note.trim() || undefined,
      });
    }
    setTitolo(""); setNote(""); setMesi("12"); setComposer(null);
  }

  function chiediElimina(v: VoceSalute) {
    Alert.alert("Eliminare?", v.titolo, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => eliminaVoce(v.id) },
    ]);
  }

  const suggerimentiDaMostrare = CONTROLLI_SUGGERITI.filter(
    (s) => !controlli.some((c) => c.titolo === s.titolo)
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader titolo="Salute" />
      <ScrollView contentContainerStyle={{ padding: 14, paddingTop: 2, paddingBottom: 30 }}>

        <View style={styles.bannerPrivacy}>
          <Icona name="shield-lock-outline" size={17} color={colors.accentDark} />
          <Text style={styles.bannerTesto}>
            Questa sezione è <Text style={{ fontFamily: fonts.extrabold, fontWeight: "800" }}>solo tua</Text>: nessun altro membro
            della casa può vederne il contenuto.
          </Text>
        </View>

        {/* ---- Controlli in programma ---- */}
        <Text style={styles.sezione}>Controlli in programma</Text>
        {controlli.length === 0 && (
          <Text style={styles.vuoto}>
            Nessun controllo impostato. Aggiungine uno dai suggerimenti qui sotto:
            ti avviseremo quando è il momento.
          </Text>
        )}
        {controlli.map((c) => {
          const giorni = c.prossimaData ? Math.ceil((c.prossimaData - Date.now()) / GIORNO) : null;
          const scaduto = giorni !== null && giorni < 0;
          const vicino = giorni !== null && giorni >= 0 && giorni <= 30;
          return (
            <TouchableOpacity key={c.id} style={styles.cardControllo}
              onLongPress={() => chiediElimina(c)} activeOpacity={0.9}>
              <View style={styles.chipIcona}>
                <Icona name="calendar-check-outline" size={20} color={colors.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.titoloVoce}>{c.titolo}</Text>
                <Text style={[styles.statoVoce, scaduto && styles.statoScaduto, vicino && styles.statoVicino]}>
                  {c.prossimaData
                    ? scaduto
                      ? `Da fare — era previsto il ${new Date(c.prossimaData).toLocaleDateString("it-IT")}`
                      : `${new Date(c.prossimaData).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}`
                    : "Nessuna data"}
                  {c.ricorrenzaMesi ? ` · ogni ${c.ricorrenzaMesi} mesi` : ""}
                </Text>
              </View>
              <TouchableOpacity style={styles.btnFatto} onPress={() => handleFatto(c)}>
                <Text style={styles.btnFattoTesto}>Fatto</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        })}

        {/* ---- Storico: le visite una tantum già fatte ---- */}
        {storico.length > 0 && (
          <>
            <Text style={styles.sezione}>Già fatte</Text>
            {storico.map((v) => (
              <View key={v.id} style={styles.cardStorico}>
                <Icona name="check-circle-outline" size={17} color="#4E8C63" />
                <Text style={styles.storicoTitolo}>{v.titolo}</Text>
                <Text style={styles.storicoData}>
                  {v.ultimaData ? new Date(v.ultimaData).toLocaleDateString("it-IT") : ""}
                </Text>
              </View>
            ))}
          </>
        )}

        {suggerimentiDaMostrare.length > 0 && (
          <>
            <Text style={styles.labelSuggerimenti}>Aggiungi rapidamente</Text>
            <View style={styles.rigaChips}>
              {suggerimentiDaMostrare.map((s) => (
                <TouchableOpacity key={s.titolo} style={styles.chipSuggerimento}
                  onPress={() => aggiungiControllo(s.titolo, s.mesi)}>
                  <Icona name={s.icona as any} size={15} color={colors.accent} />
                  <Text style={styles.chipSuggerimentoTesto}>{s.titolo}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* ---- Farmaci e note ---- */}
        <Text style={styles.sezione}>Farmaci e note</Text>
        {altre.length === 0 && (
          <Text style={styles.vuoto}>
            Qui puoi annotare farmaci che assumi, allergie o altre informazioni
            utili da ricordare (o da mostrare al medico).
          </Text>
        )}
        {altre.map((v) => (
          <TouchableOpacity key={v.id} style={styles.cardNota}
            onLongPress={() => chiediElimina(v)} activeOpacity={0.9}>
            <Icona
              name={v.tipo === "farmaco" ? "pill" : "note-text-outline"}
              size={19} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={styles.titoloVoce}>{v.titolo}</Text>
              {v.note ? <Text style={styles.noteVoce}>{v.note}</Text> : null}
            </View>
          </TouchableOpacity>
        ))}

        {/* ---- Composer ---- */}
        {composer ? (
          <View style={styles.composer}>
            <Text style={styles.composerTitolo}>
              {composer === "controllo" ? "Nuovo controllo" : composer === "farmaco" ? "Nuovo farmaco" : "Nuova nota"}
            </Text>
            <TextInput style={styles.input}
              placeholder={composer === "controllo" ? "Es. Visita cardiologica" : composer === "farmaco" ? "Es. Vitamina D" : "Es. Allergia ai pollini"}
              placeholderTextColor={colors.muted} value={titolo} onChangeText={setTitolo} />
            {composer === "controllo" ? (
              <View style={styles.rigaMesi}>
                <Text style={styles.labelMesi}>Ogni</Text>
                <TextInput style={styles.inputMesi} keyboardType="number-pad"
                  value={mesi} onChangeText={setMesi} maxLength={2} />
                <Text style={styles.labelMesi}>mesi</Text>
              </View>
            ) : (
              <TextInput style={[styles.input, { minHeight: 60 }]} multiline
                placeholder="Note (dosaggio, indicazioni…)"
                placeholderTextColor={colors.muted} value={note} onChangeText={setNote} />
            )}
            <View style={styles.rigaBottoni}>
              <TouchableOpacity style={styles.btnAnnulla} onPress={() => setComposer(null)}>
                <Text style={styles.btnAnnullaTesto}>Annulla</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnSalva} onPress={salvaDaComposer}>
                <Text style={styles.btnSalvaTesto}>Salva</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.rigaAzioni}>
            <TouchableOpacity style={styles.btnAzione} onPress={() => setComposer("controllo")}>
              <Icona name="calendar-plus" size={17} color={colors.accent} />
              <Text style={styles.btnAzioneTesto}>Controllo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnAzione} onPress={() => setComposer("farmaco")}>
              <Icona name="pill" size={17} color={colors.accent} />
              <Text style={styles.btnAzioneTesto}>Farmaco</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnAzione} onPress={() => setComposer("nota")}>
              <Icona name="note-plus-outline" size={17} color={colors.accent} />
              <Text style={styles.btnAzioneTesto}>Nota</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.piePagina}>
          Tieni premuta una voce per eliminarla · Tepore non sostituisce il parere medico
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bannerPrivacy: {
    flexDirection: "row", gap: 9, alignItems: "center", backgroundColor: colors.accentSoft,
    borderRadius: radius.md, padding: 12, marginBottom: 16,
  },
  bannerTesto: { flex: 1, fontSize: 12, color: colors.accentDark, lineHeight: 17, fontFamily: fonts.medium, fontWeight: "500" },
  sezione: { fontSize: 15, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink, marginBottom: 9, marginTop: 6 },
  vuoto: { fontSize: 12.5, color: colors.muted, lineHeight: 18, marginBottom: 10, fontFamily: fonts.medium, fontWeight: "500" },
  cardControllo: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 13, marginBottom: 9, ...shadow.card,
  },
  chipIcona: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.accentSoft,
    alignItems: "center", justifyContent: "center",
  },
  titoloVoce: { fontSize: 14.5, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  statoVoce: { fontSize: 12, color: colors.muted, marginTop: 2, fontFamily: fonts.medium, fontWeight: "500" },
  statoScaduto: { color: colors.danger, fontFamily: fonts.bold, fontWeight: "700" },
  statoVicino: { color: colors.warningInk, fontFamily: fonts.semibold, fontWeight: "600" },
  cardStorico: {
    flexDirection: "row", alignItems: "center", gap: 9,
    backgroundColor: "#F3F7F4", borderRadius: radius.md,
    paddingVertical: 11, paddingHorizontal: 13, marginBottom: 7,
  },
  storicoTitolo: { flex: 1, fontFamily: fonts.semibold, fontWeight: "600", fontSize: 14, color: "#5A6B5F" },
  storicoData: { fontFamily: fonts.regular, fontSize: 12.5, color: "#8B9B90" },
  btnFatto: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 13 },
  btnFattoTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700", fontSize: 12.5 },
  labelSuggerimenti: {
    fontSize: 11, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.muted, textTransform: "uppercase",
    letterSpacing: 0.5, marginTop: 6, marginBottom: 8,
  },
  rigaChips: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 6 },
  chipSuggerimento: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border, borderRadius: 999,
    paddingVertical: 7, paddingHorizontal: 12,
  },
  chipSuggerimentoTesto: { fontSize: 12, fontFamily: fonts.semibold, fontWeight: "600", color: colors.ink },
  cardNota: {
    flexDirection: "row", alignItems: "center", gap: 11,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, padding: 13, marginBottom: 8, ...shadow.card,
  },
  noteVoce: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  composer: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.lg, padding: 14, marginTop: 14, gap: 10, ...shadow.card,
  },
  composerTitolo: { fontSize: 14.5, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.ink },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink,
  },
  rigaMesi: { flexDirection: "row", alignItems: "center", gap: 8 },
  labelMesi: { fontSize: 14.5, color: colors.ink },
  inputMesi: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, color: colors.ink,
    width: 60, textAlign: "center",
  },
  rigaBottoni: { flexDirection: "row", gap: 9 },
  btnAnnulla: {
    flex: 1, borderRadius: radius.md, paddingVertical: 12, alignItems: "center",
    backgroundColor: colors.chipNeutral,
  },
  btnAnnullaTesto: { color: colors.chipNeutralInk, fontFamily: fonts.bold, fontWeight: "700" },
  btnSalva: {
    flex: 1, borderRadius: radius.md, paddingVertical: 12, alignItems: "center",
    backgroundColor: colors.accent,
  },
  btnSalvaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700" },
  rigaAzioni: { flexDirection: "row", gap: 8, marginTop: 14 },
  btnAzione: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, paddingVertical: 12,
  },
  btnAzioneTesto: { fontSize: 12.5, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  piePagina: { fontSize: 11, color: colors.muted, textAlign: "center", marginTop: 16, lineHeight: 16 },
});
