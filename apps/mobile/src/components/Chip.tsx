import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  BounceIn,
  ZoomIn,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from "react-native-reanimated";
import type { PlayerColor } from "@sequence/game-logic";
import { chipColorMap, colors } from "../constants/theme";

interface ChipProps {
  color: PlayerColor;
  size: number;
  isNew?: boolean;
  isInSequence?: boolean;
}

export function Chip({ color, size, isNew = false, isInSequence = false }: ChipProps) {
  const chipColor = chipColorMap[color];
  const innerSize = size * 0.7;
  const dotSize = size * 0.25;

  // Drop + bounce animation for newly placed chips
  const entering = isNew
    ? BounceIn.duration(400).damping(12)
    : undefined;

  // Pulsing glow for sequence chips
  const glowStyle = useAnimatedStyle(() => {
    if (!isInSequence) return { opacity: 0 };
    return {
      opacity: withRepeat(
        withSequence(
          withTiming(0.8, { duration: 800 }),
          withTiming(0.3, { duration: 800 }),
        ),
        -1,
        true,
      ),
    };
  });

  return (
    <Animated.View
      entering={entering}
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: chipColor,
          borderWidth: isInSequence ? 2 : 1,
          borderColor: isInSequence ? colors.goldBright : "rgba(255,255,255,0.15)",
        },
      ]}
    >
      {/* Inner ring */}
      <View
        style={[
          styles.inner,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            borderColor: "rgba(255,255,255,0.2)",
          },
        ]}
      />
      {/* Center dot */}
      <View
        style={[
          styles.dot,
          {
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: "rgba(255,255,255,0.25)",
          },
        ]}
      />
      {/* Sequence glow ring */}
      {isInSequence && (
        <Animated.View
          style={[
            styles.glow,
            {
              width: size + 6,
              height: size + 6,
              borderRadius: (size + 6) / 2,
              borderColor: colors.goldBright,
            },
            glowStyle,
          ]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  inner: {
    position: "absolute",
    borderWidth: 1,
  },
  dot: {
    position: "absolute",
  },
  glow: {
    position: "absolute",
    borderWidth: 2,
  },
});
