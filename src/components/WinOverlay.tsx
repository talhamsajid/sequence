"use client";

import type { GameState } from "@/lib/game";
import { getPlayerTeam } from "@/lib/teams";

interface WinOverlayProps {
  state: GameState;
  playerId: string;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export function WinOverlay({ state, playerId, onPlayAgain, onLeave }: WinOverlayProps) {
  if (state.phase !== "finished" || !state.winner) return null;

  const isTeams = state.mode === "teams" && state.teams;

  let isWinner = false;
  let displayName = state.winnerLabel ?? "Unknown";

  if (isTeams && state.teams) {
    // In team mode, winner is a team ID
    const playerTeam = getPlayerTeam(state.teams, playerId);
    isWinner = playerTeam?.teamId === state.winner;
  } else {
    // Solo mode, winner is a player ID
    isWinner = state.winner === playerId;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 mx-4 text-center max-w-sm w-full">
        <div className="text-5xl mb-4">{isWinner ? "\uD83C\uDFC6" : "\uD83D\uDE14"}</div>
        <h2 className="text-2xl font-bold mb-2">
          {isWinner
            ? (isTeams ? "Your Team Won!" : "You Won!")
            : `${displayName} Wins!`}
        </h2>
        <p className="text-gray-500 mb-6">
          {isWinner
            ? "Congratulations on your victory!"
            : "Better luck next time!"}
        </p>
        <div className="flex gap-3 justify-center">
          {state.hostId === playerId && (
            <button
              onClick={onPlayAgain}
              className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 active:scale-95 transition-all"
            >
              Play Again
            </button>
          )}
          <button
            onClick={onLeave}
            className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 active:scale-95 transition-all"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
