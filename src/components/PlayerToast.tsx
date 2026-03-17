"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PlayerToastProps {
  id: string;
  message: string;
  playerColor?: string; // "red" | "blue" | "green"
  icon: string;
  onDismiss: (id: string) => void;
}

const colorAccent: Record<string, string> = {
  red: "border-l-red-500",
  blue: "border-l-blue-500",
  green: "border-l-emerald-500",
};

const colorDot: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-emerald-500",
};

export function PlayerToast({ id, message, playerColor, icon, onDismiss }: PlayerToastProps) {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  // Track all pending timers so cleanup is total — prevents stale callbacks
  // after unmount or StrictMode double-invoke.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const scheduleExit = () => {
    setExiting(true);
    const t = setTimeout(() => onDismiss(id), 350);
    timers.current.push(t);
  };

  useEffect(() => {
    // Defer enter so the initial opacity-0/translate class renders first,
    // giving the browser a frame to paint before we flip to visible.
    const enterTimer = setTimeout(() => setVisible(true), 16);
    timers.current.push(enterTimer);

    // Auto-dismiss: start exit animation at 3.5s, call onDismiss after it completes.
    const exitTimer = setTimeout(scheduleExit, 3500);
    timers.current.push(exitTimer);

    return clearAllTimers;
    // onDismiss intentionally omitted — stable parent callback, id is the key dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDismiss = () => {
    // Cancel the auto-exit timers before starting a manual exit
    clearAllTimers();
    scheduleExit();
  };

  return (
    <div
      className={cn(
        // Layout
        "flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl",
        // Surface: dark glass
        "bg-gray-900/85 backdrop-blur-md shadow-lg",
        // Borders: outer border + left accent
        "border border-white/10 border-l-[3px]",
        // Left accent color — falls back to a subtle white if no player color
        playerColor && colorAccent[playerColor] ? colorAccent[playerColor] : "border-l-white/30",
        // Animate: translate + opacity toggled by state
        "transition-all duration-[350ms] ease-out",
        visible && !exiting
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-3",
      )}
      style={{ pointerEvents: "auto" }}
    >
      {/* Event icon */}
      <span className="text-base shrink-0" aria-hidden="true">
        {icon}
      </span>

      {/* Player color dot — only shown when a valid color is provided */}
      {playerColor && colorDot[playerColor] && (
        <div
          className={cn("w-2.5 h-2.5 rounded-full shrink-0", colorDot[playerColor])}
          aria-hidden="true"
        />
      )}

      {/* Message */}
      <span className="text-sm text-white/90 font-medium flex-1 min-w-0 truncate">
        {message}
      </span>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-white/40 hover:text-white/70 hover:bg-white/10 transition-colors"
        aria-label="Dismiss notification"
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="2" y1="2" x2="8" y2="8" />
          <line x1="8" y1="2" x2="2" y2="8" />
        </svg>
      </button>
    </div>
  );
}

// ─── Toast data shape exposed for consumers ──────────────────────────────────

export interface ToastData {
  id: string;
  message: string;
  playerColor?: string;
  icon: string;
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

// ─── Container ────────────────────────────────────────────────────────────────

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-0 left-1/2 -translate-x-1/2 z-[55] flex flex-col gap-2 w-full max-w-sm px-4 pointer-events-none"
      // Safe-area padding handles notched phones; the 12px base gives breathing
      // room on flat-edge devices. Using padding (not top offset) keeps the
      // container anchored at the very top of the viewport.
      style={{ paddingTop: "max(12px, env(safe-area-inset-top, 12px))" }}
    >
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
    </div>
  );
}
