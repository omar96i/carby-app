import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ORDER_STEPS } from "../utils";

export const StatusTimeline = ({ currentKey }) => {
  const activeIndex = ORDER_STEPS.findIndex((s) => s.key === currentKey);

  return (
    <View style={styles.container}>
      {ORDER_STEPS.map((step, index) => {
        const isCompleted = index <= activeIndex && currentKey !== "cancelado";
        const isActive = index === activeIndex && currentKey !== "cancelado";
        const isLast = index === ORDER_STEPS.length - 1;

        return (
          <View key={step.key} style={styles.row}>
            <View style={styles.leftCol}>
              <View style={[styles.circle, isCompleted && styles.circleActive, isActive && styles.circleActive]}>
                {isCompleted ? (
                  <Feather name="check" size={14} color="#FFFFFF" />
                ) : (
                  <View style={styles.dot} />
                )}
              </View>
              {!isLast && <View style={[styles.line, isCompleted && styles.lineActive]} />}
            </View>
            <View style={styles.rightCol}>
              <Text style={[styles.label, isActive && styles.labelActive, isCompleted && styles.labelActive]}>
                {step.label}
              </Text>
              <Text style={styles.desc}>{step.desc}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
  },
  leftCol: {
    width: 32,
    alignItems: "center",
  },
  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    borderWidth: 2,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  circleActive: {
    backgroundColor: "#FF5500",
    borderColor: "#FF5500",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#CBD5E1",
  },
  line: {
    position: "absolute",
    top: 24,
    bottom: -8,
    width: 2,
    backgroundColor: "#E2E8F0",
    zIndex: 1,
  },
  lineActive: {
    backgroundColor: "#FF5500",
  },
  rightCol: {
    flex: 1,
    paddingBottom: 22,
    paddingLeft: 4,
  },
  label: {
    fontSize: 13,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#64748B",
  },
  labelActive: {
    color: "#0F172A",
  },
  desc: {
    fontSize: 11,
    fontFamily: "Montserrat",
    color: "#94A3B8",
    marginTop: 2,
  },
});
