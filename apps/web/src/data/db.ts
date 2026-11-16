import Dexie, { type EntityTable } from 'dexie';
import type { Meal, Nutrients, Profile, Targets } from '@health/core';

export interface ProfileRow extends Profile {
  id: 'me';
  targetsOverride?: Partial<Targets>;
}
export interface FoodLogRow {
  id?: number;
  date: string; // YYYY-MM-DD
  meal: Meal;
  foodId?: string;
  grams: number;
  name: string;
  nutrients: Nutrients; // snapshot at log time
  photoMealId?: number;
  createdAt: number;
}
export interface WaterRow { id?: number; date: string; ml: number; createdAt: number }
export interface WeightRow { id?: number; date: string; kg: number }
export interface PhotoMealRow {
  id?: number;
  takenAt: number;
  thumbnail: Blob;
  embedding?: Float32Array;
  items: unknown[]; // detailed shape defined by the vision module
}
/** Lab evaluation records (Phase 0). The photo never leaves the device. */
export interface EvalMealRow {
  id?: number;
  takenAt: number;
  photo: Blob;
  truth: { foodId: string; name: string; grams: number }[];
  runs: unknown[]; // per-variant pipeline outputs + timings
}

export class HealthDB extends Dexie {
  profile!: EntityTable<ProfileRow, 'id'>;
  foodLog!: EntityTable<FoodLogRow, 'id'>;
  water!: EntityTable<WaterRow, 'id'>;
  weights!: EntityTable<WeightRow, 'id'>;
  photoMeals!: EntityTable<PhotoMealRow, 'id'>;
  evalMeals!: EntityTable<EvalMealRow, 'id'>;

  constructor(name = 'health') {
    super(name);
    this.version(1).stores({
      profile: 'id',
      foodLog: '++id, date, [date+meal], foodId, createdAt',
      water: '++id, date',
      weights: '++id, &date',
      photoMeals: '++id, takenAt',
      evalMeals: '++id, takenAt',
    });
  }
}

export const db = new HealthDB();

export async function requestPersistentStorage(): Promise<boolean | undefined> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return true;
    return await navigator.storage?.persist?.();
  } catch {
    return undefined;
  }
}

export function todayISO(d = new Date()): string {
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
}
