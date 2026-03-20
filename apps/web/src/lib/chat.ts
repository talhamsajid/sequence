import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getDatabase,
  ref,
  push,
  onValue,
  query,
  limitToLast,
  type Database,
} from "firebase/database";

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  text: string;
  timestamp: number;
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

function getApp(): FirebaseApp {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

function getDb(): Database {
  return getDatabase(getApp());
}

function chatRef(roomId: string) {
  return ref(getDb(), `chat/${roomId}`);
}

export async function sendMessage(
  roomId: string,
  message: {
    playerId: string;
    playerName: string;
    playerColor: string;
    text: string;
  }
): Promise<void> {
  const trimmed = message.text.trim();
  if (!trimmed) return;

  const msgRef = chatRef(roomId);
  await push(msgRef, {
    playerId: message.playerId,
    playerName: message.playerName,
    playerColor: message.playerColor,
    text: trimmed,
    timestamp: Date.now(),
  });
}

export function subscribeToChatMessages(
  roomId: string,
  callback: (messages: ChatMessage[]) => void
): () => void {
  const messagesQuery = query(chatRef(roomId), limitToLast(100));

  const unsubscribe = onValue(messagesQuery, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }

    const data = snapshot.val() as Record<string, Omit<ChatMessage, "id">>;
    const messages: ChatMessage[] = Object.entries(data).map(
      ([id, msg]) => ({
        id,
        playerId: msg.playerId ?? "",
        playerName: msg.playerName ?? "Unknown",
        playerColor: msg.playerColor ?? "red",
        text: msg.text ?? "",
        timestamp: msg.timestamp ?? 0,
      })
    );

    callback(messages);
  });

  return unsubscribe;
}
