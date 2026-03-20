import React from "react";
import { View, ScrollView, Pressable, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { type Card, cardDisplay, isOneEyedJack, isTwoEyedJack } from "@sequence/game-logic";
import { getCardSvg } from "../constants/cards";
import { colors, spacing, borderRadius } from "../constants/theme";

interface PlayerHandProps {
  hand: Card[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  isMyTurn: boolean;
  validCards: Set<number>;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function JackBadge({ card }: { card: Card }) {
  const oneEyed = isOneEyedJack(card);
  return (
    <View
      style={[
        styles.jackBadge,
        { backgroundColor: oneEyed ? colors.jackRemove : colors.jackWild },
      ]}
    >
      <Text style={styles.jackBadgeText}>{oneEyed ? "1J" : "2J"}</Text>
    </View>
  );
}

function HandCard({
  card,
  index,
  isSelected,
  isMyTurn,
  hasValidMove,
  onSelect,
}: {
  card: Card;
  index: number;
  isSelected: boolean;
  isMyTurn: boolean;
  hasValidMove: boolean;
  onSelect: (index: number) => void;
}) {
  const isJack = card[0] === "J";
  const CardSvg = getCardSvg(card);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: withSpring(isSelected ? -12 : 0, {
          stiffness: 180,
          damping: 14,
        }),
      },
      {
        scale: withSpring(isSelected ? 1.05 : 1, {
          stiffness: 180,
          damping: 14,
        }),
      },
    ],
  }));

  return (
    <AnimatedPressable
      onPress={() => onSelect(index)}
      disabled={!isMyTurn || !hasValidMove}
      style={[
        styles.card,
        animatedStyle,
        {
          borderColor: isSelected
            ? isJack
              ? "#7c3aed"
              : colors.goldBright
            : hasValidMove
              ? colors.gray300
              : colors.gray200,
          borderWidth: isSelected ? 2 : 1,
        },
        !hasValidMove && styles.cardDisabled,
      ]}
    >
      {/* SVG card image */}
      {CardSvg && (
        <View style={StyleSheet.absoluteFill}>
          <CardSvg width={44} height={62} />
        </View>
      )}

      {/* Jack badge */}
      {isJack && hasValidMove && <JackBadge card={card} />}

      {/* Jack strip */}
      {isJack && hasValidMove && (
        <View
          style={[
            styles.jackStrip,
            {
              backgroundColor: isOneEyedJack(card)
                ? "rgba(220,38,38,0.9)"
                : "rgba(124,58,237,0.9)",
            },
          ]}
        >
          <Text style={styles.jackStripText}>
            {isOneEyedJack(card) ? "REMOVE" : "WILD"}
          </Text>
        </View>
      )}

      {/* Selected glow overlay */}
      {isSelected && (
        <View
          style={[
            styles.selectedOverlay,
            {
              backgroundColor: isJack
                ? "rgba(139,92,246,0.10)"
                : "rgba(251,191,36,0.12)",
            },
          ]}
        />
      )}
    </AnimatedPressable>
  );
}

export function PlayerHand({
  hand,
  selectedIndex,
  onSelect,
  isMyTurn,
  validCards,
}: PlayerHandProps) {
  return (
    <View style={[styles.container, isMyTurn && styles.containerActive]}>
      {isMyTurn && (
        <Text style={styles.turnLabel}>Your turn -- pick a card</Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {hand.map((card, i) => (
          <HandCard
            key={`${card}-${i}`}
            card={card}
            index={i}
            isSelected={selectedIndex === i}
            isMyTurn={isMyTurn}
            hasValidMove={validCards.has(i)}
            onSelect={onSelect}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.10)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.10)",
    paddingTop: spacing.sm,
    paddingBottom: spacing.md + 4,
  },
  containerActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderTopColor: "rgba(52,211,153,0.5)", // emerald-400/50
  },
  turnLabel: {
    color: colors.emerald400,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 56,
    gap: 6,
    alignItems: "flex-end",
  },
  card: {
    width: 44,
    height: 62,
    backgroundColor: colors.textWhite,
    borderRadius: borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  cardDisabled: {
    opacity: 0.4,
  },
  cardRank: {
    fontSize: 18,
    fontWeight: "800",
  },
  cardSuit: {
    fontSize: 14,
    marginTop: -2,
  },
  jackBadge: {
    position: "absolute",
    top: 3,
    right: 3,
    borderRadius: 2,
    paddingHorizontal: 3,
    paddingVertical: 1,
    zIndex: 10,
  },
  jackBadgeText: {
    fontSize: 7,
    fontWeight: "900",
    color: colors.textWhite,
    letterSpacing: 0.3,
  },
  jackStrip: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  jackStripText: {
    color: colors.textWhite,
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  selectedOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: borderRadius.md,
    zIndex: 5,
  },
});
