import { dictFor } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

export type YeastKind = 'instant' | 'active-dry' | 'fresh' | 'sourdough';

export interface DoughInput {
  pizzas: number;
  ballWeightG: number;
  hydrationPct: number;
  saltPct: number;
  yeastKind: YeastKind;
  fermentationHours: number;
  coldRetard: boolean;
  prefermentKind?: 'poolish' | 'biga';
  prefermentSharePct?: number;
  wholeGrain?: boolean;
  glutenFree?: boolean;
}

export interface DoughRecipe {
  totalDoughG: number;
  flourG: number;
  waterG: number;
  saltG: number;
  yeastKind: YeastKind;
  yeastPct: number;
  yeastG: number;
  starterG: number;
  bulkHours: number;
  bulkLocation: 'fridge' | 'room';
}

export interface DoughInputError {
  field: keyof DoughInput | 'hydrationRange' | 'saltRange';
  message: string;
}

const INSTANT_YEAST_PCT_ROOM: { maxHours: number; pct: number }[] = [
  { maxHours: 4, pct: 1.0 },
  { maxHours: 8, pct: 0.5 },
  { maxHours: 12, pct: 0.3 },
  { maxHours: 24, pct: 0.15 },
  { maxHours: Infinity, pct: 0.1 },
];

const INSTANT_YEAST_PCT_COLD: { maxHours: number; pct: number }[] = [
  { maxHours: 24, pct: 0.5 },
  { maxHours: 48, pct: 0.25 },
  { maxHours: 72, pct: 0.1 },
  { maxHours: Infinity, pct: 0.05 },
];

export const STARTER_PCT = 20;
const STARTER_HYDRATION = 1.0;

function instantPctFor(fermentationHours: number, coldRetard: boolean, wholeGrain: boolean): number {
  const table = coldRetard ? INSTANT_YEAST_PCT_COLD : INSTANT_YEAST_PCT_ROOM;
  const row = table.find((entry) => fermentationHours <= entry.maxHours);
  const base = row ? row.pct : 0.1;
  return wholeGrain ? base * 1.2 : base;
}

function convertInstant(kind: YeastKind, instantPct: number): number {
  switch (kind) {
    case 'active-dry':
      return instantPct * 1.25;
    case 'fresh':
      return instantPct * 3;
    default:
      return instantPct;
  }
}

export function validateDoughInput(input: DoughInput, lang: Lang = 'en'): DoughInputError[] {
  const t = dictFor(lang).validation;
  const errors: DoughInputError[] = [];
  if (!Number.isFinite(input.pizzas) || input.pizzas < 1 || Math.round(input.pizzas) !== input.pizzas) {
    errors.push({ field: 'pizzas', message: t.pizzas });
  }
  if (!Number.isFinite(input.ballWeightG) || input.ballWeightG <= 0) {
    errors.push({ field: 'ballWeightG', message: t.ballWeight });
  }
  if (!Number.isFinite(input.hydrationPct) || input.hydrationPct < 50 || input.hydrationPct > 90) {
    errors.push({ field: 'hydrationRange', message: t.hydration });
  }
  if (!Number.isFinite(input.saltPct) || input.saltPct < 0 || input.saltPct > 5) {
    errors.push({ field: 'saltRange', message: t.salt });
  }
  if (!Number.isFinite(input.fermentationHours) || input.fermentationHours <= 0) {
    errors.push({ field: 'fermentationHours', message: t.fermentation });
  }
  return errors;
}

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function computeDough(input: DoughInput): DoughRecipe {
  const instantPct = instantPctFor(input.fermentationHours, input.coldRetard, input.wholeGrain === true);
  const isSourdough = input.yeastKind === 'sourdough';
  const yeastPct = isSourdough ? 0 : convertInstant(input.yeastKind, instantPct);

  const totalDoughG = input.pizzas * input.ballWeightG;
  const hydration = input.hydrationPct / 100;
  const salt = input.saltPct / 100;
  const bakerTotal = isSourdough ? 1 + hydration + salt : 1 + hydration + salt + yeastPct / 100;
  const totalFlourG = totalDoughG / bakerTotal;

  if (isSourdough) {
    const starterG = totalFlourG * (STARTER_PCT / 100);
    const starterFlourG = (starterG * STARTER_HYDRATION) / (1 + STARTER_HYDRATION);
    const starterWaterG = starterG - starterFlourG;
    return {
      totalDoughG: round1(totalDoughG),
      flourG: round1(totalFlourG - starterFlourG),
      waterG: round1(totalFlourG * hydration - starterWaterG),
      saltG: round1(totalFlourG * salt),
      yeastKind: input.yeastKind,
      yeastPct: 0,
      yeastG: 0,
      starterG: round1(starterG),
      bulkHours: input.fermentationHours,
      bulkLocation: input.coldRetard ? 'fridge' : 'room',
    };
  }

  return {
    totalDoughG: round1(totalDoughG),
    flourG: round1(totalFlourG),
    waterG: round1(totalFlourG * hydration),
    saltG: round1(totalFlourG * salt),
    yeastKind: input.yeastKind,
    yeastPct,
    yeastG: round1(totalFlourG * (yeastPct / 100)),
    starterG: 0,
    bulkHours: input.fermentationHours,
    bulkLocation: input.coldRetard ? 'fridge' : 'room',
  };
}

export function glutenFreeXanthanG(flourG: number): number {
  return round1(flourG * 0.01);
}

export function glutenFreeTips(hydrationPct: number, lang: Lang = 'en'): string {
  if (lang === 'da') {
    const hydrationNote =
      hydrationPct < 80
        ? 'De fleste glutenfri blandinger kræver 85–100 % hydrering — overvej at øge den.'
        : 'Hydreringen ligger i et godt område til glutenfri dej.';
    return `${hydrationNote} Rør dejen godt sammen, men spring æltning over — der er ingen gluten at udvikle — og tryk dejen ud i formen i stedet for at strække den.`;
  }
  const hydrationNote =
    hydrationPct < 80
      ? 'Most gluten-free blends need 85–100% hydration — consider raising it.'
      : 'Hydration is in a good range for gluten-free dough.';
  return `${hydrationNote} Mix well but skip kneading — there is no gluten to develop — and press the dough into the pan instead of stretching it.`;
}

export function hydrationFeel(hydrationPct: number, lang: Lang = 'en'): string {
  if (lang === 'da') {
    if (hydrationPct < 58) return 'Tør og fast — nem at arbejde med, tættere krumme.';
    if (hydrationPct < 65) return 'Afbalanceret — glat dej, nem at strække ud.';
    if (hydrationPct < 72) return 'Smidig og let klistret — blød, åben krumme.';
    if (hydrationPct < 79) return 'Våd og klistret — brug olierede hænder eller en dejskraber.';
    return 'Meget våd — brug en dejskraber til en stor, luftig krumme.';
  }
  if (hydrationPct < 58) return 'Dry and firm — easy to handle, denser crumb.';
  if (hydrationPct < 65) return 'Balanced — smooth dough, easy to stretch.';
  if (hydrationPct < 72) return 'Supple and lightly tacky — soft, open crumb.';
  if (hydrationPct < 79) return 'Wet and sticky — use oiled hands or a bench scraper.';
  return 'Very wet — handle with a bench scraper for a big, airy crumb.';
}

export function recommendedInstantYeastPct(
  fermentationHours: number,
  coldRetard: boolean,
  wholeGrain = false,
): number {
  return instantPctFor(fermentationHours, coldRetard, wholeGrain);
}
