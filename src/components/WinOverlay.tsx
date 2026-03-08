"use client";

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

export function WinOverlay({ state, playerId, onPlayAgain, onLeave }: WinOverlayProps) {
  if (state.phase !== "finished") return null;

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

  // Build scoreboard from scores map
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
    // Sort by sequences descending
    scoreEntries.sort((a, b) => b.sequences - a.sequences);
  }

  // Past history (exclude current game which is the last entry)
  const pastHistory = state.gameHistory ?? [];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 text-center max-w-sm w-full max-h-[85dvh] overflow-y-auto">
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

        {/* Actions */}
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

        {/* Room history */}
        <HistoryTable history={pastHistory} />
      </div>
    </div>
  );
}
