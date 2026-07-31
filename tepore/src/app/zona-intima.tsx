// src/app/zona-intima.tsx — M6
// La zona riservata della coppia. TUTTO il contenuto è cifrato end-to-end:
// la chiave si "scarta" dalla wrappedKey personale (vedi services/crypto.ts),
// i documenti su Firestore contengono SOLO ciphertext. Se questa schermata
// non riesce a decifrare, il server non può aiutare — è il punto.

import React, { useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, query, where,
} from "firebase/firestore";
import Icona from "../components/Icona";
import { db } from "../services/firebase";
import { useAuth } from "../hooks/useAuth";
import { useHousehold } from "../hooks/useHousehold";
import { ascoltaRelazioniCasa, miaRelazione } from "../services/relationships";
import { unwrapCoupleKey, encryptContent, decryptContent } from "../services/crypto";
import { ContenutoIntimo, ContenutoIntimoTipo, Relationship } from "../types";
import ModuloHeader from "../components/ModuloHeader";
import { colors, radius, shadow, fonts } from "../theme";

const TIPI: Array<{ tipo: ContenutoIntimoTipo; label: string; icona: string }> = [
  { tipo: "nota", label: "Nota", icona: "note-text-outline" },
  { tipo: "apprezzamento", label: "Grazie ❤", icona: "hand-heart-outline" },
  { tipo: "ricorrenza", label: "Ricorrenza", icona: "calendar-heart" },
  { tipo: "riparazione", label: "Riparazione", icona: "hand-peace" },
];

type Decifrato = ContenutoIntimo & { testo: string | null };

export default function ZonaIntimaScreen() {
  const { user } = useAuth();
  const { profile } = useHousehold();
  const householdId = profile?.householdId ?? null;

  const [relazioni, setRelazioni] = useState<Relationship[]>([]);
  const [chiave, setChiave] = useState<Uint8Array | null>(null);
  const [erroreChiave, setErroreChiave] = useState(false);
  const [contenuti, setContenuti] = useState<Decifrato[]>([]);
  const [bozza, setBozza] = useState("");
  const [tipo, setTipo] = useState<ContenutoIntimoTipo>("nota");

  const rel = user ? miaRelazione(relazioni, user.uid) : null;
  const relConfermata = rel?.stato === "confermata" ? rel : null;

  useEffect(() => {
    if (!householdId) return;
    return ascoltaRelazioniCasa(householdId, setRelazioni);
  }, [householdId]);

  // Sblocco: scarto la MIA copia della chiave di coppia
  useEffect(() => {
    (async () => {
      if (!relConfermata || !user) return;
      const wrapped = relConfermata.wrappedKeys?.[user.uid];
      if (!wrapped) { setErroreChiave(true); return; }
      try {
        setChiave(await unwrapCoupleKey(wrapped));
        setErroreChiave(false);
      } catch {
        setErroreChiave(true);
      }
    })();
  }, [relConfermata?.id, user?.uid]);

  // Contenuti in tempo reale, decifrati al volo
  useEffect(() => {
    if (!relConfermata || !chiave) return;
    const q = query(
      collection(db, "zona_intima"),
      where("relationshipId", "==", relConfermata.id)
    );
    return onSnapshot(q, (snap) => {
      const lista: Decifrato[] = snap.docs.map((d) => {
        const raw = { id: d.id, ...d.data() } as ContenutoIntimo;
        const payload = decryptContent<{ testo: string }>(chiave, raw.ciphertext);
        return { ...raw, testo: payload?.testo ?? null };
      });
      lista.sort((a, b) => b.createdAt - a.createdAt);
      setContenuti(lista);
    });
  }, [relConfermata?.id, chiave]);

  async function pubblica() {
    const testo = bozza.trim();
    if (!testo || !relConfermata || !chiave || !user || !householdId) return;
    setBozza("");
    await addDoc(collection(db, "zona_intima"), {
      householdId,
      relationshipId: relConfermata.id,
      tipo,
      ciphertext: encryptContent(chiave, { testo }),
      autore: user.uid,
      createdAt: Date.now(),
    });
  }

  function chiediElimina(c: Decifrato) {
    if (c.autore !== user?.uid) return;
    Alert.alert("Eliminare?", "Sparirà per entrambi, definitivamente.", [
      { text: "Annulla", style: "cancel" },
      { text: "Elimina", style: "destructive", onPress: () => deleteDoc(doc(db, "zona_intima", c.id)) },
    ]);
  }

  // ---- Stati speciali ----
  if (!relConfermata) {
    return (
      <View style={styles.container}>
        <ModuloHeader titolo="Zona Intima" />
        <View style={styles.centro}>
          <Icona name="heart-lock" size={48} color={colors.intimate} />
          <Text style={styles.msgCentro}>
            La Zona Intima si apre solo per le coppie confermate. Vai nella sezione
            "Coppia" per formare la vostra.
          </Text>
        </View>
      </View>
    );
  }
  if (erroreChiave) {
    return (
      <View style={styles.container}>
        <ModuloHeader titolo="Zona Intima" />
        <View style={styles.centro}>
          <Icona name="key-alert-outline" size={48} color={colors.danger} />
          <Text style={styles.msgCentro}>
            Impossibile sbloccare la chiave su questo dispositivo. Succede se hai
            cambiato telefono dopo la conferma della coppia: la protezione
            end-to-end lega la chiave al dispositivo. Sciogliete e riformate la
            coppia per generare chiavi nuove (i vecchi contenuti resteranno
            illeggibili — per tutti, noi compresi: è la garanzia della cifratura).
          </Text>
        </View>
      </View>
    );
  }
  if (!chiave) {
    return (
      <View style={[styles.container, styles.centro]}>
        <ActivityIndicator size="large" color={colors.intimate} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ModuloHeader titolo="Zona Intima" />
      <View style={styles.bannerE2E}>
        <Icona name="lock-check-outline" size={14} color={colors.intimate} />
        <Text style={styles.bannerE2ETesto}>Cifratura end-to-end: solo voi due potete leggere</Text>
      </View>

      <View style={styles.composer}>
        <View style={styles.rigaChips}>
          {TIPI.map((t) => (
            <TouchableOpacity
              key={t.tipo}
              style={[styles.chip, tipo === t.tipo && styles.chipAttivo]}
              onPress={() => setTipo(t.tipo)}
            >
              <Text style={[styles.chipTesto, tipo === t.tipo && styles.chipTestoAttivo]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.rigaInput}>
          <TextInput
            style={styles.input}
            placeholder={tipo === "apprezzamento" ? "Oggi ti ringrazio per…" : "Scrivi qualcosa solo per voi…"}
            placeholderTextColor={colors.muted}
            value={bozza}
            onChangeText={setBozza}
            multiline
          />
          <TouchableOpacity style={styles.bottoneInvia} onPress={pubblica}>
            <Icona name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={contenuti}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        ListEmptyComponent={
          <Text style={styles.vuoto}>Ancora niente qui. Il primo pensiero è il più bello 💌</Text>
        }
        renderItem={({ item }) => {
          const meta = TIPI.find((t) => t.tipo === item.tipo) ?? TIPI[0];
          return (
            <TouchableOpacity style={styles.card} onLongPress={() => chiediElimina(item)} activeOpacity={0.9}>
              <View style={styles.cardHeader}>
                <Icona name={meta.icona} size={16} color={colors.intimate} />
                <Text style={styles.cardTipo}>{meta.label}</Text>
                <Text style={styles.cardData}>
                  {new Date(item.createdAt).toLocaleDateString("it-IT", { day: "numeric", month: "short" })}
                </Text>
              </View>
              <Text style={styles.cardTesto}>
                {item.testo ?? "⚠️ Contenuto non decifrabile su questo dispositivo"}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  msgCentro: { color: colors.muted, textAlign: "center", lineHeight: 21 },
  bannerE2E: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: colors.intimateSoft, marginHorizontal: 16, borderRadius: 999,
    paddingVertical: 6, marginBottom: 8,
  },
  bannerE2ETesto: { fontSize: 12, color: colors.ink, fontFamily: fonts.semibold, fontWeight: "600" },
  composer: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 12,
    marginHorizontal: 16, marginBottom: 8, gap: 10, ...shadow.card,
  },
  rigaChips: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  chip: {
    borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12,
    backgroundColor: colors.chipNeutral,
  },
  chipAttivo: { backgroundColor: colors.intimate },
  chipTesto: { fontSize: 12, fontFamily: fonts.semibold, fontWeight: "600", color: colors.chipNeutralInk },
  chipTestoAttivo: { color: "#fff" },
  rigaInput: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  input: {
    flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, color: colors.ink,
    maxHeight: 100,
  },
  bottoneInvia: {
    backgroundColor: colors.intimate, borderRadius: radius.md,
    width: 42, height: 42, alignItems: "center", justifyContent: "center",
  },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg, padding: 14,
    marginBottom: 10, borderLeftWidth: 3, borderLeftColor: colors.intimate, ...shadow.card,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  cardTipo: { fontSize: 12, fontFamily: fonts.bold, fontWeight: "700", color: colors.intimate, flex: 1 },
  cardData: { fontSize: 11, color: colors.muted },
  cardTesto: { fontSize: 15, color: colors.ink, lineHeight: 21 },
  vuoto: { color: colors.muted, textAlign: "center", marginTop: 40 },
});
