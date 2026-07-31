// src/app/(tabs)/_layout.tsx
// Le 4 sezioni principali. Coppia usa l'accento corallo per marcare
// il cambio di contesto rispetto al resto dell'app (blu).

import React from "react";
import { Tabs } from "expo-router";
import Icona from "../../components/Icona";
import { colors, fonts } from "../../theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          height: 84,
          paddingTop: 8,
          paddingBottom: 26,
        },
        tabBarLabelStyle: { fontSize: 11, fontFamily: fonts.bold, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Icona name="home-variant-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="finanze"
        options={{
          title: "Finanze",
          tabBarIcon: ({ color, size }) => (
            <Icona name="wallet-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="utilita"
        options={{
          title: "Utilità",
          tabBarIcon: ({ color, size }) => (
            <Icona name="toolbox-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="coppia"
        options={{
          title: "Coppia",
          tabBarActiveTintColor: colors.intimate,
          tabBarIcon: ({ color, size }) => (
            <Icona name="heart-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
