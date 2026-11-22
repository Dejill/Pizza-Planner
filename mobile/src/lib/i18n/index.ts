import { da } from './da';
import { en, type Dict } from './en';

export type Lang = 'da' | 'en';
export type { Dict };

export const DEFAULT_LANG: Lang = 'da';

const DICTS: Record<Lang, Dict> = { en, da };

export function dictFor(lang: Lang): Dict {
  return DICTS[lang];
}

export type PresetId = keyof Dict['presets'];
export type ToppingKey = keyof Dict['toppings'];
