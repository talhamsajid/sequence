import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { colors, spacing, borderRadius } from "../constants/theme";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ToastData {
  id: string;
  message: string;
  playerColor?: string;
  icon: string;
}

interface PlayerToastProps {
  id: string;
  message: string;
  playerColor?: string;
  icon: string;
  onDismiss: (id: string) => void;
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Color maps
// ---------------------------------------------------------------------------

const colorAccent: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#10b981",
};

const colorDot: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#10b981",
};

// ---------------------------------------------------------------------------
// Individual toast
// ---------------------------------------------------------------------------

function PlayerToast({ id, message, playerColor, icon, onDismiss }: PlayerToastProps) {
  const translateY = useSharedValue(-20);
  const opacity = useSharedValue(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const exitingRef = useRef(false);

  const clearAllTimers = () => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  };

  const scheduleExit = () => {
    if (exitingRef.current) return;
    exitingRef.current = true;

    // Slide down + fade out
    translateY.value = withTiming(20, { duration: 350, easing: Easing.in(Easing.cubic) });
    opacity.value = withTiming(0, { duration: 350 });

    const t = setTimeout(() => onDismiss(id), 350);
    timersRef.current.push(t);
  };

  useEffect(() => {
    // Enter animation
    const enterTimer = setTimeout(() => {
      translateY.value = withTiming(0, { duration: 350, easing: Easing.out(Easing.cubic) });
      opacity.value = withTiming(1, { duration: 350 });
    }, 16);
    timersRef.current.push(enterTimer);

    // Auto-dismiss at 3.5s
    const exitTimer = setTimeout(scheduleExit, 3500);
    timersRef.current.push(exitTimer);

    return clearAllTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const accentColor =
    playerColor && colorAccent[playerColor]
      ? colorAccent[playerColor]
      : "rgba(255,255,255,0.3)";

  return (
    <Animated.View
      style={[
        styles.toast,
        { borderLeftColor: accentColor },
        animatedStyle,
      ]}
    >
      {/* Event icon */}
      <Text style={styles.toastIcon}>{icon}</Text>

      {/* Player color dot */}
      {playerColor && colorDot[playerColor] && (
        <View
          style={[
            styles.colorDot,
            { backgroundColor: colorDot[playerColor] },
          ]}
        />
      )}

      {/* Message */}
      <Text style={styles.toastMessage} numberOfLines={1}>
        {message}
      </Text>

      {/* Dismiss button */}
      <Pressable
        onPress={() => {
          clearAllTimers();
          scheduleExit();
        }}
        style={styles.dismissBtn}
      >
        <Text style={styles.dismissBtnText}>{"\u2715"}</Text>
      </Pressable>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Container
// ---------------------------------------------------------------------------

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <View style={styles.container}>
      {toasts.map((toast) => (
        <PlayerToast
          key={toast.id}
          id={toast.id}
          message={toast.message}
          playerColor={toast.playerColor}
          icon={toast.icon}
          onDismiss={onDismiss}
        />
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 55,
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: spacing.md,
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: "rgba(17,24,39,0.85)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderLeftWidth: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    maxWidth: 380,
    width: "100%",
  },
  toastIcon: {
    fontSize: 16,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  toastMessage: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  dismissBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dismissBtnText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "600",
  },
});
