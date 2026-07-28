import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "./helpers";

const TABS = [
  { key: "activas", label: "Activos" },
  { key: "historial", label: "Historial" },
  { key: "reservas", label: "Reservas" },
];

export default function PedidosTabs({ activeTab, onTabChange, counts = {} }) {
  return (
    <View style={s.container}>
      <View style={s.bar}>
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[s.tab, isActive && s.tabActive]}
              onPress={() => onTabChange(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.label, isActive ? s.labelActive : s.labelInactive]}>
                {t.label}
              </Text>
              <View style={[s.badge, isActive ? s.badgeActive : s.badgeInactive]}>
                <Text style={[s.badgeText, isActive ? s.badgeTextActive : s.badgeTextInactive]}>
                  {counts[t.key] != null ? counts[t.key] : 0}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    backgroundColor: COLORS.surface,
  },
  bar: {
    flexDirection: "row",
    backgroundColor: COLORS.zinc100,
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: COLORS.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 13,
    fontFamily: "Montserrat_800ExtraBold",
  },
  labelActive: {
    color: COLORS.ink,
  },
  labelInactive: {
    color: COLORS.muted,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  badgeActive: {
    backgroundColor: COLORS.brand,
  },
  badgeInactive: {
    backgroundColor: COLORS.zinc200,
  },
  badgeText: {
    fontSize: 10,
    fontFamily: "Montserrat_800ExtraBold",
  },
  badgeTextActive: {
    color: COLORS.surface,
  },
  badgeTextInactive: {
    color: COLORS.zinc500,
  },
});
