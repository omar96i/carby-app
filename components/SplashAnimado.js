import React, { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";

const C = { brand: "#fa6205" };
const LOGO = 172.8;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export default function SplashAnimado({ onFinish }) {
  const fade = useSharedValue(1);
  const logoOut = useSharedValue(0);
  const [started, setStarted] = useState(false);

  const start = () => {
    if (started) return;
    setStarted(true);
    SplashScreen.hideAsync();
  };

  useEffect(() => {
    const t = setTimeout(start, 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!started) return;
    logoOut.set(withTiming(1, { duration: 180, easing: EASE_OUT }));
    fade.set(
      withDelay(
        120,
        withTiming(0, { duration: 240, easing: EASE_OUT }, (finished) => {
          if (finished) scheduleOnRN(onFinish);
        })
      )
    );
  }, [started]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: 1 - logoOut.get(),
    transform: [{ scale: 1 + logoOut.get() * 0.06 }],
  }));

  return (
    <Animated.View style={[styles.container, fadeStyle]} pointerEvents="none">
      <StatusBar style="light" />
      <Animated.Image
        source={require("../assets/images/carby-logo-blanco.png")}
        style={[styles.logo, logoStyle]}
        resizeMode="contain"
        fadeDuration={0}
        onLoad={start}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.brand,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
    elevation: 999,
  },
  logo: {
    width: LOGO,
    height: LOGO,
  },
});
