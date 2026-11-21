import { buildCookSchedule } from '@/lib/schedule';
import type { DoughInput } from '@/lib/dough';

const MINUTE = 60 * 1000;

export interface ReadyByPlan {
  startAtMs: number;
  readyAtMs: number;
  startsToday: boolean;
}

export function planTotalMinutes(input: DoughInput): number {
  return buildCookSchedule(input).reduce((sum, stage) => sum + stage.minutes, 0);
}

/** Latest start time so the plan finishes exactly at the ready-by time. */
export function latestStartForReadyBy(input: DoughInput, readyByMs: number, nowMs: number): ReadyByPlan {
  const durationMs = planTotalMinutes(input) * MINUTE;
  const startAtMs = Math.max(nowMs, readyByMs - durationMs);
  return {
    startAtMs,
    readyAtMs: startAtMs + durationMs,
    startsToday: new Date(startAtMs).toDateString() === new Date(nowMs).toDateString(),
  };
}

export function formatClock(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function formatDayLabel(ms: number, nowMs: number): string {
  const date = new Date(ms);
  const now = new Date(nowMs);
  if (date.toDateString() === now.toDateString()) return 'today';
  const tomorrow = new Date(now.getTime() + 24 * 60 * MINUTE);
  if (date.toDateString() === tomorrow.toDateString()) return 'tomorrow';
  return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}
