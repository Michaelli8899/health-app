import { scaleNutrients } from '@health/core';
import { toNutrients, type FoodDB } from '../data/foods';
import type { EvalMealRow } from '../data/db';
import { estimatePortion } from './portion';

export interface EvalMetrics {
  meals: number;
  labeledItems: number;
  top1: number; // share 0..1
  top5: number;
  recall: number; // labeled food items / (labeled + missed)
  falseDetections: number; // share of boxes labeled not_food
  portionMAPE: number | null; // mean abs % error of grams, given the true food
  portionMedianAPE: number | null;
  kcalMAPE: number | null; // per meal, end to end (top-1 foods, estimated grams, incl. misses)
  kcalMedianAPE: number | null;
  meanMsPerPhoto: number;
  meanMsByStage: Record<string, number>;
  backend: string;
}

const mean = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const median = (a: number[]) => {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
};
const round3 = (x: number | null) => (x === null ? null : Math.round(x * 1000) / 1000);

export function computeMetrics(rows: readonly EvalMealRow[], db: FoodDB): EvalMetrics {
  let labeled = 0, hit1 = 0, hit5 = 0, missed = 0, notFood = 0, boxes = 0;
  const portionErr: number[] = [];
  const kcalErr: number[] = [];
  const stageSums: Record<string, number> = {};
  const totals: number[] = [];
  const kcalOf = (foodId: string, grams: number) => {
    const f = db.byId.get(foodId);
    return f ? scaleNutrients(toNutrients(f), grams).kcal : 0;
  };

  for (const row of rows) {
    const items = row.result.items;
    boxes += items.length;
    missed += row.missed.length;
    let predKcal = 0, trueKcal = 0;
    items.forEach((it, i) => {
      const label = row.labels[i];
      if (label === 'not_food') notFood++;
      if (!it.likelyNonFood && it.candidates[0] && it.portion) predKcal += kcalOf(it.candidates[0].foodId, it.portion.grams);
      if (!label || label === 'not_food') return;
      labeled++;
      trueKcal += kcalOf(label.foodId, label.grams);
      const rank = it.candidates.findIndex((c) => c.foodId === label.foodId);
      if (rank === 0) hit1++;
      if (rank >= 0 && rank < 5) hit5++;
      const food = db.byId.get(label.foodId);
      const est = food ? estimatePortion(food, it.portionCtx) : null;
      if (est && label.grams > 0) portionErr.push(Math.abs(est.grams - label.grams) / label.grams);
    });
    for (const m of row.missed) trueKcal += kcalOf(m.foodId, m.grams);
    if (trueKcal > 0) kcalErr.push(Math.abs(predKcal - trueKcal) / trueKcal);
    let total = 0;
    for (const [k, v] of Object.entries(row.result.timingsMs)) {
      stageSums[k] = (stageSums[k] ?? 0) + v;
      total += v;
    }
    totals.push(total);
  }
  const n = rows.length || 1;
  return {
    meals: rows.length,
    labeledItems: labeled,
    top1: round3(labeled ? hit1 / labeled : 0)!,
    top5: round3(labeled ? hit5 / labeled : 0)!,
    recall: round3(labeled + missed ? labeled / (labeled + missed) : 0)!,
    falseDetections: round3(boxes ? notFood / boxes : 0)!,
    portionMAPE: round3(mean(portionErr)),
    portionMedianAPE: round3(median(portionErr)),
    kcalMAPE: round3(mean(kcalErr)),
    kcalMedianAPE: round3(median(kcalErr)),
    meanMsPerPhoto: Math.round(mean(totals) ?? 0),
    meanMsByStage: Object.fromEntries(Object.entries(stageSums).map(([k, v]) => [k, Math.round(v / n)])),
    backend: rows[0]?.result.backend ?? 'n/a',
  };
}
