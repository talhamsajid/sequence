import React, { memo } from "react";
import { Pressable, View, Text, StyleSheet } from "react-native";
import type { BoardCell, PlayerColor } from "@sequence/game-logic";
import { Chip } from "./Chip";
import { getCardSvg } from "../constants/cards";
import { colors, borderRadius } from "../constants/theme";

interface CardCellProps {
  cell: BoardCell;
  chip: PlayerColor | null;
  size: number;
  row: number;
  col: number;
  isHighlighted: boolean;
  isLastMove: boolean;
  isInSequence: boolean;
  sequenceColor: PlayerColor | null;
  onCellClick: (row: number, col: number) => void;
  disabled: boolean;
}

function FreeCell({ size }: { size: number }) {
  return (
    <View
      style={[
        styles.cell,
        styles.freeCell,
        { width: size, height: size * 1.45 },
      ]}
    >
      <View style={styles.freeInner}>
        <Text style={styles.freeText}>FREE</Text>
      </View>
      <Text style={styles.freeStar}>*</Text>
    </View>
  );
}

function CardCellInner({
  cell,
  chip,
  size,
  row,
  col,
  isHighlighted,
  isLastMove,
  isInSequence,
  sequenceColor,
  onCellClick,
  disabled,
}: CardCellProps) {
  if (cell === "FREE") {
    return <FreeCell size={size} />;
  }

  const CardSvg = getCardSvg(cell);
  const cardHeight = size * 1.45; // match 167:243 ratio

  return (
    <Pressable
      onPress={() => onCellClick(row, col)}
      disabled={disabled}
      style={[
        styles.cell,
        {
          width: size,
          height: cardHeight,
          backgroundColor: colors.cardCellBg,
          borderColor: isHighlighted
            ? "transparent"
            : isLastMove
              ? "rgba(251,191,36,0.8)"
              : colors.cardCellBorder,
        },
        isHighlighted && styles.highlightedCell,
        !isHighlighted && !chip && disabled && styles.dimCell,
      ]}
    >
      {/* SVG card image */}
      {CardSvg && (
        <View style={StyleSheet.absoluteFill}>
          <CardSvg width={size} height={cardHeight} />
        </View>
      )}

      {/* Highlight overlay */}
      {isHighlighted && <View style={styles.highlightOverlay} />}

      {/* Last move indicator */}
      {isLastMove && !isHighlighted && (
        <View style={styles.lastMoveInset} />
      )}

      {/* Sequence color overlay */}
      {isInSequence && sequenceColor && (
        <View
          style={[
            styles.sequenceOverlay,
            {
              backgroundColor:
                sequenceColor === "red"
                  ? colors.seqRedBg
                  : sequenceColor === "blue"
                    ? colors.seqBlueBg
                    : colors.seqGreenBg,
              borderColor:
                sequenceColor === "red"
                  ? colors.seqRedBorder
                  : sequenceColor === "blue"
                    ? colors.seqBlueBorder
                    : colors.seqGreenBorder,
            },
          ]}
        />
      )}

      {/* Poker chip */}
      {chip && (
        <View style={styles.chipOverlay}>
          <Chip
            color={chip}
            size={size * 0.6}
            isNew={isLastMove && chip !== null}
            isInSequence={isInSequence}
          />
        </View>
      )}
    </Pressable>
  );
}

export const CardCell = memo(CardCellInner);

const styles = StyleSheet.create({
  cell: {
    borderWidth: 0.5,
    borderRadius: 2,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  freeCell: {
    borderColor: "rgba(202,138,4,0.6)", // yellow-600/60
    alignItems: "center",
    justifyContent: "center",
  },
  freeInner: {
    position: "absolute",
    top: "12%",
    left: "12%",
    right: "12%",
    bottom: "12%",
    borderRadius: 2,
    borderWidth: 0.5,
    borderColor: "rgba(253,224,71,0.4)", // yellow-300/40
    alignItems: "center",
    justifyContent: "center",
  },
  freeText: {
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 1,
    color: "#fef9c3", // yellow-100
  },
  freeStar: {
    position: "absolute",
    top: 2,
    left: 3,
    fontSize: 5,
    color: "rgba(253,224,71,0.7)",
  },
  cardContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  rank: {
    fontWeight: "800",
    lineHeight: 18,
  },
  suit: {
    lineHeight: 14,
    marginTop: -2,
  },
  highlightedCell: {
    borderWidth: 2,
    borderColor: colors.goldBright,
    shadowColor: colors.goldBright,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
  },
  dimCell: {
    opacity: 0.9,
  },
  highlightOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(251,191,36,0.15)",
    borderRadius: 2,
  },
  lastMoveInset: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1,
    borderColor: "rgba(251,191,36,0.5)",
    borderRadius: 2,
  },
  sequenceOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 1.5,
    borderRadius: 2,
  },
  chipOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
