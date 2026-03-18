"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { subscribeToRoom, setRoom, deleteRoom, registerPresence, clearPresence, subscribeToPresence, subscribeToConnectionState } from "@/lib/firebase";
import {
  type GameState,
  playCard,
  startGame,
  addPlayer,
  removePlayer,
  getValidPositions,
  hasPlayableCard,
  replaceDeadCards,
  getRandomValidMove,
} from "@/lib/game";
import { isOneEyedJack, isTwoEyedJack } from "@/lib/board";
import { preloadCardImages } from "@/lib/cards";
import { getPlayerId, getPlayerName, setPlayerName } from "@/lib/utils";
import { getMaxPlayers, switchPlayerTeam, getPlayerTeamColor } from "@/lib/teams";
import type { PlayerColor } from "@/lib/game";
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
} from "@/lib/sounds";
import { GameBoard } from "@/components/GameBoard";
import { PlayerHand } from "@/components/PlayerHand";
import { GameStatus } from "@/components/GameStatus";
import { Lobby } from "@/components/Lobby";
import { WinOverlay } from "@/components/WinOverlay";
import { Chat } from "@/components/Chat";
import { VoiceChat } from "@/components/VoiceChat";
import { JackAnimation } from "@/components/JackAnimation";
import { ToastContainer, type ToastData } from "@/components/PlayerToast";
import { ReconnectOverlay } from "@/components/ReconnectOverlay";

const FLIP_STORAGE_KEY = "sequence_board_flipped";

function getStoredFlip(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(FLIP_STORAGE_KEY) === "true";
}

export default function GamePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [playerId] = useState(() => getPlayerId());
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [boardFlipped, setBoardFlipped] = useState(() => getStoredFlip());
  const [connectedPlayers, setConnectedPlayers] = useState<Set<string>>(() => new Set());
  const [nameInput, setNameInput] = useState("");
  const [roomChecked, setRoomChecked] = useState(false);
  const [jackAnimation, setJackAnimation] = useState<{ card: string; type: "one-eyed" | "two-eyed" } | null>(null);
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const [isConnected, setIsConnected] = useState(true);

  // Track previous values for change detection
  const prevTurnRef = useRef<number | null>(null);
  const prevSeqCountRef = useRef<number>(0);
  const prevPhaseRef = useRef<string | null>(null);
  const prevLastMoveRef = useRef<GameState["lastMove"]>(null);
  const prevPlayersRef = useRef<Record<string, { name: string; color: string; connected: boolean }>>({});

  // Preload all card images into browser cache on mount
  useEffect(() => { preloadCardImages(); }, []);

  // Subscribe to game state
  useEffect(() => {
    const unsubscribe = subscribeToRoom(roomId, (gameState) => {
      setState(gameState);
      setRoomChecked(true);

      // Auto-join: player not in game, lobby phase
      if (gameState && !joining && !gameState.players[playerId] && gameState.phase === "waiting") {
        const name = getPlayerName();
        const teamCount = gameState.teams ? Object.keys(gameState.teams).length : 0;
        const maxPlayers = getMaxPlayers(gameState.mode, teamCount);
        if (name && Object.keys(gameState.players).length < maxPlayers) {
          setJoining(true);
          try {
            const updated = addPlayer(gameState, playerId, name);
            setRoom(roomId, updated).finally(() => setJoining(false));
          } catch {
            setJoining(false);
          }
        }
      }
    });

    return unsubscribe;
  }, [roomId, playerId, joining]);

  // Subscribe to presence (separate from game state — not affected by setRoom)
  useEffect(() => {
    const unsubscribe = subscribeToPresence(roomId, setConnectedPlayers);
    return unsubscribe;
  }, [roomId]);

  // Presence: register onDisconnect so Firebase marks player disconnected on tab/app close
  const presenceCleanupRef = useRef<(() => void) | null>(null);
  const isInGame = !!state?.players[playerId];

  useEffect(() => {
    if (!isInGame) return;

    presenceCleanupRef.current = registerPresence(roomId, playerId);

    return () => {
      presenceCleanupRef.current?.();
      presenceCleanupRef.current = null;
    };
  }, [roomId, playerId, isInGame]);

  // Sound effects on state changes
  useEffect(() => {
    if (!state || state.phase === "waiting") return;

    // Turn change — play your-turn chime
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
    if (prevSeqCountRef.current > 0 && currentSeqCount > prevSeqCountRef.current) {
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

  // Turn timer: auto-play a random valid move when time expires (only active player's client)
  const autoPlayingRef = useRef(false);
  const stateRef = useRef<GameState | null>(null);
  stateRef.current = state;

  const turnStartedAt = state?.turnStartedAt ?? null;
  const turnTimeLimit = state?.turnTimeLimit ?? 60;
  const currentTurnPlayerId = state?.phase === "playing" ? state.playerOrder[state.currentTurn] : null;
  const isMyTurn = currentTurnPlayerId === playerId;

  useEffect(() => {
    if (!isMyTurn || turnStartedAt === null) return;

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
            const newState = playCard(currentState, playerId, move.cardIndex, move.row, move.col);
            await setRoom(roomId, newState);
            setSelectedCard(null);
          } catch {
            // Move failed — state may have changed; next tick will re-evaluate
          }
        } else {
          // No valid move — skip turn by advancing to next player
          // playCard's skip logic handles this, but we need a manual advance here
          try {
            const nextTurn = (currentState.currentTurn + 1) % currentState.playerOrder.length;
            await setRoom(roomId, {
              ...currentState,
              currentTurn: nextTurn,
              turnStartedAt: Date.now(),
              lastActivity: Date.now(),
            });
            setSelectedCard(null);
          } catch {
            // State may have changed
          }
        }
        autoPlayingRef.current = false;
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isMyTurn, turnStartedAt, turnTimeLimit, playerId, roomId]);

  // Auto-play for disconnected players instantly (host's client handles this)
  // Uses presence data (separate from game state) to detect disconnection
  const connectedPlayersRef = useRef(connectedPlayers);
  connectedPlayersRef.current = connectedPlayers;

  useEffect(() => {
    if (!state || state.phase !== "playing" || state.hostId !== playerId) return;

    const currentTurnPlayerId2 = state.playerOrder[state.currentTurn];
    // Skip if: no player, player is connected, player is the host (we're running this check),
    // or presence data is empty (hasn't loaded yet — avoid false positives at game start)
    if (
      !currentTurnPlayerId2 ||
      currentTurnPlayerId2 === playerId ||
      connectedPlayers.has(currentTurnPlayerId2) ||
      connectedPlayers.size === 0
    ) return;

    // Disconnected player's turn — wait 15s for reconnection attempts before auto-playing
    if (autoPlayingRef.current) return;

    const timeout = setTimeout(async () => {
      if (autoPlayingRef.current) return;
      autoPlayingRef.current = true;

      const currentState = stateRef.current;
      if (!currentState || currentState.phase !== "playing") {
        autoPlayingRef.current = false;
        return;
      }

      const dcPlayerId = currentState.playerOrder[currentState.currentTurn];
      if (
        !dcPlayerId ||
        dcPlayerId === playerId ||
        connectedPlayersRef.current.has(dcPlayerId) ||
        connectedPlayersRef.current.size === 0
      ) {
        autoPlayingRef.current = false;
        return;
      }

      const move = getRandomValidMove(currentState, dcPlayerId);
      if (move) {
        try {
          const newState = playCard(currentState, dcPlayerId, move.cardIndex, move.row, move.col);
          await setRoom(roomId, newState);
        } catch {
          // State may have changed
        }
      } else {
        // No valid move — skip turn
        try {
          const nextTurn = (currentState.currentTurn + 1) % currentState.playerOrder.length;
          await setRoom(roomId, {
            ...currentState,
            currentTurn: nextTurn,
            turnStartedAt: Date.now(),
            lastActivity: Date.now(),
          });
        } catch {
          // State may have changed
        }
      }
      autoPlayingRef.current = false;
    }, 15000);

    return () => clearTimeout(timeout);
  }, [state, playerId, roomId, connectedPlayers]);

  // Tick-tock countdown sound when <=15 seconds remain (current player's turn only)
  useEffect(() => {
    if (!isMyTurn || turnStartedAt === null || state?.phase !== "playing") return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000);
      const remaining = turnTimeLimit - elapsed;

      if (remaining > 0 && remaining <= 15) {
        timerTickSound(remaining % 2 === 0);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isMyTurn, turnStartedAt, turnTimeLimit, state?.phase]);

  // Jack animation detection — all players see the animation when a Jack is played
  useEffect(() => {
    if (!state || !state.lastMove) return;
    // Only trigger when lastMove actually changes (different row/col/card)
    const prev = prevLastMoveRef.current;
    const curr = state.lastMove;
    if (prev && prev.row === curr.row && prev.col === curr.col && prev.card === curr.card && prev.playerId === curr.playerId) {
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

  // Player join/leave/disconnect detection — toast notifications
  const addToast = useCallback((message: string, playerColor?: string, icon?: string) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, playerColor, icon: icon ?? "ℹ️" }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!state) return;

    const currentPlayers = state.players;
    const prev = prevPlayersRef.current;

    // Detect leaves (player was in prev but not in current)
    for (const [pid, prevPlayer] of Object.entries(prev)) {
      if (!currentPlayers[pid]) {
        addToast(`${prevPlayer.name} left the game`, prevPlayer.color, "👋");
      } else if (prevPlayer.connected && !currentPlayers[pid].connected) {
        addToast(`${prevPlayer.name} disconnected`, prevPlayer.color, "⚡");
      }
    }

    // Detect joins (skip self)
    for (const [pid, p] of Object.entries(currentPlayers)) {
      if (!prev[pid] && pid !== playerId) {
        addToast(`${p.name} joined the game`, p.color, "👋");
      } else if (prev[pid] && !prev[pid].connected && p.connected && pid !== playerId) {
        addToast(`${p.name} reconnected`, p.color, "🔌");
      }
    }

    // Update ref
    prevPlayersRef.current = Object.fromEntries(
      Object.entries(currentPlayers).map(([pid, p]) => [pid, { name: p.name, color: p.color, connected: p.connected }])
    );
  }, [state?.players, playerId, addToast]);

  // Firebase connection state monitoring
  useEffect(() => {
    if (!isInGame) return;
    const unsubscribe = subscribeToConnectionState((connected) => {
      setIsConnected(connected);
      if (connected) {
        // Re-register presence on reconnect
        presenceCleanupRef.current?.();
        presenceCleanupRef.current = registerPresence(roomId, playerId);
      }
    });
    return unsubscribe;
  }, [isInGame, roomId, playerId]);

  // Handle cell click
  const handleCellClick = useCallback(
    async (row: number, col: number) => {
      if (!state || selectedCard === null) return;

      const player = state.players[playerId];
      const card = player?.hand?.[selectedCard];

      try {
        const newState = playCard(state, playerId, selectedCard, row, col);

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
    [state, selectedCard, playerId, roomId]
  );

  // Start game
  const handleStart = useCallback(async () => {
    if (!state) return;
    try {
      const started = startGame(state);
      await setRoom(roomId, started);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cannot start game");
    }
  }, [state, roomId]);

  // Switch team (lobby only, teams mode)
  const handleSwitchTeam = useCallback(async (targetTeamId: string) => {
    if (!state || state.mode !== "teams" || !state.teams) return;
    const newTeams = switchPlayerTeam(state.teams, playerId, targetTeamId);
    if (!newTeams) return;

    const newColor = getPlayerTeamColor(newTeams, playerId) ?? state.players[playerId].color;
    await setRoom(roomId, {
      ...state,
      teams: newTeams,
      players: {
        ...state.players,
        [playerId]: { ...state.players[playerId], color: newColor },
      },
    });
  }, [state, playerId, roomId]);

  // Change chip color (lobby only, solo mode)
  const handleChangeColor = useCallback(async (color: PlayerColor) => {
    if (!state || state.phase !== "waiting") return;
    // Check no other player already has this color
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
  }, [state, playerId, roomId]);

  // Play again
  const handlePlayAgain = useCallback(async () => {
    if (!state) return;
    const started = startGame(state);
    await setRoom(roomId, started);
    setSelectedCard(null);
  }, [state, roomId]);

  // Leave game — remove player from state, then navigate home
  const handleLeave = useCallback(async () => {
    // Cancel onDisconnect handler and clear presence
    presenceCleanupRef.current?.();
    presenceCleanupRef.current = null;
    clearPresence(roomId, playerId);

    if (state) {
      const updated = removePlayer(state, playerId);
      if (updated === null) {
        await deleteRoom(roomId).catch(() => {});
      } else {
        await setRoom(roomId, updated).catch(() => {});
      }
    }
    router.push("/");
  }, [state, playerId, roomId, router]);

  // Toggle sound
  const handleToggleSound = useCallback(() => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  }, [soundOn]);

  // Toggle board flip
  const handleToggleFlip = useCallback(() => {
    const next = !boardFlipped;
    setBoardFlipped(next);
    localStorage.setItem(FLIP_STORAGE_KEY, String(next));
  }, [boardFlipped]);

  if (!state) {
    // Room confirmed missing — redirect home
    if (roomChecked) {
      router.replace("/");
      return null;
    }

    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-emerald-900 to-emerald-950">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white/30 border-t-white rounded-full mx-auto mb-3" />
          <p className="text-emerald-200">Loading game...</p>
        </div>
      </div>
    );
  }

  // Not in game
  if (!state.players[playerId]) {
    const notInGameTeamCount = state.teams ? Object.keys(state.teams).length : 0;
    const notInGameMaxPlayers = getMaxPlayers(state.mode, notInGameTeamCount);
    const isFull = Object.keys(state.players).length >= notInGameMaxPlayers;
    const canJoin = state.phase === "waiting" && !isFull;
    const needsName = canJoin && !getPlayerName();

    const handleNameJoin = async () => {
      if (!nameInput.trim() || !state) return;
      setPlayerName(nameInput.trim());
      setJoining(true);
      try {
        const updated = addPlayer(state, playerId, nameInput.trim());
        await setRoom(roomId, updated);
      } catch {
        // Will retry on next state update
      }
      setJoining(false);
    };

    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-emerald-900 to-emerald-950">
        <div className="text-white text-center p-6 w-full max-w-sm">
          {needsName ? (
            <>
              <h2 className="text-2xl font-bold mb-1">Join Game</h2>
              <p className="text-emerald-300/60 text-sm mb-6">Enter your name to join</p>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameJoin()}
                placeholder="Your name"
                maxLength={20}
                autoFocus
                className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-medium text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent mb-3"
              />
              <button
                onClick={handleNameJoin}
                disabled={!nameInput.trim() || joining}
                className="w-full py-3 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
              >
                {joining ? "Joining..." : "Join Game"}
              </button>
            </>
          ) : (
            <p className="text-lg mb-4">
              {isFull
                ? "This game is full."
                : state.phase !== "waiting"
                ? "This game has already started."
                : "Joining..."}
            </p>
          )}
          <button
            onClick={() => router.push("/")}
            className="mt-4 px-6 py-3 bg-white/10 rounded-xl text-white font-medium hover:bg-white/20 transition-all"
          >
            Back to Home
          </button>
        </div>
      </div>
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
        roomCode={roomId}
      />
    );
  }

  // Game
  const player = state.players[playerId];
  const hand = player?.hand ?? [];

  // Which cards in hand have valid moves
  const validCardIndices = new Set<number>();
  hand.forEach((card, i) => {
    if (getValidPositions(state, card).length > 0) {
      validCardIndices.add(i);
    }
  });

  return (
    <div className="h-dvh flex flex-col bg-gradient-to-b from-emerald-900 to-emerald-950 overflow-hidden" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      {/* Status bar */}
      <div className="px-1.5 pt-1 sm:p-3 shrink-0">
        <GameStatus
          state={state}
          playerId={playerId}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
          onLeave={handleLeave}
          boardFlipped={boardFlipped}
          onToggleFlip={handleToggleFlip}
          connectedPlayers={connectedPlayers}
        />
      </div>

      {/* Error toast */}
      {error && (
        <div className="mx-4 mb-1 px-4 py-2 bg-red-500 text-white text-sm rounded-lg text-center animate-bounce shrink-0">
          {error}
        </div>
      )}

      {/* Board */}
      <div className="flex-1 flex items-center justify-center px-0 sm:px-4 min-h-0">
        <GameBoard
          state={state}
          selectedCardIndex={selectedCard}
          playerId={playerId}
          onCellClick={handleCellClick}
          boardFlipped={boardFlipped}
        />
      </div>

      {/* Hand */}
      <div
        className={`backdrop-blur-sm border-t shrink-0 transition-all duration-500 ${
          isMyTurn
            ? "bg-white/15 border-emerald-400/50 shadow-[0_-4px_20px_rgba(52,211,153,0.15)]"
            : "bg-white/10 border-white/10"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {isMyTurn && (
          <div className="text-center pt-1.5 pb-0">
            <span className="text-[10px] sm:text-xs font-semibold text-emerald-400 tracking-wide uppercase animate-pulse">
              Your turn — pick a card
            </span>
          </div>
        )}
        <PlayerHand
          hand={hand}
          selectedIndex={selectedCard}
          onSelect={setSelectedCard}
          isMyTurn={isMyTurn}
          validCards={validCardIndices}
        />
      </div>

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

      {/* Chat - visible during playing and finished phases */}
      {(state.phase === "playing" || state.phase === "finished") && player && (
        <Chat
          roomId={roomId}
          playerId={playerId}
          playerName={player.name}
          playerColor={player.color}
        />
      )}

      {/* Voice chat - visible during playing and finished phases */}
      {(state.phase === "playing" || state.phase === "finished") && player && (
        <VoiceChat
          roomId={roomId}
          playerId={playerId}
          playerName={player.name}
          playerColor={player.color}
          players={state.players}
        />
      )}

      {/* Player event toasts (join/leave/disconnect) */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* Reconnection overlay */}
      <ReconnectOverlay isConnected={isConnected} onLeave={handleLeave} />
    </div>
  );
}
