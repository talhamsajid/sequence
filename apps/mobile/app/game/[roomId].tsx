import { useEffect, useState, useCallback, useRef, useMemo } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  isTwoEyedJack,
  getMaxPlayers,
  switchPlayerTeam,
  getPlayerTeamColor,
} from "@sequence/game-logic";
import { getPlayerId, getPlayerName, setPlayerName } from "../../src/lib/storage";
import {
  playChipSound,
  yourTurnSound,
  removeChipSound,
  sequenceSound,
  winSound,
  timerTickSound,
  jackRemoveSound,
  jackWildSound,
  isSoundEnabled,
  setSoundEnabled,
} from "../../src/lib/sounds";
import { GameBoard } from "../../src/components/GameBoard";
import { PlayerHand } from "../../src/components/PlayerHand";
import { GameStatus } from "../../src/components/GameStatus";
import { Lobby } from "../../src/components/Lobby";
import { WinOverlay } from "../../src/components/WinOverlay";
import { ZoomableBoard } from "../../src/components/ZoomableBoard";
import { Chat } from "../../src/components/Chat";
import { JackAnimation } from "../../src/components/JackAnimation";
import { ReconnectOverlay } from "../../src/components/ReconnectOverlay";
import {
  ToastContainer,
  type ToastData,
} from "../../src/components/PlayerToast";
import { colors, spacing, borderRadius } from "../../src/constants/theme";

// ---------------------------------------------------------------------------
// Board flip persistence
// ---------------------------------------------------------------------------

const FLIP_STORAGE_KEY = "sequence_board_flipped";

/**
 * Execute an auto-play move for `targetPlayerId`.
 * Finds a random valid move and plays it, or skips the turn.
 * Returns true if an action was taken.
 */
async function executeAutoPlay(
  currentState: GameState,
  targetPlayerId: string,
  roomId: string,
): Promise<boolean> {
  if (currentState.phase !== "playing") return false;

  const move = getRandomValidMove(currentState, targetPlayerId);
  if (move) {
    try {
      const newState = playCard(
        currentState,
        targetPlayerId,
        move.cardIndex,
        move.row,
        move.col,
      );
      await setRoom(roomId, newState);
      return true;
    } catch {
      return false;
    }
  }

  // No valid move — skip turn
  try {
    const nextTurn =
      (currentState.currentTurn + 1) % currentState.playerOrder.length;
    await setRoom(roomId, {
      ...currentState,
      currentTurn: nextTurn,
      turnStartedAt: Date.now(),
      lastActivity: Date.now(),
    });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default function GamePage() {
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [playerId] = useState(() => getPlayerId());
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [boardFlipped, setBoardFlipped] = useState(false);
  const [connectedPlayers, setConnectedPlayers] = useState<Set<string>>(
    () => new Set()
  );
  const [nameInput, setNameInput] = useState("");
  const [roomChecked, setRoomChecked] = useState(false);
  const [jackAnimation, setJackAnimation] = useState<{
    card: string;
    type: "one-eyed" | "two-eyed";
  } | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isConnected, setIsConnected] = useState(true);

  // Track previous values for change detection
  const prevTurnRef = useRef<number | null>(null);
  const prevSeqCountRef = useRef<number>(0);
  const prevPhaseRef = useRef<string | null>(null);
  const prevLastMoveRef = useRef<GameState["lastMove"]>(null);
  const prevPlayersRef = useRef<
    Record<string, { name: string; color: string; connected: boolean }>
  >({});

  // Refs
  const autoPlayingRef = useRef(false);
  const stateRef = useRef<GameState | null>(null);
  stateRef.current = state;
  const presenceCleanupRef = useRef<(() => void) | null>(null);
  const joiningRef = useRef(false);
  joiningRef.current = joining;
  const connectedPlayersRef = useRef(connectedPlayers);
  connectedPlayersRef.current = connectedPlayers;

  // Load board flip preference from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(FLIP_STORAGE_KEY)
      .then((val) => {
        if (val === "true") setBoardFlipped(true);
      })
      .catch(() => {});
  }, []);

  // Subscribe to game state
  useEffect(() => {
    if (!roomId) return;
    const unsubscribe = subscribeToRoom(roomId, (gameState) => {
      setState(gameState);
      setRoomChecked(true);

      // Auto-join: player not in game, lobby phase
      if (
        gameState &&
        !joiningRef.current &&
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
  }, [roomId, playerId]);

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

  // -----------------------------------------------------------------------
  // Sound effects on state changes
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!state || state.phase === "waiting") return;

    // Turn change — play your-turn sound
    if (
      prevTurnRef.current !== null &&
      prevTurnRef.current !== state.currentTurn &&
      state.playerOrder[state.currentTurn] === playerId &&
      state.phase === "playing"
    ) {
      yourTurnSound();
    }

    // New sequence detected
    const currentSeqCount = state.sequences.length;
    if (
      prevSeqCountRef.current > 0 &&
      currentSeqCount > prevSeqCountRef.current
    ) {
      sequenceSound();
    }

    // Game finished
    if (prevPhaseRef.current === "playing" && state.phase === "finished") {
      winSound();
    }

    prevTurnRef.current = state.currentTurn;
    prevSeqCountRef.current = state.sequences.length;
    prevPhaseRef.current = state.phase;
  }, [state, playerId]);

  // -----------------------------------------------------------------------
  // Jack animation detection
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!state || !state.lastMove) return;
    const prev = prevLastMoveRef.current;
    const curr = state.lastMove;
    if (
      prev &&
      prev.row === curr.row &&
      prev.col === curr.col &&
      prev.card === curr.card &&
      prev.playerId === curr.playerId
    ) {
      prevLastMoveRef.current = curr;
      return;
    }
    prevLastMoveRef.current = curr;

    const { card } = curr;
    if (isOneEyedJack(card)) {
      setJackAnimation({ card, type: "one-eyed" });
      jackRemoveSound();
    } else if (isTwoEyedJack(card)) {
      setJackAnimation({ card, type: "two-eyed" });
      jackWildSound();
    }
  }, [state?.lastMove]);

  // -----------------------------------------------------------------------
  // Player join/leave/disconnect detection — toast notifications
  // -----------------------------------------------------------------------
  const addToast = useCallback(
    (message: string, playerColor?: string, icon?: string) => {
      const id = `toast_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      setToasts((prev) => [
        ...prev,
        { id, message, playerColor, icon: icon ?? "\u2139\uFE0F" },
      ]);
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!state) return;

    const currentPlayers = state.players;
    const prev = prevPlayersRef.current;

    // Detect leaves
    for (const [pid, prevPlayer] of Object.entries(prev)) {
      if (!currentPlayers[pid]) {
        addToast(
          `${prevPlayer.name} left the game`,
          prevPlayer.color,
          "\u{1F44B}"
        );
      } else if (prevPlayer.connected && !currentPlayers[pid].connected) {
        addToast(
          `${prevPlayer.name} disconnected`,
          prevPlayer.color,
          "\u26A1"
        );
      }
    }

    // Detect joins (skip self)
    for (const [pid, p] of Object.entries(currentPlayers)) {
      if (!prev[pid] && pid !== playerId) {
        addToast(
          `${p.name} joined the game`,
          p.color,
          "\u{1F44B}"
        );
      } else if (
        prev[pid] &&
        !prev[pid].connected &&
        p.connected &&
        pid !== playerId
      ) {
        addToast(
          `${p.name} reconnected`,
          p.color,
          "\u{1F50C}"
        );
      }
    }

    // Update ref
    prevPlayersRef.current = Object.fromEntries(
      Object.entries(currentPlayers).map(([pid, p]) => [
        pid,
        { name: p.name, color: p.color, connected: p.connected },
      ])
    );
  }, [state?.players, playerId, addToast]);

  // -----------------------------------------------------------------------
  // Firebase connection state monitoring
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Turn timer auto-play
  // -----------------------------------------------------------------------
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
        if (currentState) {
          await executeAutoPlay(currentState, playerId, roomId);
          setSelectedCard(null);
        }
        autoPlayingRef.current = false;
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isMyTurn, turnStartedAt, turnTimeLimit, playerId, roomId]);

  // -----------------------------------------------------------------------
  // Auto-play for disconnected players (host only)
  // -----------------------------------------------------------------------
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

      await executeAutoPlay(currentState, pid, roomId);
      autoPlayingRef.current = false;
    }, 15000);

    return () => clearTimeout(timeout);
  }, [state, playerId, roomId, connectedPlayers]);

  // -----------------------------------------------------------------------
  // Tick-tock countdown sound when <=15 seconds remain
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!isMyTurn || turnStartedAt === null || state?.phase !== "playing")
      return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000);
      const remaining = turnTimeLimit - elapsed;

      if (remaining > 0 && remaining <= 15) {
        timerTickSound(remaining % 2 === 0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isMyTurn, turnStartedAt, turnTimeLimit, state?.phase]);

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------

  const selectedCardRef = useRef<number | null>(null);
  selectedCardRef.current = selectedCard;

  const handleCellClick = useCallback(
    async (row: number, col: number) => {
      const currentState = stateRef.current;
      const currentSelectedCard = selectedCardRef.current;
      if (!currentState || currentSelectedCard === null || !roomId) return;

      const player = currentState.players[playerId];
      const card = player?.hand?.[currentSelectedCard];

      try {
        const newState = playCard(currentState, playerId, currentSelectedCard, row, col);

        // Play appropriate sound
        if (card && isOneEyedJack(card)) {
          removeChipSound();
        } else {
          playChipSound();
        }

        await setRoom(roomId, newState);
        setSelectedCard(null);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid move");
        setTimeout(() => setError(null), 2000);
      }
    },
    [playerId, roomId]
  );

  const handleStart = useCallback(async () => {
    if (!state || !roomId) return;
    try {
      const started = startGame(state);
      await setRoom(roomId, started);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot start game");
    }
  }, [state, roomId]);

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

  const handlePlayAgain = useCallback(async () => {
    if (!state || !roomId) return;
    const started = startGame(state);
    await setRoom(roomId, started);
    setSelectedCard(null);
  }, [state, roomId]);

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

  const handleToggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }, [soundOn]);

  const handleToggleFlip = useCallback(() => {
    const next = !boardFlipped;
    setBoardFlipped(next);
    AsyncStorage.setItem(FLIP_STORAGE_KEY, String(next)).catch(() => {});
  }, [boardFlipped]);

  // -----------------------------------------------------------------------
  // Derived values — ALL hooks must be above early returns (Rules of Hooks)
  // -----------------------------------------------------------------------
  const player = state?.players[playerId];
  const hand = player?.hand ?? [];

  const validCardIndices = useMemo(() => {
    if (!state) return new Set<number>();
    const indices = new Set<number>();
    hand.forEach((card, i) => {
      if (getValidPositions(state, card).length > 0) {
        indices.add(i);
      }
    });
    return indices;
  }, [state?.chips, state?.sequences, hand, state?.currentTurn]);

  // -----------------------------------------------------------------------
  // Render: Loading
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Render: Not in game (name entry)
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Render: Lobby
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Render: Game in progress
  // -----------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.gameContainer} edges={["top"]}>
      {/* Status bar */}
      <View style={styles.statusPad}>
        <GameStatus
          state={state}
          playerId={playerId}
          connectedPlayers={connectedPlayers}
          onLeave={handleLeave}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
          boardFlipped={boardFlipped}
          onToggleFlip={handleToggleFlip}
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
            boardFlipped={boardFlipped}
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

      {/* Jack card animation */}
      <JackAnimation
        card={jackAnimation?.card ?? null}
        type={jackAnimation?.type ?? null}
        onComplete={() => setJackAnimation(null)}
      />

      {/* Win overlay */}
      <WinOverlay
        state={state}
        playerId={playerId}
        onPlayAgain={handlePlayAgain}
        onLeave={handleLeave}
      />

      {/* Chat — visible during playing and finished phases */}
      {(state.phase === "playing" || state.phase === "finished") &&
        player && (
          <Chat
            roomId={roomId!}
            playerId={playerId}
            playerName={player.name}
            playerColor={player.color}
          />
        )}

      {/* Player event toasts (join/leave/disconnect) */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Reconnection overlay */}
      <ReconnectOverlay isConnected={isConnected} onLeave={handleLeave} />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

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
});
