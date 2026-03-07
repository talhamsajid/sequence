// Generate a short room code
export function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// Generate a unique player ID
export function generatePlayerId(): string {
  return `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Get or create player ID from localStorage
export function getPlayerId(): string {
  if (typeof window === "undefined") return generatePlayerId();
  let id = localStorage.getItem("sequence_player_id");
  if (!id) {
    id = generatePlayerId();
    localStorage.setItem("sequence_player_id", id);
  }
  return id;
}

// Get or set player name
export function getPlayerName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("sequence_player_name");
}

export function setPlayerName(name: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("sequence_player_name", name);
  }
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
