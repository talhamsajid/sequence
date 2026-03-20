import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, SafeAreaView, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  type GameState,
  type Card,
  getValidPositions,
  isOneEyedJack,
  isTwoEyedJack,
} from "@sequence/game-logic";
import { useLocalGame } from "../src/lib/useLocalGame";
import { GameBoard } from "../src/components/GameBoard";
import { PlayerHand } from "../src/components/PlayerHand";
import { GameStatus } from "../src/components/GameStatus";
import { WinOverlay } from "../src/components/WinOverlay";
import { pendingGameSetup } from "./local-setup";
import { colors } from "../src/constants/theme";

export default function LocalPlayScreen() {
  const router = useRouter();
  const { state, actions } = useLocalGame();

  // Track which player's turn it is (for hot-seat display)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const prevSequenceCount = useRef(0);

  // Initialize the game from setup
  useEffect(() => {
    if (state) return; // Already initialized
    if (!pendingGameSetup) {
      router.back();
      return;
    }

    const { players, mode, sequencesNeeded, teamCount } = pendingGameSetup;

    // Create game with first player as host
    actions.create(players[0], { mode, sequencesNeeded, teamCount });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Add remaining players once game is created
  useEffect(() => {
    if (!state || state.phase !== "waiting" || !pendingGameSetup) return;

    const { players } = pendingGameSetup;
    const currentCount = Object.keys(state.players).length;

    if (currentCount < players.length) {
      // Add next player
      actions.join(players[currentCount]);
    } else {
      // All players added — start
      actions.start();
    }
  }, [state, actions]);

  // Haptics on sequence completion
  useEffect(() => {
    if (!state) return;
    const newCount = state.sequences.length;
    if (newCount > prevSequenceCount.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    prevSequenceCount.current = newCount;
  }, [state?.sequences.length]);

  // Handle cell press
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (!state || state.phase !== "playing" || selectedCardIndex === null) return;

      const currentPlayerId = state.playerOrder[state.currentTurn];
      const player = state.players[currentPlayerId];
      const card = player.hand[selectedCardIndex];
      if (!card) return;

      // Validate the move
      const validPositions = getValidPositions(state, card);
      const isValid = validPositions.some(([r, c]) => r === row && c === col);
      if (!isValid) return;

      try {
        actions.play(currentPlayerId, selectedCardIndex, row, col);
        setSelectedCardIndex(null);

        // Haptics
        if (isOneEyedJack(card)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (e) {
        // Invalid move — ignore
      }
    },
    [state, selectedCardIndex, actions]
  );

  // Handle card selection
  const handleCardSelect = useCallback(
    (index: number) => {
      if (selectedCardIndex === index) {
        setSelectedCardIndex(null);
      } else {
        setSelectedCardIndex(index);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    },
    [selectedCardIndex]
  );

  // Handle play again
  const handlePlayAgain = useCallback(() => {
    if (!pendingGameSetup) return;
    const { players, mode, sequencesNeeded, teamCount } = pendingGameSetup;
    actions.reset();
    // Small delay to let state clear, then recreate
    setTimeout(() => {
      actions.create(players[0], { mode, sequencesNeeded, teamCount });
    }, 50);
  }, [actions]);

  // Handle leave
  const handleLeave = useCallback(() => {
    actions.reset();
    router.dismissAll();
  }, [actions, router]);

  if (!state || state.phase === "waiting") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          {/* Loading state while players join */}
        </View>
      </SafeAreaView>
    );
  }

  const currentPlayerId = state.playerOrder[state.currentTurn];
  const currentPlayer = state.players[currentPlayerId];
  const selectedCard =
    selectedCardIndex !== null ? currentPlayer?.hand[selectedCardIndex] ?? null : null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Status bar */}
      <GameStatus state={state} playerId={currentPlayerId} />

      {/* Board */}
      <View style={styles.boardContainer}>
        <GameBoard
          state={state}
          selectedCard={selectedCard}
          playerId={currentPlayerId}
          onCellPress={handleCellPress}
        />
      </View>

      {/* Hand */}
      <PlayerHand
        hand={currentPlayer?.hand ?? []}
        selectedIndex={selectedCardIndex}
        isMyTurn={state.phase === "playing"}
        onSelect={handleCardSelect}
      />

      {/* Win overlay */}
      <WinOverlay
        state={state}
        playerId={currentPlayerId}
        onPlayAgain={handlePlayAgain}
        onLeave={handleLeave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  boardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
