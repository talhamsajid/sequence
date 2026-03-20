"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
// Attempt 1 shown immediately, 2 at 3 s, 3 at 6 s, failed at 10 s.
const ATTEMPT_DELAYS: number[] = [0, 3000, 6000];
const FAILURE_DELAY = 10_000;

// How long the success flash stays visible (ms).
const SUCCESS_FLASH_MS = 1500;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <div
      aria-hidden="true"
      className="w-12 h-12 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin"
    />
  );
}

function ProgressDots({ currentAttempt }: { currentAttempt: number }) {
  return (
    <div className="flex items-center gap-3" aria-hidden="true">
      {Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
        const attemptNumber = i + 1; // 1-indexed
        const tried = attemptNumber < currentAttempt;
        const active = attemptNumber === currentAttempt;

        return (
          <span
            key={i}
            className={cn(
              "w-3 h-3 rounded-full transition-all duration-300",
              tried && "bg-amber-500/50",
              active && "bg-amber-500 animate-pulse",
              !tried && !active && "bg-white/15"
            )}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ReconnectOverlay({ isConnected, onLeave }: ReconnectOverlayProps) {
  const [phase, setPhase] = useState<Phase>("hidden");
  const [currentAttempt, setCurrentAttempt] = useState(1);

  // Refs keep timer IDs so we can clear them on cleanup / reconnect.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  function clearAllTimers() {
    for (const id of timersRef.current) clearTimeout(id);
    timersRef.current = [];
  }

  function scheduleAttempts() {
    clearAllTimers();
    setPhase("attempting");
    setCurrentAttempt(1);

    // Tick attempt counter at each delay threshold.
    ATTEMPT_DELAYS.forEach((delay, index) => {
      if (delay === 0) return; // attempt 1 is set synchronously above
      const id = setTimeout(() => {
        setCurrentAttempt(index + 1);
      }, delay);
      timersRef.current.push(id);
    });

    // After all attempts, transition to failed.
    const failId = setTimeout(() => {
      setPhase("failed");
    }, FAILURE_DELAY);
    timersRef.current.push(failId);
  }

  // React to connection state changes.
  useEffect(() => {
    if (isConnected) {
      if (phase === "attempting" || phase === "failed") {
        // Reconnected — show brief success flash.
        clearAllTimers();
        setPhase("success");
        const successId = setTimeout(() => {
          setPhase("hidden");
          setCurrentAttempt(1);
        }, SUCCESS_FLASH_MS);
        timersRef.current.push(successId);
      }
      // If we were already hidden / success — nothing to do.
    } else {
      // Lost connection — start the attempt sequence.
      if (phase === "hidden" || phase === "success") {
        scheduleAttempts();
      }
      // If already attempting/failed, let the existing sequence run.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // Clean up all timers on unmount.
  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  function handleTryAgain() {
    scheduleAttempts();
  }

  if (phase === "hidden") return null;

  // ---------------------------------------------------------------------------
  // Success flash
  // ---------------------------------------------------------------------------
  if (phase === "success") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label="Reconnected"
        className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      >
        <div className="bg-gray-900 rounded-2xl p-8 mx-4 max-w-xs w-full flex flex-col items-center gap-4 shadow-2xl">
          {/* Green checkmark circle */}
          <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-emerald-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="text-lg font-semibold text-emerald-400 tracking-wide">
            Reconnected!
          </p>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Attempting / Failed
  // ---------------------------------------------------------------------------
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={phase === "failed" ? "Unable to reconnect" : "Reconnecting"}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      <div className="bg-gray-900 rounded-2xl p-8 mx-4 max-w-xs w-full flex flex-col items-center gap-5 shadow-2xl">

        {/* Icon */}
        {phase === "attempting" ? (
          <Spinner />
        ) : (
          // Failed state — red X circle
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg
              className="w-7 h-7 text-red-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        )}

        {/* Title */}
        <div className="text-center space-y-1">
          <h2
            className={cn(
              "text-lg font-bold",
              phase === "attempting" ? "text-white" : "text-red-400"
            )}
          >
            {phase === "attempting" ? "Connection Lost" : "Unable to Reconnect"}
          </h2>
          {phase === "attempting" && (
            <p className="text-sm text-white/50">
              Reconnecting&hellip; Attempt {currentAttempt}/{MAX_ATTEMPTS}
            </p>
          )}
        </div>

        {/* Progress dots (only while attempting) */}
        {phase === "attempting" && (
          <ProgressDots currentAttempt={currentAttempt} />
        )}

        {/* Action buttons (only when failed) */}
        {phase === "failed" && (
          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={handleTryAgain}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-semibold transition-all duration-150"
            >
              Try Again
            </button>
            <button
              onClick={onLeave}
              className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white font-semibold transition-all duration-150"
            >
              Leave Game
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
