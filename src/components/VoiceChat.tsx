"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createVoiceManager, type VoiceManager } from "@/lib/voice";

type VoiceState = "disconnected" | "connecting" | "connected" | "muted";

interface VoiceChatProps {
  roomId: string;
  playerId: string;
  playerName: string;
  playerColor: string;
}

const COLOR_BG: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
};

export function VoiceChat({ roomId, playerId }: VoiceChatProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("disconnected");
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(
    () => new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const managerRef = useRef<VoiceManager | null>(null);

  // Initialize manager once
  useEffect(() => {
    const manager = createVoiceManager();
    managerRef.current = manager;

    manager.onPeerConnected((peerId) => {
      setConnectedPeers((prev) => new Set([...Array.from(prev), peerId]));
    });

    manager.onPeerDisconnected((peerId) => {
      setConnectedPeers((prev) => {
        const next = new Set(Array.from(prev));
        next.delete(peerId);
        return next;
      });
    });

    return () => {
      manager.leave();
      managerRef.current = null;
    };
  }, []);

  // Disconnect on unmount or roomId change
  useEffect(() => {
    return () => {
      managerRef.current?.leave();
      setVoiceState("disconnected");
      setConnectedPeers(new Set());
    };
  }, [roomId]);

  const handleJoin = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;

    setError(null);
    setVoiceState("connecting");

    try {
      await manager.join(roomId, playerId);
      setVoiceState("connected");
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied"
          : "Failed to join voice chat";
      setError(message);
      setVoiceState("disconnected");

      // Auto-dismiss error
      setTimeout(() => setError(null), 3000);
    }
  }, [roomId, playerId]);

  const handleToggleMute = useCallback(() => {
    const manager = managerRef.current;
    if (!manager) return;

    const nowMuted = manager.toggleMute();
    setVoiceState(nowMuted ? "muted" : "connected");
  }, []);

  const handleClick = useCallback(() => {
    if (voiceState === "disconnected") {
      handleJoin();
    } else if (voiceState === "connected" || voiceState === "muted") {
      handleToggleMute();
    }
  }, [voiceState, handleJoin, handleToggleMute]);

  const handleDisconnect = useCallback(() => {
    managerRef.current?.leave();
    setVoiceState("disconnected");
    setConnectedPeers(new Set());
  }, []);

  // Button styling based on state
  const buttonClass = (() => {
    switch (voiceState) {
      case "disconnected":
        return "bg-gray-600 hover:bg-gray-500";
      case "connecting":
        return "bg-amber-600 animate-pulse";
      case "connected":
        return "bg-emerald-600 hover:bg-emerald-500";
      case "muted":
        return "bg-red-600 hover:bg-red-500";
    }
  })();

  return (
    <>
      {/* Error toast */}
      {error && (
        <div className="fixed bottom-36 left-4 z-50 px-3 py-2 bg-red-500 text-white text-xs rounded-lg shadow-lg max-w-48">
          {error}
        </div>
      )}

      {/* Connected peers indicator */}
      {connectedPeers.size > 0 && voiceState !== "disconnected" && (
        <div className="fixed bottom-[84px] left-4 z-40 flex gap-1">
          {Array.from(connectedPeers).map((peerId) => (
            <div
              key={peerId}
              className={[
                "w-2.5 h-2.5 rounded-full border border-white/30",
                COLOR_BG[peerId] ?? "bg-white/60",
              ].join(" ")}
              title={`Peer: ${peerId.slice(0, 6)}`}
            />
          ))}
        </div>
      )}

      {/* Main button */}
      <div className="fixed bottom-20 left-4 z-40 flex flex-col items-center gap-1">
        {/* Disconnect button (small, shown when connected) */}
        {(voiceState === "connected" || voiceState === "muted") && (
          <button
            onClick={handleDisconnect}
            className="w-6 h-6 bg-red-600/80 hover:bg-red-500 text-white rounded-full flex items-center justify-center transition-all active:scale-95 shadow"
            aria-label="Disconnect voice"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}

        {/* Mic button */}
        <button
          onClick={handleClick}
          className={[
            "w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95",
            buttonClass,
          ].join(" ")}
          aria-label={
            voiceState === "disconnected"
              ? "Join voice chat"
              : voiceState === "muted"
                ? "Unmute"
                : "Mute"
          }
        >
          {voiceState === "disconnected" || voiceState === "muted" ? (
            <MicOffIcon />
          ) : voiceState === "connecting" ? (
            <MicIcon />
          ) : (
            <MicIcon />
          )}
        </button>
      </div>
    </>
  );
}

// ── SVG Icons ────────────────────────────────────────────────────────

function MicIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white"
    >
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-white"
    >
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
      {/* Slash line */}
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}
