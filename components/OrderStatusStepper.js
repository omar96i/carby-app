import React, { useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { FontAwesome, MaterialIcons, MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";

const AnimatedCircle = Animated.createAnimatedComponent(View);
const STEP_WIDTH = 108;
const LINE_TOP = 24;

// Stepper horizontal con scroll manual:
// - permite deslizar para ver estados faltantes
// - al cambiar el estado actual, anima relleno de barra + rebote del circulo
export default function OrderStatusStepper({ steps, currentStatus, label = "" }) {
  const scrollRef = useRef(null);
  const firstPaintRef = useRef(true);

  const currentIndex = steps.findIndex((step) => step.key === currentStatus);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;

  const fillWidth = useSharedValue(0);
  const previousIndex = useSharedValue(-1);

  const circleScales = [
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
    useSharedValue(1),
  ];

  useEffect(() => {
    const targetFill = safeIndex * STEP_WIDTH;

    if (firstPaintRef.current) {
      fillWidth.value = targetFill;
      firstPaintRef.current = false;
    } else if (previousIndex.value !== safeIndex) {
      fillWidth.value = withTiming(targetFill, { duration: 500 });
    }

    if (previousIndex.value !== safeIndex) {
      const next = circleScales[safeIndex];
      const prev = circleScales[previousIndex.value];
      if (prev) prev.value = withTiming(1, { duration: 250 });
      if (next) {
        next.value = withSpring(1.18, { damping: 8, stiffness: 160 }, () => {
          next.value = withSpring(1, { damping: 10, stiffness: 120 });
        });
      }
    }

    previousIndex.value = safeIndex;
    scrollRef.current?.scrollTo({
      x: Math.max(0, safeIndex * STEP_WIDTH - STEP_WIDTH),
      animated: true,
    });
  }, [safeIndex]);

  const fillStyle = useAnimatedStyle(() => ({
    width: fillWidth.value,
  }));

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={[styles.track, { width: STEP_WIDTH * steps.length }]}>
          <View style={[styles.lineBg, { left: STEP_WIDTH / 2, width: STEP_WIDTH * (steps.length - 1), top: LINE_TOP }]} />
          <Animated.View style={[styles.lineFill, { left: STEP_WIDTH / 2, top: LINE_TOP }, fillStyle]} />
          {steps.map((step, index) => (
            <StepItem
              key={step.key}
              step={step}
              slotW={STEP_WIDTH}
              isActive={index === safeIndex}
              isCompleted={index < safeIndex}
              isPending={index > safeIndex}
              scaleSV={circleScales[index]}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function StepItem({ step, slotW, isActive, isCompleted, isPending, scaleSV }) {
  const circleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleSV.value }],
    backgroundColor: isPending ? "#f4f4f5" : "#fa6205",
    borderColor: isPending ? "#e4e4e7" : "#fa6205",
  }));

  return (
    <View style={{ width: slotW, alignItems: "center" }}>
      <AnimatedCircle style={[styles.circle, circleStyle]}>
        {isCompleted ? (
          <FontAwesome name="check" size={16} color="#FFF" />
        ) : (
          renderIcon(step.icon, isPending ? "#999" : "#FFF", 18)
        )}
      </AnimatedCircle>
      <Text
        numberOfLines={2}
        style={[styles.stepLabel, (isActive || isCompleted) && styles.stepLabelActive, isActive && styles.stepLabelCurrent]}
      >
        {step.label}
      </Text>
    </View>
  );
}

function renderIcon(icon, color, size) {
  if (!icon) return null;
  if (icon.startsWith("md-")) return <Ionicons name={icon} size={size} color={color} />;
  if (icon.startsWith("material-")) return <MaterialIcons name={icon.replace("material-", "")} size={size} color={color} />;
  if (icon.startsWith("mci-")) return <MaterialCommunityIcons name={icon.replace("mci-", "")} size={size} color={color} />;
  return <FontAwesome name={icon} size={size} color={color} />;
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  label: { color: "#71717a", fontSize: 12, fontWeight: "700", marginBottom: 14, textTransform: "uppercase", letterSpacing: 0.5 },
  scrollContent: { paddingHorizontal: 8, paddingVertical: 6 },
  track: { flexDirection: "row", alignItems: "flex-start" },
  circle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    zIndex: 2,
    backgroundColor: "#fa6205",
  },
  lineBg: {
    position: "absolute",
    height: 4,
    backgroundColor: "#e4e4e7",
    borderRadius: 2,
  },
  lineFill: {
    position: "absolute",
    height: 4,
    backgroundColor: "#fa6205",
    borderRadius: 2,
  },
  stepLabel: { fontSize: 10, color: "#a1a1aa", marginTop: 8, textAlign: "center", textTransform: "uppercase", fontWeight: "700", letterSpacing: 0.3, paddingHorizontal: 4 },
  stepLabelActive: { color: "#1c1c1e" },
  stepLabelCurrent: { color: "#fa6205" },
});
