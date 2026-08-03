// src/app/immondizia-mensile.tsx
//
// All'apertura, la vista scorre automaticamente in modo che la riga di
// "oggi" compaia poco dopo il primo terzo dello schermo, invece che in
// cima — così si vede subito anche qualche giorno appena passato per
// contesto, senza dover scrollare a mano.

import React, { useEffect, useState, useMemo, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions } from "react-native";
import { router } from "expo-router";
import { useHousehold } from "../hooks/useHousehold";
import { ascoltaTipiRifiuto, lettereAttiveInGiorno, coloreTestoLeggibile } from "../services/immondizia";
import { TipoRifiutoPersonalizzato, GiornoSettimana } from "../types";
import { fonts } from "../theme";

const INDICE_JS_TO_GIORNO: GiornoSettimana[] = [
  "domenica", "lunedi", "martedi", "mercoledi", "giovedi", "venerdi", "sabato",
];

const GIORNO_BREVE = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

type RigaGiorno = { tipo: "giorno"; data: Date; isOggi: boolean };
type RigaSeparatore = { tipo: "separatore"; label: string };
type Riga = RigaGiorno | RigaSeparatore;

// Altezze approssimate delle righe, usate per calcolare dove scrollare.
// Non devono essere perfette al pixel: servono solo a stimare la
// posizione di partenza dello scroll automatico.
const ALTEZZA_SEPARATORE = 46;
const ALTEZZA_GIORNO = 50;

export default function ImmondiziaMensileScreen() {
  const { profile } = useHousehold();
  const [tipi, setTipi] = useState<TipoRifiutoPersonalizzato[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!profile?.householdId) return;
    return ascoltaTipiRifiuto(profile.householdId, setTipi);
  }, [profile?.householdId]);

  const righe: Riga[] = useMemo(() => {
    const oggi = new Date();
    const inizio = new Date(oggi.getFullYear(), oggi.getMonth(), 1);
    const fine = new Date(oggi.getFullYear(), oggi.getMonth() + 2, 0);

    const risultato: Riga[] = [];
    const cursore = new Date(inizio);
    let ultimoMese = -1;

    while (cursore <= fine) {
      if (cursore.getMonth() !== ultimoMese) {
        ultimoMese = cursore.getMonth();
        const label = cursore
          .toLocaleDateString("it-IT", { month: "long", year: "numeric" })
          .toUpperCase();
        risultato.push({ tipo: "separatore", label });
      }
      risultato.push({
        tipo: "giorno",
        data: new Date(cursore),
        isOggi: cursore.toDateString() === oggi.toDateString(),
      });
      cursore.setDate(cursore.getDate() + 1);
    }
    return risultato;
  }, []);

  const indiceOggi = useMemo(
    () => righe.findIndex((r) => r.tipo === "giorno" && r.isOggi),
    [righe]
  );

  // Calcola l'altezza cumulativa di tutte le righe prima di un certo indice
  // (serve sia per lo scroll automatico sia come getItemLayout della lista,
  // che rende scrollToIndex affidabile anche con righe di altezza diversa).
  function calcolaOffset(indice: number): number {
    let offset = 0;
    for (let i = 0; i < indice; i++) {
      offset += righe[i].tipo === "separatore" ? ALTEZZA_SEPARATORE : ALTEZZA_GIORNO;
    }
    return offset;
  }

  useEffect(() => {
    if (indiceOggi < 0) return;
    // Piccolo ritardo per essere sicuri che la lista abbia già completato
    // il primo render prima di provare a scrollare.
    const timer = setTimeout(() => {
      const { height: altezzaSchermo } = Dimensions.get("window");
      const offsetOggi = calcolaOffset(indiceOggi);
      // Vogliamo che "oggi" compaia poco dopo il primo terzo dello schermo,
      // quindi scrolliamo fino a un punto più in alto di quella quantità.
      const offsetDesiderato = Math.max(0, offsetOggi - altezzaSchermo * 0.33);
      flatListRef.current?.scrollToOffset({ offset: offsetDesiderato, animated: false });
    }, 100);
    return () => clearTimeout(timer);
  }, [indiceOggi]);

  function getItemLayout(_data: ArrayLike<Riga> | null | undefined, index: number) {
    const length = righe[index]?.tipo === "separatore" ? ALTEZZA_SEPARATORE : ALTEZZA_GIORNO;
    return { length, offset: calcolaOffset(index), index };
  }

  // Restituisce i TIPI completi (non solo le lettere) per poter colorare
  // ogni badge con il colore proprio di quel tipo di rifiuto.
  function tipiAttiviData(data: Date): TipoRifiutoPersonalizzato[] {
    const giorno = INDICE_JS_TO_GIORNO[data.getDay()];
    return lettereAttiveInGiorno(tipi, giorno, data);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>‹ Indietro</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Vista mensile</Text>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      <FlatList
        ref={flatListRef}
        data={righe}
        keyExtractor={(item, index) =>
          item.tipo === "separatore" ? `sep-${index}` : item.data.toISOString()
        }
        contentContainerStyle={styles.list}
        getItemLayout={getItemLayout}
        onScrollToIndexFailed={() => {
          // Rete di sicurezza: se il calcolo approssimato fosse impreciso,
          // riprova con uno scroll semplice invece di lasciare un errore.
          setTimeout(() => {
            flatListRef.current?.scrollToOffset({
              offset: calcolaOffset(indiceOggi),
              animated: false,
            });
          }, 50);
        }}
        renderItem={({ item }) => {
          if (item.tipo === "separatore") {
            return (
              <View style={styles.separatore}>
                <Text style={styles.separatoreText}>{item.label}</Text>
              </View>
            );
          }
          const tipiDelGiorno = tipiAttiviData(item.data);
          return (
            <View style={[styles.dayRow, item.isOggi && styles.dayRowOggi]}>
              <Text style={[styles.dayLabel, item.isOggi && styles.dayLabelOggi]}>
                {formatGiornoCompleto(item.data)}
                {item.isOggi ? " · oggi" : ""}
              </Text>
              <View style={styles.dayValueRow}>
                {tipiDelGiorno.length > 0 ? (
                  tipiDelGiorno.map((t) => (
                    <View key={t.id} style={[styles.dayBadge, { backgroundColor: t.colore }]}>
                      <Text style={[styles.dayBadgeText, { color: coloreTestoLeggibile(t.colore) }]}>
                        {t.lettera}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text style={styles.dayValueVuoto}>—</Text>
                )}
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

function formatGiornoCompleto(data: Date): string {
  const nomeBreve = GIORNO_BREVE[data.getDay()];
  const giornoMese = data.toLocaleDateString("it-IT", { day: "numeric", month: "short" });
  return `${nomeBreve} - ${giornoMese}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F5F8FA" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerButton: {
    backgroundColor: "#336699",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  headerButtonPlaceholder: { width: 90 },
  headerButtonText: { color: "#fff", fontSize: 14, fontFamily: fonts.semibold, fontWeight: "600" },
  title: { fontSize: 18, fontFamily: fonts.bold, fontWeight: "700", color: "#2F4858" },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  separatore: {
    marginTop: 16,
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: "#E2E9EE",
  },
  separatoreText: { fontSize: 13, fontFamily: fonts.bold, fontWeight: "700", color: "#336699", letterSpacing: 1 },
  dayRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E2E9EE",
  },
  dayRowOggi: { backgroundColor: "#DCEBF3", borderColor: "#336699" },
  dayLabel: { fontSize: 14, color: "#2F4858", fontFamily: fonts.medium, fontWeight: "500" },
  dayLabelOggi: { fontFamily: fonts.bold, fontWeight: "700", color: "#336699" },
  dayValueRow: { flexDirection: "row", gap: 4 },
  dayBadge: {
    minWidth: 26,
    height: 26,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    borderWidth: 0.75,
    borderColor: "#2F4858",
  },
  dayBadgeText: { fontSize: 12, fontFamily: fonts.bold, fontWeight: "700" },
  dayValueVuoto: { fontSize: 14, color: "#C2CCD3" },
});
