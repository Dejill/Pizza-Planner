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
      return 'Cold retard';
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
