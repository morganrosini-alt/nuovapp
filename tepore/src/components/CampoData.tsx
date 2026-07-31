// src/components/CampoData.tsx
// Selettore data compatto riutilizzabile (stesso pattern già collaudato nei
// form di bollette/immondizia: compact su iOS, dialog su Android).

import React, { useState } from "react";
import { View, Text, TouchableOpacity, Platform, StyleSheet } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { colors, radius, fonts } from "../theme";

type Props = {
  label: string;
  valore: Date;
  onChange: (d: Date) => void;
};

export default function CampoData({ label, valore, onChange }: Props) {
  const [apertoAndroid, setApertoAndroid] = useState(false);

  return (
    <View style={styles.riga}>
      <Text style={styles.label}>{label}</Text>
      {Platform.OS === "ios" ? (
        <DateTimePicker
          value={valore}
          mode="date"
          display="compact"
          onChange={(_, d) => d && onChange(d)}
        />
      ) : (
        <>
          <TouchableOpacity style={styles.bottone} onPress={() => setApertoAndroid(true)}>
            <Text style={styles.bottoneTesto}>
              {valore.toLocaleDateString("it-IT", { day: "numeric", month: "short", year: "numeric" })}
            </Text>
          </TouchableOpacity>
          {apertoAndroid && (
            <DateTimePicker
              value={valore}
              mode="date"
              onChange={(_, d) => {
                setApertoAndroid(false);
                if (d) onChange(d);
              }}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  riga: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 6,
  },
  label: { fontSize: 15, color: colors.ink, fontFamily: fonts.semibold, fontWeight: "600" },
  bottone: {
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.sm, paddingVertical: 8, paddingHorizontal: 12,
  },
  bottoneTesto: { color: colors.ink, fontSize: 14 },
});
