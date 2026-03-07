"use client";

import { cardDisplay, type Card, isOneEyedJack } from "@/lib/board";
import { cn } from "@/lib/utils";

interface PlayerHandProps {
  hand: Card[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  isMyTurn: boolean;
  validCards: Set<number>; // indices of cards that have valid positions
}

function JackBadge({ card }: { card: Card }) {
  const oneEyed = isOneEyedJack(card);
  return (
    <div
      className={cn(
        "absolute top-[3px] right-[3px] rounded-sm px-[3px] py-[1px]",
        "text-[6px] sm:text-[7px] font-black leading-none tracking-tight",
        oneEyed
          ? "bg-red-600 text-white"
          : "bg-violet-600 text-white"
      )}
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.3)" }}
    >
      {oneEyed ? "1J" : "2J"}
    </div>
  );
}

export function PlayerHand({ hand, selectedIndex, onSelect, isMyTurn, validCards }: PlayerHandProps) {
  return (
    <div className="flex gap-2 sm:gap-2.5 justify-center px-3 py-3 overflow-x-auto">
      {hand.map((card, i) => {
        const { rank, suit, color } = cardDisplay(card);
        const isSelected = selectedIndex === i;
        const hasValidMove = validCards.has(i);
        const isJack = card[0] === "J";
        const isRed = color === "red";
        const rankColor = isRed ? "#dc2626" : "#1a1a2e";

        return (
          <button
            key={`${card}-${i}`}
            onClick={() => onSelect(i)}
            disabled={!isMyTurn || !hasValidMove}
            className={cn(
              "relative shrink-0 flex flex-col items-start justify-start",
              "w-11 h-[60px] sm:w-14 sm:h-[76px]",
              "rounded-lg border transition-all duration-200",
              "overflow-hidden",
              // Valid + unselected
              hasValidMove && !isSelected && "cursor-pointer active:scale-95",
              // Selected — lifts up with glow
              isSelected && "-translate-y-3 scale-105",
              // No valid move — dimmed, desaturated
              !hasValidMove && "opacity-40 cursor-not-allowed saturate-50",
              // Not my turn but has moves
              !isMyTurn && hasValidMove && "cursor-not-allowed",
            )}
            style={{
              background: hasValidMove
                ? "#fafaf8"
                : "#f0f0ee",
              border: isSelected
                ? (isJack
                    ? "1.5px solid #7c3aed"
                    : "1.5px solid #f59e0b")
                : hasValidMove
                ? "1px solid #d1d5db"
                : "1px solid #e5e7eb",
              boxShadow: isSelected
                ? isJack
                  ? "0 8px 20px rgba(124,58,237,0.35), 0 3px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.9)"
                  : "0 8px 20px rgba(245,158,11,0.4), 0 3px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.9)"
                : hasValidMove
                ? "0 2px 6px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)"
                : "inset 0 1px 0 rgba(255,255,255,0.7)",
            }}
          >
            {/* Card linen texture */}
            <div
              className="absolute inset-0 opacity-[0.025] pointer-events-none"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 3px
                ), repeating-linear-gradient(
                  90deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 3px
                )`,
              }}
            />

            {/* Top-left corner index */}
            <div className="flex flex-col items-center leading-none pl-[4px] pt-[3px] sm:pl-[5px] sm:pt-[4px]">
              <span
                className="font-black leading-none"
                style={{
                  fontSize: "clamp(9px, 3vw, 14px)",
                  color: rankColor,
                  fontFamily: "'Georgia', serif",
                  letterSpacing: "-0.03em",
                }}
              >
                {rank}
              </span>
              <span
                className="leading-none"
                style={{
                  fontSize: "clamp(8px, 2.6vw, 12px)",
                  color: rankColor,
                  marginTop: "-1px",
                }}
              >
                {suit}
              </span>
            </div>

            {/* Center large suit */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span
                style={{
                  fontSize: "clamp(16px, 5.5vw, 26px)",
                  color: rankColor,
                  opacity: 0.75,
                }}
              >
                {suit}
              </span>
            </div>

            {/* Bottom-right corner index (rotated) */}
            <div
              className="absolute bottom-0 right-0 flex flex-col items-center leading-none pr-[4px] pb-[3px] sm:pr-[5px] sm:pb-[4px] rotate-180"
            >
              <span
                className="font-black leading-none"
                style={{
                  fontSize: "clamp(9px, 3vw, 14px)",
                  color: rankColor,
                  fontFamily: "'Georgia', serif",
                  letterSpacing: "-0.03em",
                }}
              >
                {rank}
              </span>
              <span
                className="leading-none"
                style={{
                  fontSize: "clamp(8px, 2.6vw, 12px)",
                  color: rankColor,
                  marginTop: "-1px",
                }}
              >
                {suit}
              </span>
            </div>

            {/* Jack special badge */}
            {isJack && hasValidMove && <JackBadge card={card} />}

            {/* Selected glow overlay */}
            {isSelected && (
              <div
                className="absolute inset-0 pointer-events-none rounded-lg"
                style={{
                  background: isJack
                    ? "linear-gradient(135deg, rgba(139,92,246,0.08) 0%, rgba(124,58,237,0.04) 100%)"
                    : "linear-gradient(135deg, rgba(251,191,36,0.10) 0%, rgba(245,158,11,0.05) 100%)",
                }}
              />
            )}

            {/* Jack type label strip at bottom */}
            {isJack && hasValidMove && (
              <div
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-[10px] sm:h-[12px] flex items-center justify-center",
                  isOneEyedJack(card) ? "bg-red-600" : "bg-violet-600"
                )}
              >
                <span className="text-white text-[5px] sm:text-[6px] font-black tracking-widest">
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
