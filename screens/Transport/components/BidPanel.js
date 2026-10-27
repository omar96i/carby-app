import React from "react";
import { View, Text, Pressable, StyleSheet, Animated } from "react-native";
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
        <Pressable onPress={onReset} style={({ pressed }) => [styles.recBadge, pressed && styles.recBadgePressed]}>
          {({ pressed }) => (
            <Text style={[styles.recText, pressed && styles.recTextPressed]}>Sugerido: ${suggestedPrice}</Text>
          )}
        </Pressable>
      </View>

      {isBelowSuggested && (
        <View style={styles.warnBadge}>
          <Ionicons name="alert-circle" size={13} color="#B45309" />
          <Text style={styles.warnText}>Precio por debajo de lo sugerido</Text>
        </View>
      )}

      <View style={styles.controls}>
        <Pressable
          onPress={onDecrease}
          disabled={!canDecrease500}
          style={({ pressed }) => [
            styles.stepBtn,
            !canDecrease500 && styles.stepBtnDisabled,
            pressed && canDecrease500 && styles.stepBtnPressed,
          ]}
        >
          {({ pressed }) => (
            <Text style={[styles.stepBtnText, pressed && canDecrease500 && styles.stepBtnTextPressed]}>- $500</Text>
          )}
        </Pressable>

        <View style={styles.display}>
          <Text style={styles.currency}>$</Text>
          <Animated.Text style={[styles.amount, priceAnim && { transform: [{ scale: priceAnim }] }]}>
            {displayPrice}
          </Animated.Text>
        </View>

        <Pressable
          onPress={onIncrease}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.stepBtnPressed]}
        >
          {({ pressed }) => (
            <Text style={[styles.stepBtnText, pressed && styles.stepBtnTextPressed]}>+ $500</Text>
          )}
        </Pressable>
      </View>

      <View style={styles.chipsRow}>
        {CHIPS.map((chip, i) => {
          const isActive = chip.isReset && bidOffset === 0;
          const disabled = chip.delta < 0 && !canDecrease500;
          return (
            <Pressable
              key={i}
              onPress={() => chip.isReset ? onReset() : onChipDelta(chip.delta)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.chip,
                isActive && styles.chipActive,
                disabled && styles.chipDisabled,
                pressed && !disabled && styles.chipPressed,
              ]}
            >
              {({ pressed }) => (
                <Text
                  style={[styles.chipText, (isActive || (pressed && !disabled)) && styles.chipTextActive]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {chip.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const C = { brand: "#fa6205", ink: "#1C1C1E", surface: "#FFF", muted: "#71717A", bg: "#F4F4F5", green: "#10B981" };

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.bg,
    borderRadius: 22,
    padding: 14,
    marginTop: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  title: {
    fontSize: 15,
    fontFamily: "Montserrat_800ExtraBold",
    color: C.ink,
  },
  recBadge: {
    backgroundColor: "#ECFDF5",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  recBadgePressed: {
    backgroundColor: C.green,
  },
  recText: {
    fontSize: 11.5,
    fontFamily: "Montserrat_700Bold",
    color: "#059669",
  },
  recTextPressed: {
    color: C.surface,
  },
  warnBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#FEF3C7",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  warnText: {
    fontSize: 11.5,
    fontFamily: "Montserrat_700Bold",
    color: "#B45309",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  stepBtn: {
    backgroundColor: C.surface,
    borderRadius: 999,
    paddingHorizontal: 16,
    height: 46,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  stepBtnDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
    elevation: 0,
  },
  stepBtnPressed: {
    backgroundColor: C.brand,
  },
  stepBtnText: {
    fontSize: 13.5,
    fontFamily: "Montserrat_700Bold",
    color: C.ink,
  },
  stepBtnTextPressed: {
    color: C.surface,
  },
  display: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  currency: {
    fontSize: 18,
    fontFamily: "Montserrat_800ExtraBold",
    color: C.brand,
    marginRight: 3,
  },
  amount: {
    fontSize: 28,
    fontFamily: "Montserrat_800ExtraBold",
    color: C.ink,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 12,
  },
  chip: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 999,
    height: 32,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: C.brand,
  },
  chipPressed: {
    backgroundColor: C.brand,
  },
  chipDisabled: {
    opacity: 0.4,
  },
  chipText: {
    fontSize: 11,
    fontFamily: "Montserrat_700Bold",
    color: C.muted,
  },
  chipTextActive: {
    color: C.surface,
  },
});
