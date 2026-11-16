export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Goal = 'lose' | 'maintain' | 'gain';
export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks';
export type Nova = 1 | 2 | 3 | 4;

/** Nutrient amounts. Units: kcal, grams, except sodiumMg. */
export interface Nutrients {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugar: number;
  satFat: number;
  sodiumMg: number;
}

export const NUTRIENT_KEYS: readonly (keyof Nutrients)[] = [
  'kcal', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'satFat', 'sodiumMg',
] as const;

export interface Profile {
  sex: Sex;
  birthDate: string; // YYYY-MM-DD
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  goalRateKgPerWeek: number; // positive number; direction comes from goal
  plateDiameterCm: number;
}

export interface Targets {
  kcal: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  waterMl: number;
}
