import React, { memo } from "react";
import { Pressable, View, Text, StyleSheet, Image } from "react-native";
import type { BoardCell, PlayerColor } from "@sequence/game-logic";
import { cardDisplay } from "@sequence/game-logic";
import { Chip } from "./Chip";
import { colors, borderRadius } from "../constants/theme";

interface CardCellProps {
  cell: BoardCell;
  chip: PlayerColor | null;
  size: number;
  isValid: boolean;
  isSelected: boolean;
  isLastMove: boolean;
  isInSequence: boolean;
  isNew: boolean;
  onPress: () => void;
}

function CardCellInner({
  cell,
  chip,
  size,
  isValid,
  isSelected,
  isLastMove,
  isInSequence,
  isNew,
  onPress,
}: CardCellProps) {
  const isFree = cell === "FREE";

  // Render mini card display (rank + suit symbol)
  const cardInfo = !isFree ? cardDisplay(cell) : null;

  return (
    <Pressable
      onPress={onPress}
      disabled={!isValid}
      style={[
        styles.cell,
        {
          width: size,
          height: size,
        },
        isFree && styles.freeCell,
        isValid && styles.validCell,
        isSelected && styles.selectedCell,
        isLastMove && styles.lastMoveCell,
      ]}
    >
      {/* Card content */}
      {isFree ? (
        <Text style={styles.freeText}>FREE</Text>
      ) : cardInfo ? (
        <View style={styles.cardContent}>
          <Text
            style={[
              styles.rank,
              { color: cardInfo.color === "red" ? "#C0392B" : "#C8B89A", fontSize: size * 0.3 },
            ]}
          >
            {cardInfo.rank}
          </Text>
          <Text
            style={[
              styles.suit,
              { color: cardInfo.color === "red" ? "#C0392B" : "#C8B89A", fontSize: size * 0.22 },
            ]}
          >
            {cardInfo.suit}
          </Text>
        </View>
      ) : null}

      {/* Chip overlay */}
      {chip && (
        <View style={styles.chipOverlay}>
          <Chip
            color={chip}
            size={size * 0.6}
            isNew={isNew}
            isInSequence={isInSequence}
          />
        </View>
      )}

      {/* Valid position indicator */}
      {isValid && !chip && (
        <View
          style={[
            styles.validDot,
            {
              width: size * 0.2,
              height: size * 0.2,
              borderRadius: size * 0.1,
            },
          ]}
        />
      )}
    </Pressable>
  );
}

export const CardCell = memo(CardCellInner);

const styles = StyleSheet.create({
  cell: {
    borderWidth: 0.5,
    borderColor: "rgba(201,148,58,0.15)",
    backgroundColor: colors.cardFelt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  freeCell: {
    backgroundColor: "rgba(139,105,20,0.3)",
  },
  validCell: {
    borderColor: colors.gold,
    borderWidth: 1,
    backgroundColor: "rgba(201,148,58,0.08)",
  },
  selectedCell: {
    borderColor: colors.goldBright,
    borderWidth: 1.5,
    backgroundColor: "rgba(201,148,58,0.15)",
  },
  lastMoveCell: {
    borderColor: colors.goldBright,
    borderWidth: 1,
  },
  cardContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  rank: {
    fontWeight: "700",
    lineHeight: 18,
  },
  suit: {
    lineHeight: 14,
    marginTop: -2,
  },
  freeText: {
    color: colors.freeGold,
    fontSize: 7,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  chipOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  validDot: {
    position: "absolute",
    backgroundColor: "rgba(201,148,58,0.4)",
  },
});
