"use client";

import { useEffect, useState, useCallback, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { subscribeToRoom, setRoom, deleteRoom } from "@/lib/firebase";
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
import { isOneEyedJack } from "@/lib/board";
import { getPlayerId, getPlayerName } from "@/lib/utils";
import { getMaxPlayers, getPlayerTeam, countTeamSequences, switchPlayerTeam, getPlayerTeamColor } from "@/lib/teams";
import type { PlayerColor } from "@/lib/game";
import {
  playChipSound,
  yourTurnSound,
  removeChipSound,
  sequenceSound,
  winSound,
  timerTickSound,
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

  // Track previous values for change detection
  const prevTurnRef = useRef<number | null>(null);
  const prevSeqCountRef = useRef<number>(0);
  const prevPhaseRef = useRef<string | null>(null);

  // Subscribe to game state
  useEffect(() => {
    const unsubscribe = subscribeToRoom(roomId, (gameState) => {
      setState(gameState);

      // Auto-join if not in game
      if (gameState && !gameState.players[playerId] && gameState.phase === "waiting" && !joining) {
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
            let newState = playCard(currentState, playerId, move.cardIndex, move.row, move.col);

            const nextPlayerId = newState.playerOrder[newState.currentTurn];
            if (newState.phase === "playing" && !hasPlayableCard(newState, nextPlayerId)) {
              newState = replaceDeadCards(newState, nextPlayerId);
            }

            await setRoom(roomId, newState);
            setSelectedCard(null);
          } catch {
            // Move failed — state may have changed; next tick will re-evaluate
          }
        }
        autoPlayingRef.current = false;
      }
    }, 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isMyTurn, turnStartedAt, turnTimeLimit, playerId, roomId]);

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

  // Handle cell click
  const handleCellClick = useCallback(
    async (row: number, col: number) => {
      if (!state || selectedCard === null) return;

      const player = state.players[playerId];
      const card = player?.hand?.[selectedCard];

      try {
        let newState = playCard(state, playerId, selectedCard, row, col);

        // Play appropriate sound
        if (card && isOneEyedJack(card)) {
          removeChipSound();
        } else {
          playChipSound();
        }

        // Check for dead cards for next player
        const nextPlayerId = newState.playerOrder[newState.currentTurn];
        if (newState.phase === "playing" && !hasPlayableCard(newState, nextPlayerId)) {
          newState = replaceDeadCards(newState, nextPlayerId);
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

  // Update sequences needed (host only, in lobby)
  const handleUpdateSequencesNeeded = useCallback(async (n: number) => {
    if (!state || state.hostId !== playerId) return;
    await setRoom(roomId, { ...state, sequencesNeeded: n });
  }, [state, playerId, roomId]);

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
    if (state) {
      const updated = removePlayer(state, playerId);
      if (updated === null) {
        // No players left — delete the room
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
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-emerald-900 to-emerald-950">
        <div className="text-white text-center p-6">
          <p className="text-lg mb-4">
            {Object.keys(state.players).length >= notInGameMaxPlayers
              ? "This game is full."
              : state.phase !== "waiting"
              ? "This game has already started."
              : "Joining..."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="px-6 py-3 bg-white/10 rounded-xl text-white font-medium hover:bg-white/20 transition-all"
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
        onUpdateSequencesNeeded={handleUpdateSequencesNeeded}
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
    <div className="min-h-dvh flex flex-col bg-gradient-to-b from-emerald-900 to-emerald-950">
      {/* Status bar */}
      <div className="p-2 sm:p-3">
        <GameStatus
          state={state}
          playerId={playerId}
          soundOn={soundOn}
          onToggleSound={handleToggleSound}
          onLeave={handleLeave}
        />
      </div>

      {/* Error toast */}
      {error && (
        <div className="mx-4 mb-2 px-4 py-2 bg-red-500 text-white text-sm rounded-lg text-center animate-bounce">
          {error}
        </div>
      )}

      {/* Board flip toggle */}
      <div className="flex justify-center mb-1">
        <button
          onClick={handleToggleFlip}
          className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-300/70 hover:text-emerald-200 transition-colors rounded"
          title={boardFlipped ? "Reset board orientation" : "Flip board 180\u00b0"}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transform: boardFlipped ? "rotate(180deg)" : "none",
              transition: "transform 0.3s",
            }}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            <polyline points="21 3 21 9 15 9" />
          </svg>
          <span>{boardFlipped ? "Reset" : "Flip"}</span>
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 flex items-center justify-center px-1 sm:px-4">
        <GameBoard
          state={state}
          selectedCardIndex={selectedCard}
          playerId={playerId}
          onCellClick={handleCellClick}
          boardFlipped={boardFlipped}
        />
      </div>

      {/* Sequence count */}
      <div className="text-center py-1">
        <span className="text-xs text-emerald-300/70">
          Sequences: {(() => {
            if (state.mode === "teams" && state.teams) {
              const teamInfo = getPlayerTeam(state.teams, playerId);
              return teamInfo ? countTeamSequences(state.sequences, teamInfo.team.color) : 0;
            }
            return state.sequences.filter((s) => s.color === player?.color).length;
          })()} / {state.sequencesNeeded}
        </span>
      </div>

      {/* Hand */}
      <div className="bg-white/10 backdrop-blur-sm border-t border-white/10">
        <PlayerHand
          hand={hand}
          selectedIndex={selectedCard}
          onSelect={setSelectedCard}
          isMyTurn={isMyTurn}
          validCards={validCardIndices}
        />
      </div>

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
    </div>
  );
}
