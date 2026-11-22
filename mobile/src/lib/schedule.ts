import { computeDough, type DoughInput } from '@/lib/dough';
import { dictFor } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n';

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

function formatDescriptionFolds(bulkRoomMinutes: number, lang: Lang): string {
  const t = dictFor(lang).schedule;
  if (bulkRoomMinutes <= 60) return t.foldShort;
  const foldCount = Math.max(2, Math.min(6, Math.floor(bulkRoomMinutes / 60)));
  return t.foldLong(Math.round(bulkRoomMinutes / foldCount), foldCount);
}

export function buildCookSchedule(input: DoughInput, lang: Lang = 'en'): CookStage[] {
  const t = dictFor(lang).schedule;
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
      label: t.mix,
      minutes: MIX_MINUTES,
      description: recipe.yeastKind === 'sourdough' ? t.mixSourdoughDesc : t.mixYeastDesc,
    },
    {
      id: 'knead',
      label: t.knead,
      minutes: KNEAD_MINUTES,
      description: t.kneadDesc,
    },
    {
      id: 'bulk',
      label: input.coldRetard ? t.bulkRoom : t.bulk,
      minutes: roomBulkMinutes,
      description: formatDescriptionFolds(roomBulkMinutes, lang),
    },
  ];

  if (retardMinutes > 0) {
    stages.push({
      id: 'retard',
      label: t.coldProofFridge,
      minutes: retardMinutes,
      description: t.coldProofDesc,
    });
  }

  stages.push(
    {
      id: 'preshape',
      label: t.preshape,
      minutes: PRE_SHAPE_REST_MINUTES,
      description: t.preshapeDesc(input.pizzas),
    },
    {
      id: 'shape',
      label: t.shape,
      minutes: SHAPE_MINUTES,
      description: t.shapeDesc,
    },
    {
      id: 'final-proof',
      label: t.finalProof,
      minutes: FINAL_PROOF_MINUTES,
      description: t.finalProofDesc,
    },
    {
      id: 'bake',
      label: t.bake,
      minutes: BAKE_MINUTES,
      description: t.bakeDesc,
    },
  );

  return stages;
}

export function formatDuration(minutes: number, lang: Lang = 'en'): string {
  const t = dictFor(lang).schedule;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} ${t.min}`;
  if (mins === 0) return `${hours} ${t.hour}`;
  return `${hours} ${t.hour} ${mins} ${t.min}`;
}

export function upcomingStageClockTimes(
  stages: CookStage[],
  currentIndex: number,
  currentRemainingSec: number,
  nowMs: number,
): number[] {
  const times: number[] = [];
  let acc = nowMs + Math.max(0, currentRemainingSec) * 1000;
  for (let i = currentIndex + 1; i < stages.length; i++) {
    times.push(acc);
    acc += stages[i].minutes * 60 * 1000;
  }
  return times;
}

export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${h > 0 ? `${h}:` : ''}${h > 0 ? String(m).padStart(2, '0') : m}:${String(s).padStart(2, '0')}`;
}
