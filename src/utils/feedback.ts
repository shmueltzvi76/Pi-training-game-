import { Platform } from 'react-native';
import StorageManager from '@storage/StorageManager';

let soundEnabled = true;
let hapticEnabled = true;
let audioCtx: AudioContext | null = null;

// Load settings once
export const initFeedback = async () => {
  try {
    const data = await StorageManager.getAllUserData();
    soundEnabled = data.settings?.soundEnabled ?? true;
    hapticEnabled = data.settings?.hapticEnabled ?? true;
  } catch (e) {
    // ignore
  }
};

// Reload after settings change
export const refreshFeedbackSettings = async () => {
  await initFeedback();
};

const getAudioCtx = (): AudioContext | null => {
  if (Platform.OS !== 'web') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  return audioCtx;
};

const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) => {
  if (!soundEnabled) return;
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    // ignore audio errors
  }
};

const vibrate = (pattern: number | number[]) => {
  if (!hapticEnabled) return;
  if (Platform.OS === 'web' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

// Correct digit
export const feedbackCorrect = () => {
  playTone(880, 0.1, 'sine', 0.2);
  vibrate(30);
};

// Wrong digit
export const feedbackWrong = () => {
  playTone(220, 0.25, 'square', 0.15);
  vibrate([50, 30, 50]);
};

// Game over
export const feedbackGameOver = () => {
  playTone(165, 0.4, 'sawtooth', 0.15);
  vibrate([100, 50, 100, 50, 200]);
};

// Challenge complete / victory
export const feedbackVictory = () => {
  const ctx = getAudioCtx();
  if (!soundEnabled || !ctx) {
    vibrate([50, 50, 50, 50, 200]);
    return;
  }
  try {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.value = 0.2;
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (i * 0.15) + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + (i * 0.15) + 0.2);
    });
  } catch (e) {
    // ignore
  }
  vibrate([50, 50, 50, 50, 200]);
};

// Button tap
export const feedbackTap = () => {
  playTone(600, 0.05, 'sine', 0.1);
  vibrate(15);
};
