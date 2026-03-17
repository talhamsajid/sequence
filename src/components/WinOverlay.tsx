"use client";

import { useState, useEffect, useRef } from "react";
import type { GameState, GameHistoryEntry } from "@/lib/game";
import { getPlayerTeam } from "@/lib/teams";
import { cn } from "@/lib/utils";

interface WinOverlayProps {
  state: GameState;
  playerId: string;
  onPlayAgain: () => void;
  onLeave: () => void;
}

const colorDot: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
};

function ScoreRow({ name, color, sequences, isWinner }: { name: string; color: string; sequences: number; isWinner: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-2 rounded-lg",
      isWinner ? "bg-amber-50 ring-1 ring-amber-200" : "bg-gray-50"
    )}>
      <div className={cn("w-3 h-3 rounded-full shrink-0", colorDot[color] ?? "bg-gray-400")} />
      <span className="text-sm font-medium flex-1 truncate">{name}</span>
      <span className={cn("text-sm font-bold tabular-nums", isWinner ? "text-amber-600" : "text-gray-500")}>
        {sequences}
      </span>
    </div>
  );
}

function HistoryTable({ history }: { history: GameHistoryEntry[] }) {
  if (history.length === 0) return null;

  return (
    <div className="mt-4 border-t pt-3">
      <p className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 text-center">
        Room History
      </p>
      <div className="space-y-1.5 max-h-32 overflow-y-auto">
        {[...history].reverse().map((entry) => (
          <div key={entry.gameNumber} className="flex items-center gap-2 text-xs px-2 py-1.5 bg-gray-50 rounded-md">
            <span className="text-gray-400 font-mono w-5 shrink-0">#{entry.gameNumber}</span>
            <div className="flex-1 flex items-center gap-1 min-w-0">
              {Object.entries(entry.scores).map(([id, s]) => (
                <span key={id} className="flex items-center gap-0.5 shrink-0">
                  <span className={cn("w-2 h-2 rounded-full", colorDot[s.color] ?? "bg-gray-400")} />
                  <span className="font-medium tabular-nums">{s.sequences}</span>
                </span>
              ))}
            </div>
            <span className={cn("font-semibold truncate max-w-20", entry.winnerId ? "text-gray-700" : "text-gray-400")}>
              {entry.winnerLabel}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Countdown ring: shows remaining seconds visually
function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / total;
  const dashOffset = circumference * (1 - progress);

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" className="shrink-0 -rotate-90">
      <circle
        cx="14"
        cy="14"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth="3"
      />
      <circle
        cx="14"
        cy="14"
        r={radius}
        fill="none"
        stroke="rgb(251,191,36)"
        strokeWidth="3"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
      <text
        x="14"
        y="14"
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize="9"
        fontWeight="700"
        className="rotate-90"
        style={{ transform: "rotate(90deg)", transformOrigin: "14px 14px" }}
      >
        {seconds}
      </text>
    </svg>
  );
}

const BANNER_DURATION = 4; // seconds before overlay appears

export function WinOverlay({ state, playerId, onPlayAgain, onLeave }: WinOverlayProps) {
  const [showOverlay, setShowOverlay] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [boardViewMode, setBoardViewMode] = useState(false);
  const [countdown, setCountdown] = useState(BANNER_DURATION);
  // Tracks whether the overlay card is mounted (for slide-up animation)
  const [overlayMounted, setOverlayMounted] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset all state when phase changes (e.g., Play Again resets to "playing")
  useEffect(() => {
    if (state.phase !== "finished") {
      setBannerVisible(false);
      setShowOverlay(false);
      setBoardViewMode(false);
      setCountdown(BANNER_DURATION);
      setOverlayMounted(false);
      if (timerRef.current) clearInterval(timerRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
      return;
    }

    // Phase just became "finished" — start the banner + countdown
    setBannerVisible(true);
    setCountdown(BANNER_DURATION);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    overlayTimerRef.current = setTimeout(() => {
      setBannerVisible(false);
      setShowOverlay(true);
      // Mount with a tiny delay so the CSS transition fires (needs a frame with translateY set)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setOverlayMounted(true));
      });
    }, BANNER_DURATION * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase]);

  // Board-view auto-dismiss: hide for 5 seconds then show overlay again
  const boardViewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleViewBoard = () => {
    setBoardViewMode(true);
    setOverlayMounted(false);
    boardViewTimerRef.current = setTimeout(() => {
      setBoardViewMode(false);
      setShowOverlay(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setOverlayMounted(true));
      });
    }, 5000);
  };

  const handleViewResults = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (overlayTimerRef.current) clearTimeout(overlayTimerRef.current);
    setBannerVisible(false);
    setShowOverlay(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setOverlayMounted(true));
    });
  };

  if (state.phase !== "finished") return null;

  // — Derived values (moved out of early-return zone) —
  const isTeams = state.mode === "teams" && state.teams;
  const isDraw = !state.winner;

  let isWinner = false;
  if (!isDraw) {
    if (isTeams && state.teams) {
      const playerTeam = getPlayerTeam(state.teams, playerId);
      isWinner = playerTeam?.teamId === state.winner;
    } else {
      isWinner = state.winner === playerId;
    }
  }

  const scoreEntries: { id: string; name: string; color: string; sequences: number }[] = [];
  if (state.scores) {
    if (isTeams && state.teams) {
      for (const [teamId, team] of Object.entries(state.teams)) {
        scoreEntries.push({
          id: teamId,
          name: team.name,
          color: team.color,
          sequences: state.scores[teamId] ?? 0,
        });
      }
    } else {
      for (const pid of state.playerOrder) {
        const p = state.players[pid];
        if (p) {
          scoreEntries.push({
            id: pid,
            name: p.name,
            color: p.color,
            sequences: state.scores[pid] ?? 0,
          });
        }
      }
    }
    scoreEntries.sort((a, b) => b.sequences - a.sequences);
  }

  const pastHistory = state.gameHistory ?? [];

  const winnerLabel = isDraw
    ? (state.winnerLabel ?? "Draw!")
    : isWinner
    ? (isTeams ? "Your Team Won!" : "You Won!")
    : `${state.winnerLabel} Wins!`;

  const bannerEmoji = isDraw ? "🤝" : isWinner ? "🏆" : "🎯";

  // ─── Phase 1: Floating banner ────────────────────────────────────────────────
  if (bannerVisible) {
    return (
      <div
        className={cn(
          "fixed top-4 left-1/2 -translate-x-1/2 z-[60]",
          "flex items-center gap-3 px-4 py-3 rounded-2xl",
          "bg-slate-900/90 backdrop-blur-md border border-white/10 shadow-2xl",
          "transition-all duration-400 ease-out",
        )}
        style={{ minWidth: "min(calc(100vw - 2rem), 360px)" }}
      >
        <span className="text-2xl leading-none">{bannerEmoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm leading-tight truncate">
            {winnerLabel}
          </p>
          <p className="text-white/50 text-xs mt-0.5">Board visible — view the final state</p>
        </div>
        <CountdownRing seconds={countdown} total={BANNER_DURATION} />
        <button
          onClick={handleViewResults}
          className={cn(
            "shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold",
            "bg-amber-400 text-slate-900 hover:bg-amber-300 active:scale-95",
            "transition-all duration-150"
          )}
        >
          Results
        </button>
      </div>
    );
  }

  // ─── Phase 3: Board-view mode (overlay hidden) ────────────────────────────
  if (boardViewMode) {
    return (
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[60]">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/80 backdrop-blur-md border border-white/10 shadow-lg">
          <span className="text-xs text-white/70">Results in 5s</span>
          <button
            onClick={() => {
              if (boardViewTimerRef.current) clearTimeout(boardViewTimerRef.current);
              setBoardViewMode(false);
              setShowOverlay(true);
              requestAnimationFrame(() => {
                requestAnimationFrame(() => setOverlayMounted(true));
              });
            }}
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
          >
            View Results
          </button>
        </div>
      </div>
    );
  }

  // ─── Phase 2: Full overlay (not in board-view mode) ──────────────────────
  if (!showOverlay) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] flex items-center justify-center",
        "transition-all duration-400 ease-out",
        overlayMounted ? "bg-black/60 backdrop-blur-sm" : "bg-black/0 backdrop-blur-none"
      )}
    >
      <div
        className={cn(
          "bg-white rounded-2xl shadow-2xl p-6 mx-4 text-center max-w-sm w-full max-h-[85dvh] overflow-y-auto",
          "transition-all duration-400 ease-out",
          overlayMounted
            ? "translate-y-0 opacity-100"
            : "translate-y-full opacity-0"
        )}
      >
        <div className="text-5xl mb-3">{isDraw ? "🤝" : isWinner ? "🏆" : "😔"}</div>
        <h2 className="text-2xl font-bold mb-1">
          {isDraw
            ? state.winnerLabel ?? "Draw!"
            : isWinner
            ? (isTeams ? "Your Team Won!" : "You Won!")
            : `${state.winnerLabel} Wins!`}
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          {state.sequencesNeeded === 0 ? "All cards played — final scores" : "Game over — final scores"}
        </p>

        {/* Scoreboard */}
        {scoreEntries.length > 0 && (
          <div className="space-y-1.5 mb-4">
            {scoreEntries.map((entry) => (
              <ScoreRow
                key={entry.id}
                name={entry.name}
                color={entry.color}
                sequences={entry.sequences}
                isWinner={entry.id === state.winner}
              />
            ))}
          </div>
        )}

        {/* Primary actions */}
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

        {/* View Board escape hatch */}
        <div className="mt-3">
          <button
            onClick={handleViewBoard}
            className={cn(
              "w-full px-4 py-2.5 rounded-xl text-sm font-medium",
              "border border-gray-200 text-gray-500",
              "hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50",
              "active:scale-[0.98] transition-all duration-150"
            )}
          >
            View Board
          </button>
        </div>

        {/* Room history */}
        <HistoryTable history={pastHistory} />
      </div>
    </div>
  );
}
