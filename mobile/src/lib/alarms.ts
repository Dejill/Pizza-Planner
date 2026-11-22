import * as Notifications from 'expo-notifications';
import { dictFor } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

export const STAGE_ALARM_PREFIX = 'stage-alarm';

export async function ensureAlarmPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;
  if (status !== 'granted') {
    const requested = await Notifications.requestPermissionsAsync();
    status = requested.status;
  }
  return status === 'granted';
}

export async function scheduleStageAlarm(
  stageId: string,
  minutes: number,
  lang: Lang = 'en',
): Promise<string | null> {
  const t = dictFor(lang).alarms;
  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: `${STAGE_ALARM_PREFIX}-${stageId}`,
      content: {
        title: t.appTitle,
        body: t.isDone(stageLabel(stageId, lang)),
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, Math.round(minutes * 60)),
      },
    });
  } catch {
    return null;
  }
}

export async function cancelStageAlarm(stageId: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(`${STAGE_ALARM_PREFIX}-${stageId}`);
  } catch {}
}

function stageLabel(stageId: string, lang: Lang): string {
  const t = dictFor(lang).alarms;
  switch (stageId) {
    case 'mix':
      return t.mix;
    case 'knead':
      return t.knead;
    case 'bulk':
      return t.bulk;
    case 'retard':
      return t.retard;
    case 'preshape':
      return t.preshape;
    case 'shape':
      return t.shape;
    case 'final-proof':
      return t.finalProof;
    case 'bake':
      return t.bake;
    default:
      return t.fallback;
  }
}

export function stageLabelFor(stageId: string, lang: Lang = 'en'): string {
  return stageLabel(stageId, lang);
}

export function foldOffsets(bulkMinutes: number): number[] {
  if (bulkMinutes <= 60) return [Math.round(bulkMinutes / 2)];
  const folds = Math.max(2, Math.min(6, Math.floor(bulkMinutes / 60)));
  const spacing = Math.round(bulkMinutes / folds);
  return Array.from({ length: folds }, (_, i) => spacing * (i + 1)).filter(
    (offset) => offset < bulkMinutes,
  );
}

export async function scheduleFoldAlarms(
  bulkMinutes: number,
): Promise<string[]> {
  const ids: string[] = [];
  for (const offset of foldOffsets(bulkMinutes)) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        identifier: `${STAGE_ALARM_PREFIX}-fold-${offset}`,
        content: {
          title: 'Pizza Planner',
          body: 'Time for a stretch and fold.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: Math.max(1, offset * 60),
        },
      });
      ids.push(id);
    } catch {}
  }
  return ids;
}

export async function cancelFoldAlarms(bulkMinutes: number): Promise<void> {
  for (const offset of foldOffsets(bulkMinutes)) {
    try {
      await Notifications.cancelScheduledNotificationAsync(
        `${STAGE_ALARM_PREFIX}-fold-${offset}`,
      );
    } catch {}
  }
}
