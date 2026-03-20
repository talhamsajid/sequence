import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { colors, spacing, borderRadius } from "../constants/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReconnectOverlayProps {
  isConnected: boolean;
  onLeave: () => void;
}

type Phase =
  | "hidden"       // connected, nothing to show
  | "attempting"   // disconnected, retrying
  | "failed"       // all 3 attempts exhausted
  | "success";     // just reconnected, briefly show confirmation

const MAX_ATTEMPTS = 3;

// How long after losing connection each attempt "ticks" in ms.
const ATTEMPT_DELAYS: number[] = [0, 3000, 6000];
const FAILURE_DELAY = 10_000;
const SUCCESS_FLASH_MS = 1500;

// ---------------------------------------------------------------------------
// Progress dots
// ---------------------------------------------------------------------------

function ProgressDots({ currentAttempt }: { currentAttempt: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
        const attemptNumber = i + 1;
        const tried = attemptNumber < currentAttempt;
        const active = attemptNumber === currentAttempt;

        return (
          <View
            key={i}
            style={[
              styles.dot,
              tried && styles.dotTried,
              active && styles.dotActive,
              !tried && !active && styles.dotPending,
            ]}
          />
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReconnectOverlay({ isConnected, onLeave }: ReconnectOverlayProps) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [currentAttempt, setCurrentAttempt] = useState(1);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearAllTimers() {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  }

  function scheduleAttempts() {
    clearAllTimers();
    setPhase("attempting");
    setCurrentAttempt(1);

    ATTEMPT_DELAYS.forEach((delay, index) => {
      if (delay === 0) return; // attempt 1 set synchronously
      const id = setTimeout(() => {
        setCurrentAttempt(index + 1);
      }, delay);
      timersRef.current.push(id);
    });

    const failId = setTimeout(() => {
      setPhase("failed");
    }, FAILURE_DELAY);
    timersRef.current.push(failId);
  }

  // React to connection state changes
  useEffect(() => {
    if (isConnected) {
      if (phase === "attempting" || phase === "failed") {
        clearAllTimers();
        setPhase("success");
        const successId = setTimeout(() => {
          setPhase("hidden");
          setCurrentAttempt(1);
        }, SUCCESS_FLASH_MS);
        timersRef.current.push(successId);
      }
    } else {
      if (phase === "hidden" || phase === "success") {
        scheduleAttempts();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  function handleTryAgain() {
    scheduleAttempts();
  }

  if (phase === "hidden") return null;

  // Success flash
  if (phase === "success") {
    return (
      <View style={styles.overlay}>
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.card}
        >
          {/* Green checkmark circle */}
          <View style={styles.successCircle}>
            <Text style={styles.successCheck}>{"\u2713"}</Text>
          </View>
          <Text style={styles.successText}>Reconnected!</Text>
        </Animated.View>
      </View>
    );
  }

  // Attempting / Failed
  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        {/* Icon */}
        {phase === "attempting" ? (
          <ActivityIndicator
            size="large"
            color="#f59e0b"
          />
        ) : (
          // Failed — red X circle
          <View style={styles.failedCircle}>
            <Text style={styles.failedX}>{"\u2715"}</Text>
          </View>
        )}

        {/* Title */}
        <View style={styles.titleSection}>
          <Text
            style={[
              styles.titleText,
              phase === "failed" && { color: "#f87171" },
            ]}
          >
            {phase === "attempting" ? "Connection Lost" : "Unable to Reconnect"}
          </Text>
          {phase === "attempting" && (
            <Text style={styles.subtitleText}>
              Reconnecting... Attempt {currentAttempt}/{MAX_ATTEMPTS}
            </Text>
          )}
        </View>

        {/* Progress dots (only while attempting) */}
        {phase === "attempting" && (
          <ProgressDots currentAttempt={currentAttempt} />
        )}

        {/* Action buttons (only when failed) */}
        {phase === "failed" && (
          <View style={styles.buttonsColumn}>
            <Pressable style={styles.tryAgainBtn} onPress={handleTryAgain}>
              <Text style={styles.tryAgainBtnText}>Try Again</Text>
            </Pressable>
            <Pressable style={styles.leaveBtn} onPress={onLeave}>
              <Text style={styles.leaveBtnText}>Leave Game</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 70,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    backgroundColor: colors.gray900,
    borderRadius: borderRadius["2xl"],
    paddingVertical: 32,
    paddingHorizontal: 32,
    marginHorizontal: spacing.md,
    maxWidth: 320,
    width: "100%",
    alignItems: "center",
    gap: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },

  // Success state
  successCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(16,185,129,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  successCheck: {
    fontSize: 28,
    color: "#34d399",
    fontWeight: "700",
  },
  successText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#34d399",
    letterSpacing: 0.5,
  },

  // Failed state
  failedCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(239,68,68,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  failedX: {
    fontSize: 28,
    color: "#f87171",
    fontWeight: "700",
  },

  // Title
  titleSection: {
    alignItems: "center",
    gap: 4,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textWhite,
  },
  subtitleText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
  },

  // Progress dots
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotTried: {
    backgroundColor: "rgba(245,158,11,0.5)",
  },
  dotActive: {
    backgroundColor: "#f59e0b",
  },
  dotPending: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  // Buttons
  buttonsColumn: {
    width: "100%",
    gap: 12,
  },
  tryAgainBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: "#d97706",
    alignItems: "center",
  },
  tryAgainBtnText: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: "700",
  },
  leaveBtn: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
  },
  leaveBtnText: {
    color: colors.textWhite,
    fontSize: 15,
    fontWeight: "700",
  },
});
