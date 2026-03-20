import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  update,
  remove,
  onDisconnect,
  type Database,
} from "firebase/database";
import type { GameState, ChipGrid } from "@sequence/game-logic";
import { firebaseConfig } from "./firebaseConfig";

// Firebase RTDB strips null values and empty arrays.
// This rehydrates the game state to ensure all fields have proper defaults.
function hydrateGameState(raw: Record<string, unknown>): GameState {
  const state = raw as unknown as GameState;

  // Rebuild chips as proper 10x10 grid (Firebase drops null entries)
  const chips: ChipGrid = Array.from({ length: 10 }, (_, r) => {
    const row = (state.chips as unknown as Record<string, unknown>)?.[r];
    if (!row) return Array(10).fill(null);
    if (Array.isArray(row)) {
      return Array.from({ length: 10 }, (_, c) => (row[c] as string) ?? null);
    }
    // Firebase may convert sparse arrays to objects
    const rowObj = row as Record<string, string>;
    return Array.from({ length: 10 }, (_, c) => rowObj[String(c)] ?? null);
  });

  // Ensure arrays exist
  const deck = Array.isArray(state.deck) ? state.deck : [];
  const sequences = Array.isArray(state.sequences) ? state.sequences : [];
  const playerOrder = Array.isArray(state.playerOrder) ? state.playerOrder : [];

  // Rebuild player hands (Firebase drops empty arrays)
  const players: GameState["players"] = {};
  if (state.players) {
    for (const [id, player] of Object.entries(state.players)) {
      players[id] = {
        ...player,
        hand: Array.isArray(player.hand) ? player.hand : [],
      };
    }
  }

  // Hydrate teams (Firebase may strip empty arrays in playerIds)
  let teams: GameState["teams"] = null;
  if (state.teams) {
    const hydratedTeams: Record<string, { name: string; color: string; playerIds: string[] }> = {};
    for (const [teamId, team] of Object.entries(state.teams as unknown as Record<string, Record<string, unknown>>)) {
      hydratedTeams[teamId] = {
        name: (team.name as string) ?? "",
        color: (team.color as string) ?? "red",
        playerIds: Array.isArray(team.playerIds) ? team.playerIds : [],
      };
    }
    teams = hydratedTeams as GameState["teams"];
  }

  return {
    ...state,
    chips,
    deck,
    sequences,
    playerOrder,
    players,
    mode: state.mode ?? "solo",
    teams,
    deckIndex: state.deckIndex ?? 0,
    currentTurn: state.currentTurn ?? 0,
    sequencesNeeded: state.sequencesNeeded ?? 2,
    winner: state.winner ?? null,
    winnerLabel: state.winnerLabel ?? null,
    lastMove: state.lastMove ?? null,
    turnStartedAt: state.turnStartedAt ?? null,
    turnTimeLimit: state.turnTimeLimit ?? 60,
    lastActivity: state.lastActivity ?? state.createdAt ?? 0,
    gameHistory: Array.isArray(state.gameHistory) ? state.gameHistory : [],
    scores: state.scores ?? null,
  };
}

let _app: FirebaseApp | null = null;
let _db: Database | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return _app;
}

function getDb(): Database {
  if (!_db) {
    _db = getDatabase(getFirebaseApp());
  }
  return _db;
}

// Exported for modules that need the initialized app/db (e.g. chat.ts)
export { getFirebaseApp, getDb };

function gameRef(roomId: string) {
  return ref(getDb(), `games/${roomId}`);
}

export async function createRoom(roomId: string, gameState: GameState): Promise<void> {
  await set(gameRef(roomId), gameState);
}

export async function getRoom(roomId: string): Promise<GameState | null> {
  const snapshot = await get(gameRef(roomId));
  return snapshot.exists() ? hydrateGameState(snapshot.val()) : null;
}

export async function updateRoom(roomId: string, updates: Partial<GameState>): Promise<void> {
  await update(gameRef(roomId), updates);
}

export async function setRoom(roomId: string, state: GameState): Promise<void> {
  await set(gameRef(roomId), { ...state, lastActivity: Date.now() });
}

export function subscribeToRoom(
  roomId: string,
  callback: (state: GameState | null) => void
): () => void {
  const unsubscribe = onValue(gameRef(roomId), (snapshot) => {
    callback(snapshot.exists() ? hydrateGameState(snapshot.val()) : null);
  });
  return unsubscribe;
}

/**
 * Register presence at a SEPARATE path (presence/{roomId}/{playerId}).
 * Uses onDisconnect to auto-clear when client drops.
 * Returns a cleanup function to cancel the onDisconnect handler.
 */
export function registerPresence(
  roomId: string,
  playerId: string,
): () => void {
  const presenceRef = ref(getDb(), `presence/${roomId}/${playerId}`);

  // Mark connected now
  set(presenceRef, true).catch(() => {});

  // When client disconnects, Firebase server removes the entry
  const disconnectRef = onDisconnect(presenceRef);
  disconnectRef.remove().catch(() => {});

  // Return cleanup that cancels the onDisconnect
  return () => {
    disconnectRef.cancel().catch(() => {});
  };
}

/**
 * Explicitly mark a player as disconnected (e.g. when they click Leave).
 */
export function clearPresence(roomId: string, playerId: string): void {
  const presenceRef = ref(getDb(), `presence/${roomId}/${playerId}`);
  remove(presenceRef).catch(() => {});
}

/**
 * Subscribe to presence data for a room.
 * Returns a map of playerId -> true for connected players.
 */
export function subscribeToPresence(
  roomId: string,
  callback: (connected: Set<string>) => void,
): () => void {
  const presenceRef = ref(getDb(), `presence/${roomId}`);
  return onValue(presenceRef, (snapshot) => {
    const data = snapshot.val() as Record<string, boolean> | null;
    const connected = new Set<string>();
    if (data) {
      for (const [pid, val] of Object.entries(data)) {
        if (val) connected.add(pid);
      }
    }
    callback(connected);
  });
}

export async function deleteRoom(roomId: string): Promise<void> {
  const db = getDb();
  await Promise.all([
    remove(gameRef(roomId)),
    remove(ref(db, `voice/${roomId}`)),
    remove(ref(db, `chat/${roomId}`)),
    remove(ref(db, `presence/${roomId}`)),
  ]);
}

/**
 * Subscribe to Firebase connection state.
 * Returns true when connected, false when disconnected.
 */
export function subscribeToConnectionState(
  callback: (isConnected: boolean) => void
): () => void {
  const connectedRef = ref(getDb(), ".info/connected");
  return onValue(connectedRef, (snapshot) => {
    callback(snapshot.val() === true);
  });
}
