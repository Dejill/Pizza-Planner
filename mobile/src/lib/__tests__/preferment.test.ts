import { computeDough, round1, type DoughInput } from '@/lib/dough';
import {
  clampPrefermentShare,
  computePreferment,
  DEFAULT_PREFERMENT_SHARE_PCT,
} from '@/lib/preferment';

const base: DoughInput = {
  pizzas: 4,
  ballWeightG: 250,
  hydrationPct: 65,
  saltPct: 2.5,
  yeastKind: 'instant',
  fermentationHours: 24,
  coldRetard: true,
};

describe('computePreferment', () => {
  it('splits flour and water for a 100%-hydration poolish', () => {
    const recipe = computeDough(base);
    const plan = computePreferment('poolish', 25, recipe);
    const totalFlour = recipe.flourG;
    expect(plan.mainFlourG + plan.lines[0].grams).toBeCloseTo(totalFlour, 1);
    expect(plan.lines[0].grams).toBeCloseTo(plan.lines[1].grams, 1);
    expect(plan.mainWaterG + plan.lines[1].grams).toBeCloseTo(recipe.waterG, 1);
    expect(plan.yeastInPreferment).toBe(true);
    const yeastLine = plan.lines.find((line) => line.label.includes('yeast'));
    expect(yeastLine?.grams).toBe(recipe.yeastG);
  });

  it('splits flour and water for a 50%-hydration biga', () => {
    const recipe = computeDough(base);
    const plan = computePreferment('biga', 20, recipe);
    expect(plan.lines[1].grams).toBeCloseTo(round1(plan.lines[0].grams / 2), 1);
    expect(plan.yeastInPreferment).toBe(false);
    expect(plan.mainWaterG + plan.lines[1].grams).toBeCloseTo(recipe.waterG, 1);
  });

  it('clamps out-of-range and NaN shares', () => {
    expect(clampPrefermentShare(0)).toBe(5);
    expect(clampPrefermentShare(90)).toBe(60);
    expect(clampPrefermentShare(NaN)).toBe(DEFAULT_PREFERMENT_SHARE_PCT);
  });

  it('keeps the combined totals identical to the plain recipe', () => {
    const recipe = computeDough(base);
    const plan = computePreferment('poolish', 40, recipe);
    const plainWater = computeDough({ ...base, prefermentKind: undefined }).waterG;
    expect(plan.mainFlourG + plan.lines[0].grams).toBeCloseTo(recipe.flourG, 1);
    expect(plan.mainWaterG + plan.lines[1].grams).toBeCloseTo(plainWater, 1);
  });
});
