const STORAGE_KEY = "sequence_sound_enabled";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(enabled));
  }
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === null ? true : JSON.parse(stored);
}

function playTone(
  frequency: number,
  durationMs: number,
  type: OscillatorType = "sine",
  gainValue: number = 0.15
): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
  gainNode.gain.setValueAtTime(gainValue, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    ctx.currentTime + durationMs / 1000
  );

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(ctx.currentTime);
  oscillator.stop(ctx.currentTime + durationMs / 1000);
}

function playToneAt(
  frequency: number,
  durationMs: number,
  delayMs: number,
  type: OscillatorType = "sine",
  gainValue: number = 0.15
): void {
  if (!isSoundEnabled()) return;

  const ctx = getAudioContext();
  const startTime = ctx.currentTime + delayMs / 1000;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gainNode.gain.setValueAtTime(gainValue, startTime);
  gainNode.gain.exponentialRampToValueAtTime(
    0.001,
    startTime + durationMs / 1000
  );

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(startTime);
  oscillator.stop(startTime + durationMs / 1000);
}

/** Short click/pop when placing a chip */
export function playChipSound(): void {
  playTone(800, 80, "sine", 0.12);
}

/** Gentle two-note chime when it becomes your turn */
export function yourTurnSound(): void {
  playToneAt(440, 100, 0, "sine", 0.1);
  playToneAt(660, 100, 120, "sine", 0.1);
}

/** Low thud when one-eyed Jack removes a chip */
export function removeChipSound(): void {
  playTone(200, 120, "sine", 0.18);
}

/** Rising three-note arpeggio when a sequence is completed */
export function sequenceSound(): void {
  playToneAt(440, 100, 0, "sine", 0.12);
  playToneAt(554, 100, 120, "sine", 0.12);
  playToneAt(659, 100, 240, "sine", 0.12);
}

/** Triumphant fanfare — C major chord */
export function winSound(): void {
  playToneAt(261, 400, 0, "sine", 0.1);
  playToneAt(329, 400, 0, "sine", 0.1);
  playToneAt(392, 400, 0, "sine", 0.1);
}

/** Tick-tock clock sound for timer countdown — alternates pitch */
export function timerTickSound(isEven: boolean): void {
  // Tick = higher pitch, tock = lower pitch (like a clock)
  playTone(isEven ? 1200 : 800, 40, "sine", 0.1);
}

/**
 * One-Eyed Jack remove sound — dramatic descending boom with a shattering tail.
 * Opens with a low sawtooth thud, followed by three falling tones that break
 * apart like glass, giving the impression of destruction.
 */
export function jackRemoveSound(): void {
  // Deep initial thud (sawtooth for harshness)
  playToneAt(80, 300, 0, "sawtooth", 0.22);
  // Impact body — square wave mid boom
  playToneAt(140, 250, 0, "square", 0.14);
  // Descending shattering tones
  playToneAt(320, 180, 60, "sawtooth", 0.12);
  playToneAt(220, 160, 130, "sawtooth", 0.10);
  playToneAt(150, 200, 200, "sawtooth", 0.09);
  // Final low rumble fade
  playToneAt(60, 350, 80, "sine", 0.18);
  playToneAt(45, 400, 200, "sine", 0.10);
}

/**
 * Two-Eyed Jack wild sound — magical ascending sparkle with shimmer.
 * Starts with a soft low tone that blossoms into a rising arpeggio,
 * topped with high glittering overtones that decay into silence.
 */
export function jackWildSound(): void {
  // Soft warm base
  playToneAt(261, 300, 0, "sine", 0.10);
  // Rising arpeggio (C4 → E4 → G4 → B4 → D5)
  playToneAt(261, 150, 0, "triangle", 0.11);
  playToneAt(329, 150, 100, "triangle", 0.11);
  playToneAt(392, 150, 200, "triangle", 0.11);
  playToneAt(493, 150, 300, "triangle", 0.12);
  playToneAt(587, 160, 400, "triangle", 0.12);
  // High shimmer overtones
  playToneAt(1046, 200, 380, "sine", 0.07);
  playToneAt(1318, 200, 440, "sine", 0.06);
  playToneAt(1568, 220, 500, "sine", 0.05);
  // Bright final chime
  playToneAt(1174, 300, 560, "sine", 0.08);
}
