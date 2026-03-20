/**
 * Sound effects for the Sequence mobile app.
 *
 * Since Web Audio API oscillators are not available in React Native,
 * this module uses expo-haptics as the PRIMARY feedback mechanism and
 * exposes the same function signatures as the web version.
 *
 * Audio tones can be layered in later by dropping .wav/.mp3 files into
 * assets/sounds/ and loading them with expo-av Audio.Sound.
 */

import * as Haptics from "expo-haptics";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "sequence_sound_enabled";

// In-memory cache — loaded once at init
let _soundEnabled = true;
let _initialized = false;

/**
 * Load persisted sound preference. Call once at app startup.
 */
export async function initSounds(): Promise<void> {
  if (_initialized) return;
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      _soundEnabled = JSON.parse(stored) === true;
    }
  } catch {
    // Fallback: keep default (enabled)
  }
  _initialized = true;
}

export function isSoundEnabled(): boolean {
  return _soundEnabled;
}

export function setSoundEnabled(enabled: boolean): void {
  _soundEnabled = enabled;
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(enabled)).catch(() => {});
}

// ---------------------------------------------------------------------------
// Haptic helpers (guarded by sound toggle)
// ---------------------------------------------------------------------------

function hapticImpact(style: Haptics.ImpactFeedbackStyle): void {
  if (!_soundEnabled) return;
  Haptics.impactAsync(style).catch(() => {});
}

function hapticNotification(type: Haptics.NotificationFeedbackType): void {
  if (!_soundEnabled) return;
  Haptics.notificationAsync(type).catch(() => {});
}

function hapticSelection(): void {
  if (!_soundEnabled) return;
  Haptics.selectionAsync().catch(() => {});
}

// ---------------------------------------------------------------------------
// Public API — matches web function signatures
// ---------------------------------------------------------------------------

/** Short click/pop when placing a chip */
export function playChipSound(): void {
  hapticImpact(Haptics.ImpactFeedbackStyle.Medium);
}

/** Gentle two-tap chime when it becomes your turn */
export function yourTurnSound(): void {
  hapticNotification(Haptics.NotificationFeedbackType.Success);
}

/** Low thud when one-eyed Jack removes a chip */
export function removeChipSound(): void {
  hapticImpact(Haptics.ImpactFeedbackStyle.Heavy);
}

/** Rising haptic when a sequence is completed */
export function sequenceSound(): void {
  hapticNotification(Haptics.NotificationFeedbackType.Success);
  // Double-tap feel for sequences
  setTimeout(() => {
    hapticImpact(Haptics.ImpactFeedbackStyle.Heavy);
  }, 150);
}

/** Triumphant haptic pattern on win */
export function winSound(): void {
  hapticNotification(Haptics.NotificationFeedbackType.Success);
  setTimeout(() => hapticImpact(Haptics.ImpactFeedbackStyle.Heavy), 200);
  setTimeout(() => hapticNotification(Haptics.NotificationFeedbackType.Success), 400);
}

/** Tick-tock for timer countdown — alternates feel */
export function timerTickSound(isEven: boolean): void {
  if (isEven) {
    hapticImpact(Haptics.ImpactFeedbackStyle.Light);
  } else {
    hapticSelection();
  }
}

/** One-Eyed Jack remove — dramatic heavy impact */
export function jackRemoveSound(): void {
  hapticImpact(Haptics.ImpactFeedbackStyle.Heavy);
  setTimeout(() => hapticImpact(Haptics.ImpactFeedbackStyle.Heavy), 100);
  setTimeout(() => hapticImpact(Haptics.ImpactFeedbackStyle.Medium), 250);
}

/** Two-Eyed Jack wild — light sparkle pattern */
export function jackWildSound(): void {
  hapticImpact(Haptics.ImpactFeedbackStyle.Light);
  setTimeout(() => hapticImpact(Haptics.ImpactFeedbackStyle.Light), 100);
  setTimeout(() => hapticImpact(Haptics.ImpactFeedbackStyle.Medium), 200);
  setTimeout(() => hapticNotification(Haptics.NotificationFeedbackType.Success), 350);
}

/** Cleanup — no-op for haptics (no resources to release) */
export function cleanupSounds(): void {
  // Reserved for future audio file cleanup
}
