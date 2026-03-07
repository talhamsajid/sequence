"use client";

import { useState, useEffect } from "react";
import type { GameState, PlayerColor } from "@/lib/game";
import { cn } from "@/lib/utils";
import { getPlayerTeam } from "@/lib/teams";
import { getPlayerAvatar } from "@/lib/avatars";

interface GameStatusProps {
  state: GameState;
  playerId: string;
  soundOn?: boolean;
  onToggleSound?: () => void;
  onLeave?: () => void;
}

function useTimeRemaining(turnStartedAt: number | null, turnTimeLimit: number, phase: string): number {
  const [remaining, setRemaining] = useState(() => {
    if (phase !== "playing" || turnStartedAt === null) return turnTimeLimit;
    return Math.max(0, turnTimeLimit - Math.floor((Date.now() - turnStartedAt) / 1000));
  });

  useEffect(() => {
    if (phase !== "playing" || turnStartedAt === null) {
      setRemaining(turnTimeLimit);
      return;
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - turnStartedAt) / 1000);
      setRemaining(Math.max(0, turnTimeLimit - elapsed));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [turnStartedAt, turnTimeLimit, phase]);

  return remaining;
}

function TimerDisplay({ remaining, timeLimit }: { remaining: number; timeLimit: number }) {
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const fraction = timeLimit > 0 ? remaining / timeLimit : 0;

  // Circumference for a circle with r=14
  const circumference = 2 * Math.PI * 14;
  const strokeDashoffset = circumference * (1 - fraction);

  const urgencyColor = remaining <= 10
    ? "text-red-500"
    : remaining <= 30
    ? "text-yellow-500"
    : "text-gray-600";

  const strokeColor = remaining <= 10
    ? "stroke-red-500"
    : remaining <= 30
    ? "stroke-yellow-500"
    : "stroke-emerald-500";

  return (
    <div className={cn("flex items-center gap-1.5", remaining <= 10 && "animate-pulse")}>
      <svg width="32" height="32" viewBox="0 0 32 32" className="shrink-0">
        <circle
          cx="16" cy="16" r="14"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-gray-200"
        />
        <circle
          cx="16" cy="16" r="14"
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          className={cn(strokeColor, "transition-all duration-1000")}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          transform="rotate(-90 16 16)"
        />
      </svg>
      <span className={cn("text-xs sm:text-sm font-mono font-bold tabular-nums", urgencyColor)}>
        {minutes}:{seconds.toString().padStart(2, "0")}
      </span>
    </div>
  );
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

export function GameStatus({ state, playerId, soundOn = true, onToggleSound, onLeave }: GameStatusProps) {
  const currentPlayerId = state.playerOrder[state.currentTurn];
  const isMyTurn = currentPlayerId === playerId;
  const currentPlayer = state.players[currentPlayerId];
  const isTeams = state.mode === "teams" && state.teams;
  const remaining = useTimeRemaining(state.turnStartedAt, state.turnTimeLimit, state.phase);

  // Get current team info
  const currentTeamInfo = isTeams && state.teams
    ? getPlayerTeam(state.teams, currentPlayerId)
    : null;

  return (
    <div className="flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 bg-white/90 backdrop-blur rounded-lg shadow-sm gap-2">
      {/* Players / Teams */}
      <div className="flex gap-1.5 sm:gap-3 overflow-x-auto scrollbar-none min-w-0 flex-1">
        {isTeams && state.teams ? (
          // Team mode: show teams
          Object.entries(state.teams).sort(([a], [b]) => a.localeCompare(b)).map(([teamId, team]) => {
            const isCurrentTeam = currentTeamInfo?.teamId === teamId;
            return (
              <div
                key={teamId}
                className={cn(
                  "flex items-center gap-1.5 text-xs sm:text-sm font-medium px-2 py-1 rounded-full transition-all whitespace-nowrap",
                  isCurrentTeam && "bg-gray-100 ring-2 ring-gray-300"
                )}
              >
                <div className={cn("w-2.5 h-2.5 rounded-full", colorDot[team.color])} />
                <span className="text-sm mr-0.5">
                  {team.playerIds.map((pid) => getPlayerAvatar(pid)).join("")}
                </span>
                <span className={cn(colorText[team.color])}>
                  {team.playerIds.includes(playerId) ? `${team.name} (You)` : team.name}
                </span>
              </div>
            );
          })
        ) : (
          // Solo mode: show players
          state.playerOrder.map((pid) => {
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
                <span className="text-sm mr-0.5">{getPlayerAvatar(pid)}</span>
                <div className={cn("w-2.5 h-2.5 rounded-full", colorDot[p.color])} />
                <span className={cn(colorText[p.color])}>
                  {pid === playerId ? "You" : p.name}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Turn indicator + Timer */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {state.phase === "playing" && (
          <TimerDisplay remaining={remaining} timeLimit={state.turnTimeLimit} />
        )}
      <div className="text-xs sm:text-sm font-semibold whitespace-nowrap">
        {state.phase === "finished" ? (
          <span className="text-amber-600">
            {state.winnerLabel
              ? (isTeams
                  ? (state.teams && getPlayerTeam(state.teams, playerId)?.teamId === state.winner
                      ? "Your team won!"
                      : `${state.winnerLabel} wins!`)
                  : (state.winner === playerId ? "You won!" : `${state.winnerLabel} wins!`))
              : "Game over"}
          </span>
        ) : isMyTurn ? (
          <span className="text-emerald-600 animate-pulse">Your turn</span>
        ) : isTeams && currentTeamInfo ? (
          <span className="text-gray-500">
            {currentTeamInfo.team.playerIds.includes(playerId)
              ? `${currentPlayer?.name}&apos;s turn (your team)`
              : `${currentTeamInfo.team.name}&apos;s turn`}
          </span>
        ) : (
          <span className="text-gray-500">{currentPlayer?.name}&apos;s turn</span>
        )}
      </div>

        {/* Sound toggle */}
        {onToggleSound && (
          <button
            onClick={onToggleSound}
            className="p-1.5 rounded-full hover:bg-gray-100 transition-colors shrink-0"
            title={soundOn ? "Mute sounds" : "Enable sounds"}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-500"
            >
              {soundOn ? (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                </>
              ) : (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <line x1="23" y1="9" x2="17" y2="15" />
                  <line x1="17" y1="9" x2="23" y2="15" />
                </>
              )}
            </svg>
          </button>
        )}

        {/* Leave game */}
        {onLeave && (
          <button
            onClick={onLeave}
            className="p-1.5 rounded-full hover:bg-red-50 transition-colors shrink-0"
            title="Leave game"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-gray-400 hover:text-red-500 transition-colors"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
