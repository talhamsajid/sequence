import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import Animated, { FadeIn, SlideInDown } from "react-native-reanimated";
import {
  type GameState,
  type GameHistoryEntry,
  getPlayerTeam,
} from "@sequence/game-logic";
import { colors, spacing, borderRadius } from "../constants/theme";

interface WinOverlayProps {
  state: GameState;
  playerId: string;
  onPlayAgain: () => void;
  onLeave: () => void;
}

const colorDotMap: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#10b981",
};

function ScoreRow({
  name,
  color,
  sequences,
  isWinner,
}: {
  name: string;
  color: string;
  sequences: number;
  isWinner: boolean;
}) {
  return (
    <View
      style={[
        styles.scoreRow,
        isWinner && styles.scoreRowWinner,
      ]}
    >
      <View
        style={[
          styles.scoreDot,
          { backgroundColor: colorDotMap[color] ?? colors.gray400 },
        ]}
      />
      <Text style={styles.scoreName} numberOfLines={1}>
        {name}
      </Text>
      <Text
        style={[
          styles.scoreValue,
          isWinner && styles.scoreValueWinner,
        ]}
      >
        {sequences}
      </Text>
    </View>
  );
}

function HistoryTable({ history }: { history: GameHistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <View style={styles.historySection}>
      <Text style={styles.historyLabel}>Room History</Text>
      <ScrollView style={styles.historyScroll} nestedScrollEnabled>
        {[...history].reverse().map((entry) => (
          <View key={entry.gameNumber} style={styles.historyRow}>
            <Text style={styles.historyNum}>#{entry.gameNumber}</Text>
            <View style={styles.historyScores}>
              {Object.entries(entry.scores).map(([id, s]) => (
                <View key={id} style={styles.historyScoreItem}>
                  <View
                    style={[
                      styles.historyDot,
                      {
                        backgroundColor:
                          colorDotMap[s.color] ?? colors.gray400,
                      },
                    ]}
                  />
                  <Text style={styles.historyScoreVal}>{s.sequences}</Text>
                </View>
              ))}
            </View>
            <Text
              style={[
                styles.historyWinner,
                !entry.winnerId && styles.historyWinnerDraw,
              ]}
              numberOfLines={1}
            >
              {entry.winnerLabel}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function WinOverlay({
  state,
  playerId,
  onPlayAgain,
  onLeave,
}: WinOverlayProps) {
  if (state.phase !== "finished") return null;

  const isTeams = state.mode === "teams" && state.teams;
  const isDraw = !state.winner;

  let isWinner = false;
  if (!isDraw) {
    if (isTeams && state.teams) {
      const playerTeam = getPlayerTeam(state.teams, playerId);
      isWinner = playerTeam?.teamId === state.winner;
    } else {
      isWinner = state.winner === playerId;
    }
  }

  // Build score entries
  const scoreEntries: {
    id: string;
    name: string;
    color: string;
    sequences: number;
  }[] = [];
  if (state.scores) {
    if (isTeams && state.teams) {
      for (const [teamId, team] of Object.entries(state.teams)) {
        scoreEntries.push({
          id: teamId,
          name: team.name,
          color: team.color,
          sequences: state.scores[teamId] ?? 0,
        });
      }
    } else {
      for (const pid of state.playerOrder) {
        const p = state.players[pid];
        if (p) {
          scoreEntries.push({
            id: pid,
            name: p.name,
            color: p.color,
            sequences: state.scores[pid] ?? 0,
          });
        }
      }
    }
    scoreEntries.sort((a, b) => b.sequences - a.sequences);
  }

  const pastHistory = state.gameHistory ?? [];
  const emoji = isDraw ? "\u{1F91D}" : isWinner ? "\u{1F3C6}" : "\u{1F614}";
  const title = isDraw
    ? state.winnerLabel ?? "Draw!"
    : isWinner
      ? isTeams
        ? "Your Team Won!"
        : "You Won!"
      : `${state.winnerLabel} Wins!`;
  const subtitle =
    state.sequencesNeeded === 0
      ? "All cards played -- final scores"
      : "Game over -- final scores";

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.backdrop}>
      <Animated.View
        entering={SlideInDown.springify().damping(15)}
        style={styles.sheet}
      >
        <ScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.emoji}>{emoji}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Scoreboard */}
          {scoreEntries.length > 0 && (
            <View style={styles.scoresContainer}>
              {scoreEntries.map((entry) => (
                <ScoreRow
                  key={entry.id}
                  name={entry.name}
                  color={entry.color}
                  sequences={entry.sequences}
                  isWinner={entry.id === state.winner}
                />
              ))}
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionsRow}>
            {state.hostId === playerId && (
              <Pressable style={styles.playAgainBtn} onPress={onPlayAgain}>
                <Text style={styles.playAgainText}>Play Again</Text>
              </Pressable>
            )}
            <Pressable style={styles.leaveBtn} onPress={onLeave}>
              <Text style={styles.leaveText}>Leave</Text>
            </Pressable>
          </View>

          {/* History */}
          <HistoryTable history={pastHistory} />
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 60,
  },
  sheet: {
    backgroundColor: colors.card,
    borderRadius: borderRadius["2xl"],
    marginHorizontal: spacing.md,
    maxWidth: 380,
    width: "100%",
    maxHeight: "85%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  sheetContent: {
    padding: spacing.lg,
    alignItems: "center",
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textDark,
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 13,
    color: colors.gray400,
    marginBottom: spacing.md,
    textAlign: "center",
  },
  scoresContainer: {
    width: "100%",
    gap: 6,
    marginBottom: spacing.md,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray50,
  },
  scoreRowWinner: {
    backgroundColor: "#fffbeb", // amber-50
    borderWidth: 1,
    borderColor: "#fde68a", // amber-200
  },
  scoreDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  scoreName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "500",
    color: colors.textDark,
  },
  scoreValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray500,
    fontVariant: ["tabular-nums"],
  },
  scoreValueWinner: {
    color: "#d97706", // amber-600
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  playAgainBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
  },
  playAgainText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: "700",
  },
  leaveBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: colors.gray100,
    borderRadius: borderRadius.lg,
  },
  leaveText: {
    color: colors.textDark,
    fontSize: 14,
    fontWeight: "700",
  },
  historySection: {
    marginTop: spacing.md,
    width: "100%",
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
    paddingTop: 12,
  },
  historyLabel: {
    fontSize: 11,
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 8,
  },
  historyScroll: {
    maxHeight: 128,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.sm,
    marginBottom: 4,
  },
  historyNum: {
    fontSize: 11,
    color: colors.gray400,
    fontFamily: "Menlo",
    width: 20,
  },
  historyScores: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  historyScoreItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  historyScoreVal: {
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    color: colors.textDark,
  },
  historyWinner: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textDark,
    maxWidth: 80,
  },
  historyWinnerDraw: {
    color: colors.gray400,
  },
});
