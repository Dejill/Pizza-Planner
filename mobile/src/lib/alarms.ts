import * as Notifications from 'expo-notifications';

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

export async function scheduleStageAlarm(stageId: string, minutes: number): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      identifier: `${STAGE_ALARM_PREFIX}-${stageId}`,
      content: {
        title: 'Pizza Planner',
        body: `${stageLabel(stageId)} is done — on to the next step!`,
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

function stageLabel(stageId: string): string {
  switch (stageId) {
    case 'mix':
      return 'Mixing';
    case 'knead':
      return 'Kneading';
    case 'bulk':
      return 'Bulk rise';
    case 'retard':
      return 'Cold proofing (fridge)';
    case 'preshape':
      return 'Pre-shape & rest';
    case 'shape':
      return 'Shaping';
    case 'final-proof':
      return 'Final proof';
    case 'bake':
      return 'Baking';
    default:
      return 'Your stage';
  }
}

export function stageLabelFor(stageId: string): string {
  return stageLabel(stageId);
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
