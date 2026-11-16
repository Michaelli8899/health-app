import type { FoodGroup, Nova, Nutrients, PortionClass } from '@health/core';

/** Compact row format of public/datasets/foods.json (see scripts/build_foods.py). */
export interface FoodRecord {
  id: string;
  name: string;
  cat: string;
  n: [number, number, number, number, number, number, number, number];
  sv: [string, number][];
  dens?: number;
  grp: FoodGroup;
  nova: Nova;
  alg?: string[];
  pc: PortionClass;
}

export function toNutrients(f: FoodRecord): Nutrients {
  const [kcal, protein, carbs, fat, fiber, sugar, satFat, sodiumMg] = f.n;
  return { kcal, protein, carbs, fat, fiber, sugar, satFat, sodiumMg };
}

export interface FoodDB {
  foods: FoodRecord[];
  byId: Map<string, FoodRecord>;
}

let cache: Promise<FoodDB> | null = null;

export function loadFoods(baseUrl: string = import.meta.env.BASE_URL): Promise<FoodDB> {
  cache ??= fetch(`${baseUrl}datasets/foods.json`)
    .then((r) => r.json() as Promise<{ foods: FoodRecord[] }>)
    .then(({ foods }) => ({ foods, byId: new Map(foods.map((f) => [f.id, f])) }));
  return cache;
}

const VOLUME_UNIT = /^(\d+(\.\d+)?\s*)?(cup|tbsp|tsp|fl oz|oz|g\b|nlea|serving|package|container|lb|quart|pint|liter|ml)/i;
const PIECE_PREF = [/^medium/i, /^large/i, /^slice/i, /^(piece|patty|fillet|egg|breast|thigh|wing|drumstick|unit|sandwich|item|each|roll|muffin|bagel|cookie|pancake|waffle|bun|link|frank|chop|taco|burrito)/i];

/** Weight of one typical piece (e.g. "medium" banana, "slice" of bread), if the food has one. */
export function pieceWeight(f: FoodRecord): { label: string; grams: number } | null {
  for (const re of PIECE_PREF) {
    const s = f.sv.find(([l]) => re.test(l));
    if (s) return { label: s[0], grams: s[1] };
  }
  const s = f.sv.find(([l]) => !VOLUME_UNIT.test(l));
  return s ? { label: s[0], grams: s[1] } : null;
}
