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

/** Tick sound for timer warning — last 10 seconds */
export function timerWarningSound(): void {
  playTone(1000, 30, "square", 0.08);
}
