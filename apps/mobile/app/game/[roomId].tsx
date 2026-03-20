import { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import {
  subscribeToRoom,
  setRoom,
  deleteRoom,
  registerPresence,
  clearPresence,
  subscribeToPresence,
  subscribeToConnectionState,
} from "../../src/lib/firebase";
import {
  type GameState,
  type PlayerColor,
  playCard,
  startGame,
  addPlayer,
  removePlayer,
  getValidPositions,
  getRandomValidMove,
  isOneEyedJack,
  getMaxPlayers,
  switchPlayerTeam,
  getPlayerTeamColor,
} from "@sequence/game-logic";
import { getPlayerId, getPlayerName, setPlayerName } from "../../src/lib/storage";
import { GameBoard } from "../../src/components/GameBoard";
import { PlayerHand } from "../../src/components/PlayerHand";
import { GameStatus } from "../../src/components/GameStatus";
import { Lobby } from "../../src/components/Lobby";
import { WinOverlay } from "../../src/components/WinOverlay";
import { ZoomableBoard } from "../../src/components/ZoomableBoard";
import { colors, spacing, borderRadius } from "../../src/constants/theme";

export default function GamePage() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [playerId] = useState(() => getPlayerId());
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<Set<string>>(
    () => new Set()
  );
  const [nameInput, setNameInput] = useState("");
  const [roomChecked, setRoomChecked] = useState(false);
  const [isConnected, setIsConnected] = useState(true);

  // Refs for change detection
  const prevTurnRef = useRef<number | null>(null);
  const autoPlayingRef = useRef(false);
  const stateRef = useRef<GameState | null>(null);
  stateRef.current = state;
  const presenceCleanupRef = useRef<(() => void) | null>(null);
  const connectedPlayersRef = useRef(connectedPlayers);
  connectedPlayersRef.current = connectedPlayers;

  // Subscribe to game state
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeToRoom(roomId, (gameState) => {
      setState(gameState);
      setRoomChecked(true);

      // Auto-join: player not in game, lobby phase
      if (
        gameState &&
        !joining &&
        !gameState.players[playerId] &&
        gameState.phase === "waiting"
      ) {
        const storedName = getPlayerName();
        const teamCount = gameState.teams
          ? Object.keys(gameState.teams).length
          : 0;
        const maxPlayers = getMaxPlayers(gameState.mode, teamCount);
        if (
          storedName &&
          Object.keys(gameState.players).length < maxPlayers
        ) {
          setJoining(true);
          try {
            const updated = addPlayer(gameState, playerId, storedName);
            setRoom(roomId, updated).finally(() => setJoining(false));
          } catch {
            setJoining(false);
          }
        }
      }
    });

    return unsubscribe;
  }, [roomId, playerId, joining]);

  // Subscribe to presence
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeToPresence(roomId, setConnectedPlayers);
    return unsubscribe;
  }, [roomId]);

  // Register presence
  const isInGame = !!state?.players[playerId];

  useEffect(() => {
    if (!isInGame || !roomId) return;
    presenceCleanupRef.current = registerPresence(roomId, playerId);
    return () => {
      presenceCleanupRef.current?.();
      presenceCleanupRef.current = null;
    };
  }, [roomId, playerId, isInGame]);

  // Haptics on turn change
  useEffect(() => {
    if (!state || state.phase !== "playing") return;
    if (
      prevTurnRef.current !== null &&
      prevTurnRef.current !== state.currentTurn &&
      state.playerOrder[state.currentTurn] === playerId
    ) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    prevTurnRef.current = state.currentTurn;
  }, [state, playerId]);

  // Turn timer auto-play
  const turnStartedAt = state?.turnStartedAt ?? null;
  const turnTimeLimit = state?.turnTimeLimit ?? 60;
  const currentTurnPlayerId =
    state?.phase === "playing" ? state.playerOrder[state.currentTurn] : null;
  const isMyTurn = currentTurnPlayerId === playerId;

  useEffect(() => {
    if (!isMyTurn || turnStartedAt === null || !roomId) return;

    const interval = setInterval(async () => {
      const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000);
      const remaining = turnTimeLimit - elapsed;

      if (remaining <= 0 && !autoPlayingRef.current) {
        autoPlayingRef.current = true;
        clearInterval(interval);

        const currentState = stateRef.current;
        if (!currentState || currentState.phase !== "playing") {
          autoPlayingRef.current = false;
          return;
        }

        const move = getRandomValidMove(currentState, playerId);
        if (move) {
          try {
            const newState = playCard(
              currentState,
              playerId,
              move.cardIndex,
              move.row,
              move.col
            );
            await setRoom(roomId, newState);
            setSelectedCard(null);
          } catch {
            // Move failed
          }
        } else {
          try {
            const nextTurn =
              (currentState.currentTurn + 1) %
              currentState.playerOrder.length;
            await setRoom(roomId, {
              ...currentState,
              currentTurn: nextTurn,
              turnStartedAt: Date.now(),
              lastActivity: Date.now(),
            });
            setSelectedCard(null);
          } catch {
            // State changed
          }
        }
        autoPlayingRef.current = false;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isMyTurn, turnStartedAt, turnTimeLimit, playerId, roomId]);

  // Auto-play for disconnected players (host only)
  useEffect(() => {
    if (
      !state ||
      state.phase !== "playing" ||
      state.hostId !== playerId ||
      !roomId
    )
      return;

    const dcPlayerId = state.playerOrder[state.currentTurn];
    if (
      !dcPlayerId ||
      dcPlayerId === playerId ||
      connectedPlayers.has(dcPlayerId) ||
      connectedPlayers.size === 0
    )
      return;

    if (autoPlayingRef.current) return;

    const timeout = setTimeout(async () => {
      if (autoPlayingRef.current) return;
      autoPlayingRef.current = true;

      const currentState = stateRef.current;
      if (!currentState || currentState.phase !== "playing") {
        autoPlayingRef.current = false;
        return;
      }

      const pid = currentState.playerOrder[currentState.currentTurn];
      if (
        !pid ||
        pid === playerId ||
        connectedPlayersRef.current.has(pid) ||
        connectedPlayersRef.current.size === 0
      ) {
        autoPlayingRef.current = false;
        return;
      }

      const move = getRandomValidMove(currentState, pid);
      if (move) {
        try {
          const newState = playCard(
            currentState,
            pid,
            move.cardIndex,
            move.row,
            move.col
          );
          await setRoom(roomId, newState);
        } catch {
          // State changed
        }
      } else {
        try {
          const nextTurn =
            (currentState.currentTurn + 1) %
            currentState.playerOrder.length;
          await setRoom(roomId, {
            ...currentState,
            currentTurn: nextTurn,
            turnStartedAt: Date.now(),
            lastActivity: Date.now(),
          });
        } catch {
          // State changed
        }
      }
      autoPlayingRef.current = false;
    }, 15000);

    return () => clearTimeout(timeout);
  }, [state, playerId, roomId, connectedPlayers]);

  // Firebase connection state
  useEffect(() => {
    if (!isInGame || !roomId) return;
    const unsubscribe = subscribeToConnectionState((connected) => {
      setIsConnected(connected);
      if (connected) {
        presenceCleanupRef.current?.();
        presenceCleanupRef.current = registerPresence(roomId, playerId);
      }
    });
    return unsubscribe;
  }, [isInGame, roomId, playerId]);

  // Handle cell click
  const handleCellClick = useCallback(
    async (row: number, col: number) => {
      if (!state || selectedCard === null || !roomId) return;

      const player = state.players[playerId];
      const card = player?.hand?.[selectedCard];

      try {
        const newState = playCard(state, playerId, selectedCard, row, col);

        if (card && isOneEyedJack(card)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        await setRoom(roomId, newState);
        setSelectedCard(null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid move");
        setTimeout(() => setError(null), 2000);
      }
    },
    [state, selectedCard, playerId, roomId]
  );

  // Start game
  const handleStart = useCallback(async () => {
    if (!state || !roomId) return;
    try {
      const started = startGame(state);
      await setRoom(roomId, started);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot start game");
    }
  }, [state, roomId]);

  // Switch team
  const handleSwitchTeam = useCallback(
    async (targetTeamId: string) => {
      if (!state || state.mode !== "teams" || !state.teams || !roomId)
        return;
      const newTeams = switchPlayerTeam(state.teams, playerId, targetTeamId);
      if (!newTeams) return;

      const newColor =
        getPlayerTeamColor(newTeams, playerId) ??
        state.players[playerId].color;
      await setRoom(roomId, {
        ...state,
        teams: newTeams,
        players: {
          ...state.players,
          [playerId]: { ...state.players[playerId], color: newColor },
        },
      });
    },
    [state, playerId, roomId]
  );

  // Change chip color (solo lobby)
  const handleChangeColor = useCallback(
    async (color: PlayerColor) => {
      if (!state || state.phase !== "waiting" || !roomId) return;
      const taken = Object.entries(state.players).some(
        ([pid, p]) => pid !== playerId && p.color === color
      );
      if (taken) return;

      await setRoom(roomId, {
        ...state,
        players: {
          ...state.players,
          [playerId]: { ...state.players[playerId], color },
        },
      });
    },
    [state, playerId, roomId]
  );

  // Play again
  const handlePlayAgain = useCallback(async () => {
    if (!state || !roomId) return;
    const started = startGame(state);
    await setRoom(roomId, started);
    setSelectedCard(null);
  }, [state, roomId]);

  // Leave game
  const handleLeave = useCallback(async () => {
    presenceCleanupRef.current?.();
    presenceCleanupRef.current = null;
    if (roomId) clearPresence(roomId, playerId);

    if (state && roomId) {
      const updated = removePlayer(state, playerId);
      if (updated === null) {
        await deleteRoom(roomId).catch(() => {});
      } else {
        await setRoom(roomId, updated).catch(() => {});
      }
    }
    router.replace("/");
  }, [state, playerId, roomId, router]);

  // Loading state
  if (!state) {
    if (roomChecked) {
      router.replace("/");
      return null;
    }

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.textWhite} />
        <Text style={styles.loadingText}>Loading game...</Text>
      </View>
    );
  }

  // Not in game — needs name to join
  if (!state.players[playerId]) {
    const notInGameTeamCount = state.teams
      ? Object.keys(state.teams).length
      : 0;
    const notInGameMaxPlayers = getMaxPlayers(
      state.mode,
      notInGameTeamCount
    );
    const isFull =
      Object.keys(state.players).length >= notInGameMaxPlayers;
    const canJoin = state.phase === "waiting" && !isFull;
    const needsName = canJoin && !getPlayerName();

    const handleNameJoin = async () => {
      if (!nameInput.trim() || !state || !roomId) return;
      setPlayerName(nameInput.trim());
      setJoining(true);
      try {
        const updated = addPlayer(state, playerId, nameInput.trim());
        await setRoom(roomId, updated);
      } catch {
        // Will retry
      }
      setJoining(false);
    };

    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.joinCard}>
          {needsName ? (
            <>
              <Text style={styles.joinTitle}>Join Game</Text>
              <Text style={styles.joinSubtitle}>
                Enter your name to join
              </Text>
              <TextInput
                style={styles.joinInput}
                value={nameInput}
                onChangeText={setNameInput}
                placeholder="Your name"
                placeholderTextColor="rgba(255,255,255,0.3)"
                maxLength={20}
                autoFocus
                onSubmitEditing={handleNameJoin}
              />
              <Pressable
                style={[
                  styles.joinBtn,
                  (!nameInput.trim() || joining) && styles.joinBtnDisabled,
                ]}
                onPress={handleNameJoin}
                disabled={!nameInput.trim() || joining}
              >
                <Text style={styles.joinBtnText}>
                  {joining ? "Joining..." : "Join Game"}
                </Text>
              </Pressable>
            </>
          ) : (
            <Text style={styles.joinMessage}>
              {isFull
                ? "This game is full."
                : state.phase !== "waiting"
                  ? "This game has already started."
                  : "Joining..."}
            </Text>
          )}
          <Pressable
            style={styles.joinBackBtn}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.joinBackText}>Back to Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // Lobby
  if (state.phase === "waiting") {
    return (
      <Lobby
        state={state}
        playerId={playerId}
        onStart={handleStart}
        onLeave={handleLeave}
        onSwitchTeam={handleSwitchTeam}
        onChangeColor={handleChangeColor}
        roomCode={roomId!}
      />
    );
  }

  // Game in progress
  const player = state.players[playerId];
  const hand = player?.hand ?? [];

  const validCardIndices = new Set<number>();
  hand.forEach((card, i) => {
    if (getValidPositions(state, card).length > 0) {
      validCardIndices.add(i);
    }
  });

  return (
    <SafeAreaView style={styles.gameContainer} edges={["top"]}>
      {/* Status bar */}
      <View style={styles.statusPad}>
        <GameStatus
          state={state}
          playerId={playerId}
          connectedPlayers={connectedPlayers}
          onLeave={handleLeave}
        />
      </View>

      {/* Error toast */}
      {error && (
        <View style={styles.errorToast}>
          <Text style={styles.errorToastText}>{error}</Text>
        </View>
      )}

      {/* Board */}
      <View style={styles.boardWrapper}>
        <ZoomableBoard>
          <GameBoard
            state={state}
            selectedCardIndex={selectedCard}
            playerId={playerId}
            onCellClick={handleCellClick}
          />
        </ZoomableBoard>
      </View>

      {/* Hand */}
      <PlayerHand
        hand={hand}
        selectedIndex={selectedCard}
        onSelect={setSelectedCard}
        isMyTurn={isMyTurn}
        validCards={validCardIndices}
      />

      {/* Reconnect overlay */}
      {!isConnected && (
        <View style={styles.reconnectOverlay}>
          <View style={styles.reconnectCard}>
            <ActivityIndicator size="small" color={colors.textWhite} />
            <Text style={styles.reconnectText}>Reconnecting...</Text>
          </View>
        </View>
      )}

      {/* Win overlay */}
      <WinOverlay
        state={state}
        playerId={playerId}
        onPlayAgain={handlePlayAgain}
        onLeave={handleLeave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.bgGradientTo,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg,
  },
  loadingText: {
    color: colors.emerald200,
    fontSize: 14,
    marginTop: spacing.md,
  },
  joinCard: {
    alignItems: "center",
    width: "100%",
    maxWidth: 380,
    padding: spacing.lg,
  },
  joinTitle: {
    color: colors.textWhite,
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  joinSubtitle: {
    color: "rgba(110,231,183,0.6)",
    fontSize: 13,
    marginBottom: spacing.lg,
  },
  joinInput: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
  },
  joinBtn: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    alignItems: "center",
  },
  joinBtnDisabled: {
    backgroundColor: colors.gray600,
  },
  joinBtnText: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: "700",
  },
  joinMessage: {
    color: colors.textWhite,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  joinBackBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: borderRadius.lg,
  },
  joinBackText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: "500",
  },
  gameContainer: {
    flex: 1,
    backgroundColor: colors.bgGradientTo,
  },
  statusPad: {
    paddingHorizontal: spacing.sm,
    paddingTop: 4,
  },
  errorToast: {
    marginHorizontal: spacing.md,
    marginBottom: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: "#ef4444",
    borderRadius: borderRadius.md,
    alignItems: "center",
  },
  errorToastText: {
    color: colors.textWhite,
    fontSize: 13,
    fontWeight: "500",
  },
  boardWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  reconnectOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 50,
  },
  reconnectCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: "rgba(17,24,39,0.9)",
    borderRadius: borderRadius.lg,
  },
  reconnectText: {
    color: colors.textWhite,
    fontSize: 14,
    fontWeight: "600",
  },
});
