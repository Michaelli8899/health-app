export type Box = [x1: number, y1: number, x2: number, y2: number];

export interface Detection {
  box: Box;
  label: string; // 'food' | 'plate' | 'bowl' | 'cup' | 'glass'
  score: number;
}

export interface Candidate {
  label: string;
  foodId: string;
  score: number; // cosine similarity (after personal prior boost)
}

export interface ItemResult {
  box: Box;
  detScore: number;
  maskAreaPx: number;
  areaCm2: number | null;
  candidates: Candidate[];
  /** True when the crop matched a non-food class best (likely a false detection). */
  likelyNonFood: boolean;
  portion: { grams: number; low: number; high: number; method: string } | null;
}

export interface PlateResult {
  kind: 'plate' | 'bowl' | 'none';
  box: Box | null;
  majorAxisPx: number;
  minorAxisPx: number;
  /** Diameter used as reference (cm); from the profile. */
  diameterCm: number;
}

export interface AnalysisResult {
  width: number;
  height: number;
  backend: 'webgpu' | 'wasm';
  plate: PlateResult;
  items: ItemResult[];
  imageEmbedding: number[];
  timingsMs: Record<string, number>;
}
