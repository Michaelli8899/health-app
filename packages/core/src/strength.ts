/** Epley estimated one-rep max. */
export function epley1RM(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

export interface SetResult { weightKg: number; reps: number }

/**
 * Double progression: once every working set reaches the top of the rep range,
 * suggest adding weight next session.
 */
export function suggestNextWeight(
  sets: readonly SetResult[],
  repMax: number,
  incrementKg = 2.5,
): { weightKg: number; increase: boolean } | null {
  if (sets.length === 0) return null;
  const weight = Math.max(...sets.map((s) => s.weightKg));
  const allTop = sets.every((s) => s.reps >= repMax && s.weightKg >= weight);
  return allTop ? { weightKg: weight + incrementKg, increase: true } : { weightKg: weight, increase: false };
}
