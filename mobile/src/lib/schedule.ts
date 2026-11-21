import { computeDough, type DoughInput } from '@/lib/dough';

export interface CookStage {
  id: string;
  label: string;
  minutes: number;
  description: string;
}

const MIX_MINUTES = 15;
const KNEAD_MINUTES = 10;
const PRE_SHAPE_REST_MINUTES = 20;
const SHAPE_MINUTES = 10;
const FINAL_PROOF_MINUTES = 60;
const BAKE_MINUTES = 15;
const RETARD_ROOM_BULK_MINUTES = 4 * 60;

function formatDescriptionFolds(bulkRoomMinutes: number): string {
  if (bulkRoomMinutes <= 60) {
    return 'Cover the bowl and let it rest. One stretch and fold halfway through if the dough feels slack.';
  }
  const foldCount = Math.max(2, Math.min(6, Math.floor(bulkRoomMinutes / 60)));
  return `Cover and rest. Do a stretch and fold every ${Math.round(
    bulkRoomMinutes / foldCount,
  )} minutes (${foldCount} folds total), then leave it alone.`;
}

export function buildCookSchedule(input: DoughInput): CookStage[] {
  const recipe = computeDough(input);
  const totalBulkMinutes = Math.max(0, Math.round(input.fermentationHours * 60));

  let roomBulkMinutes = totalBulkMinutes;
  let retardMinutes = 0;
  if (input.coldRetard) {
    roomBulkMinutes = Math.min(RETARD_ROOM_BULK_MINUTES, totalBulkMinutes);
    retardMinutes = totalBulkMinutes - roomBulkMinutes;
  }

  const stages: CookStage[] = [
    {
      id: 'mix',
      label: 'Mix',
      minutes: MIX_MINUTES,
      description: `Combine flour, water, salt, and ${
        recipe.yeastKind === 'sourdough' ? 'starter' : 'yeast'
      }. Mix until no dry flour remains.`,
    },
    {
      id: 'knead',
      label: 'Knead',
      minutes: KNEAD_MINUTES,
      description: 'Knead until the dough is smooth and springs back when poked.',
    },
    {
      id: 'bulk',
      label: input.coldRetard ? 'Bulk rise (room)' : 'Bulk rise',
      minutes: roomBulkMinutes,
      description: formatDescriptionFolds(roomBulkMinutes),
    },
  ];

  if (retardMinutes > 0) {
    stages.push({
      id: 'retard',
      label: 'Cold retard (fridge)',
      minutes: retardMinutes,
      description: 'Move the covered dough to the fridge. Cold fermentation builds flavor.',
    });
  }

  stages.push(
    {
      id: 'preshape',
      label: 'Pre-shape & rest',
      minutes: PRE_SHAPE_REST_MINUTES,
      description: `Divide into ${input.pizzas} equal balls, cover, and rest.`,
    },
    {
      id: 'shape',
      label: 'Shape',
      minutes: SHAPE_MINUTES,
      description: 'Tighten each ball by pulling the edges toward the center.',
    },
    {
      id: 'final-proof',
      label: 'Final proof',
      minutes: FINAL_PROOF_MINUTES,
      description: 'Let the balls relax and puff up. They are ready when softly puffy, not bloated.',
    },
    {
      id: 'bake',
      label: 'Bake',
      minutes: BAKE_MINUTES,
      description: 'Oven and pizza steel/stone at maximum temperature. Launch, bake until blistered and spotted.',
    },
  );

  return stages;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours} h`;
  return `${hours} h ${mins} min`;
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${h > 0 ? `${h}:` : ''}${h > 0 ? String(m).padStart(2, '0') : m}:${String(s).padStart(2, '0')}`;
}
