import { useLiveQuery } from 'dexie-react-hooks';
import { computeTargets, type Targets } from '@health/core';
import { db, type ProfileRow } from './db';

export const DEFAULT_PROFILE: ProfileRow = {
  id: 'me',
  sex: 'male',
  birthDate: '1995-01-01',
  heightCm: 175,
  weightKg: 75,
  activityLevel: 'moderate',
  goal: 'maintain',
  goalRateKgPerWeek: 0.5,
  plateDiameterCm: 27,
};

export function useProfile(): ProfileRow | undefined | null {
  // undefined = loading, null = not set up yet
  return useLiveQuery(async () => (await db.profile.get('me')) ?? null, []);
}

export function effectiveTargets(p: ProfileRow): { targets: Targets; warnings: string[]; tdee: number } {
  const r = computeTargets(p);
  return { ...r, targets: { ...r.targets, ...p.targetsOverride } };
}

export async function saveProfile(p: ProfileRow): Promise<void> {
  await db.profile.put(p);
}
