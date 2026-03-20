import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  type GameState,
  type Card,
  getValidPositions,
  isOneEyedJack,
  getPlayerAvatar,
} from "@sequence/game-logic";
import { useLocalGame } from "../src/lib/useLocalGame";
import { GameBoard } from "../src/components/GameBoard";
import { PlayerHand } from "../src/components/PlayerHand";
import { GameStatus } from "../src/components/GameStatus";
import { WinOverlay } from "../src/components/WinOverlay";
import { TurnTransition } from "../src/components/TurnTransition";
import { ZoomableBoard } from "../src/components/ZoomableBoard";
import { pendingGameSetup } from "./local-setup";
import { colors } from "../src/constants/theme";

export default function LocalPlayScreen() {
  const router = useRouter();
  const { state, actions } = useLocalGame();

  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [transitionReady, setTransitionReady] = useState(false);
  const prevTurn = useRef<number>(-1);
  const prevSequenceCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize the game from setup
  useEffect(() => {
    if (state) return;
    if (!pendingGameSetup) {
      router.back();
      return;
    }
    const { players, mode, sequencesNeeded, teamCount } = pendingGameSetup;
    actions.create(players[0], { mode, sequencesNeeded, teamCount });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Add remaining players once game is created
  useEffect(() => {
    if (!state || state.phase !== "waiting" || !pendingGameSetup) return;
    const { players } = pendingGameSetup;
    const currentCount = Object.keys(state.players).length;
    if (currentCount < players.length) {
      actions.join(players[currentCount]);
    } else {
      actions.start();
    }
  }, [state, actions]);

  // Show turn transition on turn change (hot-seat)
  useEffect(() => {
    if (!state || state.phase !== "playing") return;
    if (prevTurn.current === -1) {
      // First turn — show transition
      prevTurn.current = state.currentTurn;
      setShowTransition(true);
      setTransitionReady(false);
      return;
    }
    if (state.currentTurn !== prevTurn.current) {
      prevTurn.current = state.currentTurn;
      setSelectedCardIndex(null);
      setShowTransition(true);
      setTransitionReady(false);
    }
  }, [state?.currentTurn, state?.phase]);

  // Haptics on sequence completion
  useEffect(() => {
    if (!state) return;
    const newCount = state.sequences.length;
    if (newCount > prevSequenceCount.current) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    prevSequenceCount.current = newCount;
  }, [state?.sequences.length]);

  // Auto-play timer — 60s per turn
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!state || state.phase !== "playing" || showTransition) return;

    const turnStart = state.turnStartedAt ?? Date.now();
    const timeLimit = (state.turnTimeLimit ?? 60) * 1000;

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - turnStart;
      if (elapsed >= timeLimit) {
        // Auto-play random valid move
        const currentPlayerId = state.playerOrder[state.currentTurn];
        actions.autoPlay(currentPlayerId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state?.currentTurn, state?.phase, showTransition, actions]);

  // Handle cell press
  const handleCellPress = useCallback(
    (row: number, col: number) => {
      if (!state || state.phase !== "playing" || selectedCardIndex === null) return;

      const currentPlayerId = state.playerOrder[state.currentTurn];
      const player = state.players[currentPlayerId];
      const card = player.hand[selectedCardIndex];
      if (!card) return;

      const validPositions = getValidPositions(state, card);
      const isValid = validPositions.some(([r, c]) => r === row && c === col);
      if (!isValid) return;

      try {
        actions.play(currentPlayerId, selectedCardIndex, row, col);
        setSelectedCardIndex(null);
        if (isOneEyedJack(card)) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        } else {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch {
        // Invalid move
      }
    },
    [state, selectedCardIndex, actions]
  );

  const handleCardSelect = useCallback(
    (index: number) => {
      setSelectedCardIndex((prev) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return prev === index ? null : index;
      });
    },
    []
  );

  const handleTransitionReady = useCallback(() => {
    setShowTransition(false);
    setTransitionReady(true);
  }, []);

  const handlePlayAgain = useCallback(() => {
    if (!pendingGameSetup) return;
    const { players, mode, sequencesNeeded, teamCount } = pendingGameSetup;
    prevTurn.current = -1;
    actions.reset();
    setTimeout(() => {
      actions.create(players[0], { mode, sequencesNeeded, teamCount });
    }, 50);
  }, [actions]);

  const handleLeave = useCallback(() => {
    actions.reset();
    router.dismissAll();
  }, [actions, router]);

  if (!state || state.phase === "waiting") {
    return <SafeAreaView style={styles.container} />;
  }

  const currentPlayerId = state.playerOrder[state.currentTurn];
  const currentPlayer = state.players[currentPlayerId];
  const selectedCard =
    selectedCardIndex !== null ? currentPlayer?.hand[selectedCardIndex] ?? null : null;

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaView style={styles.container}>
        {/* Status bar */}
        <GameStatus state={state} playerId={currentPlayerId} />

        {/* Zoomable board */}
        <View style={styles.boardContainer}>
          <ZoomableBoard>
            <GameBoard
              state={state}
              selectedCard={selectedCard}
              playerId={currentPlayerId}
              onCellPress={handleCellPress}
            />
          </ZoomableBoard>
        </View>

        {/* Player hand */}
        <PlayerHand
          hand={currentPlayer?.hand ?? []}
          selectedIndex={selectedCardIndex}
          isMyTurn={state.phase === "playing" && !showTransition}
          onSelect={handleCardSelect}
        />

        {/* Turn transition overlay (hot-seat) */}
        {showTransition && currentPlayer && (
          <TurnTransition
            playerName={currentPlayer.name}
            playerColor={currentPlayer.color}
            avatar={getPlayerAvatar(currentPlayerId)}
            onReady={handleTransitionReady}
          />
        )}

        {/* Win overlay */}
        <WinOverlay
          state={state}
          playerId={currentPlayerId}
          onPlayAgain={handlePlayAgain}
          onLeave={handleLeave}
        />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  boardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
});
