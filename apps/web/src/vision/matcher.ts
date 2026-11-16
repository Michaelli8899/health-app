import type { Candidate } from './types';

export interface TextIndex {
  dim: number;
  labels: { label: string; foodId: string | null }[];
  vectors: Float32Array; // count × dim, L2-normalised
}

export function l2normalize(v: ArrayLike<number>): number[] {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i]! * v[i]!;
  const n = Math.sqrt(s) || 1;
  return Array.from(v, (x) => x / n);
}

export function dot(a: ArrayLike<number>, b: ArrayLike<number>, bOffset = 0): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[bOffset + i]!;
  return s;
}

/**
 * Rank vocabulary entries for an image embedding.
 * `prior` maps foodId → count of times I confirmed it; frequent foods get a small boost
 * (log-scaled so a habit helps break near-ties but cannot override a clear visual match).
 */
export function rankFoods(
  imageEmbedding: ArrayLike<number>,
  index: TextIndex,
  opts: { topK?: number; prior?: ReadonlyMap<string, number>; priorWeight?: number } = {},
): { candidates: Candidate[]; bestIsNonFood: boolean } {
  const v = l2normalize(imageEmbedding);
  const w = opts.priorWeight ?? 0.006;
  const scored = index.labels.map((l, i) => {
    let s = dot(v, index.vectors, i * index.dim);
    if (l.foodId && opts.prior?.has(l.foodId)) s += w * Math.log1p(opts.prior.get(l.foodId)!);
    return { ...l, score: s };
  });
  scored.sort((a, b) => b.score - a.score);
  const bestIsNonFood = scored[0]?.foodId === null;
  const candidates = scored
    .filter((s): s is typeof s & { foodId: string } => s.foodId !== null)
    .slice(0, opts.topK ?? 5)
    .map(({ label, foodId, score }) => ({ label, foodId, score }));
  return { candidates, bestIsNonFood };
}

/** Cosine similarity of two embeddings (for repeat-meal matching). */
export function cosine(a: ArrayLike<number>, b: ArrayLike<number>): number {
  return dot(l2normalize(a), l2normalize(b));
}
