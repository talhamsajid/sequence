import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  withSpring,
  Easing,
  interpolate,
  type SharedValue,
} from "react-native-reanimated";
import { getCardSvg } from "../constants/cards";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface JackAnimationProps {
  card: string | null;
  type: "one-eyed" | "two-eyed" | null;
  onComplete: () => void;
}

type Phase = "idle" | "enter" | "hold" | "exit";

// ---------------------------------------------------------------------------
// Particle config — matches web's 14-particle burst
// ---------------------------------------------------------------------------

const PARTICLE_COUNT = 14;
const particleAngles = Array.from({ length: PARTICLE_COUNT }, (_, i) =>
  (i * (360 / PARTICLE_COUNT) * Math.PI) / 180
);

// ---------------------------------------------------------------------------
// Theme colors (identical to web)
// ---------------------------------------------------------------------------

const THEMES = {
  remove: {
    backdropBg: "rgba(100, 18, 18, 0.42)",
    glowColor: "rgba(239,68,68,0.45)",
    glowSoft: "rgba(239,68,68,0.18)",
    ringBorder: "rgba(239,68,68,0.55)",
    cardBorder: "rgba(239,68,68,0.7)",
    cardShadowColor: "#ef4444",
    labelColor: "#ef4444",
    particleHue: (i: number) => 0 + (i % 4) * 8,
    particleSat: "85%",
  },
  wild: {
    backdropBg: "rgba(80, 55, 4, 0.38)",
    glowColor: "rgba(234,179,8,0.42)",
    glowSoft: "rgba(234,179,8,0.16)",
    ringBorder: "rgba(234,179,8,0.55)",
    cardBorder: "rgba(234,179,8,0.7)",
    cardShadowColor: "#eab308",
    labelColor: "#eab308",
    particleHue: (i: number) => 38 + (i % 4) * 9,
    particleSat: "95%",
  },
} as const;

// ---------------------------------------------------------------------------
// Particle component
// ---------------------------------------------------------------------------

function Particle({
  index,
  isRemove,
  isActive,
}: {
  index: number;
  isRemove: boolean;
  isActive: boolean;
}) {
  const angle = particleAngles[index];
  const radius = 110 + (index % 3) * 30;
  const dx = Math.cos(angle) * radius;
  const dy = Math.sin(angle) * radius;
  const size = 5 + (index % 3) * 3;
  const delay = index * 35;

  const theme = isRemove ? THEMES.remove : THEMES.wild;
  const hue = theme.particleHue(index);
  const lit = 52 + (index % 3) * 8;
  const bgColor = `hsl(${hue}, ${theme.particleSat}, ${lit}%)`;

  const progress = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      progress.value = 0;
      progress.value = withDelay(
        delay,
        withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })
      );
    } else {
      progress.value = 0;
    }
  }, [isActive, delay, progress]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [0, dx]) },
      { translateY: interpolate(progress.value, [0, 1], [0, dy]) },
      { scale: interpolate(progress.value, [0, 0.5, 1], [0, 1.2, 0]) },
    ],
    opacity: interpolate(progress.value, [0, 0.2, 0.8, 1], [0, 1, 1, 0]),
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bgColor,
        },
        animStyle,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Sparkle ring dot (wild only, hold phase)
// ---------------------------------------------------------------------------

function SparkleRingDot({
  index,
  rotation,
}: {
  index: number;
  rotation: SharedValue<number>;
}) {
  const angle = (index * 45 * Math.PI) / 180;
  const hue = 44 + index * 9;
  const lit = 58 + (index % 3) * 6;

  const animStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${rotation.value}deg` },
      { translateX: Math.cos(angle) * 130 },
      { translateY: Math.sin(angle) * 130 },
    ],
  }));

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          width: 7,
          height: 7,
          borderRadius: 3.5,
          backgroundColor: `hsl(${hue}, 98%, ${lit}%)`,
        },
        animStyle,
      ]}
    />
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function JackAnimation({ card, type, onComplete }: JackAnimationProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const { width: screenWidth } = useWindowDimensions();
  const cardVisualWidth = Math.min(screenWidth * 0.4, 180);
  const cardVisualHeight = cardVisualWidth * (243 / 167);

  // Animated values
  const backdropOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const labelScale = useSharedValue(0.5);
  const ringScale = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const shakeX = useSharedValue(0);
  const sparkleRotation = useSharedValue(0);
  const glowPulse = useSharedValue(1);

  // Phase machine: enter (520ms) -> hold (750ms) -> exit (380ms)
  useEffect(() => {
    if (!card || !type) {
      setPhase("idle");
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    const t0 = setTimeout(() => {
      setPhase("enter");

      // Animate backdrop in
      backdropOpacity.value = withTiming(1, { duration: 220 });

      // Shockwave ring
      ringScale.value = 0;
      ringOpacity.value = 1;
      ringScale.value = withTiming(2, { duration: 600, easing: Easing.out(Easing.cubic) });
      ringOpacity.value = withDelay(400, withTiming(0, { duration: 200 }));

      // Card enter with spring
      cardScale.value = 0;
      cardOpacity.value = 0;
      cardScale.value = withSpring(1, { damping: 8, stiffness: 120 });
      cardOpacity.value = withTiming(1, { duration: 300 });

      const t1 = setTimeout(() => {
        setPhase("hold");

        // Label pop
        labelOpacity.value = withTiming(1, { duration: 200 });
        labelScale.value = withSpring(1, { damping: 6, stiffness: 200 });

        // Screen shake on remove
        if (type === "one-eyed") {
          shakeX.value = withSequence(
            withTiming(8, { duration: 40 }),
            withTiming(-8, { duration: 40 }),
            withTiming(6, { duration: 40 }),
            withTiming(-6, { duration: 40 }),
            withTiming(3, { duration: 40 }),
            withTiming(-3, { duration: 40 }),
            withTiming(0, { duration: 40 })
          );
        }

        // Sparkle ring rotation (wild only)
        if (type === "two-eyed") {
          sparkleRotation.value = withTiming(360, { duration: 2500, easing: Easing.linear });
        }

        // Glow pulse
        glowPulse.value = withSequence(
          withTiming(1.08, { duration: 450 }),
          withTiming(0.95, { duration: 450 })
        );

        const t2 = setTimeout(() => {
          setPhase("exit");

          // Exit animations
          cardScale.value = withTiming(0.5, { duration: 380, easing: Easing.in(Easing.cubic) });
          cardOpacity.value = withTiming(0, { duration: 380 });
          backdropOpacity.value = withTiming(0, { duration: 380 });
          labelOpacity.value = withTiming(0, { duration: 250 });

          const t3 = setTimeout(() => {
            setPhase("idle");
            onCompleteRef.current();
          }, 380);
          timers.push(t3);
        }, 750);
        timers.push(t2);
      }, 520);
      timers.push(t1);
    }, 16);
    timers.push(t0);

    return () => {
      for (const t of timers) clearTimeout(t);
    };
  }, [
    card,
    type,
    backdropOpacity,
    cardScale,
    cardOpacity,
    labelOpacity,
    labelScale,
    ringScale,
    ringOpacity,
    shakeX,
    sparkleRotation,
    glowPulse,
  ]);

  if (phase === "idle" || !card || !type) return null;

  const isRemove = type === "one-eyed";
  const label = isRemove ? "REMOVE!" : "WILD!";
  const theme = isRemove ? THEMES.remove : THEMES.wild;
  const CardSvg = getCardSvg(card);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const containerShakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
    opacity: cardOpacity.value,
  }));

  const labelAnimStyle = useAnimatedStyle(() => ({
    opacity: labelOpacity.value,
    transform: [{ scale: labelScale.value }],
  }));

  const shockwaveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  const glowRingStyle = useAnimatedStyle(() => ({
    opacity: phase === "enter" ? 0 : phase === "exit" ? 0 : 1,
    transform: [{ scale: glowPulse.value }],
  }));

  const isParticleActive = phase === "hold" || phase === "exit";

  return (
    <Animated.View style={[styles.overlay, backdropStyle, { backgroundColor: theme.backdropBg }]}>
      <Animated.View style={[styles.centered, containerShakeStyle]}>
        {/* Shockwave ring */}
        {phase === "enter" && (
          <Animated.View
            style={[
              styles.shockwaveRing,
              { borderColor: theme.ringBorder },
              shockwaveStyle,
            ]}
          />
        )}

        {/* Persistent glow ring */}
        <Animated.View
          style={[
            styles.glowRing,
            { borderColor: theme.ringBorder },
            glowRingStyle,
          ]}
        />

        {/* Sparkle ring (wild only, hold phase) */}
        {!isRemove && phase === "hold" && (
          <View style={styles.sparkleContainer}>
            {Array.from({ length: 8 }).map((_, i) => (
              <SparkleRingDot
                key={i}
                index={i}
                rotation={sparkleRotation}
              />
            ))}
          </View>
        )}

        {/* Burst particles */}
        <View style={styles.particleContainer}>
          {particleAngles.map((_, i) => (
            <Particle
              key={i}
              index={i}
              isRemove={isRemove}
              isActive={isParticleActive}
            />
          ))}
        </View>

        {/* Card + label */}
        <Animated.View style={[styles.cardWrapper, cardAnimStyle]}>
          {/* Aura glow */}
          <View
            style={[
              styles.auraGlow,
              {
                backgroundColor: theme.glowColor,
                width: cardVisualWidth + 48,
                height: cardVisualHeight + 48,
                left: -24,
                top: -24,
              },
            ]}
          />

          {/* Card image */}
          <View
            style={[
              styles.cardImage,
              {
                width: cardVisualWidth,
                height: cardVisualHeight,
                borderColor: theme.cardBorder,
                shadowColor: theme.cardShadowColor,
              },
            ]}
          >
            {CardSvg && (
              <CardSvg width={cardVisualWidth} height={cardVisualHeight} />
            )}

            {/* Red heartbeat flash — remove only */}
            {isRemove && phase === "hold" && (
              <View style={styles.heartbeatFlash} />
            )}
          </View>

          {/* Label */}
          <Animated.View style={[styles.labelContainer, labelAnimStyle]}>
            <Text
              style={[
                styles.labelText,
                { color: theme.labelColor },
              ]}
            >
              {label}
            </Text>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  shockwaveRing: {
    position: "absolute",
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 3,
  },
  glowRing: {
    position: "absolute",
    width: 240,
    height: 240,
    borderRadius: 120,
    borderWidth: 2,
  },
  sparkleContainer: {
    position: "absolute",
    width: 260,
    height: 260,
    alignItems: "center",
    justifyContent: "center",
  },
  particleContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  cardWrapper: {
    alignItems: "center",
  },
  auraGlow: {
    position: "absolute",
    borderRadius: 24,
    opacity: 0.5,
  },
  cardImage: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 28,
    elevation: 15,
  },
  heartbeatFlash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(239,68,68,0.22)",
  },
  labelContainer: {
    marginTop: 12,
  },
  labelText: {
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 4,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
});
