import { BOARD, createDeck, shuffleDeck, findCardPositions, isOneEyedJack, isTwoEyedJack, type Card } from "./board";

export type PlayerColor = "red" | "blue" | "green";
export const PLAYER_COLORS: PlayerColor[] = ["red", "blue", "green"];

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  hand: Card[];
  connected: boolean;
}

// null = empty, PlayerColor = chip placed
export type ChipGrid = (PlayerColor | null)[][];

export interface GameState {
  id: string;
  phase: "waiting" | "playing" | "finished";
  players: Record<string, Player>;
  playerOrder: string[]; // player IDs in turn order
  currentTurn: number; // index into playerOrder
  chips: ChipGrid;
  deck: Card[];
  deckIndex: number;
  sequences: Sequence[];
  sequencesNeeded: number;
  winner: string | null; // player ID or null
  lastMove: { row: number; col: number; card: Card; playerId: string } | null;
  createdAt: number;
  hostId: string;
}

export interface Sequence {
  cells: [number, number][];
  color: PlayerColor;
}

const HAND_SIZE: Record<number, number> = {
  2: 7,
  3: 6,
};

const SEQUENCES_NEEDED: Record<number, number> = {
  2: 2,
  3: 1,
};

export function createGame(hostId: string, hostName: string, roomId: string): GameState {
  return {
    id: roomId,
    phase: "waiting",
    players: {
      [hostId]: {
        id: hostId,
        name: hostName,
        color: "red",
        hand: [],
        connected: true,
      },
    },
    playerOrder: [hostId],
    currentTurn: 0,
    chips: Array.from({ length: 10 }, () => Array(10).fill(null)),
    deck: [],
    deckIndex: 0,
    sequences: [],
    sequencesNeeded: 2,
    winner: null,
    lastMove: null,
    createdAt: Date.now(),
    hostId,
  };
}

export function addPlayer(state: GameState, playerId: string, playerName: string): GameState {
  const playerCount = Object.keys(state.players).length;
  if (playerCount >= 3) throw new Error("Game is full");
  if (state.phase !== "waiting") throw new Error("Game already started");

  const color = PLAYER_COLORS[playerCount];
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        id: playerId,
        name: playerName,
        color,
        hand: [],
        connected: true,
      },
    },
    playerOrder: [...state.playerOrder, playerId],
  };
}

export function startGame(state: GameState): GameState {
  const playerCount = Object.keys(state.players).length;
  if (playerCount < 2) throw new Error("Need at least 2 players");

  const handSize = HAND_SIZE[playerCount] ?? 6;
  const sequencesNeeded = SEQUENCES_NEEDED[playerCount] ?? 2;
  const deck = shuffleDeck(createDeck());
  let deckIndex = 0;

  const players: Record<string, Player> = {};
  for (const [id, player] of Object.entries(state.players)) {
    const hand = deck.slice(deckIndex, deckIndex + handSize);
    deckIndex += handSize;
    players[id] = { ...player, hand };
  }

  return {
    ...state,
    phase: "playing",
    players,
    deck,
    deckIndex,
    sequencesNeeded,
    currentTurn: 0,
    chips: Array.from({ length: 10 }, () => Array(10).fill(null)),
    sequences: [],
    winner: null,
    lastMove: null,
  };
}

export function playCard(
  state: GameState,
  playerId: string,
  cardIndex: number,
  row: number,
  col: number
): GameState {
  if (state.phase !== "playing") throw new Error("Game not in progress");
  const currentPlayerId = state.playerOrder[state.currentTurn];
  if (currentPlayerId !== playerId) throw new Error("Not your turn");

  const player = state.players[playerId];
  const card = player.hand[cardIndex];
  if (!card) throw new Error("Invalid card index");

  const newChips: ChipGrid = state.chips.map((r) => [...r]);

  // Handle one-eyed Jack (remove opponent's chip)
  if (isOneEyedJack(card)) {
    if (row < 0 || row > 9 || col < 0 || col > 9) throw new Error("Invalid position");
    if (BOARD[row][col] === "FREE") throw new Error("Cannot remove from corner");
    if (newChips[row][col] === null) throw new Error("No chip to remove");
    if (newChips[row][col] === player.color) throw new Error("Cannot remove your own chip");
    // Check chip is not part of a completed sequence
    if (isCellInSequence(state.sequences, row, col)) throw new Error("Cannot remove chip from completed sequence");
    newChips[row][col] = null;
  }
  // Handle two-eyed Jack (wild - place anywhere empty)
  else if (isTwoEyedJack(card)) {
    if (row < 0 || row > 9 || col < 0 || col > 9) throw new Error("Invalid position");
    if (BOARD[row][col] === "FREE") throw new Error("Corner is already free");
    if (newChips[row][col] !== null) throw new Error("Position already occupied");
    newChips[row][col] = player.color;
  }
  // Normal card
  else {
    if (BOARD[row][col] !== card) throw new Error("Card does not match board position");
    if (newChips[row][col] !== null) throw new Error("Position already occupied");
    newChips[row][col] = player.color;
  }

  // Remove card from hand and draw new one
  const newHand = [...player.hand];
  newHand.splice(cardIndex, 1);
  let newDeckIndex = state.deckIndex;
  if (newDeckIndex < state.deck.length) {
    newHand.push(state.deck[newDeckIndex]);
    newDeckIndex++;
  }

  const newPlayers = {
    ...state.players,
    [playerId]: { ...player, hand: newHand },
  };

  // Check for new sequences
  const newSequences = findAllSequences(newChips, state.sequences);

  // Check for winner
  const playerSequences = countPlayerSequences(newSequences, player.color);
  const isWinner = playerSequences >= state.sequencesNeeded;

  // Advance turn
  const nextTurn = (state.currentTurn + 1) % state.playerOrder.length;

  return {
    ...state,
    players: newPlayers,
    chips: newChips,
    deckIndex: newDeckIndex,
    currentTurn: isWinner ? state.currentTurn : nextTurn,
    sequences: newSequences,
    winner: isWinner ? playerId : null,
    phase: isWinner ? "finished" : "playing",
    lastMove: { row, col, card, playerId },
  };
}

function isCellInSequence(sequences: Sequence[], row: number, col: number): boolean {
  return sequences.some((seq) => seq.cells.some(([r, c]) => r === row && c === col));
}

function countPlayerSequences(sequences: Sequence[], color: PlayerColor): number {
  return sequences.filter((s) => s.color === color).length;
}

// Directions: horizontal, vertical, diagonal-down-right, diagonal-down-left
const DIRECTIONS: [number, number][] = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

function findAllSequences(chips: ChipGrid, existingSequences: Sequence[]): Sequence[] {
  const sequences: Sequence[] = [...existingSequences];
  const usedInSequence = new Set<string>();

  // Mark existing sequence cells
  for (const seq of existingSequences) {
    for (const [r, c] of seq.cells) {
      usedInSequence.add(`${r},${c}`);
    }
  }

  for (const color of PLAYER_COLORS) {
    for (const [dr, dc] of DIRECTIONS) {
      for (let r = 0; r < 10; r++) {
        for (let c = 0; c < 10; c++) {
          const cells: [number, number][] = [];
          let valid = true;

          for (let i = 0; i < 5; i++) {
            const nr = r + dr * i;
            const nc = c + dc * i;
            if (nr < 0 || nr > 9 || nc < 0 || nc > 9) {
              valid = false;
              break;
            }
            const isCorner =
              (nr === 0 && nc === 0) ||
              (nr === 0 && nc === 9) ||
              (nr === 9 && nc === 0) ||
              (nr === 9 && nc === 9);
            if (chips[nr][nc] !== color && !isCorner) {
              valid = false;
              break;
            }
            cells.push([nr, nc]);
          }

          if (!valid) continue;

          // Check this isn't a duplicate of an existing sequence
          const cellKey = cells.map(([cr, cc]) => `${cr},${cc}`).join("|");
          const isDuplicate = sequences.some(
            (s) => s.color === color && s.cells.map(([cr, cc]) => `${cr},${cc}`).join("|") === cellKey
          );

          if (!isDuplicate) {
            // For a second sequence, at most one cell can overlap with existing sequences
            const overlapCount = cells.filter(([cr, cc]) => usedInSequence.has(`${cr},${cc}`)).length;
            // A second sequence can share at most 1 cell with a previous sequence
            if (overlapCount <= 1 || sequences.filter((s) => s.color === color).length === 0) {
              sequences.push({ cells, color });
              for (const [cr, cc] of cells) {
                usedInSequence.add(`${cr},${cc}`);
              }
            }
          }
        }
      }
    }
  }

  return sequences;
}

// Get valid positions for a card
export function getValidPositions(
  state: GameState,
  card: Card
): [number, number][] {
  if (isOneEyedJack(card)) {
    // Can remove any opponent chip not in a sequence
    const currentPlayer = state.players[state.playerOrder[state.currentTurn]];
    const positions: [number, number][] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (
          state.chips[r][c] !== null &&
          state.chips[r][c] !== currentPlayer.color &&
          !isCellInSequence(state.sequences, r, c)
        ) {
          positions.push([r, c]);
        }
      }
    }
    return positions;
  }

  if (isTwoEyedJack(card)) {
    // Can place anywhere empty (not FREE corners, they don't need chips)
    const positions: [number, number][] = [];
    for (let r = 0; r < 10; r++) {
      for (let c = 0; c < 10; c++) {
        if (BOARD[r][c] !== "FREE" && state.chips[r][c] === null) {
          positions.push([r, c]);
        }
      }
    }
    return positions;
  }

  // Normal card - find matching empty positions
  return findCardPositions(card).filter(([r, c]) => state.chips[r][c] === null);
}

// Check if a player has any playable card (dead card detection)
export function hasPlayableCard(state: GameState, playerId: string): boolean {
  const player = state.players[playerId];
  return player.hand.some((card) => getValidPositions(state, card).length > 0);
}

// Replace dead cards in hand
export function replaceDeadCards(state: GameState, playerId: string): GameState {
  const player = state.players[playerId];
  const newHand: Card[] = [];
  let deckIdx = state.deckIndex;

  for (const card of player.hand) {
    if (getValidPositions(state, card).length === 0 && deckIdx < state.deck.length) {
      // Dead card - replace it
      newHand.push(state.deck[deckIdx]);
      deckIdx++;
    } else {
      newHand.push(card);
    }
  }

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, hand: newHand },
    },
    deckIndex: deckIdx,
  };
}
