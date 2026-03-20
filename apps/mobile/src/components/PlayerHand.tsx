import React from "react";
import { View, ScrollView, Pressable, Text, StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { type Card, cardDisplay, isOneEyedJack, isTwoEyedJack } from "@sequence/game-logic";
import { colors, spacing, borderRadius } from "../constants/theme";

interface PlayerHandProps {
  hand: Card[];
  selectedIndex: number | null;
  isMyTurn: boolean;
  onSelect: (index: number) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function HandCard({
  card,
  index,
  isSelected,
  isMyTurn,
  onSelect,
}: {
  card: Card;
  index: number;
  isSelected: boolean;
  isMyTurn: boolean;
  onSelect: (index: number) => void;
}) {
  const info = cardDisplay(card);
  const isJack = isOneEyedJack(card) || isTwoEyedJack(card);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: withSpring(isSelected ? -12 : 0, { stiffness: 180, damping: 14 }) },
      { scale: withSpring(isSelected ? 1.08 : 1, { stiffness: 180, damping: 14 }) },
    ],
  }));

  return (
    <AnimatedPressable
      onPress={() => onSelect(index)}
      disabled={!isMyTurn}
      style={[
        styles.card,
        animatedStyle,
        isSelected && styles.cardSelected,
        !isMyTurn && styles.cardDisabled,
        isJack && styles.cardJack,
      ]}
    >
      <Text
        style={[
          styles.cardRank,
          { color: info.color === "red" ? "#C0392B" : colors.heading },
        ]}
      >
        {info.rank}
      </Text>
      <Text
        style={[
          styles.cardSuit,
          { color: info.color === "red" ? "#C0392B" : colors.heading },
        ]}
      >
        {info.suit}
      </Text>
      {isJack && (
        <Text style={styles.jackLabel}>
          {isOneEyedJack(card) ? "REM" : "WILD"}
        </Text>
      )}
    </AnimatedPressable>
  );
}

export function PlayerHand({ hand, selectedIndex, isMyTurn, onSelect }: PlayerHandProps) {
  return (
    <View style={[styles.container, isMyTurn && styles.containerActive]}>
      {isMyTurn && <Text style={styles.turnLabel}>Your turn</Text>}
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
            onSelect={onSelect}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.board,
    borderTopWidth: 1,
    borderTopColor: "rgba(201,148,58,0.15)",
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  containerActive: {
    borderTopColor: colors.gold,
    borderTopWidth: 2,
  },
  turnLabel: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    alignItems: "flex-end",
  },
  card: {
    width: 56,
    height: 80,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: "rgba(201,148,58,0.2)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  cardSelected: {
    borderColor: colors.goldBright,
    borderWidth: 2,
    backgroundColor: "rgba(201,148,58,0.1)",
    shadowColor: colors.gold,
    shadowOpacity: 0.5,
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardJack: {
    borderColor: "rgba(201,148,58,0.4)",
  },
  cardRank: {
    fontSize: 22,
    fontWeight: "800",
  },
  cardSuit: {
    fontSize: 16,
    marginTop: -2,
  },
  jackLabel: {
    position: "absolute",
    bottom: 3,
    fontSize: 7,
    fontWeight: "700",
    color: colors.gold,
    letterSpacing: 0.5,
  },
});
