import React, { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions, ScrollView } from "react-native";
import {
  type GameState,
  type PlayerColor,
  BOARD,
  getValidPositions,
} from "@sequence/game-logic";
import type { Card } from "@sequence/game-logic";
import { CardCell } from "./CardCell";
import { colors, spacing } from "../constants/theme";

interface GameBoardProps {
  state: GameState;
  selectedCard: Card | null;
  playerId: string;
  onCellPress: (row: number, col: number) => void;
}

export function GameBoard({ state, selectedCard, playerId, onCellPress }: GameBoardProps) {
  const { width } = useWindowDimensions();

  // Board takes full width minus padding
  const boardPadding = spacing.sm * 2;
  const boardSize = width - boardPadding;
  const cellSize = Math.floor(boardSize / 10);
  const actualBoardSize = cellSize * 10;

  // Compute valid positions for selected card
  const validPositions = useMemo(() => {
    if (!selectedCard || state.phase !== "playing") return new Set<string>();
    const positions = getValidPositions(state, selectedCard);
    return new Set(positions.map(([r, c]) => `${r},${c}`));
  }, [selectedCard, state]);

  // Compute sequence cell set
  const sequenceCells = useMemo(() => {
    const set = new Set<string>();
    for (const seq of state.sequences) {
      for (const [r, c] of seq.cells) {
        set.add(`${r},${c}`);
      }
    }
    return set;
  }, [state.sequences]);

  // Last move
  const lastMoveKey = state.lastMove ? `${state.lastMove.row},${state.lastMove.col}` : null;

  return (
    <View style={[styles.container, { width: actualBoardSize }]}>
      {BOARD.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((cell, c) => {
            const key = `${r},${c}`;
            const isValid = validPositions.has(key);
            const isInSequence = sequenceCells.has(key);

            return (
              <CardCell
                key={key}
                cell={cell}
                chip={state.chips[r][c]}
                size={cellSize}
                isValid={isValid}
                isSelected={isValid && !!selectedCard}
                isLastMove={key === lastMoveKey}
                isInSequence={isInSequence}
                isNew={key === lastMoveKey && state.chips[r][c] !== null}
                onPress={() => onCellPress(r, c)}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.board,
    borderRadius: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(201,148,58,0.2)",
    alignSelf: "center",
  },
  row: {
    flexDirection: "row",
  },
});
