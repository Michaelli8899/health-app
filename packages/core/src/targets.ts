import type { ActivityLevel, Profile, Sex, Targets } from './types';

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const KCAL_PER_KG_FAT = 7700;
export const KCAL_FLOOR: Record<Sex, number> = { female: 1200, male: 1500 };
const PROTEIN_G_PER_KG = { lose: 2.0, maintain: 1.6, gain: 1.8 } as const;
const FAT_SHARE = 0.275;
const MAX_RATE_KG_PER_WEEK = 1.0;

export function ageOn(birthDate: string, on: Date): number {
  const [y, m, d] = birthDate.split('-').map(Number) as [number, number, number];
  let age = on.getFullYear() - y;
  const beforeBirthday = on.getMonth() + 1 < m || (on.getMonth() + 1 === m && on.getDate() < d);
  if (beforeBirthday) age -= 1;
  return age;
}

/** Mifflin–St Jeor basal metabolic rate (kcal/day). */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  return 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
}

export function tdee(p: Profile, on: Date): number {
  return bmr(p.sex, p.weightKg, p.heightCm, ageOn(p.birthDate, on)) * ACTIVITY_FACTORS[p.activityLevel];
}

export interface TargetResult {
  targets: Targets;
  tdee: number;
  warnings: string[];
}

export function computeTargets(p: Profile, on: Date = new Date()): TargetResult {
  const warnings: string[] = [];
  const maintenance = tdee(p, on);
  let rate = Math.abs(p.goalRateKgPerWeek);
  if (rate > MAX_RATE_KG_PER_WEEK) {
    warnings.push(`Rate capped at ${MAX_RATE_KG_PER_WEEK} kg/week.`);
    rate = MAX_RATE_KG_PER_WEEK;
  }
  const dailyDelta = (rate * KCAL_PER_KG_FAT) / 7;
  let kcal =
    p.goal === 'lose' ? maintenance - dailyDelta : p.goal === 'gain' ? maintenance + dailyDelta : maintenance;
  const floor = KCAL_FLOOR[p.sex];
  if (kcal < floor) {
    warnings.push(`Target raised to the minimum of ${floor} kcal/day. Consider a slower rate.`);
    kcal = floor;
  }
  kcal = Math.round(kcal / 10) * 10;
  const proteinG = Math.round(p.weightKg * PROTEIN_G_PER_KG[p.goal]);
  const fatG = Math.round((kcal * FAT_SHARE) / 9);
  const carbsG = Math.max(0, Math.round((kcal - proteinG * 4 - fatG * 9) / 4));
  const waterMl = Math.round((p.weightKg * 35) / 50) * 50;
  return { targets: { kcal, proteinG, carbsG, fatG, waterMl }, tdee: Math.round(maintenance), warnings };
}
