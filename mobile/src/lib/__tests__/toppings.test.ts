import { getApplicablePreset, DOUGH_PRESETS } from '@/lib/presets';
import { defaultSelection, toppingTotals, TOPPING_OPTIONS } from '@/lib/toppings';
import { buildShoppingList, shoppingListText } from '@/lib/shopping';
import { computeDough, validateDoughInput, type DoughInput } from '@/lib/dough';

const input: DoughInput = {
  pizzas: 3,
  ballWeightG: 250,
  hydrationPct: 60,
  saltPct: 2.8,
  yeastKind: 'instant',
  fermentationHours: 48,
  coldRetard: true,
};

describe('dough presets', () => {
  it('has a unique id and valid dough inputs for every preset', () => {
    const ids = new Set(DOUGH_PRESETS.map((p) => p.id));
    expect(ids.size).toBe(DOUGH_PRESETS.length);
    for (const preset of DOUGH_PRESETS) {
      const candidate: DoughInput = { ...input, ...preset.patch };
      expect(validateDoughInput(candidate)).toEqual([]);
    }
  });

  it('applies the Neapolitan preset', () => {
    const preset = getApplicablePreset('neapolitan');
    expect(preset?.patch.hydrationPct).toBe(60);
    expect(preset?.patch.ballWeightG).toBe(230);
  });

  it('returns undefined for unknown ids', () => {
    expect(getApplicablePreset('nope')).toBeUndefined();
  });
});

describe('toppings', () => {
  it('totals grams across the pizza count', () => {
    const totals = toppingTotals(
      { 'tomato-sauce': { gramsPerPizza: 60 }, mozzarella: { gramsPerPizza: 110 } },
      3,
    );
    expect(totals.find((t) => t.id === 'tomato-sauce')?.gramsTotal).toBe(180);
    expect(totals.find((t) => t.id === 'mozzarella')?.gramsTotal).toBe(330);
  });

  it('only includes selected toppings', () => {
    const totals = toppingTotals({}, 2);
    expect(totals).toEqual([]);
  });

  it('exposes gram defaults for every catalog option', () => {
    for (const option of TOPPING_OPTIONS) {
      expect(option.defaultGramsPerPizza).toBeGreaterThan(0);
    }
  });

  it('matches the default selection', () => {
    const totals = toppingTotals(defaultSelection(), 2);
    expect(totals.map((t) => t.id)).toEqual(['tomato-sauce', 'mozzarella', 'olive-oil']);
  });
});

describe('shopping list', () => {
  it('combines dough ingredients and selected toppings', () => {
    const recipe = computeDough(input);
    const lines = buildShoppingList(input, [
      { label: 'Mozzarella', gramsTotal: 330 },
    ]);
    expect(lines.find((l) => l.label === 'Flour')?.amount).toBe(`${recipe.flourG} g`);
    expect(lines.find((l) => l.label === 'Instant yeast')?.amount).toBe(`${recipe.yeastG} g`);
    expect(lines.find((l) => l.label === 'Sourdough starter')).toBeUndefined();
    expect(lines.find((l) => l.label === 'Mozzarella')?.amount).toBe('330 g');
  });

  it('names the starter for sourdough and omits dried yeast', () => {
    const sour = { ...input, yeastKind: 'sourdough' as const };
    const lines = buildShoppingList(sour, []);
    expect(lines.map((l) => l.label)).toContain('Sourdough starter');
    expect(lines.map((l) => l.label).some((label) => label.includes('yeast'))).toBe(false);
  });

  it('formats a multi-line share text', () => {
    const text = shoppingListText([
      { label: 'Flour', amount: '500 g' },
      { label: 'Water', amount: '300 g' },
    ]);
    expect(text.split('\n')).toHaveLength(3);
    expect(text).toContain('• Flour: 500 g');
  });
});
