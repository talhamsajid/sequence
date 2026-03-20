// Sound effects using expo-av
// Uses pre-generated oscillator tones loaded as inline audio

import { Audio } from "expo-av";

let soundsLoaded = false;
const sounds: Record<string, Audio.Sound> = {};

// Frequency-based tone generation (matching web's Web Audio API approach)
// We create simple beep tones using expo-av's Sound.createAsync
// For MVP, we use haptics primarily and add proper audio files later

export async function initSounds(): Promise<void> {
  if (soundsLoaded) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    soundsLoaded = true;
  } catch {
    // Audio not available — haptics will carry the UX
  }
}

// Placeholder — sounds will be added as audio files in Phase 4
// For now, haptics provide all feedback
export function playChipSound(): void {
  // Will play chip placement sound
}

export function playSequenceSound(): void {
  // Will play sequence completion fanfare
}

export function playWinSound(): void {
  // Will play victory sound
}

export function playTimerTickSound(): void {
  // Will play tick sound in last 10 seconds
}

export function cleanupSounds(): void {
  Object.values(sounds).forEach((s) => s.unloadAsync().catch(() => {}));
}
