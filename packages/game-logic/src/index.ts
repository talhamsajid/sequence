// @sequence/game-logic — shared game engine for web and mobile

// Core game engine
export {
  createGame,
  addPlayer,
  removePlayer,
  rejoinPlayer,
  startGame,
  playCard,
  getValidPositions,
  hasPlayableCard,
  getRandomValidMove,
  replaceDeadCards,
} from "./game";
export type {
  PlayerColor,
  Player,
  ChipGrid,
  GameState,
  Sequence,
  GameHistoryEntry,
  CreateGameOptions,
} from "./game";
export { PLAYER_COLORS } from "./game";

// Board layout and card utilities
export {
  BOARD,
  SUITS,
  RANKS,
  cardDisplay,
  isOneEyedJack,
  isTwoEyedJack,
  createDeck,
  shuffleDeck,
  findCardPositions,
} from "./board";
export type { Card, BoardCell, Suit, Rank } from "./board";

// Team management
export {
  getMaxPlayers,
  getMinPlayers,
  createTeams,
  assignPlayerToTeam,
  removePlayerFromTeam,
  getPlayerTeam,
  getPlayerTeamColor,
  buildTeamTurnOrder,
  countTeamSequences,
  switchPlayerTeam,
  getDefaultSequencesNeeded,
} from "./teams";
export type { GameMode, Team, TeamsRecord } from "./teams";

// Avatars
export { getPlayerAvatar } from "./avatars";

// Platform-agnostic utilities
export { generateRoomCode, generatePlayerId, cn } from "./utils";
