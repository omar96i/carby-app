import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { RouteSummary } from "./RouteSummary";

const { height: SCREEN_H } = Dimensions.get("window");
const COLLAPSED_H = 120;
const EXPANDED_H = SCREEN_H * 0.6;

export const SearchingSheet = ({ origin, destination, distance, duration, onCancel }) => {
  const [expanded, setExpanded] = useState(false);

  const heightAnim = useRef(new Animated.Value(COLLAPSED_H)).current;
  const expandedOpacity = useRef(new Animated.Value(0)).current;
  const collapsedHeight = useRef(new Animated.Value(1)).current;

  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = (anim, delay) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 2000, delay, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      );
    loop(pulse1, 0).start();
    loop(pulse2, 1000).start();
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue: expanded ? EXPANDED_H : COLLAPSED_H,
        useNativeDriver: false,
        friction: 9,
        tension: 60,
      }),
      Animated.timing(collapsedHeight, {
        toValue: expanded ? 0 : 1,
        duration: 200,
        useNativeDriver: false,
      }),
      Animated.timing(expandedOpacity, {
        toValue: expanded ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [expanded]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 5,
      onPanResponderRelease: (_, gesture) => {
        const wasTap = Math.abs(gesture.dy) < 10 && Math.abs(gesture.dx) < 10;
        if (wasTap) {
          setExpanded(!expanded);
          return;
        }
        if (expanded) {
          if (gesture.dy > 30 || (gesture.vy || 0) > 0.3) setExpanded(false);
          else setExpanded(true);
        } else {
          if (gesture.dy < -30 || (gesture.vy || 0) < -0.3) setExpanded(true);
          else setExpanded(false);
        }
      },
    })
  ).current;

  const sonarStyle = (anim) => ({
    opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
    transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] }) }],
  });

  return (
    <Animated.View style={[styles.sheet, { height: heightAnim }]}>
      <View style={styles.header} {...panResponder.panHandlers}>
        <View style={styles.handle} />
        <Animated.View
          style={[
            styles.collapsedRow,
            {
              opacity: collapsedHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
              height: collapsedHeight.interpolate({ inputRange: [0, 1], outputRange: [0, 64] }),
              overflow: "hidden",
            },
          ]}
        >
          <View style={styles.iconWrapSmall}>
            <Animated.View style={[styles.sonarSmall, sonarStyle(pulse1)]} />
            <Animated.View style={[styles.sonarSmall, sonarStyle(pulse2)]} />
            <View style={styles.iconCircleSmall}>
              <MaterialCommunityIcons name="car" size={24} color="#FF5500" />
            </View>
          </View>
          <View style={styles.collapsedTextBox}>
            <Text style={styles.collapsedTitle}>Buscando conductor</Text>
            <Text style={styles.collapsedSub}>Contactando conductores cercanos...</Text>
          </View>
          <ActivityIndicator size="small" color="#FF5500" />
        </Animated.View>
      </View>

      <Animated.View
        style={[styles.expandedContent, { opacity: expandedOpacity }]}
        pointerEvents={expanded ? "auto" : "none"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <Animated.View style={[styles.sonar, sonarStyle(pulse1)]} />
            <Animated.View style={[styles.sonar, sonarStyle(pulse2)]} />
            <View style={styles.iconCircle}>
              <MaterialCommunityIcons name="car" size={32} color="#FF5500" />
            </View>
          </View>

          <Text style={styles.title}>Buscando tu conductor</Text>
          <Text style={styles.subtitle}>
            Estamos contactando a los conductores mejor calificados cerca de ti.
          </Text>

          <View style={styles.progressTrack}>
            <View style={styles.progressBar} />
          </View>

          <RouteSummary origin={origin} destination={destination} distance={distance} duration={duration} />

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
            <Feather name="x" size={16} color="#0F172A" />
            <Text style={styles.cancelText}>Cancelar solicitud</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.98)",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -16 },
    shadowOpacity: 0.12,
    shadowRadius: 40,
    elevation: 20,
    overflow: "hidden",
  },
  header: {
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 16,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginTop: 0,
    marginBottom: 6,
  },
  collapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconWrapSmall: {
    width: 52,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
  },
  sonarSmall: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: "rgba(255,85,0,0.4)",
  },
  iconCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  collapsedTextBox: {
    flex: 1,
  },
  collapsedTitle: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
  collapsedSub: {
    fontSize: 11,
    fontFamily: "Montserrat",
    color: "#64748B",
    marginTop: 2,
  },
  expandedContent: {
    flex: 1,
    paddingTop: 4,
    paddingHorizontal: 20,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 50,
    paddingTop: 10,
  },
  iconWrap: {
    width: 96,
    height: 96,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  sonar: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: "rgba(255,85,0,0.4)",
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF5500",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Montserrat",
    color: "#64748B",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 20,
  },
  progressTrack: {
    width: "75%",
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    marginTop: 20,
    marginBottom: 18,
  },
  progressBar: {
    width: "40%",
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#FF5500",
  },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cancelText: {
    fontSize: 14,
    fontFamily: "MontserratBold",
    fontWeight: "bold",
    color: "#0F172A",
  },
});
