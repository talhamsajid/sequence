import { BOARD, createDeck, shuffleDeck, findCardPositions, isOneEyedJack, isTwoEyedJack, type Card } from "./board";
import type { GameMode, TeamsRecord } from "./teams";
import {
  assignPlayerToTeam,
  getPlayerTeamColor,
  getPlayerTeam,
  buildTeamTurnOrder,
  countTeamSequences,
  getMaxPlayers,
  createTeams,
  removePlayerFromTeam,
} from "./teams";

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
  mode: GameMode;
  players: Record<string, Player>;
  playerOrder: string[]; // player IDs in turn order
  currentTurn: number; // index into playerOrder
  chips: ChipGrid;
  deck: Card[];
  deckIndex: number;
  sequences: Sequence[];
  sequencesNeeded: number;
  winner: string | null; // player ID, team ID, or null
  winnerLabel: string | null; // display name for the winner
  teams: TeamsRecord | null; // null in solo mode
  lastMove: { row: number; col: number; card: Card; playerId: string } | null;
  turnStartedAt: number | null;
  turnTimeLimit: number;
  createdAt: number;
  lastActivity: number;
  hostId: string;
  gameHistory: GameHistoryEntry[];
  scores: Record<string, number> | null; // player/team ID → sequence count on finish
}

export interface Sequence {
  cells: [number, number][];
  color: PlayerColor;
}

export interface GameHistoryEntry {
  gameNumber: number;
  winnerId: string | null;
  winnerLabel: string;
  scores: Record<string, { name: string; color: string; sequences: number }>;
  timestamp: number;
}

const HAND_SIZE: Record<number, number> = {
  2: 6,
  3: 5,
  4: 5,
  5: 4,
  6: 4,
};

export interface CreateGameOptions {
  mode: GameMode;
  sequencesNeeded: number;
  teamCount?: number; // 2 or 3, only for teams mode
}

export function createGame(
  hostId: string,
  hostName: string,
  roomId: string,
  options: CreateGameOptions = { mode: "solo", sequencesNeeded: 2 }
): GameState {
  const { mode, sequencesNeeded, teamCount = 2 } = options;

  const isTeams = mode === "teams";
  let teams: TeamsRecord | null = null;
  let hostColor: PlayerColor = "red";

  if (isTeams) {
    teams = createTeams(teamCount);
    teams = assignPlayerToTeam(teams, hostId);
    hostColor = getPlayerTeamColor(teams, hostId) ?? "red";
  }

  return {
    id: roomId,
    phase: "waiting",
    mode,
    players: {
      [hostId]: {
        id: hostId,
        name: hostName,
        color: hostColor,
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
    sequencesNeeded,
    winner: null,
    winnerLabel: null,
    teams,
    lastMove: null,
    turnStartedAt: null,
    turnTimeLimit: 60,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    hostId,
    gameHistory: [],
    scores: null,
  };
}

export function addPlayer(state: GameState, playerId: string, playerName: string): GameState {
  const playerCount = Object.keys(state.players).length;
  const teamCount = state.teams ? Object.keys(state.teams).length : 0;
  const maxPlayers = getMaxPlayers(state.mode, teamCount);
  if (playerCount >= maxPlayers) throw new Error("Game is full");
  if (state.phase !== "waiting") throw new Error("Game already started");

  let color: PlayerColor;
  let newTeams = state.teams;

  if (state.mode === "teams" && state.teams) {
    newTeams = assignPlayerToTeam(state.teams, playerId);
    color = getPlayerTeamColor(newTeams, playerId) ?? PLAYER_COLORS[playerCount];
  } else {
    // Solo mode: pick the first color not already taken
    const takenColors = new Set(Object.values(state.players).map((p) => p.color));
    color = PLAYER_COLORS.find((c) => !takenColors.has(c)) ?? PLAYER_COLORS[playerCount];
  }

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
    teams: newTeams,
  };
}

/**
 * Remove a player from the game.
 * - Lobby: removes from players, playerOrder, teams.
 *   If host leaves, transfers host to next player. If no players left, returns null (delete room).
 * - Playing: removes player, skips their turns, returns cards to deck.
 *   If <2 players remain, the remaining player/team wins.
 * - Finished: just removes from players.
 */
export function removePlayer(state: GameState, playerId: string): GameState | null {
  if (!state.players[playerId]) return state;

  const { [playerId]: _removed, ...remainingPlayers } = state.players;
  const remainingCount = Object.keys(remainingPlayers).length;

  // No players left — signal to delete room
  if (remainingCount === 0) return null;

  // Remove from playerOrder
  const newPlayerOrder = state.playerOrder.filter((pid) => pid !== playerId);

  // Remove from teams if applicable
  const newTeams = state.teams ? removePlayerFromTeam(state.teams, playerId) : null;

  // Transfer host if the leaving player is host
  const newHostId = state.hostId === playerId ? newPlayerOrder[0] : state.hostId;

  // Lobby phase — simple removal
  if (state.phase === "waiting") {
    return {
      ...state,
      players: remainingPlayers,
      playerOrder: newPlayerOrder,
      teams: newTeams,
      hostId: newHostId,
    };
  }

  // Finished phase — simple removal
  if (state.phase === "finished") {
    return {
      ...state,
      players: remainingPlayers,
      playerOrder: newPlayerOrder,
      teams: newTeams,
      hostId: newHostId,
    };
  }

  // Playing phase — mark as disconnected instead of removing.
  // Their turns will be auto-played by the timer. They can rejoin.
  const disconnectedPlayers = {
    ...state.players,
    [playerId]: { ...state.players[playerId], connected: false },
  };

  // Check if ALL players are now disconnected — end game
  const connectedCount = Object.values(disconnectedPlayers).filter((p) => p.connected).length;
  if (connectedCount === 0) {
    return {
      ...state,
      phase: "finished",
      players: disconnectedPlayers,
      hostId: newHostId,
      winner: null,
      winnerLabel: "Everyone left",
      turnStartedAt: null,
    };
  }

  // Transfer host to a connected player if needed
  const activeHostId = disconnectedPlayers[newHostId]?.connected
    ? newHostId
    : state.playerOrder.find((pid) => disconnectedPlayers[pid]?.connected) ?? newHostId;

  return {
    ...state,
    players: disconnectedPlayers,
    hostId: activeHostId,
  };
}

/** Rejoin a disconnected player back into the game. */
export function rejoinPlayer(state: GameState, playerId: string): GameState {
  const player = state.players[playerId];
  if (!player) return state;
  if (player.connected) return state;

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: { ...player, connected: true },
    },
  };
}

export function startGame(state: GameState): GameState {
  const playerCount = Object.keys(state.players).length;
  if (playerCount < 2) throw new Error("Need at least 2 players");

  // Enforce unique colors in solo mode
  if (state.mode === "solo") {
    const colors = Object.values(state.players).map((p) => p.color);
    if (new Set(colors).size !== colors.length) {
      throw new Error("Each player must have a unique chip color");
    }
  }

  if (state.mode === "teams" && state.teams) {
    // Validate all teams have equal players
    const teamIds = Object.keys(state.teams);
    const teamSizes = teamIds.map((id) => state.teams![id].playerIds.length);
    if (teamSizes.some((s) => s !== teamSizes[0])) {
      throw new Error("Teams must have equal players");
    }
    if (teamSizes[0] < 1) throw new Error("Each team needs at least 1 player");
  }

  const handSize = HAND_SIZE[playerCount] ?? 5;
  const deck = shuffleDeck(createDeck());
  let deckIndex = 0;

  const players: Record<string, Player> = {};
  for (const [id, player] of Object.entries(state.players)) {
    const hand = deck.slice(deckIndex, deckIndex + handSize);
    deckIndex += handSize;
    players[id] = { ...player, hand };
  }

  // Build turn order: in team mode, alternate between teams
  const playerOrder =
    state.mode === "teams" && state.teams
      ? buildTeamTurnOrder(state.teams)
      : state.playerOrder;

  // Preserve game history; if restarting from a finished game, the result was already recorded
  const gameHistory = state.gameHistory ?? [];

  return {
    ...state,
    phase: "playing",
    players,
    playerOrder,
    deck,
    deckIndex,
    currentTurn: 0,
    chips: Array.from({ length: 10 }, () => Array(10).fill(null)),
    sequences: [],
    winner: null,
    winnerLabel: null,
    lastMove: null,
    turnStartedAt: Date.now(),
    turnTimeLimit: 60,
    gameHistory,
    scores: null,
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

  // Check if game should end: all cards exhausted (deck empty + all hands empty)
  // or no remaining player can make a move
  const deckEmpty = newDeckIndex >= state.deck.length;
  const allHandsEmpty = Object.values(newPlayers).every((p) => p.hand.length === 0);

  let gameOver = allHandsEmpty && deckEmpty;

  // If deck empty but some players have cards, check if any move remains
  if (!gameOver && deckEmpty) {
    const tempState = { ...state, players: newPlayers, chips: newChips, sequences: newSequences, deckIndex: newDeckIndex };
    const anyPlayable = state.playerOrder.some((pid) => {
      const p = newPlayers[pid];
      return p.hand.length > 0 && p.hand.some((c) => getValidPositions(tempState, c).length > 0);
    });
    if (!anyPlayable) gameOver = true;
  }

  if (gameOver) {
    const result = determineWinner(newSequences, newPlayers, state);
    const historyEntry: GameHistoryEntry = {
      gameNumber: (state.gameHistory?.length ?? 0) + 1,
      winnerId: result.winnerId,
      winnerLabel: result.winnerLabel,
      scores: result.scoreDetails,
      timestamp: Date.now(),
    };

    return {
      ...state,
      players: newPlayers,
      chips: newChips,
      deckIndex: newDeckIndex,
      sequences: newSequences,
      phase: "finished",
      winner: result.winnerId,
      winnerLabel: result.winnerLabel,
      scores: result.scores,
      lastMove: { row, col, card, playerId },
      turnStartedAt: null,
      gameHistory: [...(state.gameHistory ?? []), historyEntry],
    };
  }

  // Advance turn, skipping players with empty hands
  let nextTurn = (state.currentTurn + 1) % state.playerOrder.length;
  let attempts = 0;
  while (attempts < state.playerOrder.length) {
    const nextPid = state.playerOrder[nextTurn];
    if (newPlayers[nextPid].hand.length > 0) break;
    nextTurn = (nextTurn + 1) % state.playerOrder.length;
    attempts++;
  }

  return {
    ...state,
    players: newPlayers,
    chips: newChips,
    deckIndex: newDeckIndex,
    currentTurn: nextTurn,
    sequences: newSequences,
    winner: null,
    winnerLabel: null,
    phase: "playing",
    lastMove: { row, col, card, playerId },
    turnStartedAt: Date.now(),
  };
}

function determineWinner(
  sequences: Sequence[],
  players: Record<string, Player>,
  state: GameState
): {
  winnerId: string | null;
  winnerLabel: string;
  scores: Record<string, number>;
  scoreDetails: Record<string, { name: string; color: string; sequences: number }>;
} {
  const scores: Record<string, number> = {};
  const scoreDetails: Record<string, { name: string; color: string; sequences: number }> = {};

  if (state.mode === "teams" && state.teams) {
    for (const [teamId, team] of Object.entries(state.teams)) {
      const count = countTeamSequences(sequences, team.color);
      scores[teamId] = count;
      scoreDetails[teamId] = { name: team.name, color: team.color, sequences: count };
    }
  } else {
    for (const pid of state.playerOrder) {
      const p = players[pid];
      const count = countPlayerSequences(sequences, p.color);
      scores[pid] = count;
      scoreDetails[pid] = { name: p.name, color: p.color, sequences: count };
    }
  }

  const maxScore = Math.max(...Object.values(scores), 0);

  if (maxScore === 0) {
    return { winnerId: null, winnerLabel: "Draw — no sequences!", scores, scoreDetails };
  }

  const winners = Object.entries(scores).filter(([, s]) => s === maxScore);

  if (winners.length === 1) {
    const id = winners[0][0];
    return { winnerId: id, winnerLabel: scoreDetails[id].name, scores, scoreDetails };
  }

  return { winnerId: null, winnerLabel: "Draw!", scores, scoreDetails };
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

// Pick a random valid move for a player (random playable card + random valid position)
export function getRandomValidMove(
  state: GameState,
  playerId: string
): { cardIndex: number; row: number; col: number } | null {
  const player = state.players[playerId];
  if (!player) return null;

  // Collect all cards that have at least one valid position
  const playableCards: { cardIndex: number; positions: [number, number][] }[] = [];
  for (let i = 0; i < player.hand.length; i++) {
    const positions = getValidPositions(state, player.hand[i]);
    if (positions.length > 0) {
      playableCards.push({ cardIndex: i, positions });
    }
  }

  if (playableCards.length === 0) return null;

  // Pick a random card, then a random position
  const chosen = playableCards[Math.floor(Math.random() * playableCards.length)];
  const [row, col] = chosen.positions[Math.floor(Math.random() * chosen.positions.length)];
  return { cardIndex: chosen.cardIndex, row, col };
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
