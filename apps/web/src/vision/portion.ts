import { estimateBowlPortion, estimateByClass, estimatePiecePortion } from '@health/core';
import { pieceWeight, type FoodRecord } from '../data/foods';

export interface PortionContext {
  areaCm2: number | null;
  /** Container the item sits in, with its width converted to cm when a scale is known. */
  container?: { kind: 'bowl' | 'cup' | 'glass'; widthCm: number | null };
}

const DEFAULT_RIM_CM = { bowl: 15, cup: 8, glass: 7 } as const;

export function estimatePortion(food: FoodRecord, ctx: PortionContext): { grams: number; low: number; high: number; method: string } | null {
  const density = food.dens;
  // Liquids and anything sitting in a bowl/cup: volume of the container filled to ~70 %.
  if (ctx.container && (food.pc === 'liquid' || food.pc === 'pile' || food.pc === 'chunks')) {
    const rim = ctx.container.widthCm ?? DEFAULT_RIM_CM[ctx.container.kind];
    const isCup = ctx.container.kind !== 'bowl';
    const e = estimateBowlPortion({
      rimDiameterCm: rim,
      depthCm: isCup ? rim * 1.2 : undefined,
      fill: 0.7,
      densityGPerMl: density ?? 1,
      densityRel: density ? 0.1 : 0.25,
    });
    return { ...pick(e), method: `${ctx.container.kind} ≈${rim.toFixed(0)} cm, 70% full` };
  }
  if (food.pc === 'liquid') {
    // A liquid without a detected container: assume a standard cup (240 ml).
    const e = estimatePiecePortion(1, 240 * (density ?? 1), 0.4);
    return { ...pick(e), method: 'assumed 1 cup' };
  }
  const piece = food.pc === 'piece' ? pieceWeight(food) : null;
  // Countable foods: counting pieces from a single photo is unreliable (a fried egg is flat, a roll is tall),
  // so default to one piece; the review screen has a count stepper.
  if (piece) {
    return { ...pick(estimatePiecePortion(1, piece.grams)), method: `1 × ${piece.label}` };
  }
  if (ctx.areaCm2 === null) {
    // No plate in the photo means no size reference: fall back to a typical serving with a wide range.
    const cup = food.sv.find(([l]) => /^(\d+(\.\d+)?\s*)?cup/i.test(l));
    const grams = cup ? cup[1] * (food.pc === 'leafy' ? 1.5 : 1) : 150;
    return { ...pick(estimatePiecePortion(1, grams, 0.6)), method: cup ? `typical serving (${cup[0]}), no plate scale` : 'typical serving, no plate scale' };
  }
  const e = estimateByClass(ctx.areaCm2, food.pc, density);
  return { ...pick(e), method: `${Math.round(ctx.areaCm2)} cm² × ${food.pc}` };
}

function pick(e: { grams: number; low: number; high: number }) {
  return { grams: Math.round(e.grams), low: Math.round(e.low), high: Math.round(e.high) };
}
