"use client";

import { type BoardCell } from "@/lib/board";
import type { PlayerColor } from "@/lib/game";
import { getCardImagePath } from "@/lib/cards";
import { cn } from "@/lib/utils";

interface CardCellProps {
  cell: BoardCell;
  chip: PlayerColor | null;
  isHighlighted: boolean;
  isLastMove: boolean;
  isInSequence: boolean;
  sequenceColor: PlayerColor | null;
  onClick: () => void;
  disabled: boolean;
  cellFlipped?: boolean;
}

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
      <div
        className={cn("absolute inset-[15%] rounded-full", innerRing[color])}
        style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3)" }}
      >
        <div
          className={cn("absolute inset-[20%] rounded-full", outerRing[color])}
          style={{
            background: "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.35) 0%, transparent 65%)",
          }}
        />
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

function FreeCell({ cellFlipped = false }: { cellFlipped?: boolean }) {
  return (
    <button
      className={cn(
        "rounded-sm flex items-center justify-center relative overflow-hidden",
        "border border-yellow-600/60"
      )}
      style={{
        aspectRatio: "167 / 243",
        background: "linear-gradient(135deg, #b8860b 0%, #d4a017 35%, #ffd700 55%, #d4a017 75%, #8b6914 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)",
        transform: cellFlipped ? "rotate(180deg)" : "none",
      }}
      disabled
    >
      <div
        className="absolute inset-[12%] rounded-sm border border-yellow-300/40 flex items-center justify-center"
        style={{
          background: "linear-gradient(135deg, rgba(255,215,0,0.15) 0%, rgba(184,134,11,0.25) 100%)",
        }}
      >
        <span
          className="text-[7px] sm:text-[8px] font-black tracking-widest text-yellow-100"
          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.6)" }}
        >
          FREE
        </span>
      </div>
      <span className="absolute top-[4px] left-[4px] text-[5px] sm:text-[6px] text-yellow-200 opacity-70">
        ★
      </span>
      <span className="absolute bottom-[4px] right-[4px] text-[5px] sm:text-[6px] text-yellow-200 opacity-70">
        ★
      </span>
    </button>
  );
}

export function CardCell({
  cell,
  chip,
  isHighlighted,
  isLastMove,
  isInSequence,
  sequenceColor,
  onClick,
  disabled,
  cellFlipped = false,
}: CardCellProps) {
  if (cell === "FREE") {
    return <FreeCell cellFlipped={cellFlipped} />;
  }

  const imagePath = getCardImagePath(cell);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-sm relative overflow-hidden",
        "transition-all duration-150",
        "border bg-[#fafaf8]",
        !isHighlighted && !isLastMove && "border-gray-300/60",
        isHighlighted && "border-transparent",
        isLastMove && !isHighlighted && "border-amber-400/80",
        isHighlighted && "cursor-pointer scale-[1.06]",
        disabled && !isHighlighted && !chip && "opacity-60 brightness-95",
        isInSequence && "brightness-95",
      )}
      style={{
        aspectRatio: "167 / 243",
        boxShadow: isHighlighted
          ? "0 0 0 2px #f59e0b, 0 0 8px rgba(245,158,11,0.6)"
          : isLastMove
          ? "0 0 0 1.5px #f59e0b, 0 0 5px rgba(245,158,11,0.35)"
          : "0 1px 2px rgba(0,0,0,0.12)",
        transform: cellFlipped ? "rotate(180deg)" : "none",
      }}
    >
      {/* SVG card image */}
      <img
        src={imagePath}
        alt={cell}
        className="absolute inset-0 w-full h-full"
        draggable={false}
      />

      {/* Highlighted overlay */}
      {isHighlighted && (
        <div
          className="absolute inset-0 pointer-events-none rounded-sm"
          style={{
            background: "linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.10) 100%)",
          }}
        />
      )}

      {/* Last move indicator */}
      {isLastMove && !isHighlighted && (
        <div
          className="absolute inset-[2px] rounded-sm pointer-events-none border border-amber-400/50"
          style={{ boxShadow: "inset 0 0 4px rgba(245,158,11,0.2)" }}
        />
      )}

      {/* Sequence color overlay */}
      {isInSequence && sequenceColor && (
        <div
          className="absolute inset-0 pointer-events-none rounded-sm"
          style={{
            boxShadow: `inset 0 0 0 1.5px ${
              sequenceColor === "red"
                ? "rgba(239,68,68,0.7)"
                : sequenceColor === "blue"
                ? "rgba(59,130,246,0.7)"
                : "rgba(16,185,129,0.7)"
            }`,
            background:
              sequenceColor === "red"
                ? "rgba(239,68,68,0.12)"
                : sequenceColor === "blue"
                ? "rgba(59,130,246,0.12)"
                : "rgba(16,185,129,0.12)",
          }}
        />
      )}

      {/* Poker chip */}
      {chip && <Chip color={chip} isInSequence={isInSequence} />}
    </button>
  );
}
