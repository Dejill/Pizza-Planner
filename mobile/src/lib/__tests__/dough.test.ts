import {
  computeDough,
  recommendedInstantYeastPct,
  validateDoughInput,
  type DoughInput,
} from '@/lib/dough';

const baseInput: DoughInput = {
  pizzas: 6,
  ballWeightG: 250,
  hydrationPct: 65,
  saltPct: 2.5,
  yeastKind: 'instant',
  fermentationHours: 8,
  coldRetard: false,
};

describe('computeDough', () => {
  it('computes flour, water, salt and yeast from baker percentages', () => {
    const recipe = computeDough(baseInput);
    expect(recipe.totalDoughG).toBe(1500);
    expect(recipe.yeastPct).toBe(0.5);
    expect(recipe.flourG).toBeCloseTo(1500 / 1.68, 1);
    expect(recipe.waterG).toBeCloseTo(recipe.flourG * 0.65, 1);
    expect(recipe.saltG).toBeCloseTo(recipe.flourG * 0.025, 1);
    expect(recipe.yeastG).toBeCloseTo(recipe.flourG * 0.005, 1);
    expect(recipe.starterG).toBe(0);
  });

  it('sums to the total dough weight within rounding', () => {
    const recipe = computeDough(baseInput);
    const sum = recipe.flourG + recipe.waterG + recipe.saltG + recipe.yeastG;
    expect(sum).toBeGreaterThan(1490);
    expect(sum).toBeLessThan(1510);
  });

  it('reduces yeast for longer fermentation', () => {
    const short = computeDough({ ...baseInput, fermentationHours: 4 });
    const long = computeDough({ ...baseInput, fermentationHours: 24 });
    expect(long.yeastPct).toBeLessThan(short.yeastPct);
    expect(long.yeastPct).toBe(0.15);
  });

  it('uses the cold retard yeast table', () => {
    const cold = computeDough({ ...baseInput, fermentationHours: 48, coldRetard: true });
    expect(cold.yeastPct).toBe(0.25);
    expect(cold.bulkLocation).toBe('fridge');
  });

  it('converts yeast kinds from the instant percentage', () => {
    const activeDry = computeDough({ ...baseInput, yeastKind: 'active-dry' });
    const fresh = computeDough({ ...baseInput, yeastKind: 'fresh' });
    expect(activeDry.yeastPct).toBeCloseTo(0.5 * 1.25, 5);
    expect(fresh.yeastPct).toBeCloseTo(0.5 * 3, 5);
  });

  it('replaces yeast with starter for sourdough and subtracts starter water', () => {
    const recipe = computeDough({ ...baseInput, yeastKind: 'sourdough' });
    expect(recipe.yeastG).toBe(0);
    const totalFlourG = recipe.flourG + recipe.starterG / 2;
    expect(recipe.starterG / totalFlourG).toBeCloseTo(0.2, 2);
    const materialSum = recipe.flourG + recipe.waterG + recipe.saltG + recipe.starterG;
    expect(materialSum).toBeCloseTo(1500, 1);
    expect(recipe.yeastPct).toBe(0);
  });

  it('rounds outputs to one decimal', () => {
    const recipe = computeDough({ ...baseInput, pizzas: 3, ballWeightG: 237 });
    for (const value of [recipe.flourG, recipe.waterG, recipe.saltG, recipe.yeastG]) {
      expect(Number(value.toFixed(1))).toBe(value);
    }
  });
});

describe('recommendedInstantYeastPct', () => {
  it('matches the room-temp and cold tables', () => {
    expect(recommendedInstantYeastPct(2, false)).toBe(1.0);
    expect(recommendedInstantYeastPct(8, false)).toBe(0.5);
    expect(recommendedInstantYeastPct(12, false)).toBe(0.3);
    expect(recommendedInstantYeastPct(24, false)).toBe(0.15);
    expect(recommendedInstantYeastPct(36, false)).toBe(0.1);
    expect(recommendedInstantYeastPct(24, true)).toBe(0.5);
    expect(recommendedInstantYeastPct(48, true)).toBe(0.25);
    expect(recommendedInstantYeastPct(72, true)).toBe(0.1);
    expect(recommendedInstantYeastPct(96, true)).toBe(0.05);
  });
});

describe('validateDoughInput', () => {
  it('accepts a valid input', () => {
    expect(validateDoughInput(baseInput)).toEqual([]);
  });

  it('rejects non-positive ball weight and out-of-range hydration', () => {
    const errors = validateDoughInput({ ...baseInput, ballWeightG: 0, hydrationPct: 95 });
    expect(errors).toHaveLength(2);
    expect(errors.map((e) => e.field)).toEqual(['ballWeightG', 'hydrationRange']);
  });

  it('rejects fractional pizzas', () => {
    const errors = validateDoughInput({ ...baseInput, pizzas: 2.5 });
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('pizzas');
  });
});
