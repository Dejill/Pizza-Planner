import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DoughInput } from '@/lib/dough';

export interface CookSession {
  input: DoughInput;
  stageIndex: number;
  stageStartedAt: number;
  pausedRemainingSec: number | null;
  running: boolean;
}

export interface RecoveredPosition {
  stageIndex: number;
  remainingSec: number;
  completedAll: boolean;
  doneSecondsAgo: number;
}

const SESSION_KEY = 'pizza-planner/cook-session';

export async function saveCookSession(session: CookSession): Promise<void> {
  try {
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {}
}

export async function loadCookSession(): Promise<CookSession | null> {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookSession;
    if (!parsed || typeof parsed.stageIndex !== 'number' || !parsed.input) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearCookSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function recoverCookPosition(
  stageDurationsSec: number[],
  session: CookSession,
  nowMs: number,
): RecoveredPosition {
  const fromStage = Math.min(session.stageIndex, stageDurationsSec.length - 1);

  if (session.pausedRemainingSec !== null || !session.running) {
    return {
      stageIndex: fromStage,
      remainingSec: session.pausedRemainingSec ?? stageDurationsSec[fromStage],
      completedAll: false,
      doneSecondsAgo: 0,
    };
  }

  let index = fromStage;
  let elapsedSec = Math.max(0, Math.floor((nowMs - session.stageStartedAt) / 1000));

  while (index < stageDurationsSec.length) {
    const duration = stageDurationsSec[index];
    if (elapsedSec < duration) {
      return {
        stageIndex: index,
        remainingSec: duration - elapsedSec,
        completedAll: false,
        doneSecondsAgo: 0,
      };
    }
    elapsedSec -= duration;
    index += 1;
  }

  const totalSec = stageDurationsSec.reduce((sum, sec) => sum + sec, 0);
  const doneSecondsAgo = Math.max(
    0,
    Math.floor((nowMs - session.stageStartedAt) / 1000) - totalSec,
  );

  return {
    stageIndex: stageDurationsSec.length - 1,
    remainingSec: 0,
    completedAll: true,
    doneSecondsAgo,
  };
}
