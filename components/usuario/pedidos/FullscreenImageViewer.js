import React, { useEffect } from "react";
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { GestureHandlerRootView, Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

const { width: WIN_W, height: WIN_H } = Dimensions.get("window");
const MIN_SCALE = 1;
const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

const clamp = (v, min, max) => {
  'worklet';
  return Math.min(Math.max(v, min), max);
};

export default function FullscreenImageViewer({ uri, onClose }) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedX.value = 0;
    savedY.value = 0;
  }, [uri]);

  const reset = () => {
    scale.value = withTiming(1);
    savedScale.value = 1;
    translateX.value = withTiming(0);
    translateY.value = withTiming(0);
    savedX.value = 0;
    savedY.value = 0;
  };

  const zoomBy = (delta) => {
    const next = clamp(savedScale.value + delta, MIN_SCALE, MAX_SCALE);
    savedScale.value = next;
    scale.value = withTiming(next);
    if (next === MIN_SCALE) {
      savedX.value = 0;
      savedY.value = 0;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
    }
  };

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clamp(savedScale.value * e.scale, MIN_SCALE, MAX_SCALE);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value <= MIN_SCALE) {
        savedX.value = 0;
        savedY.value = 0;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
      }
    });

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (savedScale.value <= MIN_SCALE) return;
      const bound = 160 * savedScale.value;
      translateX.value = clamp(savedX.value + e.translationX, -bound, bound);
      translateY.value = clamp(savedY.value + e.translationY, -bound, bound);
    })
    .onEnd(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const next = savedScale.value > MIN_SCALE ? MIN_SCALE : DOUBLE_TAP_SCALE;
      savedScale.value = next;
      scale.value = withTiming(next);
      savedX.value = 0;
      savedY.value = 0;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
    });

  const composed = Gesture.Simultaneous(pinch, pan, doubleTap);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Modal visible={!!uri} animationType="fade" transparent={true} onRequestClose={onClose}>
      <GestureHandlerRootView style={s.root}>
        <View style={s.overlay}>
          <View style={s.topBar}>
            <TouchableOpacity style={s.iconBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={s.iconBtn} onPress={reset} activeOpacity={0.7}>
              <Ionicons name="contract" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <GestureDetector gesture={composed}>
            <Animated.View style={s.zoomWrap}>
              <Animated.Image
                source={{ uri: uri || "" }}
                style={[s.image, animatedStyle]}
                resizeMode="contain"
              />
            </Animated.View>
          </GestureDetector>
          <View style={s.zoomBar}>
            <TouchableOpacity style={s.zoomBtn} onPress={() => zoomBy(-1)} activeOpacity={0.7}>
              <Ionicons name="remove" size={22} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity style={s.zoomBtn} onPress={() => zoomBy(1)} activeOpacity={0.7}>
              <Ionicons name="add" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={s.hint}>Pellizca o toca 2 veces para ampliar</Text>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    justifyContent: "center",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 48,
    paddingBottom: 12,
    zIndex: 10,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  zoomWrap: {
    width: WIN_W,
    height: WIN_H * 0.7,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: WIN_W,
    height: WIN_H * 0.7,
  },
  zoomBar: {
    position: "absolute",
    right: 16,
    bottom: 96,
    gap: 10,
    zIndex: 10,
  },
  zoomBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.18)",
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    position: "absolute",
    bottom: 48,
    left: 0,
    right: 0,
    textAlign: "center",
    color: "rgba(255,255,255,0.6)",
    fontSize: 12,
  },
});
