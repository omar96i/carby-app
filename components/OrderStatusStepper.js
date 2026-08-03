import React, { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { FontAwesome } from "@expo/vector-icons";

const AnimatedIcon = Animated.createAnimatedComponent(FontAwesome);

export default function OrderStatusStepper({ steps, currentStatus, label = "" }) {
  const previousRef = useRef(currentStatus);

  const stepValues = useRef(steps.map(() => ({ scale: useSharedValue(1), opacity: useSharedValue(1), progress: useSharedValue(0) }))).current;

  useEffect(() => {
    if (previousRef.current === currentStatus) return;
    const previousIndex = steps.findIndex((step) => step.key === previousRef.current);
    const currentIndex = steps.findIndex((step) => step.key === currentStatus);
    previousRef.current = currentStatus;

    for (let i = 0; i < steps.length; i++) {
      const step = stepValues[i];
      if (i <= currentIndex) {
        step.progress.value = withTiming(1, { duration: 500 });
        step.opacity.value = withTiming(1, { duration: 400 });
      }
      if (i === currentIndex) {
        step.scale.value = withSpring(1.3, { damping: 8, stiffness: 160 }, () => {
          step.scale.value = withSpring(1, { damping: 10, stiffness: 120 });
        });
      }
    }
  }, [currentStatus]);

  const activeIndex = steps.findIndex((step) => step.key === currentStatus);

  return (
    <View style={styles.wrap}>
      {!!label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.track}>
        {steps.map((step, index) => {
          const isActive = step.key === currentStatus;
          const isCompleted = activeIndex > index;

          const iconStyle = useAnimatedStyle(() => ({
            transform: [{ scale: stepValues[index].scale.value }],
            opacity: stepValues[index].opacity.value,
          }));

          return (
            <View key={step.key} style={styles.step}>
              <AnimatedIcon name={isCompleted ? "check-circle" : step.icon} size={26} color={isCompleted || isActive ? "#fa6205" : "#d4d4d8"} style={iconStyle} />
              <Text style={[styles.stepLabel, (isCompleted || isActive) && styles.stepLabelActive]}>{step.label}</Text>
              {index < steps.length - 1 && (
                <View style={styles.lineWrap}>
                  <View style={[styles.line, (isCompleted || isActive) && styles.lineActive]} />
                </View>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 4 },
  label: { color: "#71717a", fontSize: 12, fontWeight: "700", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  track: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  step: { flex: 1, alignItems: "center", position: "relative" },
  stepLabel: { fontSize: 11, color: "#a1a1aa", marginTop: 6, textAlign: "center", paddingHorizontal: 2 },
  stepLabelActive: { color: "#1c1c1e", fontWeight: "700" },
  lineWrap: { position: "absolute", left: "55%", top: 13, right: "-55%", height: 3, justifyContent: "center" },
  line: { height: 2, backgroundColor: "#e4e4e7", borderRadius: 1 },
  lineActive: { backgroundColor: "#fa6205" },
});
