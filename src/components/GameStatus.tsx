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
  sequenceCount?: number;
  sequencesNeeded?: number;
  boardFlipped?: boolean;
  onToggleFlip?: () => void;
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

const colorDot: Record<PlayerColor, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
};

const colorRing: Record<PlayerColor, string> = {
  red: "ring-red-400",
  blue: "ring-blue-400",
  green: "ring-green-400",
};

export function GameStatus({
  state,
  playerId,
  soundOn = true,
  onToggleSound,
  onLeave,
  sequenceCount,
  sequencesNeeded,
  boardFlipped,
  onToggleFlip,
}: GameStatusProps) {
  const currentPlayerId = state.playerOrder[state.currentTurn];
  const isMyTurn = currentPlayerId === playerId;
  const currentPlayer = state.players[currentPlayerId];
  const isTeams = state.mode === "teams" && state.teams;
  const remaining = useTimeRemaining(state.turnStartedAt, state.turnTimeLimit, state.phase);

  const currentTeamInfo = isTeams && state.teams
    ? getPlayerTeam(state.teams, currentPlayerId)
    : null;

  // Timer ring colors
  const timerColor = remaining <= 10
    ? "stroke-red-500"
    : remaining <= 30
    ? "stroke-yellow-500"
    : "stroke-emerald-500";
  const timerTextColor = remaining <= 10
    ? "text-red-500"
    : remaining <= 30
    ? "text-yellow-400"
    : "text-white/70";
  const circumference = 2 * Math.PI * 14;
  const fraction = state.turnTimeLimit > 0 ? remaining / state.turnTimeLimit : 0;

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="flex items-center gap-1.5 px-1.5 py-1 sm:px-3 sm:py-2 bg-black/30 backdrop-blur-sm rounded-lg">
      {/* Player indicators — compact pill per player */}
      <div className="flex items-center gap-1 overflow-x-auto scrollbar-none min-w-0 flex-1">
        {isTeams && state.teams ? (
          Object.entries(state.teams).sort(([a], [b]) => a.localeCompare(b)).map(([teamId, team]) => {
            const isCurrentTeam = currentTeamInfo?.teamId === teamId;
            return (
              <div
                key={teamId}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap shrink-0",
                  isCurrentTeam ? "bg-white/20 ring-1 ring-white/30" : "bg-white/5",
                )}
              >
                <div className={cn("w-2 h-2 rounded-full shrink-0", colorDot[team.color])} />
                <span className="text-white/90">
                  {team.playerIds.map((pid) => getPlayerAvatar(pid)).join("")}
                </span>
              </div>
            );
          })
        ) : (
          state.playerOrder.map((pid) => {
            const p = state.players[pid];
            if (!p) return null;
            const isCurrent = pid === currentPlayerId;
            return (
              <div
                key={pid}
                className={cn(
                  "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium whitespace-nowrap shrink-0",
                  isCurrent ? "bg-white/20 ring-1" : "bg-white/5",
                  isCurrent && colorRing[p.color],
                )}
              >
                <span>{getPlayerAvatar(pid)}</span>
                <div className={cn("w-2 h-2 rounded-full shrink-0", colorDot[p.color])} />
                <span className="text-white/80 hidden sm:inline">
                  {pid === playerId ? "You" : p.name}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Center: Timer + Turn indicator */}
      <div className="flex items-center gap-1.5 shrink-0">
        {state.phase === "playing" && (
          <div className={cn("flex items-center gap-1", remaining <= 10 && "animate-pulse")}>
            <svg width="26" height="26" viewBox="0 0 32 32" className="shrink-0">
              <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="3" className="text-white/10" />
              <circle
                cx="16" cy="16" r="14" fill="none" strokeWidth="3" strokeLinecap="round"
                className={cn(timerColor, "transition-all duration-1000")}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - fraction)}
                transform="rotate(-90 16 16)"
              />
            </svg>
            <span className={cn("text-[11px] font-mono font-bold tabular-nums", timerTextColor)}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
        )}

        <div className="text-[10px] sm:text-xs font-semibold whitespace-nowrap">
          {state.phase === "finished" ? (
            <span className="text-amber-400">
              {state.winnerLabel
                ? (isTeams
                    ? (state.teams && getPlayerTeam(state.teams, playerId)?.teamId === state.winner
                        ? "You won!"
                        : `${state.winnerLabel} wins!`)
                    : (state.winner === playerId ? "You won!" : `${state.winnerLabel} wins!`))
                : "Game over"}
            </span>
          ) : isMyTurn ? (
            <span className="text-emerald-400 animate-pulse">Your turn</span>
          ) : (
            <span className="text-white/50">
              {currentPlayer?.name?.split(" ")[0]}
            </span>
          )}
        </div>
      </div>

      {/* Sequence count badge */}
      {sequenceCount !== undefined && sequencesNeeded !== undefined && (
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-white/10 rounded-full shrink-0">
          <span className="text-[10px] font-bold text-emerald-300">{sequenceCount}</span>
          <span className="text-[10px] text-white/30">/</span>
          <span className="text-[10px] text-white/50">{sequencesNeeded}</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Flip board */}
        {onToggleFlip && (
          <button
            onClick={onToggleFlip}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            title={boardFlipped ? "Reset board" : "Flip board"}
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-white/40"
              style={{ transform: boardFlipped ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </button>
        )}

        {/* Sound toggle */}
        {onToggleSound && (
          <button
            onClick={onToggleSound}
            className="p-1 rounded-full hover:bg-white/10 transition-colors"
            title={soundOn ? "Mute" : "Unmute"}
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-white/40"
            >
              {soundOn ? (
                <>
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
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
            className="p-1 rounded-full hover:bg-red-500/20 transition-colors"
            title="Leave game"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-white/40 hover:text-red-400 transition-colors"
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
