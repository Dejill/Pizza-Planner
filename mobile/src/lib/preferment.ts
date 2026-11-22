import { round1, type DoughRecipe } from '@/lib/dough';

export type PrefermentKind = 'poolish' | 'biga';

export const PREFERMENT_SHARE_MIN_PCT = 5;
export const PREFERMENT_SHARE_MAX_PCT = 60;
export const DEFAULT_PREFERMENT_SHARE_PCT = 25;
const POOLISH_HYDRATION = 1.0;
const BIGA_HYDRATION = 0.5;

export interface PrefermentLine {
  label: string;
  grams: number;
}

export interface PrefermentPlan {
  kind: PrefermentKind;
  title: string;
  lines: PrefermentLine[];
  note: string;
  mainFlourG: number;
  mainWaterG: number;
  yeastInPreferment: boolean;
}

export function clampPrefermentShare(sharePct: number): number {
  if (!Number.isFinite(sharePct)) return DEFAULT_PREFERMENT_SHARE_PCT;
  return Math.min(PREFERMENT_SHARE_MAX_PCT, Math.max(PREFERMENT_SHARE_MIN_PCT, sharePct));
}

export function computePreferment(
  kind: PrefermentKind,
  sharePct: number,
  recipe: DoughRecipe,
): PrefermentPlan {
  const share = clampPrefermentShare(sharePct) / 100;
  const hydration = kind === 'poolish' ? POOLISH_HYDRATION : BIGA_HYDRATION;
  const prefermentFlourG = round1(recipe.flourG * share);
  const prefermentWaterG = round1(prefermentFlourG * hydration);
  const mainFlourG = round1(recipe.flourG - prefermentFlourG);
  const mainWaterG = round1(recipe.waterG - prefermentWaterG);
  const yeastInPreferment = kind === 'poolish';

  const lines: PrefermentLine[] = [
    { label: 'Preferment flour', grams: prefermentFlourG },
    { label: 'Preferment water', grams: prefermentWaterG },
  ];
  if (yeastInPreferment && recipe.yeastG > 0) {
    lines.push({ label: 'Preferment yeast (all of it)', grams: recipe.yeastG });
  }

  const note =
    kind === 'poolish'
      ? 'Mix the poolish, cover, and ripen 12–18 h at room temperature (or up to 48 h in the fridge), then mix in the remaining flour, water, and salt.'
      : 'Knead the stiff biga, cover, and ripen 16–24 h in the fridge, then mix it with the remaining flour, water, yeast, and salt.';

  return {
    kind,
    title: kind === 'poolish' ? 'Poolish — make this first' : 'Biga — make this first',
    lines,
    note,
    mainFlourG,
    mainWaterG,
    yeastInPreferment,
  };
}
