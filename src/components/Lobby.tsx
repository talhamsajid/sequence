"use client";

import { useState } from "react";
import type { GameState, PlayerColor } from "@/lib/game";
import { cn } from "@/lib/utils";

interface LobbyProps {
  state: GameState;
  playerId: string;
  onStart: () => void;
  onLeave: () => void;
  roomCode: string;
}

const colorDot: Record<PlayerColor, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
};

export function Lobby({ state, playerId, onStart, onLeave, roomCode }: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const isHost = state.hostId === playerId;
  const playerCount = Object.keys(state.players).length;

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gradient-to-b from-emerald-900 to-emerald-950">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-center mb-1">Waiting for Players</h2>
        <p className="text-gray-400 text-center text-sm mb-5">
          {playerCount}/3 players joined
        </p>

        {/* Room Code */}
        <div className="bg-gray-50 rounded-xl p-4 mb-5 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Room Code</p>
          <button
            onClick={copyCode}
            className="text-3xl font-mono font-bold tracking-[0.3em] text-emerald-700 hover:text-emerald-800 transition-colors"
          >
            {roomCode}
          </button>
          <p className="text-xs text-gray-400 mt-1">
            {copied ? "Copied!" : "Tap to copy"}
          </p>
        </div>

        {/* Players list */}
        <div className="space-y-2 mb-5">
          {state.playerOrder.map((pid) => {
            const p = state.players[pid];
            if (!p) return null;
            return (
              <div
                key={pid}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <div className={cn("w-4 h-4 rounded-full", colorDot[p.color])} />
                <span className="font-medium text-sm">
                  {p.name}
                  {pid === playerId && (
                    <span className="text-gray-400 ml-1">(you)</span>
                  )}
                </span>
                {pid === state.hostId && (
                  <span className="ml-auto text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                    Host
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {isHost ? (
            <button
              onClick={onStart}
              disabled={playerCount < 2}
              className={cn(
                "flex-1 py-3 rounded-xl font-semibold text-white transition-all active:scale-95",
                playerCount >= 2
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-gray-300 cursor-not-allowed"
              )}
            >
              {playerCount < 2 ? "Need 2+ players" : "Start Game"}
            </button>
          ) : (
            <div className="flex-1 py-3 rounded-xl font-medium text-center text-gray-500 bg-gray-100">
              Waiting for host to start...
            </div>
          )}
          <button
            onClick={onLeave}
            className="px-4 py-3 rounded-xl font-medium text-gray-500 bg-gray-100 hover:bg-gray-200 transition-all active:scale-95"
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
