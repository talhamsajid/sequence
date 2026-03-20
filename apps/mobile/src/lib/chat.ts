import {
  getDatabase,
  ref,
  push,
  onValue,
  query,
  limitToLast,
} from "firebase/database";
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";

export interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  text: string;
  timestamp: number;
}

// Re-use the same Firebase app instance that firebase.ts creates.
// firebase/app deduplicates — getApps()[0] returns the singleton.
const firebaseConfig = {
  apiKey: "AIzaSyDnb6NWw0eAsatYE8HF11RcZ2LltyvbHXU",
  authDomain: "sequence-game-online.firebaseapp.com",
  databaseURL: "https://sequence-game-online-default-rtdb.firebaseio.com",
  projectId: "sequence-game-online",
  storageBucket: "sequence-game-online.firebasestorage.app",
  messagingSenderId: "884344372722",
  appId: "1:884344372722:web:e5017d48ca6f38a4e2bf6b",
};

function getApp(): FirebaseApp {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
}

function getDb() {
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
