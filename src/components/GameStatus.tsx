"use client";

import type { GameState, PlayerColor } from "@/lib/game";
import { cn } from "@/lib/utils";

interface GameStatusProps {
  state: GameState;
  playerId: string;
}

const colorDot: Record<PlayerColor, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
};

const colorText: Record<PlayerColor, string> = {
  red: "text-red-600",
  blue: "text-blue-600",
  green: "text-green-600",
};

export function GameStatus({ state, playerId }: GameStatusProps) {
  const currentPlayerId = state.playerOrder[state.currentTurn];
  const isMyTurn = currentPlayerId === playerId;
  const currentPlayer = state.players[currentPlayerId];

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-white/90 backdrop-blur rounded-lg shadow-sm">
      {/* Players */}
      <div className="flex gap-3">
        {state.playerOrder.map((pid) => {
          const p = state.players[pid];
          if (!p) return null;
          const isCurrent = pid === currentPlayerId;
          return (
            <div
              key={pid}
              className={cn(
                "flex items-center gap-1.5 text-xs sm:text-sm font-medium px-2 py-1 rounded-full transition-all",
                isCurrent && "bg-gray-100 ring-2 ring-gray-300"
              )}
            >
              <div className={cn("w-2.5 h-2.5 rounded-full", colorDot[p.color])} />
              <span className={cn(colorText[p.color])}>
                {pid === playerId ? "You" : p.name}
              </span>
            </div>
          );
        })}
      </div>

      {/* Turn indicator */}
      <div className="text-xs sm:text-sm font-semibold">
        {state.phase === "finished" ? (
          <span className="text-amber-600">
            {state.winner === playerId ? "You won!" : `${state.players[state.winner!]?.name} wins!`}
          </span>
        ) : isMyTurn ? (
          <span className="text-emerald-600 animate-pulse">Your turn</span>
        ) : (
          <span className="text-gray-500">{currentPlayer?.name}&apos;s turn</span>
        )}
      </div>
    </div>
  );
}
