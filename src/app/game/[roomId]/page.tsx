"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { subscribeToRoom, setRoom } from "@/lib/firebase";
import {
  type GameState,
  playCard,
  startGame,
  addPlayer,
  getValidPositions,
  hasPlayableCard,
  replaceDeadCards,
} from "@/lib/game";
import { getPlayerId, getPlayerName } from "@/lib/utils";
import { GameBoard } from "@/components/GameBoard";
import { PlayerHand } from "@/components/PlayerHand";
import { GameStatus } from "@/components/GameStatus";
import { Lobby } from "@/components/Lobby";
import { WinOverlay } from "@/components/WinOverlay";

export default function GamePage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  const [state, setState] = useState<GameState | null>(null);
  const [selectedCard, setSelectedCard] = useState<number | null>(null);
  const [playerId] = useState(() => getPlayerId());
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  // Subscribe to game state
  useEffect(() => {
    const unsubscribe = subscribeToRoom(roomId, (gameState) => {
      setState(gameState);

      // Auto-join if not in game
      if (gameState && !gameState.players[playerId] && gameState.phase === "waiting" && !joining) {
        const name = getPlayerName();
        if (name && Object.keys(gameState.players).length < 3) {
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

  // Handle cell click
  const handleCellClick = useCallback(
    async (row: number, col: number) => {
      if (!state || selectedCard === null) return;

      try {
        let newState = playCard(state, playerId, selectedCard, row, col);

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

  // Play again
  const handlePlayAgain = useCallback(async () => {
    if (!state) return;
    const started = startGame(state);
    await setRoom(roomId, started);
    setSelectedCard(null);
  }, [state, roomId]);

  // Leave game
  const handleLeave = useCallback(() => {
    router.push("/");
  }, [router]);

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
    return (
      <div className="min-h-dvh flex items-center justify-center bg-gradient-to-b from-emerald-900 to-emerald-950">
        <div className="text-white text-center p-6">
          <p className="text-lg mb-4">
            {Object.keys(state.players).length >= 3
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
        roomCode={roomId}
      />
    );
  }

  // Game
  const player = state.players[playerId];
  const isMyTurn = state.playerOrder[state.currentTurn] === playerId;
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
        <GameStatus state={state} playerId={playerId} />
      </div>

      {/* Error toast */}
      {error && (
        <div className="mx-4 mb-2 px-4 py-2 bg-red-500 text-white text-sm rounded-lg text-center animate-bounce">
          {error}
        </div>
      )}

      {/* Board */}
      <div className="flex-1 flex items-center justify-center px-1 sm:px-4">
        <GameBoard
          state={state}
          selectedCardIndex={selectedCard}
          playerId={playerId}
          onCellClick={handleCellClick}
        />
      </div>

      {/* Sequence count */}
      <div className="text-center py-1">
        <span className="text-xs text-emerald-300/70">
          Sequences: {state.sequences.filter((s) => s.color === player?.color).length} / {state.sequencesNeeded}
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
    </div>
  );
}
