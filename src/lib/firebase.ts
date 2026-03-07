import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  update,
  remove,
  type Database,
} from "firebase/database";
import type { GameState, ChipGrid } from "./game";

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

  return {
    ...state,
    chips,
    deck,
    sequences,
    playerOrder,
    players,
    deckIndex: state.deckIndex ?? 0,
    currentTurn: state.currentTurn ?? 0,
    sequencesNeeded: state.sequencesNeeded ?? 2,
    winner: state.winner ?? null,
    lastMove: state.lastMove ?? null,
  };
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;
let _db: Database | null = null;

function getApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  }
  return _app;
}

function getDb(): Database {
  if (!_db) {
    _db = getDatabase(getApp());
  }
  return _db;
}

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
  await set(gameRef(roomId), state);
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

export async function deleteRoom(roomId: string): Promise<void> {
  await remove(gameRef(roomId));
}
