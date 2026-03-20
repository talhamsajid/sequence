// Re-export shared utilities from game-logic package
export { generateRoomCode, generatePlayerId, cn } from "@sequence/game-logic";

import { generatePlayerId } from "@sequence/game-logic";

// Web-specific: localStorage-backed player identity

export function getPlayerId(): string {
  if (typeof window === "undefined") return generatePlayerId();
  let id = localStorage.getItem("sequence_player_id");
  if (!id) {
    id = generatePlayerId();
    localStorage.setItem("sequence_player_id", id);
  }
  return id;
}

export function getPlayerName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sequence_player_name");
}

export function setPlayerName(name: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("sequence_player_name", name);
  }
}
