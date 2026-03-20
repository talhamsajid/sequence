import React, { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, { Line } from "react-native-svg";
import {
  type GameState,
  type PlayerColor,
  BOARD,
  getValidPositions,
} from "@sequence/game-logic";
import { CardCell } from "./CardCell";
import { colors, spacing } from "../constants/theme";

interface GameBoardProps {
  state: GameState;
  selectedCardIndex: number | null;
  playerId: string;
  onCellClick: (row: number, col: number) => void;
  boardFlipped?: boolean;
}

const SEQUENCE_LINE_COLORS: Record<PlayerColor, { stroke: string; glow: string }> = {
  red: { stroke: "rgba(239,68,68,0.85)", glow: "rgba(239,68,68,0.4)" },
  blue: { stroke: "rgba(59,130,246,0.85)", glow: "rgba(59,130,246,0.4)" },
  green: { stroke: "rgba(16,185,129,0.85)", glow: "rgba(16,185,129,0.4)" },
};

export function GameBoard({
  state,
  selectedCardIndex,
  playerId,
  onCellClick,
  boardFlipped = false,
}: GameBoardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const player = state.players[playerId];
  const isMyTurn = state.playerOrder[state.currentTurn] === playerId;
  const selectedCard =
    selectedCardIndex !== null ? player?.hand?.[selectedCardIndex] : null;

  // Board sizing
  const boardPadding = spacing.sm * 2;
  const boardSize = Math.min(screenWidth - boardPadding, 520);
  const gap = 1;
  const cellWidth = Math.floor((boardSize - gap * 9 - boardPadding) / 10);
  const cellHeight = Math.floor(cellWidth * 1.45);
  const actualBoardWidth = cellWidth * 10 + gap * 9 + boardPadding;
  const actualBoardHeight = cellHeight * 10 + gap * 9 + boardPadding;
  const cellPad = boardPadding / 2;

  // Compute valid positions
  const validPositions = useMemo(() => {
    if (!selectedCard || !isMyTurn) return new Set<string>();
    const positions = getValidPositions(state, selectedCard);
    return new Set(positions.map(([r, c]) => `${r},${c}`));
  }, [selectedCard, state, isMyTurn]);

  // Sequence cell tracking
  const sequenceCells = useMemo(() => new Set<string>(), []);
  const sequenceCellColors = useMemo(() => {
    const map = new Map<string, string>();
    const cells = new Set<string>();
    for (const seq of state.sequences) {
      for (const [r, c] of seq.cells) {
        const k = `${r},${c}`;
        cells.add(k);
        map.set(k, seq.color);
      }
    }
    // Mutate the ref set (memoized container)
    sequenceCells.clear();
    cells.forEach((k) => sequenceCells.add(k));
    return map;
  }, [state.sequences, sequenceCells]);

  // Sequence lines
  const sequenceLines = state.sequences.map((seq) => {
    const first = seq.cells[0];
    const last = seq.cells[seq.cells.length - 1];
    const x1 = cellPad + first[1] * (cellWidth + gap) + cellWidth / 2;
    const y1 = cellPad + first[0] * (cellHeight + gap) + cellHeight / 2;
    const x2 = cellPad + last[1] * (cellWidth + gap) + cellWidth / 2;
    const y2 = cellPad + last[0] * (cellHeight + gap) + cellHeight / 2;
    return { x1, y1, x2, y2, color: seq.color as PlayerColor };
  });

  return (
    <View
      style={[
        styles.container,
        { width: actualBoardWidth, height: actualBoardHeight },
        boardFlipped && { transform: [{ rotate: "180deg" }] },
      ]}
    >
      {/* Grid */}
      <View style={[styles.grid, { padding: cellPad, gap }]}>
        {BOARD.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            const isValid = validPositions.has(key);
            return (
              <CardCell
                key={key}
                cell={cell}
                chip={state.chips?.[r]?.[c] ?? null}
                size={cellWidth}
                isHighlighted={isValid}
                isLastMove={
                  state.lastMove?.row === r && state.lastMove?.col === c
                }
                isInSequence={sequenceCells.has(key)}
                sequenceColor={
                  (sequenceCellColors.get(key) as PlayerColor) ?? null
                }
                onClick={() => onCellClick(r, c)}
                disabled={!isValid}
              />
            );
          })
        )}
      </View>

      {/* Sequence lines overlay */}
      {sequenceLines.length > 0 && (
        <Svg
          width={actualBoardWidth}
          height={actualBoardHeight}
          style={styles.svgOverlay}
        >
          {sequenceLines.map((line, i) => {
            const lineColors = SEQUENCE_LINE_COLORS[line.color];
            return (
              <React.Fragment key={`seq-line-${i}`}>
                {/* Glow */}
                <Line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={lineColors.glow}
                  strokeWidth={8}
                  strokeLinecap="round"
                />
                {/* Main */}
                <Line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={lineColors.stroke}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {/* Center bright */}
                <Line
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth={1}
                  strokeLinecap="round"
                />
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: "hidden",
    alignSelf: "center",
    // Casino felt gradient simulated with solid color (closest match)
    backgroundColor: colors.feltMid,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  svgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
  },
});
