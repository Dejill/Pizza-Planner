import type { DoughInput } from '@/lib/dough';

export interface DoughStylePreset {
  id: string;
  label: string;
  description: string;
  bakeNote: string;
  patch: Pick<DoughInput, 'hydrationPct' | 'saltPct' | 'fermentationHours' | 'coldRetard' | 'ballWeightG'>;
}

export const DOUGH_PRESETS: DoughStylePreset[] = [
  {
    id: 'neapolitan',
    label: 'Neapolitan',
    description: 'Soft, blistered, leopard-spotted. Cooks in about 1 minute.',
    bakeNote:
      'Bake at maximum temperature (450 °C / 850 °F) with a stone or steel — 60–90 seconds, turning once for even leopard-spotting.',
    patch: { hydrationPct: 60, saltPct: 2.8, fermentationHours: 8, coldRetard: true, ballWeightG: 230 },
  },
  {
    id: 'ny',
    label: 'New York',
    description: 'Foldable slices, chewy crust with structure.',
    bakeNote:
      'Bake hot at ~260 °C (500 °F) on a stone or steel for 5–7 minutes until the edge bubbles and chars.',
    patch: { hydrationPct: 63, saltPct: 2.5, fermentationHours: 48, coldRetard: true, ballWeightG: 260 },
  },
  {
    id: 'sicilian',
    label: 'Sicilian',
    description: 'Thick, airy, focaccia-like sheet pan pizza.',
    bakeNote:
      'Bake in a well-oiled sheet pan at ~240 °C (465 °F) for 12–15 minutes; add cheese early so the top stays moist.',
    patch: { hydrationPct: 75, saltPct: 2.5, fermentationHours: 48, coldRetard: true, ballWeightG: 400 },
  },
  {
    id: 'detroit',
    label: 'Detroit',
    description: 'Deep rectangle, crispy fried cheese edges.',
    bakeNote:
      'Bake in a dark steel pan at ~260 °C (500 °F) for 12–15 minutes until the cheese edges fry crisp.',
    patch: { hydrationPct: 70, saltPct: 2.5, fermentationHours: 24, coldRetard: true, ballWeightG: 450 },
  },
  {
    id: 'roman',
    label: 'Roman pinsa',
    description: 'High hydration, light and bubbly oval crust.',
    bakeNote:
      'Bake on a very hot stone or steel (~260 °C / 500 °F) for 6–8 minutes; the high-hydration dough needs a hot floor.',
    patch: { hydrationPct: 80, saltPct: 2.5, fermentationHours: 48, coldRetard: true, ballWeightG: 300 },
  },
];

export function getApplicablePreset(presetId: string): DoughStylePreset | undefined {
  return DOUGH_PRESETS.find((preset) => preset.id === presetId);
}
