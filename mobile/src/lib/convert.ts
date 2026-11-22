import { dictFor } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

export interface UnitConversion {
  label: string;
  amount: number;
  unit: 'cups' | 'tsp';
}

export type IngredientKey =
  | 'flour'
  | 'water'
  | 'starter'
  | 'instant-yeast'
  | 'active-dry-yeast'
  | 'fresh-yeast'
  | 'salt';

const GRAMS_PER_CUP: Partial<Record<IngredientKey, number>> = {
  flour: 120,
  water: 240,
  starter: 240,
};

const GRAMS_PER_TSP: Partial<Record<IngredientKey, number>> = {
  'instant-yeast': 3.1,
  'active-dry-yeast': 2.8,
  'fresh-yeast': 3.2,
  salt: 5.7,
};

function findIngredientKey(label: string): IngredientKey | null {
  const lower = label.toLowerCase();
  if (lower.includes('flour') || lower.includes('mel')) return 'flour';
  if (lower.includes('water') || lower.includes('vand')) return 'water';
  if (lower.includes('starter') || lower.includes('surdej')) return 'starter';
  if (lower.includes('instantgær') || lower.includes('instant yeast')) return 'instant-yeast';
  if (lower.includes('tørgær') || lower.includes('active dry')) return 'active-dry-yeast';
  if (lower.includes('frisk gær') || lower.includes('fresh yeast')) return 'fresh-yeast';
  if (lower.includes('salt')) return 'salt';
  return null;
}

function gramsToCups(grams: number, gramsPerCup: number): number {
  return Math.round((grams / gramsPerCup) * 4) / 4;
}

function gramsToTsp(grams: number, gramsPerTsp: number): number {
  const tsp = grams / gramsPerTsp;
  if (tsp >= 0.5) return Math.round(tsp * 2) / 2;
  return Math.round(tsp * 10) / 10;
}

function convertByKey(
  key: IngredientKey,
  grams: number,
  t: ReturnType<typeof dictFor>['convert'],
): UnitConversion | null {
  const cups = GRAMS_PER_CUP[key];
  if (cups) {
    return { label: t.cups, unit: 'cups', amount: gramsToCups(grams, cups) };
  }
  const tsp = GRAMS_PER_TSP[key];
  if (tsp) {
    return { label: t.tsp, unit: 'tsp', amount: gramsToTsp(grams, tsp) };
  }
  return null;
}

export function convertByIngredientKey(
  key: IngredientKey,
  grams: number,
  lang: Lang = 'en',
): UnitConversion | null {
  return convertByKey(key, grams, dictFor(lang).convert);
}

export function convertLine(label: string, grams: number, lang: Lang = 'en'): UnitConversion | null {
  const key = findIngredientKey(label);
  if (!key) return null;
  return convertByKey(key, grams, dictFor(lang).convert);
}

export function formatConversion(conversion: UnitConversion, lang: Lang = 'en'): string {
  const t = dictFor(lang).convert;
  if (conversion.unit === 'cups' && conversion.amount === 0) return t.lessThanQuarterCup;
  return `${conversion.amount} ${conversion.label}`;
}
