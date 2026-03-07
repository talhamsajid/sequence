"use client";

import { useState } from "react";
import type { GameState, PlayerColor } from "@/lib/game";
import { cn } from "@/lib/utils";
import { getMaxPlayers, getMinPlayers, getPlayerTeam } from "@/lib/teams";

interface LobbyProps {
  state: GameState;
  playerId: string;
  onStart: () => void;
  onLeave: () => void;
  onUpdateSequencesNeeded: (n: number) => void;
  onSwitchTeam: (targetTeamId: string) => void;
  onChangeColor: (color: PlayerColor) => void;
  roomCode: string;
}

const ALL_COLORS: PlayerColor[] = ["red", "blue", "green"];

const colorRing: Record<PlayerColor, string> = {
  red: "ring-red-500",
  blue: "ring-blue-500",
  green: "ring-green-500",
};

const colorDot: Record<PlayerColor, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
};

export function Lobby({ state, playerId, onStart, onLeave, onUpdateSequencesNeeded, onSwitchTeam, onChangeColor, roomCode }: LobbyProps) {
  const [copied, setCopied] = useState(false);
  const isHost = state.hostId === playerId;
  const playerCount = Object.keys(state.players).length;
  const isTeams = state.mode === "teams";
  const teamCount = state.teams ? Object.keys(state.teams).length : 0;
  const myTeam = isTeams && state.teams ? getPlayerTeam(state.teams, playerId) : null;
  const maxPlayers = getMaxPlayers(state.mode, teamCount);
  const minPlayers = getMinPlayers(state.mode, teamCount);

  const copyCode = async () => {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gradient-to-b from-emerald-900 to-emerald-950">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        <h2 className="text-xl font-bold text-center mb-1">Waiting for Players</h2>
        <p className="text-gray-400 text-center text-sm mb-2">
          {playerCount}/{maxPlayers} players joined
        </p>

        {/* Mode badge */}
        <div className="flex justify-center mb-4">
          <span className={cn(
            "text-xs font-semibold px-3 py-1 rounded-full",
            isTeams
              ? "bg-purple-100 text-purple-700"
              : "bg-emerald-100 text-emerald-700"
          )}>
            {isTeams ? `Teams (${teamCount} teams)` : "Solo"}
          </span>
        </div>

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
        {isTeams && state.teams ? (
          <div className="space-y-3 mb-5">
            {Object.entries(state.teams).sort(([a], [b]) => a.localeCompare(b)).map(([teamId, team]) => (
              <div key={teamId} className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className={cn("w-3 h-3 rounded-full", colorDot[team.color])} />
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {team.name}
                  </span>
                  <span className="text-xs text-gray-400">
                    ({team.playerIds.length}/2)
                  </span>
                  {/* Switch team button — show if player is on a different team and this team has room */}
                  {myTeam && myTeam.teamId !== teamId && team.playerIds.length < 2 && (
                    <button
                      onClick={() => onSwitchTeam(teamId)}
                      className="ml-auto text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium hover:bg-blue-100 transition-colors active:scale-95"
                    >
                      Join
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 ml-5">
                  {team.playerIds.map((pid) => {
                    const p = state.players[pid];
                    if (!p) return null;
                    return (
                      <div key={pid} className="flex items-center gap-2 text-sm">
                        <span className="font-medium">
                          {p.name}
                          {pid === playerId && (
                            <span className="text-gray-400 ml-1">(you)</span>
                          )}
                        </span>
                        {pid === state.hostId && (
                          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                            Host
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {team.playerIds.length < 2 && (
                    <p className="text-xs text-gray-300 italic">Waiting for player...</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2 mb-5">
            {state.playerOrder.map((pid) => {
              const p = state.players[pid];
              if (!p) return null;
              const isMe = pid === playerId;
              const takenColors = new Set(
                Object.entries(state.players)
                  .filter(([id]) => id !== playerId)
                  .map(([, pl]) => pl.color)
              );
              return (
                <div
                  key={pid}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {/* Color picker for current player, static dot for others */}
                  {isMe ? (
                    <div className="flex gap-1.5">
                      {ALL_COLORS.map((c) => {
                        const taken = takenColors.has(c);
                        const selected = p.color === c;
                        return (
                          <button
                            key={c}
                            onClick={() => !taken && onChangeColor(c)}
                            disabled={taken}
                            className={cn(
                              "w-5 h-5 rounded-full transition-all",
                              colorDot[c],
                              selected && "ring-2 ring-offset-1",
                              selected && colorRing[c],
                              taken && !selected && "opacity-25 cursor-not-allowed",
                              !taken && !selected && "opacity-60 hover:opacity-100 cursor-pointer hover:scale-110"
                            )}
                            title={taken ? "Taken" : `Pick ${c}`}
                          />
                        );
                      })}
                    </div>
                  ) : (
                    <div className={cn("w-4 h-4 rounded-full", colorDot[p.color])} />
                  )}
                  <span className="font-medium text-sm">
                    {p.name}
                    {isMe && (
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
        )}

        {/* Sequences to win selector (host only) */}
        <div className="mb-5">
          <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block text-center">
            Sequences to Win
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => isHost && onUpdateSequencesNeeded(n)}
                disabled={!isHost}
                className={cn(
                  "py-2 rounded-lg font-semibold text-sm transition-all",
                  state.sequencesNeeded === n
                    ? "bg-emerald-600 text-white ring-2 ring-emerald-600"
                    : isHost
                    ? "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    : "bg-gray-50 text-gray-400 cursor-not-allowed"
                )}
              >
                {n}
              </button>
            ))}
          </div>
          {!isHost && (
            <p className="text-xs text-gray-400 text-center mt-1">Only the host can change this</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {isHost ? (
            <button
              onClick={onStart}
              disabled={playerCount < minPlayers}
              className={cn(
                "flex-1 py-3 rounded-xl font-semibold text-white transition-all active:scale-95",
                playerCount >= minPlayers
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-gray-300 cursor-not-allowed"
              )}
            >
              {playerCount < minPlayers
                ? `Need ${minPlayers}+ players`
                : "Start Game"}
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
