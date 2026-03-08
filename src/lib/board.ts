// Standard Sequence board layout - 10x10 grid
// Each card appears exactly twice on the board. Jacks are NOT on the board.
// Corners are free/wild spaces.
// Format: RS where R=rank (A,2,3,4,5,6,7,8,9,T,Q,K), S=suit (s,h,d,c)
// FREE = corner wild space

export type Card = string; // e.g. "2s", "Ah", "Kd", "Tc"
export type BoardCell = Card | "FREE";

export const BOARD: BoardCell[][] = [
  ["FREE", "2s", "3s", "4s", "5s", "6s", "7s", "8s", "9s", "FREE"],
  ["6c",   "5c", "4c", "3c", "2c", "Ah", "Kh", "Qh", "Th", "Ts"],
  ["7c",   "As", "2d", "3d", "4d", "5d", "6d", "7d", "9h", "Qs"],
  ["8c",   "Ks", "6c", "5c", "4c", "3c", "2c", "8d", "8h", "Ks"],
  ["9c",   "Qs", "7c", "6h", "5h", "4h", "Ah", "9d", "7h", "As"],
  ["Tc",   "Ts", "8c", "7h", "2h", "3h", "Kh", "Td", "6h", "2d"],
  ["Qc",   "9s", "9c", "8h", "9h", "Th", "Qh", "Qd", "5h", "3d"],
  ["Kc",   "8s", "Tc", "Qc", "Kc", "Ac", "Ad", "Kd", "4h", "4d"],
  ["Ac",   "7s", "6s", "5s", "4s", "3s", "2s", "2h", "3h", "5d"],
  ["FREE", "Ad", "Kd", "Qd", "Td", "9d", "8d", "7d", "6d", "FREE"],
];

export const SUITS = ["s", "h", "d", "c"] as const;
export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export function cardDisplay(card: Card): { rank: string; suit: string; color: "red" | "black" } {
  const rank = card[0];
  const suit = card[1] as Suit;
  const rankMap: Record<string, string> = {
    A: "A", "2": "2", "3": "3", "4": "4", "5": "5",
    "6": "6", "7": "7", "8": "8", "9": "9", T: "10", Q: "Q", K: "K",
  };
  const suitMap: Record<Suit, string> = { s: "\u2660", h: "\u2665", d: "\u2666", c: "\u2663" };
  const color: "red" | "black" = suit === "h" || suit === "d" ? "red" : "black";
  return { rank: rankMap[rank] ?? rank, suit: suitMap[suit], color };
}

export function isOneEyedJack(card: Card): boolean {
  // One-eyed Jacks: Jack of Spades, Jack of Hearts
  return card === "Js" || card === "Jh";
}

export function isTwoEyedJack(card: Card): boolean {
  // Two-eyed Jacks: Jack of Diamonds, Jack of Clubs
  return card === "Jd" || card === "Jc";
}

// Create a full double-deck (104 cards)
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push(`${rank}${suit}`);
    }
  }
  // Two decks
  return [...deck, ...deck];
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Find all board positions matching a card
export function findCardPositions(card: Card): [number, number][] {
  const positions: [number, number][] = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 10; c++) {
      if (BOARD[r][c] === card) {
        positions.push([r, c]);
      }
    }
  }
  return positions;
}
