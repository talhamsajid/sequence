"use client";

import { type Card, isOneEyedJack } from "@/lib/board";
import { getCardImagePath } from "@/lib/cards";
import { cn } from "@/lib/utils";

interface PlayerHandProps {
  hand: Card[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  isMyTurn: boolean;
  validCards: Set<number>;
}

function JackBadge({ card }: { card: Card }) {
  const oneEyed = isOneEyedJack(card);
  return (
    <div
      className={cn(
        "absolute top-1 right-1 rounded-sm px-1 py-[1px] z-10",
        "text-[7px] sm:text-[8px] font-black leading-none tracking-tight",
        oneEyed ? "bg-red-600 text-white" : "bg-violet-600 text-white"
      )}
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
    >
      {oneEyed ? "1J" : "2J"}
    </div>
  );
}

export function PlayerHand({ hand, selectedIndex, onSelect, isMyTurn, validCards }: PlayerHandProps) {
  return (
    <div className="flex gap-1.5 sm:gap-2.5 justify-center px-14 py-2.5 sm:py-3 sm:px-4 overflow-x-auto">
      {hand.map((card, i) => {
        const isSelected = selectedIndex === i;
        const hasValidMove = validCards.has(i);
        const isJack = card[0] === "J";
        const imagePath = getCardImagePath(card);

        return (
          <button
            key={`${card}-${i}`}
            onClick={() => onSelect(i)}
            disabled={!isMyTurn || !hasValidMove}
            className={cn(
              "relative shrink-0",
              "w-[44px] h-[62px] sm:w-14 sm:h-[76px]",
              "rounded-lg border transition-all duration-200",
              "overflow-hidden",
              hasValidMove && !isSelected && "cursor-pointer active:scale-95",
              isSelected && "-translate-y-3 scale-105",
              !hasValidMove && "opacity-40 cursor-not-allowed saturate-50",
              !isMyTurn && hasValidMove && "cursor-not-allowed",
            )}
            style={{
              border: isSelected
                ? isJack
                  ? "2px solid #7c3aed"
                  : "2px solid #f59e0b"
                : hasValidMove
                ? "1px solid #d1d5db"
                : "1px solid #e5e7eb",
              boxShadow: isSelected
                ? isJack
                  ? "0 8px 20px rgba(124,58,237,0.35), 0 3px 8px rgba(0,0,0,0.15)"
                  : "0 8px 20px rgba(245,158,11,0.4), 0 3px 8px rgba(0,0,0,0.15)"
                : hasValidMove
                ? "0 2px 6px rgba(0,0,0,0.12)"
                : "none",
            }}
          >
            {/* SVG card image */}
            <img
              src={imagePath}
              alt={card}
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />

            {/* Jack badge */}
            {isJack && hasValidMove && <JackBadge card={card} />}

            {/* Selected glow overlay */}
            {isSelected && (
              <div
                className="absolute inset-0 pointer-events-none rounded-lg z-10"
                style={{
                  background: isJack
                    ? "linear-gradient(135deg, rgba(139,92,246,0.10) 0%, rgba(124,58,237,0.05) 100%)"
                    : "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.06) 100%)",
                }}
              />
            )}

            {/* Jack type label strip at bottom */}
            {isJack && hasValidMove && (
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-[12px] sm:h-[14px] flex items-center justify-center z-10",
                  isOneEyedJack(card) ? "bg-red-600/90" : "bg-violet-600/90"
                )}
              >
                <span className="text-white text-[7px] sm:text-[8px] font-black tracking-widest">
                  {isOneEyedJack(card) ? "REMOVE" : "WILD"}
                </span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
