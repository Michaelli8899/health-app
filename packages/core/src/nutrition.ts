import { NUTRIENT_KEYS, type Nutrients } from './types';

export const ZERO_NUTRIENTS: Readonly<Nutrients> = Object.freeze({
  kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, sodiumMg: 0,
});

/** Nutrients for `grams` of a food given its per-100 g values. */
export function scaleNutrients(per100g: Nutrients, grams: number): Nutrients {
  const f = Math.max(0, grams) / 100;
  const out = { ...ZERO_NUTRIENTS };
  for (const k of NUTRIENT_KEYS) out[k] = per100g[k] * f;
  return out;
}

export function sumNutrients(items: readonly Nutrients[]): Nutrients {
  const out = { ...ZERO_NUTRIENTS };
  for (const n of items) for (const k of NUTRIENT_KEYS) out[k] += n[k];
  return out;
}

/** Round for display: kcal and sodium to integers, grams to 1 decimal. */
export function roundNutrients(n: Nutrients): Nutrients {
  const out = { ...n };
  for (const k of NUTRIENT_KEYS) {
    out[k] = k === 'kcal' || k === 'sodiumMg' ? Math.round(n[k]) : Math.round(n[k] * 10) / 10;
  }
  return out;
}
