import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { getDefaultSequencesNeeded, type GameMode } from "@sequence/game-logic";
import { colors, spacing, borderRadius, chipColorMap } from "../src/constants/theme";

// Store game setup in a module-level variable for the play screen to pick up
export let pendingGameSetup: {
  players: string[];
  mode: GameMode;
  sequencesNeeded: number;
  teamCount: number;
} | null = null;

export default function LocalSetupScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<GameMode>("solo");
  const [teamCount, setTeamCount] = useState(2);
  const [playerNames, setPlayerNames] = useState(["", ""]);
  const [sequencesNeeded, setSequencesNeeded] = useState(2);

  const maxPlayers = mode === "solo" ? 3 : teamCount * 2;
  const minPlayers = mode === "solo" ? 2 : teamCount * 2;

  const updatePlayerName = (index: number, name: string) => {
    const updated = [...playerNames];
    updated[index] = name;
    setPlayerNames(updated);
  };

  const addPlayer = () => {
    if (playerNames.length < maxPlayers) {
      setPlayerNames([...playerNames, ""]);
    }
  };

  const removePlayer = () => {
    if (playerNames.length > 2) {
      setPlayerNames(playerNames.slice(0, -1));
    }
  };

  const startGame = () => {
    // Validate names
    const names = playerNames.map((n, i) => n.trim() || `Player ${i + 1}`);

    if (mode === "teams" && names.length < minPlayers) {
      Alert.alert("Not enough players", `Teams mode needs ${minPlayers} players`);
      return;
    }

    pendingGameSetup = {
      players: names,
      mode,
      sequencesNeeded,
      teamCount,
    };

    router.push("/local-play");
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>New Game</Text>

        {/* Mode selector */}
        <Text style={styles.label}>Mode</Text>
        <View style={styles.toggleRow}>
          <Pressable
            style={[styles.toggle, mode === "solo" && styles.toggleActive]}
            onPress={() => {
              setMode("solo");
              if (playerNames.length > 3) setPlayerNames(playerNames.slice(0, 3));
              setSequencesNeeded(getDefaultSequencesNeeded("solo", playerNames.length));
            }}
          >
            <Text style={[styles.toggleText, mode === "solo" && styles.toggleTextActive]}>
              Solo
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggle, mode === "teams" && styles.toggleActive]}
            onPress={() => {
              setMode("teams");
              // Ensure even number of players for teams
              const needed = teamCount * 2;
              const newNames = [...playerNames];
              while (newNames.length < needed) newNames.push("");
              while (newNames.length > needed) newNames.pop();
              setPlayerNames(newNames);
              setSequencesNeeded(getDefaultSequencesNeeded("teams", teamCount));
            }}
          >
            <Text style={[styles.toggleText, mode === "teams" && styles.toggleTextActive]}>
              Teams
            </Text>
          </Pressable>
        </View>

        {/* Team count (teams mode only) */}
        {mode === "teams" && (
          <>
            <Text style={styles.label}>Teams</Text>
            <View style={styles.toggleRow}>
              {[2, 3].map((n) => (
                <Pressable
                  key={n}
                  style={[styles.toggle, teamCount === n && styles.toggleActive]}
                  onPress={() => {
                    setTeamCount(n);
                    const needed = n * 2;
                    const newNames = [...playerNames];
                    while (newNames.length < needed) newNames.push("");
                    while (newNames.length > needed) newNames.pop();
                    setPlayerNames(newNames);
                  }}
                >
                  <Text style={[styles.toggleText, teamCount === n && styles.toggleTextActive]}>
                    {n} Teams
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Sequences to win */}
        <Text style={styles.label}>Sequences to Win</Text>
        <View style={styles.toggleRow}>
          {[1, 2, 3].map((n) => (
            <Pressable
              key={n}
              style={[styles.toggle, sequencesNeeded === n && styles.toggleActive]}
              onPress={() => setSequencesNeeded(n)}
            >
              <Text style={[styles.toggleText, sequencesNeeded === n && styles.toggleTextActive]}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Player names */}
        <Text style={styles.label}>Players</Text>
        {playerNames.map((name, i) => {
          const chipColors = ["red", "blue", "green"] as const;
          const teamIndex = mode === "teams" ? Math.floor(i / 2) : i;
          const dotColor = chipColorMap[chipColors[teamIndex % 3]];

          return (
            <View key={i} style={styles.playerRow}>
              <View style={[styles.playerDot, { backgroundColor: dotColor }]} />
              <TextInput
                style={styles.playerInput}
                value={name}
                onChangeText={(text) => updatePlayerName(i, text)}
                placeholder={`Player ${i + 1}`}
                placeholderTextColor={colors.muted}
              />
            </View>
          );
        })}

        {/* Add/remove player buttons (solo mode only) */}
        {mode === "solo" && (
          <View style={styles.playerActions}>
            {playerNames.length < maxPlayers && (
              <Pressable style={styles.smallButton} onPress={addPlayer}>
                <Text style={styles.smallButtonText}>+ Add Player</Text>
              </Pressable>
            )}
            {playerNames.length > 2 && (
              <Pressable style={styles.smallButton} onPress={removePlayer}>
                <Text style={styles.smallButtonText}>- Remove</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Start button */}
        <Pressable style={styles.startButton} onPress={startGame}>
          <Text style={styles.startButtonText}>Start Game</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: {
    color: colors.heading,
    fontSize: 28,
    fontWeight: "800",
    marginBottom: spacing.lg,
  },
  label: {
    color: colors.body,
    fontSize: 13,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  toggleRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  toggle: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.muted,
    alignItems: "center",
  },
  toggleActive: {
    borderColor: colors.gold,
    backgroundColor: "rgba(201,148,58,0.1)",
  },
  toggleText: {
    color: colors.muted,
    fontSize: 14,
    fontWeight: "600",
  },
  toggleTextActive: {
    color: colors.gold,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  playerDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  playerInput: {
    flex: 1,
    height: 44,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    color: colors.heading,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "rgba(201,148,58,0.1)",
  },
  playerActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  smallButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.muted,
  },
  smallButtonText: {
    color: colors.body,
    fontSize: 12,
    fontWeight: "600",
  },
  startButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.gold,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: "center",
  },
  startButtonText: {
    color: colors.background,
    fontSize: 18,
    fontWeight: "800",
  },
});
