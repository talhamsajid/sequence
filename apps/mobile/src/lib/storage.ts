import AsyncStorage from "@react-native-async-storage/async-storage";
import { generatePlayerId } from "@sequence/game-logic";

// In-memory cache for synchronous access after initial load
let _playerId: string | null = null;
let _playerName: string | null = null;
let _initialized = false;

/**
 * Initialize storage by loading cached values from AsyncStorage.
 * Call once at app startup before using sync getters.
 */
export async function initStorage(): Promise<void> {
  if (_initialized) return;
  try {
    const [id, name] = await Promise.all([
      AsyncStorage.getItem("sequence_player_id"),
      AsyncStorage.getItem("sequence_player_name"),
    ]);
    if (id) _playerId = id;
    if (name) _playerName = name;
  } catch {
    // AsyncStorage not available — continue with in-memory
  }
  _initialized = true;
}

/**
 * Get or create a persistent player ID (synchronous after init).
 */
export function getPlayerId(): string {
  if (_playerId) return _playerId;
  const newId = generatePlayerId();
  _playerId = newId;
  AsyncStorage.setItem("sequence_player_id", newId).catch(() => {});
  return newId;
}

/**
 * Get the stored player name (synchronous after init).
 */
export function getPlayerName(): string | null {
  return _playerName;
}

/**
 * Persist the player name.
 */
export function setPlayerName(name: string): void {
  _playerName = name;
  AsyncStorage.setItem("sequence_player_name", name).catch(() => {});
}
