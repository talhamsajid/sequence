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
  boardFlipped?: boolean;
  onToggleFlip?: () => void;
  connectedPlayers?: Set<string>;
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
  boardFlipped,
  onToggleFlip,
  connectedPlayers,
}: GameStatusProps) {
  const currentPlayerId = state.playerOrder[state.currentTurn];
  const isMyTurn = currentPlayerId === playerId;
  const currentPlayer = state.players[currentPlayerId];
  const isTeams = state.mode === "teams" && state.teams;
  const remaining = useTimeRemaining(state.turnStartedAt, state.turnTimeLimit, state.phase);

  const currentTeamInfo = isTeams && state.teams
    ? getPlayerTeam(state.teams, currentPlayerId)
    : null;

  // Timer
  const timerStroke = remaining <= 10
    ? "stroke-red-500"
    : remaining <= 30
    ? "stroke-yellow-500"
    : "stroke-emerald-400";
  const timerText = remaining <= 10
    ? "text-red-400"
    : remaining <= 30
    ? "text-yellow-400"
    : "text-white";
  const circumference = 2 * Math.PI * 12;
  const fraction = state.turnTimeLimit > 0 ? remaining / state.turnTimeLimit : 0;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;

  return (
    <div className="flex items-center gap-2 px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-900/90 backdrop-blur rounded-xl border border-white/10">
      {/* Players */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none min-w-0 flex-1">
        {isTeams && state.teams ? (
          Object.entries(state.teams).sort(([a], [b]) => a.localeCompare(b)).map(([teamId, team]) => {
            const isCurrentTeam = currentTeamInfo?.teamId === teamId;
            return (
              <div
                key={teamId}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0",
                  isCurrentTeam ? "bg-white/15 ring-1 ring-white/30" : "bg-white/5",
                )}
              >
                <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", colorDot[team.color])} />
                <span className="text-sm">
                  {team.playerIds.map((pid) => {
                    const isTeamMemberDc = connectedPlayers && connectedPlayers.size > 0 && !connectedPlayers.has(pid) && pid !== playerId;
                    return (
                      <span key={pid} className={cn(isTeamMemberDc && "opacity-40")}>
                        {getPlayerAvatar(pid)}
                      </span>
                    );
                  })}
                </span>
                <span className="text-white/70 text-[11px]">
                  {team.playerIds.includes(playerId) ? "You" : team.name}
                </span>
              </div>
            );
          })
        ) : (
          state.playerOrder.map((pid) => {
            const p = state.players[pid];
            if (!p) return null;
            const isCurrent = pid === currentPlayerId;
            const isDisconnected = connectedPlayers && connectedPlayers.size > 0 && !connectedPlayers.has(pid) && pid !== playerId;
            return (
              <div
                key={pid}
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap shrink-0",
                  isCurrent ? "bg-white/15 ring-1.5" : "bg-white/5",
                  isCurrent && colorRing[p.color],
                  isDisconnected && "opacity-50",
                )}
              >
                <span className="text-sm">{getPlayerAvatar(pid)}</span>
                {isDisconnected ? (
                  <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-amber-500 animate-pulse" />
                ) : (
                  <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", colorDot[p.color])} />
                )}
                <span className={cn("text-[11px]", isDisconnected ? "text-amber-400/80" : "text-white/80")}>
                  {pid === playerId ? "You" : p.name.split(" ")[0]}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* Timer + Turn */}
      <div className="flex items-center gap-1.5 shrink-0">
        {state.phase === "playing" && (
          <div className={cn("flex items-center gap-1", remaining <= 10 && "animate-pulse")}>
            <svg width="24" height="24" viewBox="0 0 28 28" className="shrink-0">
              <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white/10" />
              <circle
                cx="14" cy="14" r="12" fill="none" strokeWidth="2.5" strokeLinecap="round"
                className={cn(timerStroke, "transition-all duration-1000")}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - fraction)}
                transform="rotate(-90 14 14)"
              />
            </svg>
            <span className={cn("text-xs font-mono font-bold tabular-nums", timerText)}>
              {minutes}:{seconds.toString().padStart(2, "0")}
            </span>
          </div>
        )}

        <div className="text-[11px] sm:text-xs font-semibold whitespace-nowrap">
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
            <span className="text-white/60">
              {currentPlayer?.name?.split(" ")[0]}
            </span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-0 shrink-0">
        {onToggleFlip && (
          <button
            onClick={onToggleFlip}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            title={boardFlipped ? "Reset board" : "Flip board"}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-white/70"
              style={{ transform: boardFlipped ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              <polyline points="21 3 21 9 15 9" />
            </svg>
          </button>
        )}

        {onToggleSound && (
          <button
            onClick={onToggleSound}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            title={soundOn ? "Mute" : "Unmute"}
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-white/70"
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

        {onLeave && (
          <button
            onClick={onLeave}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-red-500/20 transition-colors"
            title="Leave game"
          >
            <svg
              width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className="text-white/70 hover:text-red-400 transition-colors"
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
