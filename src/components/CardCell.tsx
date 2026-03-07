"use client";

import { cardDisplay, type BoardCell } from "@/lib/board";
import type { PlayerColor } from "@/lib/game";
import { cn } from "@/lib/utils";

interface CardCellProps {
  cell: BoardCell;
  chip: PlayerColor | null;
  isHighlighted: boolean;
  isLastMove: boolean;
  isInSequence: boolean;
  onClick: () => void;
  disabled: boolean;
}

const chipColors: Record<PlayerColor, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
};

const chipBorders: Record<PlayerColor, string> = {
  red: "ring-red-300",
  blue: "ring-blue-300",
  green: "ring-green-300",
};

export function CardCell({
  cell,
  chip,
  isHighlighted,
  isLastMove,
  isInSequence,
  onClick,
  disabled,
}: CardCellProps) {
  if (cell === "FREE") {
    return (
      <button
        className={cn(
          "aspect-square rounded-sm flex items-center justify-center text-[8px] sm:text-[10px] font-bold",
          "bg-gradient-to-br from-amber-400 to-amber-600 text-white",
          "border border-amber-700/50 shadow-inner"
        )}
        disabled
      >
        FREE
      </button>
    );
  }

  const { rank, suit, color } = cardDisplay(cell);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "aspect-square rounded-sm flex flex-col items-center justify-center relative",
        "text-[8px] sm:text-[10px] leading-tight font-medium",
        "border transition-all duration-150",
        // Base card style
        !chip && !isHighlighted && "bg-white border-gray-200 text-gray-700",
        // Highlighted (valid move)
        isHighlighted && !chip && "bg-yellow-50 border-yellow-400 ring-1 ring-yellow-400 cursor-pointer scale-105",
        // Has chip
        chip && !isInSequence && "border-gray-300",
        // In sequence
        isInSequence && "border-2",
        isInSequence && chip === "red" && "border-red-600",
        isInSequence && chip === "blue" && "border-blue-600",
        isInSequence && chip === "green" && "border-green-600",
        // Last move pulse
        isLastMove && "animate-pulse",
        // Disabled
        disabled && !isHighlighted && "opacity-80"
      )}
    >
      {/* Card text */}
      <span className={cn("leading-none", color === "red" ? "text-red-600" : "text-gray-800")}>
        {rank}
      </span>
      <span className={cn("leading-none -mt-px", color === "red" ? "text-red-600" : "text-gray-800")}>
        {suit}
      </span>

      {/* Chip overlay */}
      {chip && (
        <div
          className={cn(
            "absolute inset-[15%] rounded-full shadow-md",
            chipColors[chip],
            isInSequence && "ring-2",
            isInSequence && chipBorders[chip]
          )}
        />
      )}
    </button>
  );
}
