import { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import {
  createGame,
  getDefaultSequencesNeeded,
  generateRoomCode,
  getMaxPlayers,
  type GameMode,
} from "@sequence/game-logic";
import { createRoom, getRoom } from "../src/lib/firebase";
import { getPlayerId, getPlayerName, setPlayerName } from "../src/lib/storage";
import { colors, spacing, borderRadius } from "../src/constants/theme";

export default function HomeScreen() {
  const router = useRouter();
  const [name, setName] = useState(() => getPlayerName() ?? "");
  const [joinCode, setJoinCode] = useState("");
  const [view, setView] = useState<"home" | "create" | "join">("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create game options
  const [gameMode, setGameMode] = useState<GameMode>("solo");
  const [teamCount, setTeamCount] = useState(2);
  const [sequencesNeeded, setSequencesNeeded] = useState(2);

  const updateMode = useCallback(
    (mode: GameMode) => {
      setGameMode(mode);
      setSequencesNeeded(
        getDefaultSequencesNeeded(mode, mode === "solo" ? 2 : teamCount)
      );
    },
    [teamCount]
  );

  const updateTeamCount = useCallback((count: number) => {
    setTeamCount(count);
    setSequencesNeeded(getDefaultSequencesNeeded("teams", count));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    setLoading(true);
    setError(null);
    setPlayerName(name.trim());

    const playerId = getPlayerId();
    const roomId = generateRoomCode();
    const game = createGame(playerId, name.trim(), roomId, {
      mode: gameMode,
      sequencesNeeded,
      teamCount: gameMode === "teams" ? teamCount : undefined,
    });

    try {
      await createRoom(roomId, game);
      router.push(`/game/${roomId}`);
    } catch {
      setError("Failed to create game. Check your connection.");
      setLoading(false);
    }
  }, [name, router, gameMode, sequencesNeeded, teamCount]);

  const handleJoin = useCallback(async () => {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Enter a room code");
      return;
    }
    setLoading(true);
    setError(null);
    setPlayerName(name.trim());

    try {
      const room = await getRoom(code);
      if (!room) {
        setError("Room not found");
        setLoading(false);
        return;
      }
      if (room.phase !== "waiting") {
        setError("Game already started");
        setLoading(false);
        return;
      }
      const teamCnt = room.teams ? Object.keys(room.teams).length : 0;
      const maxPlayers = getMaxPlayers(room.mode, teamCnt);
      if (Object.keys(room.players).length >= maxPlayers) {
        setError("Room is full");
        setLoading(false);
        return;
      }
      router.push(`/game/${code}`);
    } catch {
      setError("Failed to join. Check your connection.");
      setLoading(false);
    }
  }, [name, joinCode, router]);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logo}>
            <Text style={styles.logoTitle}>SEQUENCE</Text>
            <Text style={styles.logoSubtitle}>
              The Classic Board Game, Online
            </Text>
          </View>

          {/* White card panel */}
          <View style={styles.card}>
            {/* Name input */}
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Your Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor={colors.gray400}
                maxLength={20}
                autoCorrect={false}
              />
            </View>

            {/* Error */}
            {error && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Home view */}
            {view === "home" && (
              <View style={styles.buttonGroup}>
                <Pressable
                  style={styles.primaryBtn}
                  onPress={() => setView("create")}
                >
                  <Text style={styles.primaryBtnText}>Create Game</Text>
                </Pressable>
                <Pressable
                  style={styles.secondaryBtn}
                  onPress={() => setView("join")}
                >
                  <Text style={styles.secondaryBtnText}>Join Game</Text>
                </Pressable>
              </View>
            )}

            {/* Create view */}
            {view === "create" && (
              <View style={styles.sectionGap}>
                {/* Mode selector */}
                <View>
                  <Text style={styles.label}>Game Mode</Text>
                  <View style={styles.toggleRow}>
                    {(["solo", "teams"] as const).map((m) => (
                      <Pressable
                        key={m}
                        style={[
                          styles.toggle,
                          gameMode === m && styles.toggleActive,
                        ]}
                        onPress={() => updateMode(m)}
                      >
                        <Text
                          style={[
                            styles.toggleText,
                            gameMode === m && styles.toggleTextActive,
                          ]}
                        >
                          {m === "solo" ? "Solo" : "Teams"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.hint}>
                    {gameMode === "solo"
                      ? "2-3 individual players"
                      : `${teamCount} teams of 2 players each`}
                  </Text>
                </View>

                {/* Team count */}
                {gameMode === "teams" && (
                  <View>
                    <Text style={styles.label}>Number of Teams</Text>
                    <View style={styles.toggleRow}>
                      {[2, 3].map((n) => (
                        <Pressable
                          key={n}
                          style={[
                            styles.toggle,
                            teamCount === n && styles.toggleActive,
                          ]}
                          onPress={() => updateTeamCount(n)}
                        >
                          <Text
                            style={[
                              styles.toggleText,
                              teamCount === n && styles.toggleTextActive,
                            ]}
                          >
                            {n} Teams
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    <Text style={styles.hint}>
                      {teamCount * 2} players total
                    </Text>
                  </View>
                )}

                {/* Win condition */}
                <View>
                  <Text style={styles.label}>Win Condition</Text>
                  <View style={styles.winRow}>
                    {[1, 2, 3, 0].map((n) => (
                      <Pressable
                        key={n}
                        style={[
                          styles.winToggle,
                          sequencesNeeded === n && styles.toggleActive,
                        ]}
                        onPress={() => setSequencesNeeded(n)}
                      >
                        <Text
                          style={[
                            styles.winToggleText,
                            sequencesNeeded === n && styles.toggleTextActive,
                          ]}
                        >
                          {n === 0 ? "Last Card" : `${n} Seq`}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                  <Text style={styles.hint}>
                    {sequencesNeeded === 0
                      ? "Play until all cards are used -- most sequences wins"
                      : `First to ${sequencesNeeded} sequence${sequencesNeeded > 1 ? "s" : ""} wins`}
                  </Text>
                </View>

                <Pressable
                  style={[styles.primaryBtn, loading && styles.disabledBtn]}
                  onPress={handleCreate}
                  disabled={loading}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading ? "Creating..." : "Create Game"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setView("home");
                    setError(null);
                  }}
                  style={styles.backBtn}
                >
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
              </View>
            )}

            {/* Join view */}
            {view === "join" && (
              <View style={styles.sectionGap}>
                <View>
                  <Text style={styles.label}>Room Code</Text>
                  <TextInput
                    style={styles.codeInput}
                    value={joinCode}
                    onChangeText={(t) => setJoinCode(t.toUpperCase())}
                    placeholder="XXXXX"
                    placeholderTextColor={colors.gray400}
                    maxLength={5}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                </View>

                <Pressable
                  style={[styles.primaryBtn, loading && styles.disabledBtn]}
                  onPress={handleJoin}
                  disabled={loading}
                >
                  <Text style={styles.primaryBtnText}>
                    {loading ? "Joining..." : "Join"}
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    setView("home");
                    setError(null);
                  }}
                  style={styles.backBtn}
                >
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Rules hint */}
          <Text style={styles.rulesHint}>
            2-3 players. Play cards to place chips on the board. Get 5 in a row
            to form a sequence. First to complete the required sequences wins.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bgGradientTo,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  logo: {
    alignItems: "center",
    marginBottom: 32,
  },
  logoTitle: {
    fontSize: 48,
    fontWeight: "900",
    color: colors.textWhite,
    letterSpacing: 2,
  },
  logoSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(110,231,183,0.6)",
    marginTop: 4,
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
  fieldGroup: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.gray400,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: "500",
    color: colors.textDark,
  },
  codeInput: {
    backgroundColor: colors.inputBg,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 20,
    fontWeight: "700",
    color: colors.textDark,
    textAlign: "center",
    letterSpacing: 8,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  errorBox: {
    backgroundColor: colors.errorBg,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.md,
    alignItems: "center",
  },
  errorText: {
    color: colors.errorText,
    fontSize: 13,
    fontWeight: "500",
  },
  buttonGroup: {
    gap: 12,
  },
  sectionGap: {
    gap: spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryBtn: {
    backgroundColor: "#ecfdf5",
    borderRadius: borderRadius.lg,
    paddingVertical: 16,
    alignItems: "center",
  },
  secondaryBtnText: {
    color: colors.primaryHover,
    fontSize: 15,
    fontWeight: "700",
  },
  disabledBtn: {
    backgroundColor: colors.gray400,
  },
  backBtn: {
    paddingVertical: 12,
    alignItems: "center",
  },
  backBtnText: {
    color: colors.gray400,
    fontSize: 13,
    fontWeight: "500",
  },
  toggleRow: {
    flexDirection: "row",
    gap: 8,
  },
  toggle: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray50,
    alignItems: "center",
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.gray600,
  },
  toggleTextActive: {
    color: colors.textWhite,
  },
  winRow: {
    flexDirection: "row",
    gap: 6,
  },
  winToggle: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.gray50,
    alignItems: "center",
  },
  winToggleText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.gray600,
  },
  hint: {
    fontSize: 11,
    color: colors.gray400,
    marginTop: 6,
  },
  rulesHint: {
    marginTop: spacing.lg,
    maxWidth: 300,
    textAlign: "center",
    color: "rgba(110,231,183,0.4)",
    fontSize: 11,
    lineHeight: 18,
  },
});
