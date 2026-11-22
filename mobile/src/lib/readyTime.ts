import { buildCookSchedule } from '@/lib/schedule';
import type { DoughInput } from '@/lib/dough';
import { dictFor } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

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

export function formatClock(ms: number, lang: Lang = 'en'): string {
  const date = new Date(ms);
  const locale = lang === 'da' ? 'da-DK' : undefined;
  return date.toLocaleTimeString(locale ? [locale] : [], { hour: 'numeric', minute: '2-digit' });
}

export function formatDayLabel(ms: number, nowMs: number, lang: Lang = 'en'): string {
  const date = new Date(ms);
  const now = new Date(nowMs);
  const t = dictFor(lang).readyTime;
  const locale = lang === 'da' ? 'da-DK' : undefined;
  if (date.toDateString() === now.toDateString()) return t.today;
  const tomorrow = new Date(now.getTime() + 24 * 60 * MINUTE);
  if (date.toDateString() === tomorrow.toDateString()) return t.tomorrow;
  return date.toLocaleDateString(locale ? [locale] : [], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}
