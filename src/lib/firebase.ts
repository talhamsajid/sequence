import { initializeApp, getApps } from "firebase/app";
import {
  getDatabase,
  ref,
  set,
  get,
  onValue,
  update,
  remove,
  type DatabaseReference,
} from "firebase/database";
import type { GameState } from "./game";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

function gameRef(roomId: string): DatabaseReference {
  return ref(db, `games/${roomId}`);
}

export async function createRoom(roomId: string, gameState: GameState): Promise<void> {
  await set(gameRef(roomId), gameState);
}

export async function getRoom(roomId: string): Promise<GameState | null> {
  const snapshot = await get(gameRef(roomId));
  return snapshot.exists() ? (snapshot.val() as GameState) : null;
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
    callback(snapshot.exists() ? (snapshot.val() as GameState) : null);
  });
  return unsubscribe;
}

export async function deleteRoom(roomId: string): Promise<void> {
  await remove(gameRef(roomId));
}

export { db };
