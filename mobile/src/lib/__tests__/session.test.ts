import { foldOffsets } from '@/lib/alarms';
import { recoverCookPosition, type CookSession } from '@/lib/session';
import type { DoughInput } from '@/lib/dough';

const input: DoughInput = {
  pizzas: 4,
  ballWeightG: 250,
  hydrationPct: 65,
  saltPct: 2.5,
  yeastKind: 'instant',
  fermentationHours: 24,
  coldRetard: true,
};

const durationsSec = [15 * 60, 10 * 60, 4 * 60 * 60, 44 * 60 * 60, 20 * 60, 10 * 60, 60 * 60, 15 * 60];

function session(partial: Partial<CookSession>): CookSession {
  return {
    input,
    stageIndex: 0,
    stageStartedAt: 0,
    pausedRemainingSec: null,
    running: false,
    ...partial,
  };
}

describe('recoverCookPosition', () => {
  it('keeps the paused remaining time even across a long gap', () => {
    const result = recoverCookPosition(
      durationsSec,
      session({ stageIndex: 2, pausedRemainingSec: 3600, running: false }),
      24 * 60 * 60 * 1000,
    );
    expect(result.stageIndex).toBe(2);
    expect(result.remainingSec).toBe(3600);
    expect(result.completedAll).toBe(false);
  });

  it('advances within the current stage when it is still running', () => {
    const result = recoverCookPosition(
      durationsSec,
      session({ stageIndex: 2, stageStartedAt: 1000, running: true }),
      1000 + 2 * 3600 * 1000,
    );
    expect(result.stageIndex).toBe(2);
    expect(result.remainingSec).toBe(2 * 3600);
  });

  it('cascades across stages that already elapsed', () => {
    const result = recoverCookPosition(
      durationsSec,
      session({ stageIndex: 0, stageStartedAt: 0, running: true }),
      (15 * 60 + 10 * 60 + 4 * 3600 + 120) * 1000,
    );
    expect(result.stageIndex).toBe(3);
    expect(result.remainingSec).toBe(44 * 3600 - 120);
  });

  it('reports a fully completed plan and how long ago it finished', () => {
    const result = recoverCookPosition(
      durationsSec,
      session({ stageIndex: durationsSec.length - 1, stageStartedAt: 0, running: true }),
      (15 * 60 + 10 * 60 + 4 * 3600 + 44 * 3600 + 20 * 60 + 10 * 60 + 60 * 60 + 15 * 60 + 2 * 3600) * 1000,
    );
    expect(result.completedAll).toBe(true);
    expect(result.remainingSec).toBe(0);
    expect(result.doneSecondsAgo).toBe(2 * 3600);
  });

  it('treats elapsed time before start as zero remaining', () => {
    const result = recoverCookPosition(
      durationsSec,
      session({ stageIndex: 0, stageStartedAt: 1000, running: true }),
      500,
    );
    expect(result.stageIndex).toBe(0);
    expect(result.remainingSec).toBe(durationsSec[0]);
  });
});

describe('foldOffsets', () => {
  it('gives one midpoint fold for short bulks', () => {
    expect(foldOffsets(50)).toEqual([25]);
  });

  it('gives between 2 and 6 evenly spaced folds for long bulks', () => {
    expect(foldOffsets(240)).toEqual([60, 120, 180]);
    expect(foldOffsets(360)).toEqual([60, 120, 180, 240, 300]);
    expect(foldOffsets(960)).toEqual([160, 320, 480, 640, 800]);
    expect(foldOffsets(720)).toEqual([120, 240, 360, 480, 600]);
  });

  it('never returns an offset at or past the end of the bulk', () => {
    for (const offset of foldOffsets(120)) {
      expect(offset).toBeLessThan(120);
    }
  });
});
