import {
  buildCookSchedule,
  formatCountdown,
  formatDuration,
  upcomingStageClockTimes,
} from '@/lib/schedule';
import type { DoughInput } from '@/lib/dough';

const baseInput: DoughInput = {
  pizzas: 4,
  ballWeightG: 250,
  hydrationPct: 65,
  saltPct: 2.5,
  yeastKind: 'instant',
  fermentationHours: 24,
  coldRetard: false,
};

describe('buildCookSchedule', () => {
  it('contains the fixed prep and bake stages', () => {
    const stages = buildCookSchedule(baseInput);
    const ids = stages.map((s) => s.id);
    expect(ids).toEqual(['mix', 'knead', 'bulk', 'preshape', 'shape', 'final-proof', 'bake']);
    expect(stages[0].minutes).toBe(15);
    expect(stages.at(-1)?.minutes).toBe(15);
  });

  it('puts all fermentation time into the room bulk without cold proof', () => {
    const stages = buildCookSchedule(baseInput);
    const bulk = stages.find((s) => s.id === 'bulk');
    expect(bulk?.minutes).toBe(24 * 60);
  });

  it('caps room bulk at 4 h and moves the rest to the fridge with cold proof', () => {
    const stages = buildCookSchedule({ ...baseInput, fermentationHours: 48, coldRetard: true });
    const bulk = stages.find((s) => s.id === 'bulk');
    const retard = stages.find((s) => s.id === 'retard');
    expect(bulk?.minutes).toBe(4 * 60);
    expect(retard?.minutes).toBe(44 * 60);
  });

  it('skips the cold proof stage when the cold bulk fits in the room window', () => {
    const stages = buildCookSchedule({ ...baseInput, fermentationHours: 2, coldRetard: true });
    expect(stages.some((s) => s.id === 'retard')).toBe(false);
    expect(stages.find((s) => s.id === 'bulk')?.minutes).toBe(2 * 60);
  });

  it('mentions the starter for sourdough and yeast otherwise', () => {
    const yeastDesc = buildCookSchedule(baseInput)[0].description;
    const sourdoughDesc = buildCookSchedule({
      ...baseInput,
      yeastKind: 'sourdough',
    })[0].description;
    expect(yeastDesc).toContain('yeast');
    expect(sourdoughDesc).toContain('starter');
  });

  it('gives every stage a positive duration and a description', () => {
    const stages = buildCookSchedule({
      ...baseInput,
      fermentationHours: 96,
      coldRetard: true,
      yeastKind: 'sourdough',
    });
    for (const stage of stages) {
      expect(stage.minutes).toBeGreaterThan(0);
      expect(stage.description.length).toBeGreaterThan(10);
    }
  });
});

describe('formatters', () => {
  it('formats durations', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(45)).toBe('45 min');
    expect(formatDuration(60)).toBe('1 h');
    expect(formatDuration(125)).toBe('2 h 5 min');
  });

  it('formats countdowns', () => {
    expect(formatCountdown(0)).toBe('0:00');
    expect(formatCountdown(65)).toBe('1:05');
    expect(formatCountdown(3605)).toBe('1:00:05');
    expect(formatCountdown(-3)).toBe('0:00');
  });
});

describe('upcomingStageClockTimes', () => {
  const stages = buildCookSchedule(baseInput);

  it('times the next stage after the current one finishes', () => {
    const now = 1000 * 60 * 60 * 9;
    const times = upcomingStageClockTimes(stages, 0, 15 * 60, now);
    expect(times).toHaveLength(stages.length - 1);
    expect(times[0]).toBe(now + 15 * 60 * 1000);
    expect(times[1]).toBe(times[0] + stages[1].minutes * 60 * 1000);
  });

  it('returns nothing for the last stage', () => {
    expect(upcomingStageClockTimes(stages, stages.length - 1, 0, 0)).toEqual([]);
  });

  it('clamps negative remaining time', () => {
    const now = 0;
    const times = upcomingStageClockTimes(stages, 0, -5, now);
    expect(times[0]).toBe(0);
  });
});
