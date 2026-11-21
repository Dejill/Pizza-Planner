import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { DoughInput, YeastKind } from '@/lib/dough';
import { buildCookSchedule, formatCountdown, formatDuration, type CookStage } from '@/lib/schedule';
import { useCountdown } from '@/lib/useCountdown';
import { cancelStageAlarm, ensureAlarmPermission, scheduleStageAlarm } from '@/lib/alarms';

const COLORS = {
  background: '#fff7f0',
  card: '#ffffff',
  text: '#2d2016',
  muted: '#8a7663',
  accent: '#d9541e',
  accentSoft: '#fbe4d5',
  border: '#eadcd2',
  done: '#c9ecd0',
};

function parseDoughInput(params: Record<string, string | string[] | undefined>): DoughInput {
  const num = (key: string, fallback: number): number => {
    const raw = Array.isArray(params[key]) ? params[key][0] : params[key];
    const parsed = Number.parseFloat(raw ?? '');
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const str = (key: string, fallback: string): string => {
    const raw = Array.isArray(params[key]) ? params[key][0] : params[key];
    return raw ?? fallback;
  };
  return {
    pizzas: num('pizzas', 4),
    ballWeightG: num('ballWeightG', 250),
    hydrationPct: num('hydrationPct', 65),
    saltPct: num('saltPct', 2.5),
    yeastKind: str('yeastKind', 'instant') as YeastKind,
    fermentationHours: num('fermentationHours', 24),
    coldRetard: str('coldRetard', 'true') === 'true',
  };
}

export default function CookScreen() {
  const params = useLocalSearchParams();
  const input = useMemo(() => parseDoughInput(params), [params]);
  const stages = useMemo(() => buildCookSchedule(input), [input]);

  const [stageIndex, setStageIndex] = useState(0);
  const stage: CookStage | undefined = stages[stageIndex];
  const isLast = stageIndex === stages.length - 1;

  const goNextStage = useCallback(() => {
    if (!isLast) setStageIndex((index) => index + 1);
  }, [isLast]);

  const timer = useCountdown((stage?.minutes ?? 0) * 60, goNextStage);

  useEffect(() => {
    timer.reset((stage?.minutes ?? 0) * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageIndex, stages]);

  const startStage = useCallback(async () => {
    if (!stage) return;
    const granted = await ensureAlarmPermission();
    timer.start();
    if (granted) void scheduleStageAlarm(stage.id, stage.minutes);
  }, [stage, timer]);

  const pauseStage = useCallback(() => {
    timer.pause();
    if (stage) void cancelStageAlarm(stage.id);
  }, [stage, timer]);

  const finishStage = useCallback(() => {
    timer.reset();
    if (stage) void cancelStageAlarm(stage.id);
    goNextStage();
  }, [stage, timer, goNextStage]);

  useEffect(() => {
    const cancelAll = () => {
      stages.forEach((s) => void cancelStageAlarm(s.id));
    };
    return cancelAll;
  }, [stages]);

  const totalRemainingSec = useMemo(() => {
    const doneSec = stages.slice(0, stageIndex).reduce((sum, s) => sum + s.minutes * 60, 0);
    return stages.reduce((sum, s) => sum + s.minutes * 60, 0) - doneSec - timer.remainingSec;
  }, [stages, stageIndex, timer.remainingSec]);

  if (!stage) return null;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.overview}>
        {stages.length} steps · {formatDuration(stages.reduce((s, x) => s + x.minutes, 0))} total ·{' '}
        {formatCountdown(totalRemainingSec)} to go
      </Text>

      {stages.map((s, index) => (
        <Pressable
          key={s.id}
          accessibilityRole="button"
          accessibilityLabel={s.label}
          onPress={() => index < stageIndex && setStageIndex(index)}
          style={[styles.stageRow, index === stageIndex && styles.stageActive, index < stageIndex && styles.stageDone]}
        >
          <Text style={index <= stageIndex ? styles.stageText : styles.stageTextMuted}>
            {index < stageIndex ? '✓ ' : ''}
            {s.label}
          </Text>
          <Text style={styles.stageMinutes}>{formatDuration(s.minutes)}</Text>
        </Pressable>
      ))}

      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>{stage.label}</Text>
        <Text style={styles.timer}>{formatCountdown(timer.remainingSec)}</Text>
        <Text style={styles.timerDescription}>{stage.description}</Text>

        <View style={styles.controls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={timer.running ? 'Pause' : 'Start'}
            onPress={() => (timer.running ? pauseStage() : void startStage())}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>
              {timer.finished ? 'Stage done' : timer.running ? 'Pause' : timer.remainingSec === stage.minutes * 60 ? 'Start' : 'Resume'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip stage"
            onPress={finishStage}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>{isLast ? 'Finish' : 'Next stage'}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 8,
  },
  overview: {
    fontSize: 14,
    color: COLORS.muted,
  },
  stageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  stageActive: {
    borderColor: COLORS.accent,
    borderWidth: 2,
  },
  stageDone: {
    backgroundColor: COLORS.done,
    borderColor: COLORS.done,
  },
  stageText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  stageTextMuted: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.muted,
  },
  stageMinutes: {
    fontSize: 14,
    color: COLORS.muted,
    alignSelf: 'center',
  },
  timerCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.accent,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  timer: {
    fontSize: 64,
    fontWeight: '800',
    color: COLORS.accent,
    fontVariant: ['tabular-nums'],
  },
  timerDescription: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  primaryButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: COLORS.accentSoft,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: COLORS.accent,
    fontSize: 16,
    fontWeight: '700',
  },
});
