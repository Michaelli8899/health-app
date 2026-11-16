import type { Nova, Nutrients } from './types';

/** All thresholds in one place (PRD §6.6). Daily values follow FDA labelling. */
export const HEALTH_CONFIG = {
  dailyValue: { sodiumMg: 2300, satFatG: 20, sugarG: 50, fiberG: 28 },
  /** A meal is "high" in a nutrient above this share of the daily value (≈ a third of the day). */
  mealHighShare: 0.3,
  sodiumLimitMg: 2300,
  satFatMaxShareKcal: 0.1,
  freeSugarMaxShareKcal: 0.1,
  fiberGPer1000Kcal: 14,
  fruitVegServingG: 80,
} as const;

export type FoodGroup =
  | 'fruit' | 'vegetable' | 'grain' | 'whole_grain' | 'protein' | 'dairy' | 'fat_oil'
  | 'sweet' | 'beverage' | 'mixed' | 'other';

export interface HealthItem {
  grams: number;
  nutrients: Nutrients;
  nova: Nova;
  group: FoodGroup;
  allergens: readonly string[];
}

/** Sugar from processed (NOVA 3–4) foods counts as likely added/free sugar. */
function likelyFreeSugar(items: readonly HealthItem[]): number {
  return items.filter((i) => i.nova >= 3).reduce((s, i) => s + i.nutrients.sugar, 0);
}

export interface MealHealth {
  highSodium: boolean;
  highSatFat: boolean;
  highSugar: boolean;
  wholeGrain: boolean;
  fruitVegServings: number;
  maxNova: Nova;
  allergens: string[];
}

export function mealHealth(items: readonly HealthItem[]): MealHealth {
  const c = HEALTH_CONFIG;
  const sodium = items.reduce((s, i) => s + i.nutrients.sodiumMg, 0);
  const satFat = items.reduce((s, i) => s + i.nutrients.satFat, 0);
  const fvGrams = items.filter((i) => i.group === 'fruit' || i.group === 'vegetable').reduce((s, i) => s + i.grams, 0);
  return {
    highSodium: sodium > c.dailyValue.sodiumMg * c.mealHighShare,
    highSatFat: satFat > c.dailyValue.satFatG * c.mealHighShare,
    highSugar: likelyFreeSugar(items) > c.dailyValue.sugarG * c.mealHighShare,
    wholeGrain: items.some((i) => i.group === 'whole_grain'),
    fruitVegServings: Math.round((fvGrams / c.fruitVegServingG) * 10) / 10,
    maxNova: items.reduce<Nova>((m, i) => (i.nova > m ? i.nova : m), 1),
    allergens: [...new Set(items.flatMap((i) => i.allergens))].sort(),
  };
}

export interface DayHealth {
  sodiumMg: number;
  sodiumOver: boolean;
  satFatShareKcal: number;
  satFatOver: boolean;
  freeSugarShareKcal: number;
  freeSugarOver: boolean;
  fiberG: number;
  fiberTargetG: number;
  fruitVegServings: number;
  ultraProcessedShareKcal: number;
}

export function dayHealth(items: readonly HealthItem[]): DayHealth {
  const c = HEALTH_CONFIG;
  const kcal = items.reduce((s, i) => s + i.nutrients.kcal, 0);
  const share = (k: number) => (kcal > 0 ? k / kcal : 0);
  const sodiumMg = items.reduce((s, i) => s + i.nutrients.sodiumMg, 0);
  const satFatShareKcal = share(items.reduce((s, i) => s + i.nutrients.satFat, 0) * 9);
  const freeSugarShareKcal = share(likelyFreeSugar(items) * 4);
  const fvGrams = items.filter((i) => i.group === 'fruit' || i.group === 'vegetable').reduce((s, i) => s + i.grams, 0);
  return {
    sodiumMg,
    sodiumOver: sodiumMg > c.sodiumLimitMg,
    satFatShareKcal,
    satFatOver: satFatShareKcal > c.satFatMaxShareKcal,
    freeSugarShareKcal,
    freeSugarOver: freeSugarShareKcal > c.freeSugarMaxShareKcal,
    fiberG: items.reduce((s, i) => s + i.nutrients.fiber, 0),
    fiberTargetG: Math.round((kcal / 1000) * c.fiberGPer1000Kcal),
    fruitVegServings: Math.round((fvGrams / c.fruitVegServingG) * 10) / 10,
    ultraProcessedShareKcal: share(items.filter((i) => i.nova === 4).reduce((s, i) => s + i.nutrients.kcal, 0)),
  };
}
