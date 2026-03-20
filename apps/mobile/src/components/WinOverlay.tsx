import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import type { GameState } from "@sequence/game-logic";
import { colors, spacing, borderRadius, chipColorMap } from "../constants/theme";

interface WinOverlayProps {
  state: GameState;
  playerId: string;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export function WinOverlay({ state, playerId, onPlayAgain, onLeave }: WinOverlayProps) {
  if (state.phase !== "finished") return null;

  const isWinner = state.winner === playerId;
  const scores = state.scores ?? {};

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.backdrop}>
      <Animated.View entering={SlideInDown.springify().damping(15)} style={styles.sheet}>
        {/* Trophy / Result */}
        <Text style={styles.emoji}>{isWinner ? "🏆" : state.winner ? "😔" : "🤝"}</Text>
        <Text style={styles.title}>
          {state.winnerLabel ?? "Game Over"}
        </Text>
        <Text style={styles.subtitle}>
          {isWinner ? "You win!" : state.winner ? "Better luck next time" : "It's a draw!"}
        </Text>

        {/* Scores */}
        <View style={styles.scoresContainer}>
          {Object.entries(scores).map(([id, count]) => {
            const player = state.players[id];
            const team = state.teams?.[id];
            const name = team?.name ?? player?.name ?? id;
            const chipColor = team?.color ?? player?.color ?? "red";

            return (
              <View key={id} style={styles.scoreRow}>
                <View style={[styles.scorePip, { backgroundColor: chipColorMap[chipColor as keyof typeof chipColorMap] }]} />
                <Text style={styles.scoreName}>{name}</Text>
                <Text style={styles.scoreValue}>{count} seq</Text>
              </View>
            );
          })}
        </View>

        {/* Actions */}
        <Pressable onPress={onPlayAgain} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Play Again</Text>
        </Pressable>
        <Pressable onPress={onLeave} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Leave</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    alignItems: "center",
  },
  emoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  title: {
    color: colors.heading,
    fontSize: 24,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.body,
    fontSize: 14,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  scoresContainer: {
    width: "100%",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  scorePip: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scoreName: {
    flex: 1,
    color: colors.heading,
    fontSize: 14,
    fontWeight: "600",
  },
  scoreValue: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  primaryButton: {
    width: "100%",
    backgroundColor: colors.gold,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: "800",
  },
  secondaryButton: {
    width: "100%",
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.muted,
  },
  secondaryButtonText: {
    color: colors.body,
    fontSize: 14,
    fontWeight: "600",
  },
});
