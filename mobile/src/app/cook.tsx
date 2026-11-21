import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import type { DoughInput, YeastKind } from '@/lib/dough';
import { buildCookSchedule, formatCountdown, formatDuration, type CookStage } from '@/lib/schedule';
import { useCountdown } from '@/lib/useCountdown';
import {
  cancelFoldAlarms,
  cancelStageAlarm,
  ensureAlarmPermission,
  scheduleFoldAlarms,
  scheduleStageAlarm,
} from '@/lib/alarms';
import { clearCookSession, loadCookSession, recoverCookPosition, saveCookSession, type CookSession } from '@/lib/session';

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
  const durationsSec = useMemo(() => stages.map((s) => s.minutes * 60), [stages]);

  const [stageIndex, setStageIndex] = useState(0);
  const [completedAll, setCompletedAll] = useState(false);
  const [doneSecondsAgo, setDoneSecondsAgo] = useState(0);
  const restoredRef = useRef(false);
  const stageStartedAtRef = useRef(0);
  const stage: CookStage | undefined = stages[stageIndex];
  const isLast = stageIndex === stages.length - 1;

  const handleStageComplete = useCallback(() => {
    if (isLast) {
      setDoneSecondsAgo(0);
      setCompletedAll(true);
    } else {
      setStageIndex((index) => index + 1);
    }
  }, [isLast]);

  const timer = useCountdown((stage?.minutes ?? 0) * 60, handleStageComplete);

  useEffect(() => {
    let active = true;
    void loadCookSession().then((session) => {
      if (!active || !session) return;
      restoredRef.current = true;
      const recovered = recoverCookPosition(durationsSec, session, Date.now());
      if (recovered.completedAll) {
        setCompletedAll(true);
        setDoneSecondsAgo(recovered.doneSecondsAgo);
        setStageIndex(recovered.stageIndex);
      } else if (recovered.remainingSec < durationsSec[recovered.stageIndex] || recovered.stageIndex > 0) {
        setStageIndex(recovered.stageIndex);
        timer.reset(recovered.remainingSec);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!stage || completedAll || !restoredRef.current || stageStartedAtRef.current === 0) return;
    const session: CookSession = {
      input,
      stageIndex,
      stageStartedAt: stageStartedAtRef.current,
      pausedRemainingSec: timer.running ? null : timer.remainingSec,
      running: timer.running,
    };
    void saveCookSession(session);
  }, [stage, stageIndex, completedAll, timer.running, timer.remainingSec, input]);

  const goToStage = useCallback(
    (index: number, restoreSec?: number) => {
      setStageIndex(index);
      setCompletedAll(false);
      timer.reset(restoreSec ?? durationsSec[index] ?? 0);
    },
    [durationsSec, timer],
  );

  useEffect(() => {
    timer.reset(stage?.minutes ?? 0 * 60);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageIndex, stages]);

  const startStage = useCallback(async () => {
    if (!stage) return;
    if (stageStartedAtRef.current === 0 || timer.remainingSec === stage.minutes * 60) {
      stageStartedAtRef.current = Date.now();
    }
    const granted = await ensureAlarmPermission();
    timer.start();
    if (granted) void scheduleStageAlarm(stage.id, stage.minutes);
    if (stage.id === 'bulk' && !input.coldRetard && Platform.OS !== 'web') {
      void scheduleFoldAlarms(stage.minutes);
    }
  }, [stage, timer, input.coldRetard]);

  const pauseStage = useCallback(() => {
    timer.pause();
    if (!stage) return;
    void cancelStageAlarm(stage.id);
    if (stage.id === 'bulk') void cancelFoldAlarms(stage.minutes);
  }, [stage, timer]);

  const finishStage = useCallback(() => {
    timer.reset();
    stageStartedAtRef.current = 0;
    if (!stage) return;
    void cancelStageAlarm(stage.id);
    if (stage.id === 'bulk') void cancelFoldAlarms(stage.minutes);
    if (isLast) {
      setDoneSecondsAgo(0);
      setCompletedAll(true);
    } else {
      setStageIndex((index) => index + 1);
    }
  }, [stage, timer, isLast]);

  const resetPlan = useCallback(() => {
    void clearCookSession();
    stageStartedAtRef.current = 0;
    setCompletedAll(false);
    setDoneSecondsAgo(0);
    goToStage(0);
  }, [goToStage]);

  useEffect(() => {
    const cancelAll = () => {
      stages.forEach((s) => void cancelStageAlarm(s.id));
      if (input.coldRetard === false) void cancelFoldAlarms(stages[2]?.minutes ?? 0);
    };
    return cancelAll;
  }, [stages, input.coldRetard]);

  const totalRemainingSec = useMemo(() => {
    const doneSec = stages.slice(0, stageIndex).reduce((sum, s) => sum + s.minutes * 60, 0);
    return stages.reduce((sum, s) => sum + s.minutes * 60, 0) - doneSec - timer.remainingSec;
  }, [stages, stageIndex, timer.remainingSec]);

  if (!stage) return null;

  if (completedAll) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.readyCard}>
          <Text style={styles.readyTitle}>Ready to bake 🍕</Text>
          <Text style={styles.readySubtitle}>
            {doneSecondsAgo > 0
              ? `You finished the plan ${formatDuration(Math.round(doneSecondsAgo / 60))} ago.`
              : 'You finished the plan. Time to bake!'}
          </Text>
          <Text style={styles.readyNotes}>
            You have {input.pizzas} balls ({input.ballWeightG} g each, {input.hydrationPct}%
            hydration). Bake on a preheated steel or stone at the maximum oven temperature.
            Slide them onto the stone, bake {Math.round(stage.minutes * 0.25)} min on the stone, then move to
            broiler or finishing spot for the last stretch until blistered and spotted. Rest slices
            on a rack for a minute before serving.
          </Text>
          <Pressable accessibilityRole="button" onPress={resetPlan} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Start a new plan</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

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
          onPress={() => index < stageIndex && goToStage(index)}
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
              {timer.running ? 'Pause' : timer.remainingSec === stage.minutes * 60 ? 'Start' : 'Resume'}
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
        <Text style={styles.hintText}>Timers keep running if you leave the app.</Text>
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
  hintText: {
    fontSize: 12,
    color: COLORS.muted,
  },
  readyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.accent,
    padding: 20,
    gap: 12,
  },
  readyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.accent,
    textAlign: 'center',
  },
  readySubtitle: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  readyNotes: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 20,
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
