"use client";

import { cardDisplay, type Card } from "@/lib/board";
import { cn } from "@/lib/utils";

interface PlayerHandProps {
  hand: Card[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  isMyTurn: boolean;
  validCards: Set<number>; // indices of cards that have valid positions
}

export function PlayerHand({ hand, selectedIndex, onSelect, isMyTurn, validCards }: PlayerHandProps) {
  return (
    <div className="flex gap-1.5 sm:gap-2 justify-center px-2 py-3 overflow-x-auto">
      {hand.map((card, i) => {
        const { rank, suit, color } = cardDisplay(card);
        const isSelected = selectedIndex === i;
        const hasValidMove = validCards.has(i);
        const isJack = card[0] === "J";

        return (
          <button
            key={`${card}-${i}`}
            onClick={() => onSelect(i)}
            disabled={!isMyTurn || !hasValidMove}
            className={cn(
              "flex flex-col items-center justify-center shrink-0",
              "w-12 h-16 sm:w-14 sm:h-20 rounded-lg border-2 transition-all duration-150",
              "font-semibold text-sm sm:text-base",
              // Default
              !isSelected && hasValidMove && "bg-white border-gray-200 shadow-sm active:scale-95",
              // Selected
              isSelected && "bg-yellow-50 border-yellow-500 shadow-lg -translate-y-2 scale-105",
              // No valid move
              !hasValidMove && "bg-gray-100 border-gray-200 opacity-50",
              // Jack special styling
              isJack && hasValidMove && !isSelected && "border-purple-300 bg-purple-50",
              isJack && isSelected && "border-purple-500 bg-purple-50",
            )}
          >
            <span className={cn("text-base sm:text-lg", color === "red" ? "text-red-600" : "text-gray-800")}>
              {rank}
            </span>
            <span className={cn("text-sm sm:text-base -mt-1", color === "red" ? "text-red-600" : "text-gray-800")}>
              {suit}
            </span>
          </button>
        );
      })}
    </div>
  );
}
