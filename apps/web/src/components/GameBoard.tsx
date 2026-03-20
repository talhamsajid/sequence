"use client";

import { useRef, useEffect, useState } from "react";
import { BOARD } from "@sequence/game-logic";
import { getValidPositions, type GameState, type PlayerColor } from "@sequence/game-logic";
import { CardCell } from "./CardCell";

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
  const player = state.players[playerId];
  const isMyTurn = state.playerOrder[state.currentTurn] === playerId;
  const selectedCard = selectedCardIndex !== null ? player?.hand?.[selectedCardIndex] : null;
  const gridRef = useRef<HTMLDivElement>(null);
  const [gridRect, setGridRect] = useState<{ left: number; top: number; cellWidth: number; cellHeight: number; gap: number; padding: number } | null>(null);

  // Measure grid cells for SVG line positioning
  useEffect(() => {
    const measure = () => {
      const grid = gridRef.current;
      if (!grid) return;
      const firstCell = grid.children[0] as HTMLElement;
      const lastCell = grid.children[99] as HTMLElement;
      if (!firstCell || !lastCell) return;

      const gridBounds = grid.getBoundingClientRect();
      const firstBounds = firstCell.getBoundingClientRect();
      const cellWidth = firstBounds.width;
      const cellHeight = firstBounds.height;
      const padding = firstBounds.left - gridBounds.left;
      const gap = grid.children[1]
        ? (grid.children[1] as HTMLElement).getBoundingClientRect().left - firstBounds.right
        : 1;

      setGridRect({ left: padding, top: padding, cellWidth, cellHeight, gap, padding });
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [state.sequences.length]);

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

  // Calculate line coordinates for each sequence
  const sequenceLines = gridRect
    ? state.sequences.map((seq) => {
        const first = seq.cells[0];
        const last = seq.cells[seq.cells.length - 1];
        const cellW = gridRect.cellWidth;
        const cellH = gridRect.cellHeight;
        const gap = gridRect.gap;
        const pad = gridRect.padding;

        const x1 = pad + first[1] * (cellW + gap) + cellW / 2;
        const y1 = pad + first[0] * (cellH + gap) + cellH / 2;
        const x2 = pad + last[1] * (cellW + gap) + cellW / 2;
        const y2 = pad + last[0] * (cellH + gap) + cellH / 2;

        return { x1, y1, x2, y2, color: seq.color as PlayerColor };
      })
    : [];

  return (
    <div className="w-full max-w-[min(100vw,520px)] mx-auto">
      <div className="relative">
        <div
          ref={gridRef}
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
                  sequenceColor={(sequenceCellColors.get(key) as PlayerColor) ?? null}
                  onClick={() => onCellClick(r, c)}
                  disabled={!isValid}
                  cellFlipped={boardFlipped}
                />
              );
            })
          )}
        </div>

        {/* Sequence lines SVG overlay */}
        {sequenceLines.length > 0 && gridRef.current && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={gridRef.current.offsetWidth}
            height={gridRef.current.offsetHeight}
            style={{
              transform: boardFlipped ? "rotate(180deg)" : "none",
              transition: "transform 0.4s ease-in-out",
            }}
          >
            <defs>
              {state.sequences.map((_, i) => (
                <filter key={`glow-${i}`} id={`seq-glow-${i}`} x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              ))}
            </defs>
            {sequenceLines.map((line, i) => {
              const colors = SEQUENCE_LINE_COLORS[line.color];
              return (
                <g key={`seq-line-${i}`}>
                  {/* Glow layer */}
                  <line
                    x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                    stroke={colors.glow}
                    strokeWidth={8}
                    strokeLinecap="round"
                    filter={`url(#seq-glow-${i})`}
                  />
                  {/* Main line */}
                  <line
                    x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                    stroke={colors.stroke}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                  {/* Bright center */}
                  <line
                    x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
                    stroke="rgba(255,255,255,0.35)"
                    strokeWidth={1}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
