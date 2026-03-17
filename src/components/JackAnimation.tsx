"use client";

import { useEffect, useRef, useState } from "react";
import { getCardImagePath } from "@/lib/cards";
import { cn } from "@/lib/utils";

interface JackAnimationProps {
  card: string | null;
  type: "one-eyed" | "two-eyed" | null;
  onComplete: () => void;
}

/**
 * PARTICLE CONFIG
 * Each particle has a fixed direction vector (dx, dy) injected as CSS custom
 * properties so the jackParticleBurst keyframe can read them without JS animation.
 */
const PARTICLE_COUNT = 14;
const particleAngles = Array.from({ length: PARTICLE_COUNT }, (_, i) =>
  (i * (360 / PARTICLE_COUNT) * Math.PI) / 180
);

function getParticleStyle(
  index: number,
  isRemove: boolean,
  phase: "idle" | "enter" | "hold" | "exit"
): React.CSSProperties {
  const angle = particleAngles[index];
  const radius = 110 + (index % 3) * 30;
  const dx = Math.cos(angle) * radius;
  const dy = Math.sin(angle) * radius;
  const size = 5 + (index % 3) * 3;
  const delay = index * 35;

  // Hue cycling for visual richness
  const hue = isRemove
    ? 0 + (index % 4) * 8          // red tones 0-24
    : 38 + (index % 4) * 9;        // amber-gold tones 38-65

  const sat = isRemove ? "85%" : "95%";
  const lit = 52 + (index % 3) * 8 + "%";
  const glow = isRemove
    ? "0 0 10px rgba(239,68,68,0.9)"
    : "0 0 10px rgba(234,179,8,0.9)";

  const isVisible = phase === "hold" || phase === "exit";

  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: size,
    height: size,
    borderRadius: "50%",
    backgroundColor: `hsl(${hue}, ${sat}, ${lit})`,
    boxShadow: glow,
    // CSS custom props for the keyframe
    ["--dx" as string]: `${dx}px`,
    ["--dy" as string]: `${dy}px`,
    animation: isVisible
      ? `jackParticleBurst 700ms ${delay}ms cubic-bezier(0.22, 0, 0.36, 1) both`
      : "none",
    opacity: isVisible ? undefined : 0,
  };
}

export function JackAnimation({ card, type, onComplete }: JackAnimationProps) {
  const [phase, setPhase] = useState<"idle" | "enter" | "hold" | "exit">("idle");
  // Stable ref so the effect doesn't re-fire when onComplete identity changes
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!card || !type) {
      setPhase("idle");
      return;
    }

    // Micro-delay so the browser paints "idle" state first, giving animations
    // a clean starting point on every trigger.
    const t0 = setTimeout(() => {
      setPhase("enter");

      // After card-enter animation (~500ms) settle into hold
      const t1 = setTimeout(() => {
        setPhase("hold");

        // Hold for 750ms then exit
        const t2 = setTimeout(() => {
          setPhase("exit");

          // Exit animation ~350ms then fire onComplete
          const t3 = setTimeout(() => {
            setPhase("idle");
            onCompleteRef.current();
          }, 380);

          return () => clearTimeout(t3);
        }, 750);

        return () => clearTimeout(t2);
      }, 520);

      return () => clearTimeout(t1);
    }, 16);

    return () => clearTimeout(t0);
  }, [card, type]);

  if (phase === "idle" || !card || !type) return null;

  const imagePath = getCardImagePath(card);
  const isRemove = type === "one-eyed";
  const label = isRemove ? "REMOVE!" : "WILD!";

  // Theme colors as constants to keep inline styles readable
  const theme = isRemove
    ? {
        backdropBg: "rgba(100, 18, 18, 0.42)",
        glowColor: "rgba(239,68,68,0.45)",
        glowSoft: "rgba(239,68,68,0.18)",
        ringBorder: "rgba(239,68,68,0.55)",
        ringGlow: "0 0 50px rgba(239,68,68,0.3), inset 0 0 30px rgba(239,68,68,0.12)",
        cardBorder: "2px solid rgba(239,68,68,0.7)",
        cardShadow:
          "0 0 28px rgba(239,68,68,0.6), 0 0 70px rgba(239,68,68,0.22), 0 24px 48px rgba(0,0,0,0.45)",
        labelColor: "#ef4444",
        labelGlow:
          "0 0 16px rgba(239,68,68,0.9), 0 0 40px rgba(239,68,68,0.5), 0 2px 6px rgba(0,0,0,0.6)",
      }
    : {
        backdropBg: "rgba(80, 55, 4, 0.38)",
        glowColor: "rgba(234,179,8,0.42)",
        glowSoft: "rgba(234,179,8,0.16)",
        ringBorder: "rgba(234,179,8,0.55)",
        ringGlow: "0 0 50px rgba(234,179,8,0.3), inset 0 0 30px rgba(234,179,8,0.12)",
        cardBorder: "2px solid rgba(234,179,8,0.7)",
        cardShadow:
          "0 0 28px rgba(234,179,8,0.6), 0 0 70px rgba(234,179,8,0.22), 0 24px 48px rgba(0,0,0,0.45)",
        labelColor: "#eab308",
        labelGlow:
          "0 0 16px rgba(234,179,8,0.9), 0 0 40px rgba(234,179,8,0.5), 0 2px 6px rgba(0,0,0,0.6)",
      };

  const isExiting = phase === "exit";

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
      style={{
        backgroundColor: isExiting ? "transparent" : theme.backdropBg,
        animation: isExiting
          ? "jackBackdropOut 380ms ease-out forwards"
          : "jackBackdropIn 220ms ease-out forwards",
        // Screen shake on remove jack during hold
        ...(isRemove && phase === "hold"
          ? { animation: "jackShake 320ms ease-in-out, jackBackdropIn 220ms ease-out" }
          : {}),
      }}
    >
      {/* ── Shockwave ring (fires once on enter) ──────────────────── */}
      {phase === "enter" && (
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            width: 260,
            height: 260,
            border: `3px solid ${theme.ringBorder}`,
            animation: "jackShockwave 600ms cubic-bezier(0.22, 1, 0.36, 1) forwards",
          }}
        />
      )}

      {/* ── Spinning sparkle ring (wild only, hold phase) ──────── */}
      {!isRemove && phase === "hold" && (
        <div
          className="absolute pointer-events-none"
          style={{
            width: 260,
            height: 260,
            animation: "jackSpinRing 2.5s linear infinite",
          }}
        >
          {Array.from({ length: 8 }).map((_, i) => {
            const a = (i * 45 * Math.PI) / 180;
            return (
              <div
                key={i}
                className="absolute rounded-full"
                style={{
                  width: 7,
                  height: 7,
                  left: "50%",
                  top: "50%",
                  transform: `translate(-50%, -50%) translate(${Math.cos(a) * 130}px, ${Math.sin(a) * 130}px)`,
                  backgroundColor: `hsl(${44 + i * 9}, 98%, ${58 + (i % 3) * 6}%)`,
                  boxShadow: "0 0 12px rgba(234,179,8,1)",
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── Persistent glow ring ──────────────────────────────────── */}
      <div
        className="absolute rounded-full pointer-events-none"
        style={{
          width: 240,
          height: 240,
          border: `2px solid ${theme.ringBorder}`,
          boxShadow: theme.ringGlow,
          opacity: phase === "enter" ? 0 : isExiting ? 0 : 1,
          animation:
            phase === "hold" ? "jackGlowPulse 900ms ease-in-out infinite" : "none",
          transition: "opacity 300ms ease-out",
        }}
      />

      {/* ── Burst particles ───────────────────────────────────────── */}
      <div className="absolute pointer-events-none">
        {particleAngles.map((_, i) => (
          <div key={i} style={getParticleStyle(i, isRemove, phase)} />
        ))}
      </div>

      {/* ── Card + label ─────────────────────────────────────────── */}
      <div
        className="relative flex flex-col items-center pointer-events-none"
        style={{
          animation: isExiting
            ? "jackCardExit 380ms ease-in forwards"
            : phase === "enter"
            ? "jackCardEnter 520ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards"
            : "none",
        }}
      >
        {/* Outer aura glow */}
        <div
          className="absolute -inset-6 rounded-3xl pointer-events-none"
          style={{
            background: `radial-gradient(circle, ${theme.glowColor} 0%, ${theme.glowSoft} 40%, transparent 70%)`,
            filter: "blur(12px)",
          }}
        />

        {/* Card image */}
        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            width: "min(40vw, 180px)",
            aspectRatio: "167 / 243",
            boxShadow: theme.cardShadow,
            border: theme.cardBorder,
          }}
        >
          <img
            src={imagePath}
            alt={card}
            className="w-full h-full object-cover"
            draggable={false}
          />

          {/* Shimmer sweep — wild only */}
          {!isRemove && phase === "hold" && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.38) 50%, transparent 65%)",
                animation: "jackShimmer 900ms ease-in-out infinite",
              }}
            />
          )}

          {/* Red heartbeat flash — remove only */}
          {isRemove && phase === "hold" && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "rgba(239,68,68,0.22)",
                animation: "jackPulseRed 500ms ease-in-out infinite",
              }}
            />
          )}
        </div>

        {/* Label */}
        <div
          className={cn(
            "absolute pointer-events-none",
            // Position below the card. Card is min(40vw,180px), AR≈0.687
            // So card height ≈ min(40vw,180px)/0.687. We sit ~8px below it.
          )}
          style={{
            top: "calc(100% + 10px)",
            left: "50%",
            whiteSpace: "nowrap",
            opacity: phase === "enter" ? 0 : isExiting ? 0 : 1,
            animation:
              phase === "hold"
                ? "jackLabelPop 400ms 160ms cubic-bezier(0.34, 1.56, 0.64, 1) both"
                : "none",
            transition: isExiting ? "opacity 250ms ease-out" : "none",
          }}
        >
          <span
            className="text-2xl sm:text-3xl font-black tracking-widest uppercase"
            style={{
              color: theme.labelColor,
              textShadow: theme.labelGlow,
              // Slight letter-spacing bump on mobile for legibility
              letterSpacing: "0.15em",
            }}
          >
            {label}
          </span>
        </div>
      </div>
    </div>
  );
}
