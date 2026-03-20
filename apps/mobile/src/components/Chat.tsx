import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import {
  sendMessage,
  subscribeToChatMessages,
  type ChatMessage,
} from "../lib/chat";
import { colors, spacing, borderRadius } from "../constants/theme";

// ---------------------------------------------------------------------------
// Emoji categories — identical to web
// ---------------------------------------------------------------------------

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
  red: "#f87171",
  blue: "#60a5fa",
  green: "#4ade80",
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ChatProps {
  roomId: string;
  playerId: string;
  playerName: string;
  playerColor: string;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Chat({ roomId, playerId, playerName, playerColor }: ChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const lastSeenCountRef = useRef(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  // Badge pulse animation
  const badgeScale = useSharedValue(1);
  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  // Ref to avoid re-subscribing when isOpen changes
  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  // Subscribe to messages
  useEffect(() => {
    const unsubscribe = subscribeToChatMessages(roomId, (newMessages) => {
      setMessages(newMessages);

      if (!isOpenRef.current && newMessages.length > lastSeenCountRef.current) {
        const newOnes = newMessages
          .slice(lastSeenCountRef.current)
          .filter((m) => m.playerId !== playerId);
        if (newOnes.length > 0) {
          setUnreadCount((prev) => prev + newOnes.length);
          // Pulse badge
          badgeScale.value = withTiming(1.3, { duration: 120 }, () => {
            badgeScale.value = withTiming(1, { duration: 120 });
          });
        }
      }

      if (isOpenRef.current) {
        lastSeenCountRef.current = newMessages.length;
      }
    });

    return unsubscribe;
  }, [roomId, playerId]);

  // Scroll to bottom when messages update or chat opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, isOpen]);

  // Clear unread when opening
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      lastSeenCountRef.current = messages.length;
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen, messages.length]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setInput("");
    setShowEmojis(false);
    Keyboard.dismiss();

    await sendMessage(roomId, {
      playerId,
      playerName,
      playerColor,
      text: trimmed,
    });
  }, [input, roomId, playerId, playerName, playerColor]);

  const insertEmoji = useCallback((emoji: string) => {
    setInput((prev) => prev + emoji);
  }, []);

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev);
    setShowEmojis(false);
  }, []);

  const closeChat = useCallback(() => {
    setIsOpen(false);
    setShowEmojis(false);
    Keyboard.dismiss();
  }, []);

  return (
    <>
      {/* Toggle button — fixed in bottom-right */}
      {!isOpen && (
        <Pressable style={styles.toggleBtn} onPress={toggleChat}>
          {/* Chat bubble icon */}
          <Text style={styles.toggleIcon}>{"\u{1F4AC}"}</Text>
          {unreadCount > 0 && (
            <Animated.View style={[styles.badge, badgeStyle]}>
              <Text style={styles.badgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </Animated.View>
          )}
        </Pressable>
      )}

      {/* Chat panel as a Modal sliding up from bottom */}
      <Modal
        visible={isOpen}
        animationType="slide"
        transparent
        onRequestClose={closeChat}
      >
        <Pressable style={styles.backdrop} onPress={closeChat} />
        <KeyboardAvoidingView
          style={styles.panelContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={styles.panel}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>
                Chat ({messages.length})
              </Text>
              <Pressable onPress={closeChat} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>{"\u2715"}</Text>
              </Pressable>
            </View>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messageList}
              contentContainerStyle={styles.messageListContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() =>
                scrollViewRef.current?.scrollToEnd({ animated: false })
              }
            >
              {messages.length === 0 && (
                <Text style={styles.emptyText}>
                  No messages yet. Say hello!
                </Text>
              )}
              {messages.map((msg) => (
                <View key={msg.id} style={styles.messageBubble}>
                  <View style={styles.messageHeader}>
                    <Text
                      style={[
                        styles.msgName,
                        { color: COLOR_MAP[msg.playerColor] ?? "#fff" },
                      ]}
                    >
                      {msg.playerName}
                    </Text>
                    <Text style={styles.msgTime}>
                      {formatTime(msg.timestamp)}
                    </Text>
                  </View>
                  <Text style={styles.msgText}>{msg.text}</Text>
                </View>
              ))}
            </ScrollView>

            {/* Emoji picker */}
            {showEmojis && (
              <View style={styles.emojiPicker}>
                {EMOJI_CATEGORIES.map((cat) => (
                  <View key={cat.label} style={styles.emojiCategory}>
                    <Text style={styles.emojiCategoryLabel}>{cat.label}</Text>
                    <View style={styles.emojiRow}>
                      {cat.emojis.map((emoji) => (
                        <Pressable
                          key={emoji}
                          onPress={() => insertEmoji(emoji)}
                          style={styles.emojiBtn}
                        >
                          <Text style={styles.emojiText}>{emoji}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Input bar */}
            <View style={styles.inputBar}>
              <Pressable
                onPress={() => setShowEmojis((prev) => !prev)}
                style={[
                  styles.emojiToggle,
                  showEmojis && styles.emojiToggleActive,
                ]}
              >
                <Text style={styles.emojiToggleText}>{"\u263A"}</Text>
              </Pressable>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={input}
                onChangeText={setInput}
                onFocus={() => setShowEmojis(false)}
                placeholder="Type a message..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                maxLength={200}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
              <Pressable
                onPress={handleSend}
                disabled={!input.trim()}
                style={[
                  styles.sendBtn,
                  !input.trim() && styles.sendBtnDisabled,
                ]}
              >
                <Text style={styles.sendBtnText}>{"\u27A4"}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  // Toggle button
  toggleBtn: {
    position: "absolute",
    right: 6,
    bottom: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 40,
  },
  toggleIcon: {
    fontSize: 22,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#ef4444",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // Backdrop
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },

  // Panel
  panelContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  panel: {
    height: 320,
    backgroundColor: "rgba(17,24,39,0.95)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  headerTitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600",
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 16,
  },

  // Message list
  messageList: {
    flex: 1,
    paddingHorizontal: 12,
  },
  messageListContent: {
    paddingVertical: spacing.sm,
  },
  emptyText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    textAlign: "center",
    marginTop: 40,
  },
  messageBubble: {
    marginBottom: 8,
  },
  messageHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  msgName: {
    fontSize: 12,
    fontWeight: "700",
  },
  msgTime: {
    fontSize: 10,
    color: "rgba(255,255,255,0.2)",
  },
  msgText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
  },

  // Emoji picker
  emojiPicker: {
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    backgroundColor: "rgba(31,41,55,1)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  emojiCategory: {
    marginBottom: 6,
  },
  emojiCategoryLabel: {
    fontSize: 9,
    color: "rgba(255,255,255,0.3)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  emojiRow: {
    flexDirection: "row",
    gap: 4,
  },
  emojiBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: {
    fontSize: 18,
  },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(17,24,39,0.95)",
  },
  emojiToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiToggleActive: {
    backgroundColor: colors.primary,
  },
  emojiToggleText: {
    fontSize: 20,
    color: "rgba(255,255,255,0.5)",
  },
  textInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 13,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.3,
  },
  sendBtnText: {
    color: "#fff",
    fontSize: 16,
  },
});
