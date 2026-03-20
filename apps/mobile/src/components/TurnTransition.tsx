import React, { useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import type { PlayerColor } from "@sequence/game-logic";
import { colors, spacing, borderRadius, chipColorMap } from "../constants/theme";

interface TurnTransitionProps {
  playerName: string;
  playerColor: PlayerColor;
  avatar: string;
  onReady: () => void;
}

export function TurnTransition({ playerName, playerColor, avatar, onReady }: TurnTransitionProps) {
  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const chipColor = chipColorMap[playerColor];

  return (
    <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.backdrop}>
      <Animated.View entering={SlideInDown.springify().damping(15)} style={styles.card}>
        <Text style={styles.avatar}>{avatar}</Text>
        <Text style={styles.name}>{playerName}</Text>
        <View style={[styles.colorBar, { backgroundColor: chipColor }]} />
        <Text style={styles.instruction}>Your turn</Text>

        <Pressable style={[styles.readyButton, { borderColor: chipColor }]} onPress={onReady}>
          <Text style={[styles.readyText, { color: chipColor }]}>I'm Ready</Text>
        </Pressable>

        <Text style={styles.hint}>Tap when ready — don't let others see your hand!</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13,11,14,0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
    alignItems: "center",
    width: "80%",
    maxWidth: 320,
  },
  avatar: {
    fontSize: 56,
    marginBottom: spacing.md,
  },
  name: {
    color: colors.heading,
    fontSize: 24,
    fontWeight: "800",
    marginBottom: spacing.sm,
  },
  colorBar: {
    width: 48,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.lg,
  },
  instruction: {
    color: colors.body,
    fontSize: 16,
    fontWeight: "500",
    marginBottom: spacing.xl,
  },
  readyButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    marginBottom: spacing.md,
  },
  readyText: {
    fontSize: 18,
    fontWeight: "800",
  },
  hint: {
    color: colors.muted,
    fontSize: 11,
    textAlign: "center",
  },
});
