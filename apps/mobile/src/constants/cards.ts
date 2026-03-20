/** Maps game card codes to require()-based asset references for React Native */

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

// Build a static map of card code → image key for RN asset loading
// Card SVGs will be copied from web/public/cards/ and loaded via Image source
export function getCardAssetKey(card: string): string {
  const rank = RANK_MAP[card[0]] ?? card[0];
  const suit = SUIT_MAP[card[1]] ?? card[1];
  return `${rank}_of_${suit}`;
}

export const CARD_BACK_KEY = "back";
