// src/app/calendario.tsx — M4
// Calendario condiviso: eventi con visibilità household / coppia / personale.
// La visibilità è applicata dalle Security Rules; qui la lettura avviene con
// query separate per livello (vedi services/scoped.ts).

import React, { useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, SectionList,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { addDoc, collection, deleteDoc, doc } from "firebase/firestore";
import Icona from "../components/Icona";
import { db } from "../services/firebase";
import { ascoltaContenutiScoped } from "../services/scoped";
import { ascoltaRelazioniCasa, miaRelazione } from "../services/relationships";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { EventoCalendario, Relationship, VisibilitaContenuto } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import CampoData from "../components/CampoData";
import { colors, radius, shadow, fonts } from "../theme";

const ETICHETTE: Record<VisibilitaContenuto, string> = {
  household: "Casa", coppia: "Coppia", personale: "Solo io",
};

export default function CalendarioScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [eventi, setEventi] = useState<EventoCalendario[]>([]);
  const [relazioni, setRelazioni] = useState<Relationship[]>([]);
  const [composerAperto, setComposerAperto] = useState(false);
  const [titolo, setTitolo] = useState("");
  const [data, setData] = useState(new Date());
  const [visibilita, setVisibilita] = useState<VisibilitaContenuto>("household");

  const rel = user ? miaRelazione(relazioni, user.uid) : null;
  const relConfermata = rel?.stato === "confermata" ? rel : null;

  useEffect(() => {
    if (!householdId || !user) return;
    const unsubRel = ascoltaRelazioniCasa(householdId, setRelazioni);
    return unsubRel;
  }, [householdId, user?.uid]);

  useEffect(() => {
    if (!householdId || !user) return;
    return ascoltaContenutiScoped<EventoCalendario>(
      "calendario", householdId, user.uid, relConfermata?.id ?? null, setEventi
    );
  }, [householdId, user?.uid, relConfermata?.id]);

  const sezioni = useMemo(() => {
    const futuri = eventi
      .filter((e) => e.inizio >= new Date().setHours(0, 0, 0, 0))
      .sort((a, b) => a.inizio - b.inizio);
    const gruppi = new Map<string, EventoCalendario[]>();
    for (const e of futuri) {
      const chiave = new Date(e.inizio).toLocaleDateString("it-IT", {
        weekday: "long", day: "numeric", month: "long",
      });
      gruppi.set(chiave, [...(gruppi.get(chiave) ?? []), e]);
    }
    return [...gruppi.entries()].map(([title, data]) => ({ title, data }));
  }, [eventi]);

  async function salva() {
    if (!titolo.trim() || !householdId || !user) return;
    await addDoc(collection(db, "calendario"), {
      householdId,
      titolo: titolo.trim(),
      inizio: data.getTime(),
      visibilita,
      ...(visibilita === "coppia" && relConfermata ? { relationshipId: relConfermata.id } : {}),
      autore: user.uid,
      createdAt: Date.now(),
    });
    setTitolo(""); setVisibilita("household"); setComposerAperto(false);
  }

  function chiediElimina(e: EventoCalendario) {
    if (e.autore !== user?.uid) return;
    Alert.alert("Eliminare l'evento?", e.titolo, [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => deleteDoc(doc(db, "calendario", e.id)) },
    ]);
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader
        titolo="Calendario"
        destra={
          <TouchableOpacity style={styles.bottonePiu} onPress={() => setComposerAperto(!composerAperto)}>
            <Icona name={composerAperto ? "close" : "plus"} size={20} color="#fff" />
          </TouchableOpacity>
        }
      />

      {composerAperto && (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Titolo evento (es. Cena dai suoceri)"
            placeholderTextColor={colors.muted}
            value={titolo}
            onChangeText={setTitolo}
          />
          <CampoData label="Quando" valore={data} onChange={setData} />
          <View style={styles.rigaChips}>
            {(Object.keys(ETICHETTE) as VisibilitaContenuto[]).map((v) => {
              const disabilitato = v === "coppia" && !relConfermata;
              return (
                <TouchableOpacity
                  key={v}
                  disabled={disabilitato}
                  style={[styles.chip, visibilita === v && styles.chipAttivo, disabilitato && styles.chipDisabilitato]}
                  onPress={() => setVisibilita(v)}
                >
                  <Text style={[styles.chipTesto, visibilita === v && styles.chipTestoAttivo]}>
                    {ETICHETTE[v]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {!relConfermata && (
            <Text style={styles.nota}>La visibilità "Coppia" si attiva formando una coppia nella sezione dedicata.</Text>
          )}
          <TouchableOpacity style={styles.bottoneSalva} onPress={salva}>
            <Text style={styles.bottoneSalvaTesto}>Aggiungi evento</Text>
          </TouchableOpacity>
        </View>
      )}

      <SectionList
        sections={sezioni}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          <Text style={styles.vuoto}>Nessun evento in programma. Tocca + per aggiungerne uno.</Text>
        }
        renderSectionHeader={({ section }) => (
          <Text style={styles.sezione}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onLongPress={() => chiediElimina(item)} activeOpacity={0.8}>
            <View style={{ flex: 1 }}>
              <Text style={styles.titoloEvento}>{item.titolo}</Text>
              {item.luogo ? <Text style={styles.luogo}>{item.luogo}</Text> : null}
            </View>
            <View style={[styles.badge,
              item.visibilita === "coppia" && styles.badgeCoppia,
              item.visibilita === "personale" && styles.badgePersonale]}>
              <Text style={styles.badgeTesto}>{ETICHETTE[item.visibilita]}</Text>
            </View>
          </TouchableOpacity>
        )}
      />
      <Text style={styles.suggerimento}>Tieni premuto un tuo evento per eliminarlo</Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  bottonePiu: {
    backgroundColor: colors.accent, borderRadius: radius.sm,
    width: 38, height: 38, alignItems: "center", justifyContent: "center",
  },
  composer: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14,
    marginHorizontal: 16, marginBottom: 8, gap: 10, ...shadow.card,
  },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink,
  },
  rigaChips: { flexDirection: "row", gap: 8 },
  chip: {
    borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14,
    backgroundColor: colors.chipNeutral,
  },
  chipAttivo: { backgroundColor: colors.accent },
  chipDisabilitato: { opacity: 0.4 },
  chipTesto: { fontSize: 13, fontFamily: fonts.semibold, fontWeight: "600", color: colors.chipNeutralInk },
  chipTestoAttivo: { color: "#fff" },
  nota: { fontSize: 12, color: colors.muted },
  bottoneSalva: {
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 12, alignItems: "center",
  },
  bottoneSalvaTesto: { color: "#fff", fontFamily: fonts.bold, fontWeight: "700" },
  sezione: {
    fontSize: 13, fontFamily: fonts.extrabold, fontWeight: "800", color: colors.muted,
    textTransform: "capitalize", marginTop: 12, marginBottom: 6,
  },
  card: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: colors.card, borderRadius: radius.md, padding: 14,
    marginBottom: 8, ...shadow.card,
  },
  titoloEvento: { fontSize: 15, fontFamily: fonts.semibold, fontWeight: "600", color: colors.ink },
  luogo: { fontSize: 13, color: colors.muted, marginTop: 2 },
  badge: {
    borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10,
    backgroundColor: colors.accentSoft,
  },
  badgeCoppia: { backgroundColor: colors.intimateSoft },
  badgePersonale: { backgroundColor: colors.chipNeutral },
  badgeTesto: { fontSize: 11, fontFamily: fonts.bold, fontWeight: "700", color: colors.ink },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40, lineHeight: 20 },
  suggerimento: { color: colors.muted, fontSize: 11, textAlign: "center", paddingBottom: 12 },
});
