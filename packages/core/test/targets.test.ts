import { describe, expect, it } from 'vitest';
import { ageOn, bmr, computeTargets, type Profile } from '../src';

const base: Profile = {
  sex: 'male', birthDate: '1996-06-15', heightCm: 180, weightKg: 80,
  activityLevel: 'moderate', goal: 'maintain', goalRateKgPerWeek: 0, plateDiameterCm: 27,
};
const on = new Date(2026, 10, 16);

describe('targets', () => {
  it('computes age with birthday boundary', () => {
    expect(ageOn('1996-06-15', on)).toBe(30);
    expect(ageOn('1996-12-01', on)).toBe(29);
  });
  it('Mifflin–St Jeor matches hand calculation', () => {
    expect(bmr('male', 80, 180, 30)).toBe(800 + 1125 - 150 + 5);
    expect(bmr('female', 60, 165, 30)).toBeCloseTo(600 + 1031.25 - 150 - 161);
  });
  it('maintenance target = TDEE rounded', () => {
    const r = computeTargets(base, on);
    expect(r.tdee).toBe(Math.round(1780 * 1.55));
    expect(r.targets.kcal).toBe(2760);
    expect(r.targets.proteinG).toBe(128);
    expect(r.targets.waterMl).toBe(2800);
    const macroKcal = r.targets.proteinG * 4 + r.targets.carbsG * 4 + r.targets.fatG * 9;
    expect(Math.abs(macroKcal - r.targets.kcal)).toBeLessThan(15);
  });
  it('applies deficit for weight loss', () => {
    const r = computeTargets({ ...base, goal: 'lose', goalRateKgPerWeek: 0.5 }, on);
    expect(r.targets.kcal).toBe(Math.round((1780 * 1.55 - 550) / 10) * 10);
  });
  it('enforces the floor and caps the rate with warnings', () => {
    const r = computeTargets({ ...base, sex: 'female', weightKg: 50, heightCm: 155, goal: 'lose', goalRateKgPerWeek: 2 }, on);
    expect(r.targets.kcal).toBe(1200);
    expect(r.warnings).toHaveLength(2);
  });
});
