import { round1, type DoughRecipe } from '@/lib/dough';
import { dictFor } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

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
  lang: Lang = 'en',
): PrefermentPlan {
  const share = clampPrefermentShare(sharePct) / 100;
  const hydration = kind === 'poolish' ? POOLISH_HYDRATION : BIGA_HYDRATION;
  const prefermentFlourG = round1(recipe.flourG * share);
  const prefermentWaterG = round1(prefermentFlourG * hydration);
  const mainFlourG = round1(recipe.flourG - prefermentFlourG);
  const mainWaterG = round1(recipe.waterG - prefermentWaterG);
  const yeastInPreferment = kind === 'poolish';

  const t = dictFor(lang).preferment;
  const lines: PrefermentLine[] = [
    { label: t.prefFlour, grams: prefermentFlourG },
    { label: t.prefWater, grams: prefermentWaterG },
  ];
  if (yeastInPreferment && recipe.yeastG > 0) {
    lines.push({ label: t.prefYeast, grams: recipe.yeastG });
  }

  return {
    kind,
    title: kind === 'poolish' ? t.poolishTitle : t.bigaTitle,
    lines,
    note: kind === 'poolish' ? t.poolishNote : t.bigaNote,
    mainFlourG,
    mainWaterG,
    yeastInPreferment,
  };
}
