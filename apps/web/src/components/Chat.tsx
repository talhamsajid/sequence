"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { sendMessage, subscribeToChatMessages, type ChatMessage } from "@/lib/chat";

const EMOJI_CATEGORIES = [
  {
    label: "Good game",
    emojis: ["\u{1F44D}", "\u{1F44F}", "\u{1F389}", "\u{1F3C6}", "\u{1F525}", "\u{1F4AA}"],
  },
  {
    label: "Reactions",
    emojis: ["\u{1F602}", "\u{1F62E}", "\u{1F631}", "\u{1F914}", "\u{1F60E}", "\u{1F92F}"],
  },
  {
    label: "Taunts",
    emojis: ["\u{1F608}", "\u{1F480}", "\u{1FAE1}", "\u{1F624}", "\u{1F972}", "\u{1F60F}"],
  },
  {
    label: "Cards",
    emojis: ["\u2660\uFE0F", "\u2665\uFE0F", "\u2666\uFE0F", "\u2663\uFE0F", "\u{1F0CF}", "\u{1F3B4}"],
  },
] as const;

const COLOR_MAP: Record<string, string> = {
  red: "text-red-400",
  blue: "text-blue-400",
  green: "text-green-400",
};

interface ChatProps {
  roomId: string;
  playerId: string;
  playerName: string;
  playerColor: string;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function Chat({ roomId, playerId, playerName, playerColor }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSeenCountRef = useRef(0);

  // Subscribe to messages
  useEffect(() => {
    const unsubscribe = subscribeToChatMessages(roomId, (newMessages) => {
      setMessages(newMessages);

      if (!isOpen && newMessages.length > lastSeenCountRef.current) {
        const newOnes = newMessages
          .slice(lastSeenCountRef.current)
          .filter((m) => m.playerId !== playerId);
        setUnreadCount((prev) => prev + newOnes.length);
      }

      if (isOpen) {
        lastSeenCountRef.current = newMessages.length;
      }
    });

    return unsubscribe;
  }, [roomId, playerId, isOpen]);

  // Scroll to bottom when messages update or chat opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Clear unread when opening
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      lastSeenCountRef.current = messages.length;
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages.length]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setInput("");
    setShowEmojis(false);

    await sendMessage(roomId, {
      playerId,
      playerName,
      playerColor,
      text: trimmed,
    });
  }, [input, roomId, playerId, playerName, playerColor]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const insertEmoji = useCallback((emoji: string) => {
    setInput((prev) => prev + emoji);
    inputRef.current?.focus();
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
    setShowEmojis(false);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setShowEmojis(false);
  }, []);

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30"
          onClick={closeChat}
        />
      )}

      {/* Chat panel */}
      <div
        className={[
          "fixed bottom-0 left-0 right-0 z-50",
          "bg-gray-900/95 backdrop-blur-md border-t border-white/10",
          "rounded-t-2xl shadow-2xl",
          "transition-transform duration-300 ease-out",
          isOpen ? "translate-y-0" : "translate-y-full",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ height: "40dvh", maxHeight: "320px" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
          <span className="text-white/80 text-sm font-medium">
            Chat ({messages.length})
          </span>
          <button
            onClick={closeChat}
            className="w-10 h-10 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close chat"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2" style={{ height: "calc(100% - 100px)" }}>
          {messages.length === 0 && (
            <p className="text-white/30 text-xs text-center mt-8">
              No messages yet. Say hello!
            </p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="mb-2">
              <div className="flex items-baseline gap-2">
                <span
                  className={[
                    "text-xs font-semibold",
                    COLOR_MAP[msg.playerColor] ?? "text-white",
                  ].join(" ")}
                >
                  {msg.playerName}
                </span>
                <span className="text-white/20 text-[10px]">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <p className="text-white/90 text-sm break-words pl-0">
                {msg.text}
              </p>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Emoji picker */}
        {showEmojis && (
          <div className="absolute bottom-12 left-2 right-2 bg-gray-800 border border-white/10 rounded-xl p-3 shadow-xl">
            {EMOJI_CATEGORIES.map((cat) => (
              <div key={cat.label} className="mb-2 last:mb-0">
                <p className="text-white/30 text-[10px] uppercase tracking-wider mb-1">
                  {cat.label}
                </p>
                <div className="flex gap-1">
                  {cat.emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => insertEmoji(emoji)}
                      className="w-9 h-9 flex items-center justify-center text-lg rounded-lg hover:bg-white/10 transition-colors"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="absolute bottom-0 left-0 right-0 px-3 py-2 border-t border-white/10 bg-gray-900/95">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEmojis((prev) => !prev)}
              className={[
                "w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0",
                showEmojis
                  ? "bg-emerald-600 text-white"
                  : "text-white/40 hover:text-white hover:bg-white/10",
              ].join(" ")}
              aria-label="Toggle emoji picker"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </button>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowEmojis(false)}
              placeholder="Type a message..."
              maxLength={200}
              className="flex-1 bg-white/10 text-white text-sm rounded-full px-4 py-2 placeholder:text-white/30 outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-emerald-600 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-emerald-500 transition-colors shrink-0"
              aria-label="Send message"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Toggle button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed right-1.5 z-40 w-11 h-11 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 0.625rem)" }}
          aria-label="Open chat"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}
    </>
  );
}
