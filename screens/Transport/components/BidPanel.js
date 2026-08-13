import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const CHIPS = [
  { label: "-$1.000", delta: -1000 },
  { label: "-$500", delta: -500 },
  { label: "Sugerido", delta: 0, isReset: true },
  { label: "+$500", delta: 500 },
  { label: "+$1.000", delta: 1000 },
];

export default function BidPanel({
  displayPrice,
  suggestedPrice,
  onIncrease,
  onDecrease,
  onReset,
  onChipDelta,
  priceAnim,
  bidOffset,
  hasPrice,
}) {
  if (!hasPrice) return null;

  const isBelowSuggested = bidOffset < 0;
  const canDecrease500 = displayPrice && parseInt(displayPrice.replace(/\./g, ""), 10) - 500 >= 2000;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Tu oferta</Text>
        <TouchableOpacity onPress={onReset} activeOpacity={0.7}>
          <View style={styles.recBadge}>
            <Text style={styles.recText}>Sugerido: ${suggestedPrice}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {isBelowSuggested && (
        <View style={styles.warnBadge}>
          <Ionicons name="alert-circle" size={12} color="#B45309" style={{ marginRight: 6 }} />
          <Text style={styles.warnText}>Precio por debajo de lo sugerido</Text>
        </View>
      )}

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.stepBtn, !canDecrease500 && styles.stepBtnDisabled]}
          onPress={onDecrease}
          activeOpacity={0.7}
          disabled={!canDecrease500}
        >
          <Text style={[styles.stepBtnText, !canDecrease500 && styles.stepBtnTextDisabled]}>- $500</Text>
        </TouchableOpacity>

        <Animated.View
          style={[
            styles.display,
            priceAnim && {
              borderColor: priceAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: ["#E2E8F0", "#FF5500"],
              }),
              shadowColor: priceAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: ["transparent", "#FF5500"],
              }),
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: priceAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0, 0.35],
              }),
              shadowRadius: priceAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [0, 16],
              }),
            },
          ]}
        >
          <Text style={styles.currency}>$</Text>
          <Animated.Text
            style={[
              styles.amount,
              priceAnim && { transform: [{ scale: priceAnim }] },
            ]}
          >
            {displayPrice}
          </Animated.Text>
        </Animated.View>

        <TouchableOpacity style={styles.stepBtn} onPress={onIncrease} activeOpacity={0.7}>
          <Text style={styles.stepBtnText}>+ $500</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chipsRow}>
        {CHIPS.map((chip, i) => {
          const isActive = chip.isReset && bidOffset === 0;
          const disabled = chip.delta < 0 && !canDecrease500;
          return (
            <TouchableOpacity
              key={i}
              style={[styles.chip, isActive && styles.chipActive, disabled && styles.chipDisabled]}
              onPress={() => chip.isReset ? onReset() : onChipDelta(chip.delta)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive, disabled && styles.chipTextDisabled]}>
                {chip.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 18,
    padding: 12,
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 11,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#475569",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  recBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recText: {
    fontSize: 11,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#059669",
  },
  warnBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  warnText: {
    fontSize: 11,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#B45309",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  stepBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#FF5500",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 2,
  },
  stepBtnDisabled: {
    opacity: 0.3,
    borderColor: "#e4e4e7",
    backgroundColor: "#F4F4F5",
  },
  stepBtnText: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
  },
  stepBtnTextDisabled: {
    color: "#a1a1aa",
  },
  display: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 16,
    minHeight: 44,
  },
  currency: {
    fontSize: 16,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#FF5500",
    marginRight: 4,
  },
  amount: {
    fontSize: 22,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  chipsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
  },
  chip: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  chipActive: {
    backgroundColor: "#FF5500",
    borderColor: "#FF5500",
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  chipDisabled: {
    opacity: 0.3,
    borderColor: "#e4e4e7",
  },
  chipText: {
    fontSize: 10,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#475569",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  chipTextDisabled: {
    color: "#a1a1aa",
  },
});
