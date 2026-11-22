import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useKeepAwake } from 'expo-keep-awake';
import type { DoughInput, YeastKind } from '@/lib/dough';
import {
  buildCookSchedule,
  formatCountdown,
  formatDuration,
  upcomingStageClockTimes,
  type CookStage,
} from '@/lib/schedule';
import { formatClock } from '@/lib/readyTime';
import { useCountdown } from '@/lib/useCountdown';
import { stageCompleteFeedback, tapFeedback, unlockAudio } from '@/lib/feedback';
import { useThemeColors, type ThemeColors } from '@/lib/theme';
import {
  cancelFoldAlarms,
  cancelStageAlarm,
  ensureAlarmPermission,
  scheduleFoldAlarms,
  scheduleStageAlarm,
} from '@/lib/alarms';
import { clearCookSession, loadCookSession, recoverCookPosition, saveCookSession, type CookSession } from '@/lib/session';
import { getApplicablePreset } from '@/lib/presets';
import { addCookHistoryEntry, updateCookHistoryNote } from '@/lib/history';
import { defaultRecipeStore } from '@/lib/recipes';

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
  useKeepAwake();
  const c = useThemeColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const params = useLocalSearchParams();
  const input = useMemo(() => parseDoughInput(params), [params]);
  const preset = useMemo(() => {
    const raw = Array.isArray(params.presetId) ? params.presetId[0] : params.presetId;
    return raw ? getApplicablePreset(raw) : undefined;
  }, [params.presetId]);
  const stages = useMemo(() => buildCookSchedule(input), [input]);
  const durationsSec = useMemo(() => stages.map((s) => s.minutes * 60), [stages]);

  const [stageIndex, setStageIndex] = useState(0);
  const [completedAll, setCompletedAll] = useState(false);
  const [doneSecondsAgo, setDoneSecondsAgo] = useState(0);
  const [historyEntryId, setHistoryEntryId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const completedFromRestoreRef = useRef(false);
  const restoredRef = useRef(false);
  const stageStartedAtRef = useRef(0);
  const stage: CookStage | undefined = stages[stageIndex];
  const isLast = stageIndex === stages.length - 1;

  const handleStageComplete = useCallback(() => {
    void stageCompleteFeedback();
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
        completedFromRestoreRef.current = true;
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

  useEffect(() => {
    if (!completedAll || completedFromRestoreRef.current) return;
    void addCookHistoryEntry(defaultRecipeStore(), input).then((entry) => {
      setHistoryEntryId(entry.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completedAll]);

  const goToStage = useCallback(
    (index: number, restoreSec?: number) => {
      void tapFeedback();
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
    unlockAudio();
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

  const adjustStage = useCallback(
    (deltaSec: number) => {
      if (!stage) return;
      const next = Math.max(60, Math.min(6 * 3600, timer.remainingSec + deltaSec));
      timer.addTime(next - timer.remainingSec);
      if (timer.running) {
        void cancelStageAlarm(stage.id).then(() => {
          void scheduleStageAlarm(stage.id, Math.ceil(next / 60));
        });
      }
    },
    [stage, timer],
  );

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
    setHistoryEntryId(null);
    setNoteText('');
    goToStage(0);
  }, [goToStage]);

  useEffect(() => {
    const cancelAll = () => {
      stages.forEach((s) => void cancelStageAlarm(s.id));
      if (input.coldRetard === false) void cancelFoldAlarms(stages[2]?.minutes ?? 0);
    };
    return cancelAll;
  }, [stages, input.coldRetard]);

  const clockTimes = useMemo(
    () => upcomingStageClockTimes(stages, stageIndex, timer.remainingSec, timer.nowMs),
    [stages, stageIndex, timer.remainingSec, timer.nowMs],
  );

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
          <Text style={styles.readyBakeNote}>{preset?.bakeNote ?? 'Bake on a preheated steel or stone at the maximum oven temperature.'}</Text>
          <Text style={styles.readyNotes}>
            You have {input.pizzas} balls ({input.ballWeightG} g each, {input.hydrationPct}%
            hydration). Launch them onto the hot surface, bake until the base sets and the top
            blisters, and rest the pizzas on a rack for a minute before serving.
          </Text>
          <Text style={styles.hintText}>How did it turn out?</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="Notes for next time (optional)"
            placeholderTextColor={c.muted}
            value={noteText}
            onChangeText={setNoteText}
            multiline
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Save bake note"
            onPress={() => {
              if (!historyEntryId) return;
              void updateCookHistoryNote(defaultRecipeStore(), historyEntryId, noteText.trim());
            }}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Save note to bake history</Text>
          </Pressable>
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
          <View style={styles.stageMeta}>
            {index > stageIndex && clockTimes[index - stageIndex - 1] !== undefined && (
              <Text style={styles.stageClock}>{formatClock(clockTimes[index - stageIndex - 1])}</Text>
            )}
            <Text style={styles.stageMinutes}>{formatDuration(s.minutes)}</Text>
          </View>
        </Pressable>
      ))}

      <View style={styles.timerCard}>
        <Text style={styles.timerLabel}>{stage.label}</Text>
        <Text style={styles.timer}>{formatCountdown(timer.remainingSec)}</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.round(
                  ((stage.minutes * 60 - timer.remainingSec) / (stage.minutes * 60)) * 100,
                )}%`,
              },
            ]}
          />
        </View>
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
        <View style={styles.adjustRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Make stage 5 minutes shorter"
            onPress={() => adjustStage(-300)}
            style={styles.adjustButton}
          >
            <Text style={styles.adjustButtonText}>−5 min</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Make stage 5 minutes longer"
            onPress={() => adjustStage(300)}
            style={styles.adjustButton}
          >
            <Text style={styles.adjustButtonText}>+5 min</Text>
          </Pressable>
        </View>
        <Text style={styles.hintText}>Timers keep running if you leave the app.</Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: c.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
    gap: 8,
  },
  overview: {
    fontSize: 14,
    color: c.muted,
  },
  stageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: c.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  stageActive: {
    borderColor: c.accent,
    borderWidth: 2,
  },
  stageDone: {
    backgroundColor: c.done,
    borderColor: c.done,
  },
  stageText: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
  },
  stageTextMuted: {
    fontSize: 16,
    fontWeight: '500',
    color: c.muted,
  },
  stageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stageClock: {
    fontSize: 13,
    color: c.muted,
    fontVariant: ['tabular-nums'],
  },
  stageMinutes: {
    fontSize: 14,
    color: c.muted,
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 6,
    borderRadius: 3,
    backgroundColor: c.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: c.accent,
    borderRadius: 3,
  },
  timerCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: c.accent,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  timerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: c.text,
  },
  timer: {
    fontSize: 64,
    fontWeight: '800',
    color: c.accent,
    fontVariant: ['tabular-nums'],
  },
  timerDescription: {
    fontSize: 14,
    color: c.muted,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 12,
    color: c.muted,
  },
  noteInput: {
    alignSelf: 'stretch',
    minHeight: 70,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.background,
    padding: 12,
    fontSize: 14,
    color: c.text,
    textAlignVertical: 'top',
  },
  readyCard: {
    backgroundColor: c.card,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: c.accent,
    padding: 20,
    gap: 12,
  },
  readyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: c.accent,
    textAlign: 'center',
  },
  readySubtitle: {
    fontSize: 15,
    color: c.text,
    fontWeight: '600',
    textAlign: 'center',
  },
  readyNotes: {
    fontSize: 14,
    color: c.muted,
    lineHeight: 20,
  },
  readyBakeNote: {
    fontSize: 14,
    color: c.text,
    lineHeight: 20,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  adjustRow: {
    flexDirection: 'row',
    gap: 10,
  },
  adjustButton: {
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  adjustButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.muted,
  },
  primaryButton: {
    backgroundColor: c.accent,
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
    backgroundColor: c.accentSoft,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  secondaryButtonText: {
    color: c.accent,
    fontSize: 16,
    fontWeight: '700',
  },
});
}
