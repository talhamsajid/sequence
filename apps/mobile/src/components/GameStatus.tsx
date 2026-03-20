import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import {
  type GameState,
  type PlayerColor,
  getPlayerTeam,
  getPlayerAvatar,
} from "@sequence/game-logic";
import { colors, spacing, borderRadius, chipColorMap } from "../constants/theme";

interface GameStatusProps {
  state: GameState;
  playerId: string;
}

export function GameStatus({ state, playerId }: GameStatusProps) {
  const currentPlayerId = state.playerOrder[state.currentTurn];
  const currentPlayer = state.players[currentPlayerId];
  const isMyTurn = currentPlayerId === playerId;

  // Timer
  const [timeLeft, setTimeLeft] = useState(state.turnTimeLimit);

  useEffect(() => {
    if (state.phase !== "playing" || !state.turnStartedAt) return;

    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - state.turnStartedAt!) / 1000);
      const remaining = Math.max(0, state.turnTimeLimit - elapsed);
      setTimeLeft(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [state.turnStartedAt, state.turnTimeLimit, state.phase]);

  if (!currentPlayer) return null;

  const chipColor = chipColorMap[currentPlayer.color] ?? colors.muted;
  const avatar = getPlayerAvatar(currentPlayerId);

  // Sequence counts per player/team
  const sequenceCounts: { id: string; name: string; color: PlayerColor; count: number }[] = [];
  if (state.mode === "teams" && state.teams) {
    for (const [teamId, team] of Object.entries(state.teams)) {
      const count = state.sequences.filter((s) => s.color === team.color).length;
      sequenceCounts.push({ id: teamId, name: team.name, color: team.color, count });
    }
  } else {
    for (const pid of state.playerOrder) {
      const p = state.players[pid];
      const count = state.sequences.filter((s) => s.color === p.color).length;
      sequenceCounts.push({ id: pid, name: p.name, color: p.color, count });
    }
  }

  return (
    <View style={styles.container}>
      {/* Current turn indicator */}
      <View style={[styles.turnPill, { borderColor: chipColor }]}>
        <Text style={styles.avatar}>{avatar}</Text>
        <View>
          <Text style={[styles.turnName, isMyTurn && { color: colors.goldBright }]}>
            {isMyTurn ? "Your turn" : currentPlayer.name}
          </Text>
          <Text style={[styles.timer, timeLeft <= 10 && styles.timerWarning]}>
            {timeLeft}s
          </Text>
        </View>
      </View>

      {/* Score chips */}
      <View style={styles.scores}>
        {sequenceCounts.map(({ id, name, color, count }) => (
          <View key={id} style={styles.scoreItem}>
            <View style={[styles.scoreDot, { backgroundColor: chipColorMap[color] }]} />
            <Text style={styles.scoreCount}>
              {count}/{state.sequencesNeeded || "?"}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.statusBar,
  },
  turnPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  avatar: {
    fontSize: 20,
  },
  turnName: {
    color: colors.heading,
    fontSize: 13,
    fontWeight: "700",
  },
  timer: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
  timerWarning: {
    color: colors.error,
  },
  scores: {
    flexDirection: "row",
    gap: spacing.md,
  },
  scoreItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  scoreDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  scoreCount: {
    color: colors.body,
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
