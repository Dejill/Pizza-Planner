import {
  computeDough,
  glutenFreeTips,
  glutenFreeXanthanG,
  hydrationFeel,
  validateDoughInput,
  type DoughInput,
  type YeastKind,
} from '@/lib/dough';

const baseTick: DoughInput = {
  pizzas: 1,
  ballWeightG: 250,
  hydrationPct: 65,
  saltPct: 2.5,
  yeastKind: 'instant',
  fermentationHours: 8,
  coldRetard: false,
};

describe('dough edge cases', () => {
  it.each(['instant', 'active-dry', 'fresh'] as const)(
    'material sums to total dough for %s yeast',
    (yeastKind) => {
      const recipe = computeDough({ ...baseTick, yeastKind });
      const sum = recipe.flourG + recipe.waterG + recipe.saltG + recipe.yeastG;
      expect(sum).toBeCloseTo(250, 0);
    },
  );

  it('handles the smallest plausible batch: one 60 g pizzetta', () => {
    const recipe = computeDough({ ...baseTick, ballWeightG: 60 });
    expect(recipe.totalDoughG).toBe(60);
    expect(recipe.flourG).toBeGreaterThan(30);
    expect(recipe.flourG).toBeLessThan(40);
  });

  it('handles a 20-ball party batch without overflow', () => {
    const recipe = computeDough({ ...baseTick, pizzas: 20, ballWeightG: 280 });
    expect(recipe.totalDoughG).toBe(5600);
    expect(recipe.yeastG).toBeGreaterThan(0);
    const sum = recipe.flourG + recipe.waterG + recipe.saltG + recipe.yeastG;
    expect(sum).toBeCloseTo(5600, 0);
  });

  it('supports extreme hydration bounds', () => {
    const low = computeDough({ ...baseTick, hydrationPct: 50 });
    expect(low.waterG).toBeCloseTo(low.flourG / 2, 0);
    const high = computeDough({ ...baseTick, hydrationPct: 90 });
    expect(high.waterG / high.flourG).toBeCloseTo(0.9, 2);
  });

  it('supports zero salt', () => {
    const recipe = computeDough({ ...baseTick, saltPct: 0 });
    expect(recipe.saltG).toBe(0);
  });

  it('supports extreme fermentation windows without negative yeast', () => {
    const overnight = computeDough({ ...baseTick, fermentationHours: 48, coldRetard: false });
    const week = computeDough({ ...baseTick, fermentationHours: 168, coldRetard: true });
    expect(overnight.yeastG).toBeGreaterThan(0);
    expect(week.yeastG).toBeGreaterThan(0);
    expect(week.yeastPct).toBeLessThan(overnight.yeastPct);
  });

  it('fresh yeast is heavier than active dry which is heavier than instant', () => {
    const kinds: YeastKind[] = ['instant', 'active-dry', 'fresh'];
    const pcts = kinds.map((k) => computeDough({ ...baseTick, yeastKind: k }).yeastPct);
    expect(pcts[2] / pcts[1]).toBeCloseTo(3 / 1.25, 5);
    expect(pcts[1] / pcts[0]).toBeCloseTo(1.25, 5);
  });

  it('sourdough with maximum fermentation stays internally consistent', () => {
    const recipe = computeDough({
      ...baseTick,
      yeastKind: 'sourdough',
      fermentationHours: 96,
      coldRetard: true,
    });
    const sum = recipe.flourG + recipe.waterG + recipe.saltG + recipe.starterG;
    expect(sum).toBeCloseTo(250, 0);
    expect(recipe.starterG).toBeGreaterThan(0);
  });

  it('rejects NaN-derived garbage inputs', () => {
    const errors = validateDoughInput({
      ...baseTick,
      pizzas: NaN,
      ballWeightG: NaN,
      hydrationPct: NaN,
      saltPct: NaN,
      fermentationHours: NaN,
    });
    expect(errors).toHaveLength(5);
  });

  it('rejects negative fermentation time', () => {
    expect(validateDoughInput({ ...baseTick, fermentationHours: -4 })).toHaveLength(1);
  });

  it('describes hydration feel across the range', () => {
    expect(hydrationFeel(55)).toContain('Dry');
    expect(hydrationFeel(60)).toContain('Balanced');
    expect(hydrationFeel(68)).toContain('Supple');
    expect(hydrationFeel(75)).toContain('Wet');
    expect(hydrationFeel(85)).toContain('Very wet');
  });

  it('computes xanthan gum at 1% of flour for gluten-free dough', () => {
    expect(glutenFreeXanthanG(500)).toBe(5);
    expect(glutenFreeXanthanG(57.5)).toBeCloseTo(0.6, 1);
  });

  it('warns about low hydration in gluten-free tips', () => {
    expect(glutenFreeTips(65)).toContain('85–100%');
    expect(glutenFreeTips(88)).toContain('good range');
  });
});
