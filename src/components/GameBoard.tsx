"use client";

import { BOARD } from "@/lib/board";
import { getValidPositions, type GameState } from "@/lib/game";
import { CardCell } from "./CardCell";

interface GameBoardProps {
  state: GameState;
  selectedCardIndex: number | null;
  playerId: string;
  onCellClick: (row: number, col: number) => void;
  boardFlipped?: boolean;
}

export function GameBoard({
  state,
  selectedCardIndex,
  playerId,
  onCellClick,
  boardFlipped = false,
}: GameBoardProps) {
  const player = state.players[playerId];
  const isMyTurn = state.playerOrder[state.currentTurn] === playerId;
  const selectedCard = selectedCardIndex !== null ? player?.hand?.[selectedCardIndex] : null;

  // Calculate valid positions for click validation only (no highlighting)
  const validPositions = new Set<string>();
  if (selectedCard && isMyTurn) {
    const positions = getValidPositions(state, selectedCard);
    positions.forEach(([r, c]) => validPositions.add(`${r},${c}`));
  }

  // Cells in completed sequences → map to sequence color
  const sequenceCells = new Set<string>();
  const sequenceCellColors = new Map<string, string>();
  for (const seq of state.sequences) {
    for (const [r, c] of seq.cells) {
      const k = `${r},${c}`;
      sequenceCells.add(k);
      sequenceCellColors.set(k, seq.color);
    }
  }

  return (
    <div className="w-full max-w-[min(100vw,520px)] mx-auto">
      <div
        className="grid gap-[1px] sm:gap-[3px] p-1 sm:p-2.5 rounded-lg sm:rounded-xl shadow-2xl"
        style={{
          gridTemplateColumns: "repeat(10, 1fr)",
          background: `
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 4px,
              rgba(255,255,255,0.014) 4px,
              rgba(255,255,255,0.014) 5px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 4px,
              rgba(0,0,0,0.03) 4px,
              rgba(0,0,0,0.03) 5px
            ),
            linear-gradient(160deg, #1a5c3a 0%, #155230 40%, #0f3d24 100%)
          `,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.3)",
          transform: boardFlipped ? "rotate(180deg)" : "none",
          transition: "transform 0.4s ease-in-out",
        }}
      >
        {BOARD.map((row, r) =>
          row.map((cell, c) => {
            const key = `${r},${c}`;
            const isValid = validPositions.has(key);
            return (
              <CardCell
                key={key}
                cell={cell}
                chip={state.chips?.[r]?.[c] ?? null}
                isHighlighted={isValid}
                isLastMove={
                  state.lastMove?.row === r && state.lastMove?.col === c
                }
                isInSequence={sequenceCells.has(key)}
                sequenceColor={(sequenceCellColors.get(key) as import("@/lib/game").PlayerColor) ?? null}
                onClick={() => onCellClick(r, c)}
                disabled={!isValid}
                cellFlipped={boardFlipped}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
