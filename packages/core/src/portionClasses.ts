import type { Estimate } from './portion';
import { estimateFlatPortion } from './portion';

/**
 * How a food sits on a plate (assigned per food by scripts/build_foods.py).
 * Effective height already includes a shape factor (a mound of rice is not a cylinder).
 * Values are starting estimates to be tuned with the Phase 0 evaluation set.
 */
export type PortionClass = 'pile' | 'slab' | 'chunks' | 'leafy' | 'flat' | 'piece' | 'sauce' | 'liquid';

export interface PortionClassParams {
  /** Effective height in cm (area × height = volume). */
  heightCm: number;
  heightRel: number;
  /** Density used when the food has no USDA-derived bulk density (g/ml). */
  defaultDensity: number;
  densityRel: number;
  /** Ignore the USDA bulk (cup) density and use defaultDensity (solid foods like steak). */
  solid?: boolean;
}

export const PORTION_CLASSES: Record<PortionClass, PortionClassParams> = {
  pile:   { heightCm: 1.8, heightRel: 0.35, defaultDensity: 0.75, densityRel: 0.2 },
  slab:   { heightCm: 1.6, heightRel: 0.3,  defaultDensity: 1.05, densityRel: 0.08, solid: true },
  chunks: { heightCm: 2.2, heightRel: 0.4,  defaultDensity: 0.6,  densityRel: 0.25 },
  leafy:  { heightCm: 3.5, heightRel: 0.5,  defaultDensity: 0.12, densityRel: 0.35 },
  flat:   { heightCm: 1.2, heightRel: 0.35, defaultDensity: 0.55, densityRel: 0.25, solid: true },
  piece:  { heightCm: 3.0, heightRel: 0.4,  defaultDensity: 0.6,  densityRel: 0.3 },
  sauce:  { heightCm: 0.4, heightRel: 0.6,  defaultDensity: 1.0,  densityRel: 0.15 },
  liquid: { heightCm: 0,   heightRel: 0,    defaultDensity: 1.0,  densityRel: 0.05 },
};

/** Area-based estimate for a food of a given class (not for bowls/cups, see estimateBowlPortion). */
export function estimateByClass(areaCm2: number, cls: PortionClass, foodDensity?: number): Estimate {
  const p = PORTION_CLASSES[cls];
  const useFood = foodDensity !== undefined && !p.solid;
  return estimateFlatPortion({
    areaCm2,
    heightCm: p.heightCm,
    heightRel: p.heightRel,
    densityGPerMl: useFood ? foodDensity : p.defaultDensity,
    densityRel: useFood ? Math.min(p.densityRel, 0.15) : p.densityRel,
  });
}
