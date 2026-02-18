import { Platform } from 'react-native';
import StorageManager from '@storage/StorageManager';

let soundEnabled = true;
let hapticEnabled = true;
let audioCtx: AudioContext | null = null;
let correctBuffer: AudioBuffer | null = null;
let wrongBuffer: AudioBuffer | null = null;

export const initFeedback = async () => {
  try {
    const data = await StorageManager.getAllUserData();
    soundEnabled = data.settings?.soundEnabled ?? true;
    hapticEnabled = data.settings?.hapticEnabled ?? true;
  } catch (e) {
    // ignore
  }
  if (Platform.OS === 'web') {
    warmupAudio();
  }
};

export const refreshFeedbackSettings = async () => {
  try {
    const data = await StorageManager.getAllUserData();
    soundEnabled = data.settings?.soundEnabled ?? true;
    hapticEnabled = data.settings?.hapticEnabled ?? true;
  } catch (e) {
    // ignore
  }
};

const ensureCtx = (): AudioContext | null => {
  if (Platform.OS !== 'web') return null;
  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      return null;
    }
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
};

// Pre-generate short audio buffers for instant playback
const warmupAudio = () => {
  const ctx = ensureCtx();
  if (!ctx) return;
  try {
    const rate = ctx.sampleRate;
    // Correct: 880Hz sine, 60ms
    const cLen = Math.floor(rate * 0.06);
    const cBuf = ctx.createBuffer(1, cLen, rate);
    const cData = cBuf.getChannelData(0);
    for (let i = 0; i < cLen; i++) {
      const t = i / rate;
      const env = Math.max(0, 1 - t / 0.06);
      cData[i] = Math.sin(2 * Math.PI * 880 * t) * 0.18 * env;
    }
    correctBuffer = cBuf;

    // Wrong: 220Hz square, 120ms
    const wLen = Math.floor(rate * 0.12);
    const wBuf = ctx.createBuffer(1, wLen, rate);
    const wData = wBuf.getChannelData(0);
    for (let i = 0; i < wLen; i++) {
      const t = i / rate;
      const env = Math.max(0, 1 - t / 0.12);
      wData[i] = (Math.sin(2 * Math.PI * 220 * t) > 0 ? 1 : -1) * 0.1 * env;
    }
    wrongBuffer = wBuf;
  } catch (e) {
    // ignore
  }
};

const playBuffer = (buffer: AudioBuffer | null) => {
  if (!soundEnabled || !buffer) return;
  const ctx = ensureCtx();
  if (!ctx) return;
  try {
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(ctx.destination);
    src.start();
  } catch (e) {
    // ignore
  }
};

const vibrate = (pattern: number | number[]) => {
  if (!hapticEnabled) return;
  if (Platform.OS === 'web' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

export const feedbackCorrect = () => {
  playBuffer(correctBuffer);
  vibrate(20);
};

export const feedbackWrong = () => {
  playBuffer(wrongBuffer);
  vibrate([40, 20, 40]);
};

export const feedbackGameOver = () => {
  if (!soundEnabled) {
    vibrate([80, 40, 80, 40, 160]);
    return;
  }
  const ctx = ensureCtx();
  if (!ctx) return;
  try {
    const rate = ctx.sampleRate;
    const len = Math.floor(rate * 0.35);
    const buf = ctx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / rate;
      const env = Math.max(0, 1 - t / 0.35);
      data[i] = (Math.sin(2 * Math.PI * 165 * t) > 0 ? 1 : -1) * 0.12 * env;
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
  } catch (e) {
    // ignore
  }
  vibrate([80, 40, 80, 40, 160]);
};

export const feedbackVictory = () => {
  if (!soundEnabled) {
    vibrate([40, 40, 40, 40, 160]);
    return;
  }
  const ctx = ensureCtx();
  if (!ctx) return;
  try {
    const rate = ctx.sampleRate;
    const notes = [523, 659, 784, 1047];
    const noteLen = 0.15;
    const totalLen = Math.floor(rate * (notes.length * noteLen + 0.1));
    const buf = ctx.createBuffer(1, totalLen, rate);
    const data = buf.getChannelData(0);
    notes.forEach((freq, idx) => {
      const start = Math.floor(rate * idx * noteLen);
      const dur = Math.floor(rate * 0.14);
      for (let i = 0; i < dur && start + i < totalLen; i++) {
        const t = i / rate;
        const env = Math.max(0, 1 - t / 0.14);
        data[start + i] += Math.sin(2 * Math.PI * freq * t) * 0.18 * env;
      }
    });
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.connect(ctx.destination);
    src.start();
  } catch (e) {
    // ignore
  }
  vibrate([40, 40, 40, 40, 160]);
};

export const feedbackTap = () => {
  vibrate(10);
};
