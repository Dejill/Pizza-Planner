import {
  computePreferment,
  DEFAULT_PREFERMENT_SHARE_PCT,
} from '@/lib/preferment';
import { convertByIngredientKey, formatConversion } from '@/lib/convert';
import { buildCookSchedule, formatDuration } from '@/lib/schedule';
import { computeDough, validateDoughInput } from '@/lib/dough';
import { buildShoppingList, shoppingListText } from '@/lib/shopping';
import { toppingLabel, toppingTotals } from '@/lib/toppings';
import { DEFAULT_LANG, dictFor } from '@/lib/i18n';

const baseInput = {
  pizzas: 4,
  ballWeightG: 250,
  hydrationPct: 65,
  saltPct: 2.5,
  yeastKind: 'instant' as const,
  fermentationHours: 24,
  coldRetard: true,
};

describe('i18n dictionaries', () => {
  it('defaults to Danish', () => {
    expect(DEFAULT_LANG).toBe('da');
    expect(dictFor('da').calc.heading).toBe('Dejberegner');
    expect(dictFor('da').langName).toBe('Dansk');
  });

  it('keeps the English strings intact', () => {
    const en = dictFor('en');
    expect(en.calc.heading).toBe('Dough Calculator');
    expect(en.validation.pizzas).toBe('Number of pizzas must be a whole number of at least 1.');
    expect(en.presets.neapolitan.label).toBe('Neapolitan');
  });

  it('translates validation messages', () => {
    const en = validateDoughInput({ ...baseInput, pizzas: 0 }, 'en');
    const da = validateDoughInput({ ...baseInput, pizzas: 0 }, 'da');
    expect(en[0].message).toBe(dictFor('en').validation.pizzas);
    expect(da[0].message).toBe(dictFor('da').validation.pizzas);
    expect(da[0].message).not.toBe(en[0].message);
  });

  it('translates schedule labels and durations', () => {
    const en = buildCookSchedule(baseInput, 'en');
    const da = buildCookSchedule(baseInput, 'da');
    expect(da.map((s) => s.id)).toEqual(en.map((s) => s.id));
    expect(en.some((s) => s.label === 'Mix')).toBe(true);
    expect(da.some((s) => s.label === 'Bland')).toBe(true);
    expect(formatDuration(90, 'en')).toContain('h');
    expect(formatDuration(90, 'da')).toContain('t');
  });

  it('translates preferment output', () => {
    const recipe = computeDough(baseInput);
    const en = computePreferment('poolish', DEFAULT_PREFERMENT_SHARE_PCT, recipe, 'en');
    const da = computePreferment('poolish', DEFAULT_PREFERMENT_SHARE_PCT, recipe, 'da');
    expect(en.title).toBe(dictFor('en').preferment.poolishTitle);
    expect(da.title).toBe(dictFor('da').preferment.poolishTitle);
    expect(da.title).toContain('Poolish');
  });

  it('translates unit conversions', () => {
    const cupsEn = convertByIngredientKey('flour', 300, 'en');
    const cupsDa = convertByIngredientKey('flour', 300, 'da');
    expect(cupsEn).not.toBeNull();
    expect(cupsDa).not.toBeNull();
    expect(formatConversion(cupsEn!, 'en')).toContain('cups');
    expect(formatConversion(cupsDa!, 'da')).toContain('kopper');
    const saltEn = convertByIngredientKey('salt', 10, 'en');
    expect(formatConversion(saltEn!, 'en')).toContain('tsp');
  });

  it('translates toppings and shopping list', () => {
    expect(toppingLabel('mozzarella', 'en')).toBe('Mozzarella');
    expect(toppingLabel('mozzarella', 'da')).toBe('Mozzarella');
    expect(toppingLabel('mushrooms', 'en')).toBe('Mushrooms');
    expect(toppingLabel('mushrooms', 'da')).toBe('Svampe');

    const selection = { 'tomato-sauce': { gramsPerPizza: 60 } };
    const totalsEn = toppingTotals(selection, 4, 'en');
    const totalsDa = toppingTotals(selection, 4, 'da');
    expect(totalsDa[0].label).not.toBe(totalsEn[0].label);

    const linesEn = buildShoppingList(baseInput, totalsEn, 'en');
    const linesDa = buildShoppingList(baseInput, totalsDa, 'da');
    const textEn = shoppingListText(linesEn, 'en');
    const textDa = shoppingListText(linesDa, 'da');
    expect(textEn).toContain('Flour');
    expect(textDa).toContain('Mel');
  });
});
