"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createVoiceManager, type VoiceManager, type PeerAudioState } from "@/lib/voice";
import { getPlayerAvatar } from "@/lib/avatars";
import type { Player, PlayerColor } from "@/lib/game";
import { cn } from "@/lib/utils";

type VoiceState = "disconnected" | "connecting" | "connected" | "muted";

interface VoiceChatProps {
  roomId: string;
  playerId: string;
  playerName: string;
  playerColor: string;
  players: Record<string, Player>;
}

const COLOR_RING: Record<string, string> = {
  red: "ring-red-400",
  blue: "ring-blue-400",
  green: "ring-green-400",
};

const COLOR_BG: Record<string, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  green: "bg-green-500",
};

const COLOR_GLOW: Record<string, string> = {
  red: "shadow-[0_0_12px_rgba(239,68,68,0.7)]",
  blue: "shadow-[0_0_12px_rgba(59,130,246,0.7)]",
  green: "shadow-[0_0_12px_rgba(34,197,94,0.7)]",
};

export function VoiceChat({ roomId, playerId, playerName, playerColor, players }: VoiceChatProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("disconnected");
  const [connectedPeers, setConnectedPeers] = useState<Set<string>>(() => new Set());
  const [peerStates, setPeerStates] = useState<Map<string, PeerAudioState>>(() => new Map());
  const [localSpeaking, setLocalSpeaking] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const managerRef = useRef<VoiceManager | null>(null);
  const autoJoinedRef = useRef(false);

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

    manager.onSpeakingChange((states, speaking) => {
      setPeerStates(new Map(states));
      setLocalSpeaking(speaking);
    });

    // Auto-join signaling channel (no mic needed, no user gesture required)
    if (!autoJoinedRef.current) {
      autoJoinedRef.current = true;
      setVoiceState("connecting");
      manager.join(roomId, playerId).then(() => {
        setVoiceState("muted"); // joined but mic not acquired yet
      }).catch(() => {
        setVoiceState("disconnected");
      });
    }

    return () => {
      manager.leave();
      managerRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    return () => {
      managerRef.current?.leave();
      setVoiceState("disconnected");
      setConnectedPeers(new Set());
      setPeerStates(new Map());
    };
  }, [roomId]);

  // Manual join (if auto-join failed or after disconnect)
  const handleJoin = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;

    setError(null);
    setVoiceState("connecting");

    try {
      await manager.join(roomId, playerId);
      setVoiceState("muted");
    } catch {
      setError("Failed to join voice chat");
      setVoiceState("disconnected");
      setTimeout(() => setError(null), 3000);
    }
  }, [roomId, playerId]);

  // Toggle mute — acquires mic on first unmute (user gesture context)
  const handleToggleMute = useCallback(async () => {
    const manager = managerRef.current;
    if (!manager) return;

    try {
      const nowMuted = await manager.toggleMute();
      setVoiceState(nowMuted ? "muted" : "connected");
    } catch (err) {
      const message =
        err instanceof DOMException && err.name === "NotAllowedError"
          ? "Microphone access denied"
          : "Failed to access microphone";
      setError(message);
      setTimeout(() => setError(null), 3000);
    }
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
    setPeerStates(new Map());
    setLocalSpeaking(false);
    setPanelOpen(false);
  }, []);

  const handlePeerVolume = useCallback((peerId: string, volume: number) => {
    managerRef.current?.setPeerVolume(peerId, volume);
    setPeerStates((prev) => {
      const next = new Map(prev);
      const state = next.get(peerId);
      if (state) next.set(peerId, { ...state, volume });
      return next;
    });
  }, []);

  const handlePeerMute = useCallback((peerId: string) => {
    const state = peerStates.get(peerId);
    if (!state) return;
    const newMuted = !state.muted;
    managerRef.current?.setPeerMuted(peerId, newMuted);
    setPeerStates((prev) => {
      const next = new Map(prev);
      const s = next.get(peerId);
      if (s) next.set(peerId, { ...s, muted: newMuted });
      return next;
    });
  }, [peerStates]);

  const isActive = voiceState !== "disconnected";

  const buttonClass = (() => {
    switch (voiceState) {
      case "disconnected": return "bg-gray-600 hover:bg-gray-500";
      case "connecting": return "bg-amber-600 animate-pulse";
      case "connected": return "bg-emerald-600 hover:bg-emerald-500";
      case "muted": return "bg-red-600 hover:bg-red-500";
    }
  })();

  return (
    <>
      {/* Error toast */}
      {error && (
        <div className="fixed bottom-24 left-4 z-50 px-3 py-2 bg-red-500 text-white text-xs rounded-lg shadow-lg max-w-48">
          {error}
        </div>
      )}

      {/* Voice panel */}
      {isActive && panelOpen && (
        <div className="fixed bottom-[4.5rem] left-4 z-40 w-56 bg-black/80 backdrop-blur-md rounded-xl border border-white/10 shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
            <span className="text-xs font-semibold text-white/80 uppercase tracking-wider">
              Voice Chat
            </span>
            <button
              onClick={() => setPanelOpen(false)}
              className="text-white/40 hover:text-white/80 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          <div className="p-2 space-y-1 max-h-60 overflow-y-auto">
            <VoiceParticipant
              name={playerName}
              color={playerColor}
              avatar={getPlayerAvatar(playerId)}
              speaking={localSpeaking && voiceState === "connected"}
              isSelf
              muted={voiceState === "muted"}
              onToggleMute={handleToggleMute}
            />

            {Array.from(connectedPeers).map((peerId) => {
              const player = players[peerId];
              const state = peerStates.get(peerId);
              return (
                <VoiceParticipant
                  key={peerId}
                  name={player?.name ?? peerId.slice(0, 8)}
                  color={player?.color ?? "blue"}
                  avatar={getPlayerAvatar(peerId)}
                  speaking={state?.speaking ?? false}
                  muted={state?.muted ?? false}
                  volume={state?.volume ?? 1}
                  onToggleMute={() => handlePeerMute(peerId)}
                  onVolumeChange={(v) => handlePeerVolume(peerId, v)}
                />
              );
            })}

            {connectedPeers.size === 0 && (
              <p className="text-xs text-white/30 text-center py-2">
                Waiting for others to join...
              </p>
            )}
          </div>

          <div className="px-2 pb-2">
            <button
              onClick={handleDisconnect}
              className="w-full py-1.5 text-xs font-medium text-red-300 bg-red-500/15 hover:bg-red-500/25 rounded-lg transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Floating button area */}
      <div className="fixed bottom-4 left-4 z-40 flex items-center gap-2">
        <button
          onClick={handleClick}
          className={cn(
            "w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 relative",
            buttonClass,
            localSpeaking && voiceState === "connected" && COLOR_GLOW[playerColor],
          )}
          aria-label={
            voiceState === "disconnected"
              ? "Join voice chat"
              : voiceState === "muted"
                ? "Unmute (tap to enable mic)"
                : "Mute"
          }
        >
          <span className="absolute -top-1 -right-1 text-sm select-none">
            {getPlayerAvatar(playerId)}
          </span>
          {voiceState === "muted" || voiceState === "disconnected" ? (
            <MicOffIcon />
          ) : (
            <MicIcon />
          )}
        </button>

        {isActive && !panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="h-8 px-2 bg-black/60 backdrop-blur-sm rounded-full flex items-center gap-1.5 text-white/70 hover:text-white/90 transition-colors border border-white/10"
          >
            {Array.from(connectedPeers).slice(0, 3).map((peerId) => {
              const state = peerStates.get(peerId);
              const color = players[peerId]?.color ?? "blue";
              return (
                <span
                  key={peerId}
                  className={cn(
                    "text-sm transition-all",
                    state?.speaking && COLOR_GLOW[color],
                  )}
                >
                  {getPlayerAvatar(peerId)}
                </span>
              );
            })}
            {connectedPeers.size === 0 && (
              <span className="text-xs">...</span>
            )}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        )}
      </div>
    </>
  );
}

// ── Participant Row ──────────────────────────────────────────────────

interface VoiceParticipantProps {
  name: string;
  color: string;
  avatar: string;
  speaking: boolean;
  muted: boolean;
  isSelf?: boolean;
  volume?: number;
  onToggleMute: () => void;
  onVolumeChange?: (v: number) => void;
}

function VoiceParticipant({
  name,
  color,
  avatar,
  speaking,
  muted,
  isSelf,
  volume,
  onToggleMute,
  onVolumeChange,
}: VoiceParticipantProps) {
  const [showSlider, setShowSlider] = useState(false);
  const pColor = color as PlayerColor;

  return (
    <div className="group">
      <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
        <div className="relative shrink-0">
          <div
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-base transition-all",
              "bg-white/10",
              speaking && "ring-2",
              speaking && (COLOR_RING[pColor] ?? "ring-white/60"),
              speaking && (COLOR_GLOW[pColor] ?? ""),
            )}
          >
            {avatar}
          </div>
          {speaking && (
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full animate-pulse border border-black/40",
              COLOR_BG[pColor] ?? "bg-white",
            )} />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-white/90 truncate">
            {name}
            {isSelf && <span className="text-white/40 ml-1">(you)</span>}
          </p>
          {muted && (
            <p className="text-[10px] text-red-400/70">Muted</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {!isSelf && onVolumeChange && (
            <button
              onClick={() => setShowSlider(!showSlider)}
              className="w-6 h-6 flex items-center justify-center text-white/40 hover:text-white/80 transition-colors rounded"
              title="Adjust volume"
            >
              <SpeakerIcon size={12} muted={muted} volume={volume ?? 1} />
            </button>
          )}
          <button
            onClick={onToggleMute}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded transition-colors",
              muted
                ? "text-red-400 hover:text-red-300 bg-red-500/10"
                : "text-white/40 hover:text-white/80",
            )}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOffIconSmall /> : <MicIconSmall />}
          </button>
        </div>
      </div>

      {!isSelf && showSlider && onVolumeChange && (
        <div className="px-3 pb-1.5 flex items-center gap-2">
          <SpeakerIcon size={10} muted={false} volume={0} />
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round((volume ?? 1) * 100)}
            onChange={(e) => onVolumeChange(Number(e.target.value) / 100)}
            className="flex-1 h-1 accent-emerald-500 cursor-pointer"
          />
          <SpeakerIcon size={10} muted={false} volume={1} />
        </div>
      )}
    </div>
  );
}

// ── SVG Icons ────────────────────────────────────────────────────────

function MicIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function MicIconSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
    </svg>
  );
}

function MicOffIconSmall() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function SpeakerIcon({ size, muted, volume }: { size: number; muted: boolean; volume: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {muted ? (
        <>
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </>
      ) : volume > 0.5 ? (
        <>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </>
      ) : volume > 0 ? (
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      ) : null}
    </svg>
  );
}
