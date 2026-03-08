"use client";

import { useState, useEffect, useRef } from "react";
import type { GameState, PlayerColor } from "@/lib/game";
import { cn } from "@/lib/utils";
import { getPlayerTeam } from "@/lib/teams";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentPlayerId = state.playerOrder[state.currentTurn];
  const isMyTurn = currentPlayerId === playerId;
  const currentPlayer = state.players[currentPlayerId];
  const isTeams = state.mode === "teams" && state.teams;
  const remaining = useTimeRemaining(state.turnStartedAt, state.turnTimeLimit, state.phase);

  // Close menu on outside tap
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  // Timer visuals
  const timerColor = remaining <= 10
    ? "text-red-400"
    : remaining <= 30
    ? "text-yellow-400"
    : "text-white/90";
  const circumference = 2 * Math.PI * 10;
  const fraction = state.turnTimeLimit > 0 ? remaining / state.turnTimeLimit : 0;
  const timerStroke = remaining <= 10
    ? "stroke-red-500"
    : remaining <= 30
    ? "stroke-yellow-500"
    : "stroke-emerald-400";
  const seconds = remaining % 60;
  const minutes = Math.floor(remaining / 60);

  // Turn label
  const turnLabel = (() => {
    if (state.phase === "finished") {
      if (!state.winnerLabel) return "Game over";
      if (isTeams && state.teams) {
        return getPlayerTeam(state.teams, playerId)?.teamId === state.winner
          ? "You won!" : `${state.winnerLabel} wins!`;
      }
      return state.winner === playerId ? "You won!" : `${state.winnerLabel} wins!`;
    }
    if (isMyTurn) return "Your turn";
    return currentPlayer?.name?.split(" ")[0] ?? "";
  })();

  const turnLabelColor = state.phase === "finished"
    ? "text-amber-400"
    : isMyTurn
    ? "text-emerald-400"
    : "text-white/50";

  // Current turn indicator dot color
  const turnDotColor = (() => {
    if (!currentPlayer) return "bg-white/30";
    return colorDot[currentPlayer.color];
  })();

  return (
    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-900/90 backdrop-blur rounded-xl border border-white/10">
      {/* Turn indicator: dot + label */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", turnDotColor, isMyTurn && state.phase === "playing" && "animate-pulse")} />
        <span className={cn("text-xs font-semibold truncate", turnLabelColor, isMyTurn && state.phase === "playing" && "animate-pulse")}>
          {turnLabel}
        </span>
      </div>

      {/* Timer */}
      {state.phase === "playing" && (
        <div className={cn("flex items-center gap-1 shrink-0", remaining <= 10 && "animate-pulse")}>
          <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/10" />
            <circle
              cx="12" cy="12" r="10" fill="none" strokeWidth="2" strokeLinecap="round"
              className={cn(timerStroke, "transition-all duration-1000")}
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - fraction)}
              transform="rotate(-90 12 12)"
            />
          </svg>
          <span className={cn("text-[11px] font-mono font-bold tabular-nums", timerColor)}>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </span>
        </div>
      )}

      {/* Sequence count */}
      {sequenceCount !== undefined && sequencesNeeded !== undefined && (
        <div className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500/20 rounded-full shrink-0 border border-emerald-500/30">
          <span className="text-[11px] font-bold text-emerald-300">{sequenceCount}</span>
          <span className="text-[10px] text-white/40">/</span>
          <span className="text-[11px] text-white/50">{sequencesNeeded}</span>
        </div>
      )}

      {/* Menu button */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-white/60">
            <circle cx="12" cy="5" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="12" cy="19" r="2" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {menuOpen && (
          <div className="absolute top-full right-0 mt-1 w-40 bg-gray-900/95 backdrop-blur-md border border-white/15 rounded-xl shadow-2xl overflow-hidden z-50">
            {onToggleFlip && (
              <button
                onClick={() => { onToggleFlip(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50" style={{ transform: boardFlipped ? "rotate(180deg)" : "none" }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  <polyline points="21 3 21 9 15 9" />
                </svg>
                {boardFlipped ? "Reset Board" : "Flip Board"}
              </button>
            )}
            {onToggleSound && (
              <button
                onClick={() => { onToggleSound(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-white/80 hover:bg-white/10 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/50">
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
                {soundOn ? "Mute Sound" : "Unmute Sound"}
              </button>
            )}
            {onLeave && (
              <button
                onClick={() => { onLeave(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Leave Game
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
