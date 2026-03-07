/** Maps game card codes (e.g. "As", "Th") to SVG image paths in /cards/ */

const RANK_MAP: Record<string, string> = {
  A: "ace",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  T: "10",
  J: "jack",
  Q: "queen",
  K: "king",
};

const SUIT_MAP: Record<string, string> = {
  s: "spades",
  h: "hearts",
  d: "diamonds",
  c: "clubs",
};

export function getCardImagePath(card: string): string {
  const rank = RANK_MAP[card[0]] ?? card[0];
  const suit = SUIT_MAP[card[1]] ?? card[1];
  return `/cards/${rank}_of_${suit}.svg`;
}

export const CARD_BACK_PATH = "/cards/back.svg";
