import type { DoughInput } from '@/lib/dough';

export interface DoughStylePreset {
  id: string;
  label: string;
  description: string;
  patch: Pick<DoughInput, 'hydrationPct' | 'saltPct' | 'fermentationHours' | 'coldRetard' | 'ballWeightG'>;
}

export const DOUGH_PRESETS: DoughStylePreset[] = [
  {
    id: 'neapolitan',
    label: 'Neapolitan',
    description: 'Soft, blistered, leopard-spotted. Cooks in about 1 minute.',
    patch: { hydrationPct: 60, saltPct: 2.8, fermentationHours: 8, coldRetard: true, ballWeightG: 230 },
  },
  {
    id: 'ny',
    label: 'New York',
    description: 'Foldable slices, chewy crust with structure.',
    patch: { hydrationPct: 63, saltPct: 2.5, fermentationHours: 48, coldRetard: true, ballWeightG: 260 },
  },
  {
    id: 'sicilian',
    label: 'Sicilian',
    description: 'Thick, airy, focaccia-like sheet pan pizza.',
    patch: { hydrationPct: 75, saltPct: 2.5, fermentationHours: 48, coldRetard: true, ballWeightG: 400 },
  },
  {
    id: 'detroit',
    label: 'Detroit',
    description: 'Deep rectangle, crispy fried cheese edges.',
    patch: { hydrationPct: 70, saltPct: 2.5, fermentationHours: 24, coldRetard: true, ballWeightG: 450 },
  },
  {
    id: 'roman',
    label: 'Roman pinsa',
    description: 'High hydration, light and bubbly oval crust.',
    patch: { hydrationPct: 80, saltPct: 2.5, fermentationHours: 48, coldRetard: true, ballWeightG: 300 },
  },
];

export function getApplicablePreset(presetId: string): DoughStylePreset | undefined {
  return DOUGH_PRESETS.find((preset) => preset.id === presetId);
}
