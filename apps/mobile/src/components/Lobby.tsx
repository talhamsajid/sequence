import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Clipboard from "expo-clipboard";
import {
  type GameState,
  type PlayerColor,
  getMaxPlayers,
  getMinPlayers,
  getPlayerTeam,
  getPlayerAvatar,
} from "@sequence/game-logic";
import { colors, spacing, borderRadius, chipColorMap } from "../constants/theme";

interface LobbyProps {
  state: GameState;
  playerId: string;
  onStart: () => void;
  onLeave: () => void;
  onSwitchTeam: (targetTeamId: string) => void;
  onChangeColor: (color: PlayerColor) => void;
  roomCode: string;
}

const ALL_COLORS: PlayerColor[] = ["red", "blue", "green"];

const colorDotMap: Record<PlayerColor, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
};

const colorRingMap: Record<PlayerColor, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
};

export function Lobby({
  state,
  playerId,
  onStart,
  onLeave,
  onSwitchTeam,
  onChangeColor,
  roomCode,
}: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const isHost = state.hostId === playerId;
  const playerCount = Object.keys(state.players).length;
  const isTeams = state.mode === "teams";
  const teamCount = state.teams ? Object.keys(state.teams).length : 0;
  const myTeam =
    isTeams && state.teams ? getPlayerTeam(state.teams, playerId) : null;
  const maxPlayers = getMaxPlayers(state.mode, teamCount);
  const minPlayers = getMinPlayers(state.mode, teamCount);

  const copyCode = async () => {
    await Clipboard.setStringAsync(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareGame = async () => {
    const gameUrl = `https://sequence-lilac.vercel.app/game/${roomCode}`;
    try {
      await Share.share({
        message: `Join my Sequence game! Room code: ${roomCode}\n${gameUrl}`,
      });
    } catch {
      await Clipboard.setStringAsync(gameUrl);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Waiting for Players</Text>
          <Text style={styles.subtitle}>
            {playerCount}/{maxPlayers} players joined
          </Text>

          {/* Mode badge */}
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.badge,
                isTeams ? styles.badgeTeams : styles.badgeSolo,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  isTeams ? styles.badgeTeamsText : styles.badgeSoloText,
                ]}
              >
                {isTeams ? `Teams (${teamCount} teams)` : "Solo"}
              </Text>
            </View>
          </View>

          {/* Room code */}
          <View style={styles.codeBox}>
            <Text style={styles.codeLabel}>Room Code</Text>
            <Pressable onPress={copyCode}>
              <Text style={styles.codeValue}>{roomCode}</Text>
            </Pressable>
            <Text style={styles.codeHint}>
              {copied ? "Copied!" : "Tap to copy"}
            </Text>

            <Pressable style={styles.shareBtn} onPress={shareGame}>
              <Text style={styles.shareBtnText}>
                {linkCopied ? "Link Copied!" : "Invite Friends"}
              </Text>
            </Pressable>
          </View>

          {/* Players list */}
          {isTeams && state.teams ? (
            <View style={styles.teamsSection}>
              {Object.entries(state.teams)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([teamId, team]) => (
                  <View key={teamId} style={styles.teamCard}>
                    <View style={styles.teamHeader}>
                      <View
                        style={[
                          styles.teamDot,
                          { backgroundColor: colorDotMap[team.color] },
                        ]}
                      />
                      <Text style={styles.teamName}>{team.name}</Text>
                      <Text style={styles.teamCount}>
                        ({team.playerIds.length}/2)
                      </Text>
                      {myTeam &&
                        myTeam.teamId !== teamId &&
                        team.playerIds.length < 2 && (
                          <Pressable
                            style={styles.switchBtn}
                            onPress={() => onSwitchTeam(teamId)}
                          >
                            <Text style={styles.switchBtnText}>Join</Text>
                          </Pressable>
                        )}
                    </View>
                    <View style={styles.teamPlayers}>
                      {team.playerIds.map((pid) => {
                        const p = state.players[pid];
                        if (!p) return null;
                        return (
                          <View key={pid} style={styles.playerRow}>
                            <Text style={styles.playerAvatar}>
                              {getPlayerAvatar(pid)}
                            </Text>
                            <Text style={styles.playerName}>
                              {p.name}
                              {pid === playerId && (
                                <Text style={styles.youTag}> (you)</Text>
                              )}
                            </Text>
                            {pid === state.hostId && (
                              <View style={styles.hostBadge}>
                                <Text style={styles.hostBadgeText}>
                                  Host
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
                      {team.playerIds.length < 2 && (
                        <Text style={styles.waitingText}>
                          Waiting for player...
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
            </View>
          ) : (
            <View style={styles.playersSection}>
              {state.playerOrder.map((pid) => {
                const p = state.players[pid];
                if (!p) return null;
                const isMe = pid === playerId;
                const takenColors = new Set(
                  Object.entries(state.players)
                    .filter(([id]) => id !== playerId)
                    .map(([, pl]) => pl.color)
                );

                return (
                  <View key={pid} style={styles.soloPlayerRow}>
                    <Text style={styles.playerAvatar}>
                      {getPlayerAvatar(pid)}
                    </Text>

                    {/* Color picker for self, dot for others */}
                    {isMe ? (
                      <View style={styles.colorPicker}>
                        {ALL_COLORS.map((c) => {
                          const taken = takenColors.has(c);
                          const selected = p.color === c;
                          return (
                            <Pressable
                              key={c}
                              onPress={() => !taken && onChangeColor(c)}
                              disabled={taken}
                              style={[
                                styles.colorOption,
                                { backgroundColor: colorDotMap[c] },
                                selected && {
                                  borderWidth: 2,
                                  borderColor: colorRingMap[c],
                                },
                                taken && !selected && styles.colorTaken,
                                !taken &&
                                  !selected &&
                                  styles.colorAvailable,
                              ]}
                            />
                          );
                        })}
                      </View>
                    ) : (
                      <View
                        style={[
                          styles.soloColorDot,
                          { backgroundColor: colorDotMap[p.color] },
                        ]}
                      />
                    )}

                    <Text style={styles.playerName}>
                      {p.name}
                      {isMe && (
                        <Text style={styles.youTag}> (you)</Text>
                      )}
                    </Text>

                    {pid === state.hostId && (
                      <View style={styles.hostBadge}>
                        <Text style={styles.hostBadgeText}>Host</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Win condition */}
          <View style={styles.winInfo}>
            <Text style={styles.winInfoText}>
              {state.sequencesNeeded === 0
                ? "Last Card -- most sequences wins"
                : `First to ${state.sequencesNeeded} sequence${state.sequencesNeeded > 1 ? "s" : ""}`}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            {isHost ? (
              <Pressable
                style={[
                  styles.startBtn,
                  playerCount < minPlayers && styles.startBtnDisabled,
                ]}
                onPress={onStart}
                disabled={playerCount < minPlayers}
              >
                <Text style={styles.startBtnText}>
                  {playerCount < minPlayers
                    ? `Need ${minPlayers}+ players`
                    : "Start Game"}
                </Text>
              </Pressable>
            ) : (
              <View style={styles.waitingHost}>
                <Text style={styles.waitingHostText}>
                  Waiting for host to start...
                </Text>
              </View>
            )}
            <Pressable style={styles.leaveBtn} onPress={onLeave}>
              <Text style={styles.leaveBtnText}>Leave</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bgGradientTo,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius["2xl"],
    padding: spacing.lg,
    width: "100%",
    maxWidth: 380,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: colors.gray400,
    textAlign: "center",
    marginBottom: 8,
  },
  badgeRow: {
    alignItems: "center",
    marginBottom: spacing.md,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
  },
  badgeSolo: {
    backgroundColor: "#ecfdf5",
  },
  badgeTeams: {
    backgroundColor: colors.purpleBg,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  badgeSoloText: {
    color: colors.primaryHover,
  },
  badgeTeamsText: {
    color: colors.purpleText,
  },
  codeBox: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: 20,
    alignItems: "center",
  },
  codeLabel: {
    fontSize: 11,
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  codeValue: {
    fontSize: 30,
    fontWeight: "800",
    color: colors.primaryHover,
    letterSpacing: 8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  codeHint: {
    fontSize: 11,
    color: colors.gray400,
    marginTop: 4,
  },
  shareBtn: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  shareBtnText: {
    color: colors.textWhite,
    fontSize: 13,
    fontWeight: "700",
  },
  teamsSection: {
    gap: 12,
    marginBottom: 20,
  },
  teamCard: {
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
    padding: 12,
  },
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  teamDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  teamName: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray600,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  teamCount: {
    fontSize: 11,
    color: colors.gray400,
  },
  switchBtn: {
    marginLeft: "auto",
    backgroundColor: "#eff6ff", // blue-50
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  switchBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563eb",
  },
  teamPlayers: {
    marginLeft: 20,
    gap: 6,
  },
  playersSection: {
    gap: 8,
    marginBottom: 20,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  soloPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: colors.gray50,
    borderRadius: borderRadius.md,
  },
  playerAvatar: {
    fontSize: 20,
  },
  playerName: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.textDark,
    flex: 1,
  },
  youTag: {
    color: colors.gray400,
  },
  hostBadge: {
    backgroundColor: colors.amberBg,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  hostBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.amberText,
  },
  waitingText: {
    fontSize: 11,
    color: colors.gray300,
    fontStyle: "italic",
  },
  colorPicker: {
    flexDirection: "row",
    gap: 6,
  },
  colorOption: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  colorTaken: {
    opacity: 0.25,
  },
  colorAvailable: {
    opacity: 0.6,
  },
  soloColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  winInfo: {
    alignItems: "center",
    marginBottom: 20,
  },
  winInfoText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray600,
    backgroundColor: colors.gray100,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    overflow: "hidden",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
  },
  startBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: "center",
  },
  startBtnDisabled: {
    backgroundColor: colors.gray300,
  },
  startBtnText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: "700",
  },
  waitingHost: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray100,
    alignItems: "center",
  },
  waitingHostText: {
    color: colors.gray500,
    fontSize: 13,
    fontWeight: "500",
  },
  leaveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray100,
    alignItems: "center",
  },
  leaveBtnText: {
    color: colors.gray500,
    fontSize: 13,
    fontWeight: "500",
  },
});
