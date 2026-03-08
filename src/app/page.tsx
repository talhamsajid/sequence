"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createRoom, getRoom } from "@/lib/firebase";
import { createGame } from "@/lib/game";
import { generateRoomCode, getPlayerId, getPlayerName, setPlayerName, cn } from "@/lib/utils";
import type { GameMode } from "@/lib/teams";
import { getDefaultSequencesNeeded } from "@/lib/teams";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState(() => getPlayerName() ?? "");
  const [joinCode, setJoinCode] = useState("");
  const [view, setView] = useState<"home" | "create" | "join">("home");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create game options
  const [gameMode, setGameMode] = useState<GameMode>("solo");
  const [teamCount, setTeamCount] = useState(2);
  const [sequencesNeeded, setSequencesNeeded] = useState(2);

  const updateMode = useCallback((mode: GameMode) => {
    setGameMode(mode);
    setSequencesNeeded(getDefaultSequencesNeeded(mode, mode === "solo" ? 2 : teamCount));
  }, [teamCount]);

  const updateTeamCount = useCallback((count: number) => {
    setTeamCount(count);
    setSequencesNeeded(getDefaultSequencesNeeded("teams", count));
  }, []);

  const handleCreate = useCallback(async () => {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    setLoading(true);
    setError(null);
    setPlayerName(name.trim());

    const playerId = getPlayerId();
    const roomId = generateRoomCode();
    const game = createGame(playerId, name.trim(), roomId, {
      mode: gameMode,
      sequencesNeeded,
      teamCount: gameMode === "teams" ? teamCount : undefined,
    });

    try {
      await createRoom(roomId, game);
      router.push(`/game/${roomId}`);
    } catch {
      setError("Failed to create game. Check your connection.");
      setLoading(false);
    }
  }, [name, router, gameMode, sequencesNeeded, teamCount]);

  const handleJoin = useCallback(async () => {
    if (!name.trim()) {
      setError("Enter your name");
      return;
    }
    const code = joinCode.trim().toUpperCase();
    if (!code) {
      setError("Enter a room code");
      return;
    }
    setLoading(true);
    setError(null);
    setPlayerName(name.trim());

    try {
      const room = await getRoom(code);
      if (!room) {
        setError("Room not found");
        setLoading(false);
        return;
      }
      if (room.phase !== "waiting") {
        setError("Game already started");
        setLoading(false);
        return;
      }
      const maxPlayers = room.mode === "teams" && room.teams
        ? Object.keys(room.teams).length * 2
        : 3;
      if (Object.keys(room.players).length >= maxPlayers) {
        setError("Room is full");
        setLoading(false);
        return;
      }
      router.push(`/game/${code}`);
    } catch {
      setError("Failed to join. Check your connection.");
      setLoading(false);
    }
  }, [name, joinCode, router]);

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-gradient-to-b from-emerald-900 to-emerald-950">
      {/* Logo */}
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-black text-white tracking-tight mb-1">
          SEQUENCE
        </h1>
        <p className="text-emerald-300/60 text-sm font-medium">
          The Classic Board Game, Online
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
        {/* Name input */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">
            Your Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            maxLength={20}
            className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 font-medium text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 text-red-600 text-sm rounded-lg text-center">
            {error}
          </div>
        )}

        {view === "home" && (
          <div className="space-y-3">
            <button
              onClick={() => setView("create")}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-all active:scale-[0.98]"
            >
              Create Game
            </button>

            <button
              onClick={() => setView("join")}
              className="w-full py-3.5 rounded-xl font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-all active:scale-[0.98]"
            >
              Join Game
            </button>
          </div>
        )}

        {view === "create" && (
          <div className="space-y-4">
            {/* Mode selector */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">
                Game Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => updateMode("solo")}
                  className={cn(
                    "py-2.5 rounded-lg font-semibold text-sm transition-all",
                    gameMode === "solo"
                      ? "bg-emerald-600 text-white ring-2 ring-emerald-600"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  Solo
                </button>
                <button
                  onClick={() => updateMode("teams")}
                  className={cn(
                    "py-2.5 rounded-lg font-semibold text-sm transition-all",
                    gameMode === "teams"
                      ? "bg-emerald-600 text-white ring-2 ring-emerald-600"
                      : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                  )}
                >
                  Teams
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {gameMode === "solo"
                  ? "2-3 individual players"
                  : `${teamCount} teams of 2 players each`}
              </p>
            </div>

            {/* Team count (only for teams mode) */}
            {gameMode === "teams" && (
              <div>
                <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">
                  Number of Teams
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[2, 3].map((n) => (
                    <button
                      key={n}
                      onClick={() => updateTeamCount(n)}
                      className={cn(
                        "py-2.5 rounded-lg font-semibold text-sm transition-all",
                        teamCount === n
                          ? "bg-emerald-600 text-white ring-2 ring-emerald-600"
                          : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {n} Teams
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {teamCount * 2} players total
                </p>
              </div>
            )}

            {/* Win condition */}
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-2 block">
                Win Condition
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 0].map((n) => (
                  <button
                    key={n}
                    onClick={() => setSequencesNeeded(n)}
                    className={cn(
                      "py-2.5 rounded-lg font-semibold text-xs transition-all",
                      sequencesNeeded === n
                        ? "bg-emerald-600 text-white ring-2 ring-emerald-600"
                        : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                    )}
                  >
                    {n === 0 ? "Last Card" : `${n} Seq`}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {sequencesNeeded === 0
                  ? "Play until all cards are used — most sequences wins"
                  : `First to ${sequencesNeeded} sequence${sequencesNeeded > 1 ? "s" : ""} wins`}
              </p>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading}
              className={cn(
                "w-full py-3.5 rounded-xl font-semibold text-white transition-all active:scale-[0.98]",
                loading ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {loading ? "Creating..." : "Create Game"}
            </button>

            <button
              onClick={() => {
                setView("home");
                setError(null);
              }}
              className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Back
            </button>
          </div>
        )}

        {view === "join" && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider font-medium mb-1 block">
                Room Code
              </label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="XXXXX"
                maxLength={5}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-gray-800 font-mono font-bold text-lg text-center tracking-[0.3em] uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={loading}
              className={cn(
                "w-full py-3.5 rounded-xl font-semibold text-white transition-all active:scale-[0.98]",
                loading ? "bg-gray-400" : "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {loading ? "Joining..." : "Join"}
            </button>

            <button
              onClick={() => {
                setView("home");
                setError(null);
              }}
              className="w-full py-3 text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>

      {/* Rules hint */}
      <div className="mt-6 text-center max-w-xs">
        <p className="text-emerald-300/40 text-xs leading-relaxed">
          2-3 players. Play cards to place chips on the board. Get 5 in a row to form a sequence. First to complete the required sequences wins.
        </p>
      </div>
    </div>
  );
}
