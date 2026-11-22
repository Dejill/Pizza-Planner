import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

let audioCtx: AudioContext | null = null;

export function unlockAudio(): void {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return;
  try {
    const Ctx = window.AudioContext;
    if (!Ctx) return;
    if (!audioCtx) audioCtx = new Ctx();
    void audioCtx.resume();
  } catch {}
}

function playChime(): void {
  if (!audioCtx) return;
  try {
    const ctx = audioCtx;
    const now = ctx.currentTime;
    const note = (freq: number, start: number, dur: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + start);
      gain.gain.exponentialRampToValueAtTime(0.2, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    };
    note(659.25, 0, 0.2);
    note(880, 0.18, 0.35);
  } catch {}
}

export async function stageCompleteFeedback(): Promise<void> {
  playChime();
  if (Platform.OS === 'web') return;
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {}
}

export async function tapFeedback(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {}
}
