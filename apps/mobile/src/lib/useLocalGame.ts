// Local (hot-seat) game state hook — no Firebase, pure game logic
// This powers single-device multiplayer (pass-and-play)

import { useState, useCallback, useRef } from "react";
import {
  type GameState,
  type CreateGameOptions,
  createGame,
  addPlayer,
  startGame,
  playCard,
  getValidPositions,
  hasPlayableCard,
  replaceDeadCards,
  getRandomValidMove,
  generatePlayerId,
  generateRoomCode,
} from "@sequence/game-logic";

interface LocalGameActions {
  create: (hostName: string, options: CreateGameOptions) => void;
  join: (playerName: string) => string;
  start: () => void;
  play: (playerId: string, cardIndex: number, row: number, col: number) => void;
  autoPlay: (playerId: string) => void;
  reset: () => void;
}

export function useLocalGame(): {
  state: GameState | null;
  actions: LocalGameActions;
} {
  const [state, setState] = useState<GameState | null>(null);
  const hostIdRef = useRef<string>("");

  const create = useCallback((hostName: string, options: CreateGameOptions) => {
    const hostId = generatePlayerId();
    hostIdRef.current = hostId;
    const roomId = generateRoomCode();
    const newState = createGame(hostId, hostName, roomId, options);
    setState(newState);
  }, []);

  const join = useCallback((playerName: string): string => {
    const playerId = generatePlayerId();
    setState((prev) => {
      if (!prev) throw new Error("No game to join");
      return addPlayer(prev, playerId, playerName);
    });
    return playerId;
  }, []);

  const start = useCallback(() => {
    setState((prev) => {
      if (!prev) throw new Error("No game to start");
      return startGame(prev);
    });
  }, []);

  const play = useCallback(
    (playerId: string, cardIndex: number, row: number, col: number) => {
      setState((prev) => {
        if (!prev) throw new Error("No game in progress");
        return playCard(prev, playerId, cardIndex, row, col);
      });
    },
    []
  );

  const autoPlay = useCallback((playerId: string) => {
    setState((prev) => {
      if (!prev) return prev;
      const move = getRandomValidMove(prev, playerId);
      if (!move) return prev;
      return playCard(prev, playerId, move.cardIndex, move.row, move.col);
    });
  }, []);

  const reset = useCallback(() => {
    setState(null);
  }, []);

  return {
    state,
    actions: { create, join, start, play, autoPlay, reset },
  };
}
