import { describe, expect, it } from 'vitest';
import { cleanFoodBoxes, fitEllipse, maskArea, nms } from './geometry';
import { rankFoods, type TextIndex } from './matcher';
import { estimatePortion } from './portion';
import { pieceWeight, type FoodRecord } from '../data/foods';

function ellipseMask(w: number, h: number, cx: number, cy: number, a: number, b: number) {
  const m = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (((x - cx) / a) ** 2 + ((y - cy) / b) ** 2 <= 1) m[y * w + x] = 1;
  return m;
}

describe('geometry', () => {
  it('fits an ellipse to a tilted-plate mask', () => {
    const e = fitEllipse(ellipseMask(400, 300, 200, 150, 150, 90), 400)!;
    expect(e.majorAxisPx).toBeCloseTo(300, -1);
    expect(e.minorAxisPx).toBeCloseTo(180, -1);
  });
  it('counts mask area inside a box', () => {
    const m = ellipseMask(100, 100, 50, 50, 20, 20);
    expect(maskArea(m, 100)).toBeCloseTo(Math.PI * 400, -1.5);
    expect(maskArea(m, 100, [50, 0, 100, 100])).toBeLessThan(maskArea(m, 100) / 1.8);
  });
  it('removes duplicate, whole-plate and group boxes', () => {
    const plate: [number, number, number, number] = [0, 0, 100, 100];
    const foods = [
      { box: [2, 2, 98, 98] as [number, number, number, number], label: 'food', score: 0.6 }, // whole plate
      { box: [10, 10, 40, 40] as [number, number, number, number], label: 'food', score: 0.5 },
      { box: [11, 11, 41, 41] as [number, number, number, number], label: 'food', score: 0.4 }, // duplicate
      { box: [50, 50, 90, 90] as [number, number, number, number], label: 'food', score: 0.5 },
    ];
    expect(nms(foods).length).toBe(3);
    expect(cleanFoodBoxes(foods, plate).map((f) => f.box[0])).toEqual([10, 50]);
  });
});

describe('matcher', () => {
  const index: TextIndex = {
    dim: 2,
    labels: [{ label: 'rice', foodId: 'r' }, { label: 'pasta', foodId: 'p' }, { label: 'a table', foodId: null }],
    vectors: new Float32Array([1, 0, 0.9, 0.436, 0, 1]),
  };
  it('ranks by cosine and lets a strong habit break a near-tie', () => {
    expect(rankFoods([1, 0.2], index).candidates[0]!.label).toBe('rice');
    expect(rankFoods([1, 0.21], index, { prior: new Map([['p', 50]]), priorWeight: 0.05 }).candidates[0]!.label).toBe('pasta');
  });
  it('flags non-food best matches', () => {
    const r = rankFoods([0, 1], index);
    expect(r.bestIsNonFood).toBe(true);
    expect(r.candidates.every((c) => c.foodId)).toBe(true);
  });
});

describe('portion', () => {
  const base = { cat: '', n: [0, 0, 0, 0, 0, 0, 0, 0] as FoodRecord['n'], grp: 'other' as const, nova: 1 as const };
  const rice: FoodRecord = { ...base, id: 'r', name: 'rice', sv: [['cup', 158]], dens: 0.668, pc: 'pile' };
  const egg: FoodRecord = { ...base, id: 'e', name: 'egg', sv: [['tbsp', 8.5], ['large', 50]], pc: 'piece' };
  const soup: FoodRecord = { ...base, id: 's', name: 'soup', sv: [['cup', 241]], dens: 1.02, pc: 'liquid' };
  it('picks piece weights', () => expect(pieceWeight(egg)).toEqual({ label: 'large', grams: 50 }));
  it('estimates plated, piece and bowl portions', () => {
    expect(estimatePortion(rice, { areaCm2: 100 })!.grams).toBe(120);
    expect(estimatePortion(egg, { areaCm2: 30 })!.method).toBe('1 × large');
    const s = estimatePortion(soup, { areaCm2: null, container: { kind: 'bowl', widthCm: 16 } })!;
    expect(s.grams).toBeGreaterThan(200);
    expect(s.low).toBeLessThan(s.grams);
  });
});

import { rectLongSidePx } from './calibrate';
describe('card calibration geometry', () => {
  it('recovers a rotated rectangle long side from mask moments', () => {
    const w = 300, h = 300, m = new Uint8Array(w * h);
    const L = 171, S = 108, a = 0.5; // card-like 85.6 × 54 at 2 px/mm, rotated ~29°
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const dx = x - 150, dy = y - 150;
      const u = dx * Math.cos(a) + dy * Math.sin(a), v = -dx * Math.sin(a) + dy * Math.cos(a);
      if (Math.abs(u) <= L / 2 && Math.abs(v) <= S / 2) m[y * w + x] = 1;
    }
    expect(rectLongSidePx(fitEllipse(m, w)!.majorAxisPx)).toBeCloseTo(L, -0.5);
  });
});
