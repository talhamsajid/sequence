import React from "react";
import { View, StyleSheet } from "react-native";
import Animated, {
  BounceIn,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import type { PlayerColor } from "@sequence/game-logic";
import { chipColorMap, chipInnerColorMap, chipLightColorMap } from "../constants/theme";

interface ChipProps {
  color: PlayerColor;
  size: number;
  isNew?: boolean;
  isInSequence?: boolean;
}

// Sequence ring glow — module-level constant (no re-creation per render)
const sequenceRingColors: Record<string, string> = {
  red: "rgba(254,202,202,0.7)", // red-200
  blue: "rgba(191,219,254,0.7)", // blue-200
  green: "rgba(167,243,208,0.7)", // emerald-200
};

export function Chip({ color, size, isNew = false, isInSequence = false }: ChipProps) {
  const outerColor = chipColorMap[color] ?? "#dc2626";
  const innerColor = chipInnerColorMap[color] ?? "#ef4444";
  const highlightColor = chipLightColorMap[color] ?? "#fca5a5";
  const innerSize = size * 0.7;

  const entering = isNew ? BounceIn.duration(400).damping(12) : undefined;

  const glowStyle = useAnimatedStyle(() => {
    if (!isInSequence) return { opacity: 0 };
    return {
      opacity: withRepeat(
        withSequence(
          withTiming(0.8, { duration: 800 }),
          withTiming(0.3, { duration: 800 })
        ),
        -1,
        true
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
          backgroundColor: outerColor,
        },
        isInSequence && {
          borderWidth: 2,
          borderColor: sequenceRingColors[color] ?? "rgba(167,243,208,0.7)",
        },
      ]}
    >
      {/* Inner ring */}
      <View
        style={[
          styles.innerRing,
          {
            width: innerSize,
            height: innerSize,
            borderRadius: innerSize / 2,
            backgroundColor: innerColor,
          },
        ]}
      >
        {/* Radial highlight simulation */}
        <View
          style={[
            styles.highlight,
            {
              width: innerSize * 0.55,
              height: innerSize * 0.35,
              borderRadius: innerSize * 0.2,
              backgroundColor: highlightColor,
              top: innerSize * 0.08,
            },
          ]}
        />
      </View>

      {/* Sequence glow ring */}
      {isInSequence && (
        <Animated.View
          style={[
            styles.glow,
            {
              width: size + 6,
              height: size + 6,
              borderRadius: (size + 6) / 2,
              borderColor: sequenceRingColors[color] ?? "rgba(167,243,208,0.7)",
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
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  innerRing: {
    position: "absolute",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  highlight: {
    position: "absolute",
    opacity: 0.5,
    alignSelf: "center",
  },
  glow: {
    position: "absolute",
    borderWidth: 2,
  },
});
