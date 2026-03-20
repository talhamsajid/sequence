// Platform-specific storage using React Native AsyncStorage
// Drop-in replacement for web's localStorage-based utils

import { generatePlayerId } from "@sequence/game-logic";

// In-memory fallback until AsyncStorage is loaded
let _playerId: string | null = null;
let _playerName: string | null = null;

// Lazy-load AsyncStorage to avoid import issues during SSR/testing
async function getStorage() {
  const { default: AsyncStorage } = await import(
    "@react-native-async-storage/async-storage"
  );
  return AsyncStorage;
}

export async function getPlayerId(): Promise<string> {
  if (_playerId) return _playerId;
  try {
    const storage = await getStorage();
    const id = await storage.getItem("sequence_player_id");
    if (id) {
      _playerId = id;
      return id;
    }
  } catch {
    // AsyncStorage not available — generate ephemeral ID
  }
  const newId = generatePlayerId();
  _playerId = newId;
  try {
    const storage = await getStorage();
    await storage.setItem("sequence_player_id", newId);
  } catch {
    // Silently continue with in-memory ID
  }
  return newId;
}

export async function getPlayerName(): Promise<string | null> {
  if (_playerName !== null) return _playerName;
  try {
    const storage = await getStorage();
    const name = await storage.getItem("sequence_player_name");
    _playerName = name;
    return name;
  } catch {
    return null;
  }
}

export async function setPlayerName(name: string): Promise<void> {
  _playerName = name;
  try {
    const storage = await getStorage();
    await storage.setItem("sequence_player_name", name);
  } catch {
    // Silently continue with in-memory name
  }
}
