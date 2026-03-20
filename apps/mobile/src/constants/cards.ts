/**
 * Static require map for card SVG assets.
 * With react-native-svg-transformer, require() returns a React component.
 */

import type { SvgProps } from "react-native-svg";
import type { FC } from "react";

const RANK_MAP: Record<string, string> = {
  A: "ace", "2": "2", "3": "3", "4": "4", "5": "5",
  "6": "6", "7": "7", "8": "8", "9": "9", T: "10",
  J: "jack", Q: "queen", K: "king",
};

const SUIT_MAP: Record<string, string> = {
  s: "spades", h: "hearts", d: "diamonds", c: "clubs",
};

export function getCardAssetKey(card: string): string {
  const rank = RANK_MAP[card[0]] ?? card[0];
  const suit = SUIT_MAP[card[1]] ?? card[1];
  return `${rank}_of_${suit}`;
}

export type CardSvgComponent = FC<SvgProps>;

// Static require map — every SVG is imported as a component
const CARD_ASSETS: Record<string, CardSvgComponent> = {
  "ace_of_spades": require("../../assets/cards/ace_of_spades.svg").default,
  "ace_of_hearts": require("../../assets/cards/ace_of_hearts.svg").default,
  "ace_of_diamonds": require("../../assets/cards/ace_of_diamonds.svg").default,
  "ace_of_clubs": require("../../assets/cards/ace_of_clubs.svg").default,
  "2_of_spades": require("../../assets/cards/2_of_spades.svg").default,
  "2_of_hearts": require("../../assets/cards/2_of_hearts.svg").default,
  "2_of_diamonds": require("../../assets/cards/2_of_diamonds.svg").default,
  "2_of_clubs": require("../../assets/cards/2_of_clubs.svg").default,
  "3_of_spades": require("../../assets/cards/3_of_spades.svg").default,
  "3_of_hearts": require("../../assets/cards/3_of_hearts.svg").default,
  "3_of_diamonds": require("../../assets/cards/3_of_diamonds.svg").default,
  "3_of_clubs": require("../../assets/cards/3_of_clubs.svg").default,
  "4_of_spades": require("../../assets/cards/4_of_spades.svg").default,
  "4_of_hearts": require("../../assets/cards/4_of_hearts.svg").default,
  "4_of_diamonds": require("../../assets/cards/4_of_diamonds.svg").default,
  "4_of_clubs": require("../../assets/cards/4_of_clubs.svg").default,
  "5_of_spades": require("../../assets/cards/5_of_spades.svg").default,
  "5_of_hearts": require("../../assets/cards/5_of_hearts.svg").default,
  "5_of_diamonds": require("../../assets/cards/5_of_diamonds.svg").default,
  "5_of_clubs": require("../../assets/cards/5_of_clubs.svg").default,
  "6_of_spades": require("../../assets/cards/6_of_spades.svg").default,
  "6_of_hearts": require("../../assets/cards/6_of_hearts.svg").default,
  "6_of_diamonds": require("../../assets/cards/6_of_diamonds.svg").default,
  "6_of_clubs": require("../../assets/cards/6_of_clubs.svg").default,
  "7_of_spades": require("../../assets/cards/7_of_spades.svg").default,
  "7_of_hearts": require("../../assets/cards/7_of_hearts.svg").default,
  "7_of_diamonds": require("../../assets/cards/7_of_diamonds.svg").default,
  "7_of_clubs": require("../../assets/cards/7_of_clubs.svg").default,
  "8_of_spades": require("../../assets/cards/8_of_spades.svg").default,
  "8_of_hearts": require("../../assets/cards/8_of_hearts.svg").default,
  "8_of_diamonds": require("../../assets/cards/8_of_diamonds.svg").default,
  "8_of_clubs": require("../../assets/cards/8_of_clubs.svg").default,
  "9_of_spades": require("../../assets/cards/9_of_spades.svg").default,
  "9_of_hearts": require("../../assets/cards/9_of_hearts.svg").default,
  "9_of_diamonds": require("../../assets/cards/9_of_diamonds.svg").default,
  "9_of_clubs": require("../../assets/cards/9_of_clubs.svg").default,
  "10_of_spades": require("../../assets/cards/10_of_spades.svg").default,
  "10_of_hearts": require("../../assets/cards/10_of_hearts.svg").default,
  "10_of_diamonds": require("../../assets/cards/10_of_diamonds.svg").default,
  "10_of_clubs": require("../../assets/cards/10_of_clubs.svg").default,
  "jack_of_spades": require("../../assets/cards/jack_of_spades.svg").default,
  "jack_of_hearts": require("../../assets/cards/jack_of_hearts.svg").default,
  "jack_of_diamonds": require("../../assets/cards/jack_of_diamonds.svg").default,
  "jack_of_clubs": require("../../assets/cards/jack_of_clubs.svg").default,
  "queen_of_spades": require("../../assets/cards/queen_of_spades.svg").default,
  "queen_of_hearts": require("../../assets/cards/queen_of_hearts.svg").default,
  "queen_of_diamonds": require("../../assets/cards/queen_of_diamonds.svg").default,
  "queen_of_clubs": require("../../assets/cards/queen_of_clubs.svg").default,
  "king_of_spades": require("../../assets/cards/king_of_spades.svg").default,
  "king_of_hearts": require("../../assets/cards/king_of_hearts.svg").default,
  "king_of_diamonds": require("../../assets/cards/king_of_diamonds.svg").default,
  "king_of_clubs": require("../../assets/cards/king_of_clubs.svg").default,
  "back": require("../../assets/cards/back.svg").default,
};

export function getCardSvg(card: string): CardSvgComponent | null {
  const key = getCardAssetKey(card);
  return CARD_ASSETS[key] ?? null;
}

export function getCardBackSvg(): CardSvgComponent {
  return CARD_ASSETS["back"];
}
