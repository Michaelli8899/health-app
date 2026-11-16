import { describe, expect, it } from 'vitest';
import { computeMetrics } from './evaluation';
import type { EvalMealRow } from '../data/db';
import type { FoodDB, FoodRecord } from '../data/foods';
import type { ItemResult } from './types';

const food = (id: string, kcal: number, pc: FoodRecord['pc'] = 'pile'): FoodRecord =>
  ({ id, name: id, cat: '', n: [kcal, 0, 0, 0, 0, 0, 0, 0], sv: [['cup', 158]], dens: 0.67, grp: 'grain', nova: 1, pc });
const db: FoodDB = { foods: [food('rice', 130), food('pasta', 158), food('chicken', 165, 'slab')], byId: new Map() };
db.foods.forEach((f) => db.byId.set(f.id, f));

const item = (cands: string[], grams: number, areaCm2: number): ItemResult => ({
  box: [0, 0, 10, 10], detScore: 0.5, maskAreaPx: 100, maskCoverage: 0.7, areaCm2, likelyNonFood: false,
  candidates: cands.map((c, i) => ({ label: c, foodId: c, score: 0.3 - i * 0.01 })),
  portion: { grams, low: grams / 2, high: grams * 2, method: '' }, portionCtx: { areaCm2 },
});

describe('computeMetrics', () => {
  it('scores identification, portions, kcal, recall and timing', () => {
    const row: EvalMealRow = {
      takenAt: 0, photo: new Blob(),
      result: { width: 1, height: 1, backend: 'webgpu', plate: { kind: 'plate', box: null, majorAxisPx: 1, minorAxisPx: 1, diameterCm: 27, maskAgreement: 1 },
        items: [item(['rice', 'pasta'], 120, 100), item(['pasta', 'chicken'], 100, 50), item(['rice'], 50, 10)],
        imageEmbedding: [], timingsMs: { detect: 1000, segment: 500 } },
      labels: [{ foodId: 'rice', grams: 120 }, { foodId: 'chicken', grams: 100 }, 'not_food'],
      missed: [{ foodId: 'pasta', grams: 100 }],
    };
    const m = computeMetrics([row], db);
    expect(m).toMatchObject({ meals: 1, labeledItems: 2, top1: 0.5, top5: 1, recall: 0.667, falseDetections: 0.333, meanMsPerPhoto: 1500, backend: 'webgpu' });
    expect(m.portionMedianAPE).not.toBeNull();
    // pred kcal: rice 120 g (156) + pasta 100 g (158) + rice 50 g (65) = 379; true: rice 156 + chicken 165 + pasta 158 = 479
    expect(m.kcalMAPE).toBeCloseTo(100 / 479, 2);
  });
});
