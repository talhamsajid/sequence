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
  cellFlipped?: boolean;
}

// Poker chip rendering — layered rings for depth
function Chip({
  color,
  isInSequence,
}: {
  color: PlayerColor;
  isInSequence: boolean;
}) {
  const outerRing: Record<PlayerColor, string> = {
    red: "bg-red-600",
    blue: "bg-blue-600",
    green: "bg-emerald-600",
  };
  const innerRing: Record<PlayerColor, string> = {
    red: "bg-red-500",
    blue: "bg-blue-500",
    green: "bg-emerald-500",
  };
  const highlight: Record<PlayerColor, string> = {
    red: "bg-red-300",
    blue: "bg-blue-300",
    green: "bg-emerald-300",
  };
  const sequenceRing: Record<PlayerColor, string> = {
    red: "ring-red-200",
    blue: "ring-blue-200",
    green: "ring-emerald-200",
  };

  return (
    // Outer chip body
    <div
      className={cn(
        "absolute inset-[10%] rounded-full shadow-md",
        outerRing[color],
        isInSequence && "ring-2 ring-offset-0",
        isInSequence && sequenceRing[color]
      )}
      style={{
        boxShadow: "0 2px 4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}
    >
      {/* Middle ring band */}
      <div
        className={cn(
          "absolute inset-[15%] rounded-full",
          innerRing[color]
        )}
        style={{
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)",
        }}
      >
        {/* Inner core with specular highlight */}
        <div
          className={cn(
            "absolute inset-[20%] rounded-full",
            outerRing[color]
          )}
          style={{
            background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35) 0%, transparent 65%)`,
          }}
        />
        {/* Top highlight sliver */}
        <div
          className={cn(
            "absolute top-[10%] left-[20%] right-[20%] h-[18%] rounded-full opacity-50",
            highlight[color]
          )}
        />
      </div>
    </div>
  );
}

// FREE corner — gold wild space
function FreeCell({ cellFlipped = false }: { cellFlipped?: boolean }) {
  return (
    <button
      className={cn(
        "aspect-square rounded-sm flex items-center justify-center relative overflow-hidden",
        "border border-yellow-600/60"
      )}
      style={{
        background: "linear-gradient(135deg, #b8860b 0%, #d4a017 35%, #ffd700 55%, #d4a017 75%, #8b6914 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)",
        transform: cellFlipped ? "rotate(180deg)" : "none",
      }}
      disabled
    >
      {/* Inner frame */}
      <div
        className="absolute inset-[12%] rounded-sm border border-yellow-300/40 flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(184,134,11,0.25) 100%)",
        }}
      >
        <span
          className="text-[5px] sm:text-[7px] font-black tracking-widest text-yellow-100"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
        >
          FREE
        </span>
      </div>
      {/* Corner stars */}
      <span className="absolute top-[4px] left-[4px] text-[4px] sm:text-[5px] text-yellow-200 opacity-70">★</span>
      <span className="absolute bottom-[4px] right-[4px] text-[4px] sm:text-[5px] text-yellow-200 opacity-70">★</span>
    </button>
  );
}

export function CardCell({
  cell,
  chip,
  isHighlighted,
  isLastMove,
  isInSequence,
  onClick,
  disabled,
  cellFlipped = false,
}: CardCellProps) {
  if (cell === "FREE") {
    return <FreeCell cellFlipped={cellFlipped} />;
  }

  const { rank, suit, color } = cardDisplay(cell);
  const isRed = color === "red";
  const rankColor = isRed ? "#dc2626" : "#1e1e2e";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "aspect-square rounded-sm flex flex-col items-start justify-start relative overflow-hidden",
        "transition-all duration-150",
        "border",
        // Base card face
        "bg-[#fafaf8]",
        // Border states
        !isHighlighted && !isLastMove && "border-gray-300/80",
        isHighlighted && "border-transparent",
        isLastMove && !isHighlighted && "border-amber-400/80",
        // Highlight glow via box-shadow (not just bg change)
        isHighlighted && "cursor-pointer scale-[1.06]",
        // Dimmed when disabled and not highlighted
        disabled && !isHighlighted && !chip && "opacity-60 brightness-95",
        // Sequence cells get a subtle tint
        isInSequence && chip === "red" && "brightness-95",
        isInSequence && chip === "blue" && "brightness-95",
        isInSequence && chip === "green" && "brightness-95",
      )}
      style={{
        boxShadow: isHighlighted
          ? "0 0 0 2px #f59e0b, 0 0 8px rgba(245,158,11,0.6), inset 0 1px 0 rgba(255,255,255,0.8)"
          : isLastMove
          ? "0 0 0 1.5px #f59e0b, 0 0 5px rgba(245,158,11,0.35)"
          : "inset 0 1px 0 rgba(255,255,255,0.9), 0 1px 2px rgba(0,0,0,0.12)",
        transform: cellFlipped ? "rotate(180deg)" : "none",
      }}
    >
      {/* Card background texture — subtle linen grain */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            0deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 3px
          ), repeating-linear-gradient(
            90deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 3px
          )`,
        }}
      />

      {/* Top-left rank + suit pip */}
      <div className="flex flex-col items-center leading-none pl-[2px] pt-[1px]">
        <span
          className="font-black leading-none"
          style={{
            fontSize: "clamp(5px, 1.8vw, 9px)",
            color: rankColor,
            fontFamily: "'Georgia', serif",
            letterSpacing: "-0.02em",
          }}
        >
          {rank}
        </span>
        <span
          className="leading-none"
          style={{
            fontSize: "clamp(4px, 1.5vw, 8px)",
            color: rankColor,
            marginTop: "-0.5px",
          }}
        >
          {suit}
        </span>
      </div>

      {/* Center suit — large, anchored to center */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span
          style={{
            fontSize: "clamp(7px, 2.4vw, 14px)",
            color: chip ? "rgba(0,0,0,0.08)" : rankColor,
            opacity: chip ? 0.15 : 0.7,
            transition: "opacity 0.15s",
          }}
        >
          {suit}
        </span>
      </div>

      {/* Highlighted overlay — amber glow wash */}
      {isHighlighted && (
        <div
          className="absolute inset-0 pointer-events-none rounded-sm"
          style={{
            background: "linear-gradient(135deg, rgba(251,191,36,0.12) 0%, rgba(245,158,11,0.08) 100%)",
          }}
        />
      )}

      {/* Last move indicator — subtle amber ring, no pulse */}
      {isLastMove && !isHighlighted && (
        <div
          className="absolute inset-[3px] rounded-sm pointer-events-none border border-amber-400/50"
          style={{ boxShadow: "inset 0 0 4px rgba(245,158,11,0.2)" }}
        />
      )}

      {/* Poker chip */}
      {chip && (
        <Chip color={chip} isInSequence={isInSequence} />
      )}
    </button>
  );
}
