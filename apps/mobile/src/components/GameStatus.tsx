import React, { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import {
  type GameState,
  type PlayerColor,
  getPlayerTeam,
  getPlayerAvatar,
} from "@sequence/game-logic";
import { colors, spacing, borderRadius, colorDotMap, colorRingMap } from "../constants/theme";

interface GameStatusProps {
  state: GameState;
  playerId: string;
  connectedPlayers?: Set<string>;
  onLeave?: () => void;
  soundOn?: boolean;
  onToggleSound?: () => void;
  boardFlipped?: boolean;
  onToggleFlip?: () => void;
}

function useTimeRemaining(
  turnStartedAt: number | null,
  turnTimeLimit: number,
  phase: string
): number {
  const [remaining, setRemaining] = useState(() => {
    if (phase !== "playing" || turnStartedAt === null) return turnTimeLimit;
    return Math.max(
      0,
      turnTimeLimit - Math.floor((Date.now() - turnStartedAt) / 1000)
    );
  });

  useEffect(() => {
    if (phase !== "playing" || turnStartedAt === null) {
      setRemaining(turnTimeLimit);
      return;
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000);
      setRemaining(Math.max(0, turnTimeLimit - elapsed));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [turnStartedAt, turnTimeLimit, phase]);

  return remaining;
}

export function GameStatus({
  state,
  playerId,
  connectedPlayers,
  onLeave,
  soundOn,
  onToggleSound,
  boardFlipped,
  onToggleFlip,
}: GameStatusProps) {
  const currentPlayerId = state.playerOrder[state.currentTurn];
  const isMyTurn = currentPlayerId === playerId;
  const currentPlayer = state.players[currentPlayerId];
  const isTeams = state.mode === "teams" && state.teams;
  const remaining = useTimeRemaining(
    state.turnStartedAt,
    state.turnTimeLimit,
    state.phase
  );

  const currentTeamInfo =
    isTeams && state.teams
      ? getPlayerTeam(state.teams, currentPlayerId)
      : null;

  // Timer visuals
  const timerStrokeColor =
    remaining <= 10
      ? "#ef4444"
      : remaining <= 30
        ? "#eab308"
        : colors.emerald400;
  const timerTextColor =
    remaining <= 10
      ? "#f87171"
      : remaining <= 30
        ? "#facc15"
        : colors.textWhite;
  const circumference = 2 * Math.PI * 12;
  const fraction =
    state.turnTimeLimit > 0 ? remaining / state.turnTimeLimit : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <View style={styles.container}>
      {/* Players */}
      <View style={styles.playersRow}>
        {isTeams && state.teams
          ? Object.entries(state.teams)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([teamId, team]) => {
                const isCurrentTeam = currentTeamInfo?.teamId === teamId;
                return (
                  <View
                    key={teamId}
                    style={[
                      styles.playerPill,
                      isCurrentTeam && styles.playerPillActive,
                      isCurrentTeam && {
                        borderColor: "rgba(255,255,255,0.3)",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: colorDotMap[team.color] },
                      ]}
                    />
                    <Text style={styles.playerEmoji}>
                      {team.playerIds.map((pid) => {
                        const isDc =
                          connectedPlayers &&
                          connectedPlayers.size > 0 &&
                          !connectedPlayers.has(pid) &&
                          pid !== playerId;
                        return (
                          <Text
                            key={pid}
                            style={isDc ? styles.dcEmoji : undefined}
                          >
                            {getPlayerAvatar(pid)}
                          </Text>
                        );
                      })}
                    </Text>
                    <Text style={styles.playerLabel}>
                      {team.playerIds.includes(playerId) ? "You" : team.name}
                    </Text>
                  </View>
                );
              })
          : state.playerOrder.map((pid) => {
              const p = state.players[pid];
              if (!p) return null;
              const isCurrent = pid === currentPlayerId;
              const isDc =
                connectedPlayers &&
                connectedPlayers.size > 0 &&
                !connectedPlayers.has(pid) &&
                pid !== playerId;
              return (
                <View
                  key={pid}
                  style={[
                    styles.playerPill,
                    isCurrent && styles.playerPillActive,
                    isCurrent && {
                      borderColor: colorRingMap[p.color],
                    },
                    isDc && styles.playerDc,
                  ]}
                >
                  <Text style={styles.playerEmoji}>
                    {getPlayerAvatar(pid)}
                  </Text>
                  {isDc ? (
                    <View style={styles.dcDot} />
                  ) : (
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: colorDotMap[p.color] },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.playerLabel,
                      isDc && styles.dcLabel,
                    ]}
                  >
                    {pid === playerId ? "You" : p.name.split(" ")[0]}
                  </Text>
                </View>
              );
            })}
      </View>

      {/* Timer + turn info */}
      <View style={styles.timerSection}>
        {state.phase === "playing" && (
          <View style={styles.timerGroup}>
            <Svg width={24} height={24} viewBox="0 0 28 28">
              <Circle
                cx={14}
                cy={14}
                r={12}
                fill="none"
                stroke="rgba(255,255,255,0.1)"
                strokeWidth={2.5}
              />
              <Circle
                cx={14}
                cy={14}
                r={12}
                fill="none"
                stroke={timerStrokeColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeDasharray={`${circumference}`}
                strokeDashoffset={`${circumference * (1 - fraction)}`}
                transform="rotate(-90 14 14)"
              />
            </Svg>
            <Text style={[styles.timerText, { color: timerTextColor }]}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </Text>
          </View>
        )}

        <View>
          {state.phase === "finished" ? (
            <Text style={styles.turnFinished}>Game over</Text>
          ) : isMyTurn ? (
            <Text style={styles.turnYours}>Your turn</Text>
          ) : (
            <Text style={styles.turnOther}>
              {currentPlayer?.name?.split(" ")[0]}
            </Text>
          )}
        </View>
      </View>

      {/* Sound toggle */}
      {onToggleSound && (
        <Pressable style={styles.iconBtn} onPress={onToggleSound}>
          <Text style={styles.iconBtnText}>
            {soundOn ? "\u{1F50A}" : "\u{1F507}"}
          </Text>
        </Pressable>
      )}

      {/* Board flip toggle */}
      {onToggleFlip && (
        <Pressable style={styles.iconBtn} onPress={onToggleFlip}>
          <Text
            style={[
              styles.iconBtnText,
              boardFlipped && styles.iconBtnActive,
            ]}
          >
            {"\u{1F503}"}
          </Text>
        </Pressable>
      )}

      {/* Leave button */}
      {onLeave && (
        <Pressable style={styles.leaveBtn} onPress={onLeave}>
          <Text style={styles.leaveBtnText}>X</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: colors.statusBar,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  playersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
    overflow: "hidden",
  },
  playerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  playerPillActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
  },
  playerDc: {
    opacity: 0.5,
  },
  playerEmoji: {
    fontSize: 14,
  },
  dcEmoji: {
    opacity: 0.4,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dcDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f59e0b",
  },
  playerLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },
  dcLabel: {
    color: "rgba(245,158,11,0.8)",
  },
  timerSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timerGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timerText: {
    fontSize: 11,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    fontFamily: "Menlo",
  },
  turnYours: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.emerald400,
  },
  turnOther: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  turnFinished: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gold,
  },
  iconBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnText: {
    fontSize: 14,
    opacity: 0.7,
  },
  iconBtnActive: {
    opacity: 1,
  },
  leaveBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveBtnText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "700",
  },
});
