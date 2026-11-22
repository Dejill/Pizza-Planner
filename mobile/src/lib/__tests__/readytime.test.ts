import { convertLine, formatConversion } from '@/lib/convert';
import { formatClock, formatDayLabel, latestStartForReadyBy, planTotalMinutes } from '@/lib/readyTime';
import type { DoughInput } from '@/lib/dough';

const input: DoughInput = {
  pizzas: 4,
  ballWeightG: 250,
  hydrationPct: 65,
  saltPct: 2.5,
  yeastKind: 'instant',
  fermentationHours: 48,
  coldRetard: true,
};

describe('convert', () => {
  it('converts flour grams to quarter-cup steps', () => {
    expect(convertLine('Flour', 600)?.amount).toBe(5);
    expect(convertLine('Flour', 610)?.amount).toBe(5);
    expect(convertLine('Flour', 630)?.amount).toBe(5.25);
  });

  it('converts water and starter by volume', () => {
    expect(convertLine('Water', 480)?.label).toBe('cups (approx)');
    expect(convertLine('Mature starter', 120)?.amount).toBe(0.5);
  });

  it('converts yeast and salt to teaspoon steps', () => {
    expect(convertLine('Instant yeast', 3.1)?.amount).toBe(1);
    expect(convertLine('Salt', 11.4)?.amount).toBe(2);
    expect(convertLine('Active dry yeast', 2.8)?.amount).toBe(1);
  });

  it('returns null for non-convertible rows', () => {
    expect(convertLine('Prosciutto', 90)).toBeNull();
    expect(convertLine('Mozzarella', 330)).toBeNull();
  });

  it('formats tiny cup amounts sanely', () => {
    expect(formatConversion({ label: 'cups (approx)', amount: 0, unit: 'cups' })).toBe('less than ¼ cup (approx)');
    expect(formatConversion({ label: 'tsp (approx)', amount: 1.5, unit: 'tsp' })).toBe('1.5 tsp (approx)');
  });
});

describe('ready time planning', () => {
  const NOW = new Date('2026-11-21T12:00:00Z').getTime();

  it('sums the plan length with the correct remainders', () => {
    expect(planTotalMinutes(input)).toBe(48 * 60 + 130);
  });

  it('back-computes a start time for a ready-by deadline in the future', () => {
    const readyBy = NOW + 72 * 60 * 60 * 1000;
    const plan = latestStartForReadyBy(input, readyBy, NOW);
    expect(plan.readyAtMs).toBe(readyBy);
    expect(plan.startsToday).toBe(false);
  });

  it('keeps the start on the same day for near deadlines', () => {
    const plan = latestStartForReadyBy(input, NOW + 60 * 60 * 60 * 1000, NOW);
    expect(plan.startsToday).toBe(true);
  });

  it('clamps start time to now when the deadline is too soon', () => {
    const plan = latestStartForReadyBy(input, NOW + 30 * 60 * 1000, NOW);
    expect(plan.startAtMs).toBe(NOW);
    expect(plan.readyAtMs).toBe(NOW + planTotalMinutes(input) * 60 * 1000);
  });

  it('labels today, tomorrow, and other days', () => {
    expect(formatDayLabel(NOW, NOW)).toBe('today');
    expect(formatDayLabel(NOW + 24 * 3600 * 1000, NOW)).toBe('tomorrow');
    expect(formatDayLabel(NOW + 8 * 24 * 3600 * 1000, NOW)).toMatch(/Sunday|Sun/);
  });

  it('formats a clock time', () => {
    expect(formatClock(new Date('2026-11-21T18:30:00Z').getTime())).toMatch(/18|6/);
  });
});
