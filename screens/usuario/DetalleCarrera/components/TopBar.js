import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { HEADER_TEXT, STATES } from "../utils";

export const TopBar = ({ state, showBack, onBack, onStateChange }) => {
  const insets = useSafeAreaInsets();
  const header = HEADER_TEXT[state] || HEADER_TEXT.searching;
  const isSearching = state === "searching";

  return (
    <View style={[styles.container, { top: insets.top + 8 }]}>
      <View style={styles.row}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.8}>
            <Feather name="arrow-left" size={20} color="#0F172A" />
          </TouchableOpacity>
        )}

        <View style={[styles.statusPill, !showBack && styles.statusPillFull]}>
          <View style={[styles.dot, { backgroundColor: header.tone }, isSearching && styles.pulseDot]} />
          <View style={styles.textBox}>
            <Text style={[styles.title, { color: header.tone }]} numberOfLines={1}>
              {header.title}
            </Text>
            <Text style={styles.sub} numberOfLines={1}>
              {header.sub}
            </Text>
          </View>
        </View>
      </View>

      {/* Demo state stepper (visible only when onStateChange provided) */}
      {onStateChange && (
        <View style={styles.stepper}>
          {STATES.map((s) => (
            <TouchableOpacity
              key={s.key}
              onPress={() => onStateChange(s.key)}
              style={[styles.stepBtn, state === s.key && styles.stepBtnActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepText, state === s.key && styles.stepTextActive]}>{s.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 1100,
    padding: 12,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  statusPillFull: {
    flex: 1,
  },
  statusPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pulseDot: {
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  textBox: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    lineHeight: 18,
  },
  sub: {
    fontSize: 11,
    fontFamily: "Montserrat_400Regular",
    color: "#64748B",
  },
  stepper: {
    flexDirection: "row",
    alignSelf: "center",
    gap: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  stepBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  stepBtnActive: {
    backgroundColor: "#FF5500",
  },
  stepText: {
    fontSize: 10,
    fontFamily: "Montserrat_700Bold",
    fontWeight: "bold",
    color: "#64748B",
  },
  stepTextActive: {
    color: "#FFFFFF",
  },
});
