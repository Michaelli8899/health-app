import { describe, expect, it } from 'vitest';
import {
  dayHealth, epley1RM, mealHealth, roundNutrients, scaleNutrients, suggestNextWeight, sumNutrients,
  type HealthItem, type Nutrients,
} from '../src';

const n = (p: Partial<Nutrients>): Nutrients => ({ kcal: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, satFat: 0, sodiumMg: 0, ...p });

describe('nutrition', () => {
  it('scales and sums', () => {
    const rice = n({ kcal: 130, carbs: 28.2, protein: 2.7, sodiumMg: 1 });
    const s = scaleNutrients(rice, 150);
    expect(s.kcal).toBeCloseTo(195);
    expect(sumNutrients([s, s]).carbs).toBeCloseTo(84.6);
    expect(roundNutrients(s)).toMatchObject({ kcal: 195, carbs: 42.3, sodiumMg: 2 });
  });
});

describe('health rules', () => {
  const apple: HealthItem = { grams: 160, nutrients: n({ kcal: 83, sugar: 16.6, fiber: 3.8 }), nova: 1, group: 'fruit', allergens: [] };
  const soda: HealthItem = { grams: 355, nutrients: n({ kcal: 140, sugar: 39 }), nova: 4, group: 'beverage', allergens: [] };
  const pizza: HealthItem = { grams: 300, nutrients: n({ kcal: 800, satFat: 14, sodiumMg: 1700, sugar: 9 }), nova: 4, group: 'mixed', allergens: ['gluten', 'dairy'] };

  it('fruit sugar is not flagged; soda sugar is', () => {
    expect(mealHealth([apple]).highSugar).toBe(false);
    expect(mealHealth([soda]).highSugar).toBe(true);
  });
  it('flags sodium, sat fat, allergens, NOVA and servings', () => {
    const m = mealHealth([pizza, apple]);
    expect(m).toMatchObject({ highSodium: true, highSatFat: true, maxNova: 4, allergens: ['dairy', 'gluten'], fruitVegServings: 2 });
  });
  it('day summary shares', () => {
    const d = dayHealth([apple, soda, pizza]);
    expect(d.ultraProcessedShareKcal).toBeCloseTo(940 / 1023);
    expect(d.freeSugarOver).toBe(true);
    expect(d.fiberTargetG).toBe(14);
    expect(dayHealth([]).ultraProcessedShareKcal).toBe(0);
  });
});

describe('strength', () => {
  it('epley', () => {
    expect(epley1RM(100, 1)).toBe(100);
    expect(epley1RM(100, 10)).toBeCloseTo(133.33, 1);
    expect(epley1RM(0, 5)).toBe(0);
  });
  it('double progression', () => {
    expect(suggestNextWeight([{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 10 }], 10)).toEqual({ weightKg: 62.5, increase: true });
    expect(suggestNextWeight([{ weightKg: 60, reps: 10 }, { weightKg: 60, reps: 8 }], 10)).toEqual({ weightKg: 60, increase: false });
    expect(suggestNextWeight([], 10)).toBeNull();
  });
});
