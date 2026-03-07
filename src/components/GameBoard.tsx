"use client";

import { BOARD } from "@/lib/board";
import { getValidPositions, type GameState } from "@/lib/game";
import { CardCell } from "./CardCell";

interface GameBoardProps {
  state: GameState;
  selectedCardIndex: number | null;
  playerId: string;
  onCellClick: (row: number, col: number) => void;
}

export function GameBoard({ state, selectedCardIndex, playerId, onCellClick }: GameBoardProps) {
  const player = state.players[playerId];
  const isMyTurn = state.playerOrder[state.currentTurn] === playerId;
  const selectedCard = selectedCardIndex !== null ? player?.hand?.[selectedCardIndex] : null;

  // Calculate valid positions for selected card
  const validPositions = new Set<string>();
  if (selectedCard && isMyTurn) {
    const positions = getValidPositions(state, selectedCard);
    positions.forEach(([r, c]) => validPositions.add(`${r},${c}`));
  }

  // Cells in completed sequences
  const sequenceCells = new Set<string>();
  for (const seq of state.sequences) {
    for (const [r, c] of seq.cells) {
      sequenceCells.add(`${r},${c}`);
    }
  }

  return (
    <div className="w-full max-w-[min(95vw,480px)] mx-auto">
      <div
        className="grid gap-[2px] sm:gap-[3px] p-1 sm:p-2 bg-emerald-800 rounded-lg shadow-xl"
        style={{ gridTemplateColumns: "repeat(10, 1fr)" }}
      >
        {BOARD.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            return (
              <CardCell
                key={key}
                cell={cell}
                chip={state.chips?.[r]?.[c] ?? null}
                isHighlighted={validPositions.has(key)}
                isLastMove={
                  state.lastMove?.row === r && state.lastMove?.col === c
                }
                isInSequence={sequenceCells.has(key)}
                onClick={() => onCellClick(r, c)}
                disabled={!validPositions.has(key)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
