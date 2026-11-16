/**
 * Portion estimation from a single photo, using the plate as a size reference.
 *
 * Geometry: a round plate of known diameter D appears as an ellipse. Its major axis
 * is (approximately) unaffected by camera tilt, so it gives the pixel scale; the
 * minor/major ratio gives the foreshortening of everything lying on the plate plane.
 */

export interface PlateEllipse {
  majorAxisPx: number;
  minorAxisPx: number;
}

/** Real area (cm²) on the plate plane for a region of `areaPx` pixels. */
export function areaOnPlateCm2(areaPx: number, plate: PlateEllipse, plateDiameterCm: number): number {
  if (plate.majorAxisPx <= 0 || plate.minorAxisPx <= 0) throw new Error('invalid plate ellipse');
  const cmPerPx = plateDiameterCm / plate.majorAxisPx;
  const foreshortening = Math.min(1, plate.minorAxisPx / plate.majorAxisPx);
  return (areaPx * cmPerPx * cmPerPx) / foreshortening;
}

export interface Estimate {
  grams: number;
  low: number;
  high: number;
  /** Combined relative uncertainty (e.g. 0.4 = ±40%, applied multiplicatively). */
  relUncertainty: number;
}

/** Combine independent relative uncertainties; area-type terms count twice (squared length). */
export function combineRel(terms: readonly number[]): number {
  return Math.sqrt(terms.reduce((s, t) => s + t * t, 0));
}

function toEstimate(grams: number, rel: number): Estimate {
  const g = Math.max(0, grams);
  return { grams: g, low: g / (1 + rel), high: g * (1 + rel), relUncertainty: rel };
}

export interface FlatPortionInput {
  areaCm2: number;
  /** Effective height (already includes the shape factor of a mound/pile). */
  heightCm: number;
  heightRel: number;
  densityGPerMl: number;
  densityRel: number;
  /** Relative uncertainty of the pixel scale (length). Default 0.08. */
  scaleRel?: number;
}

/** Foods lying on a plate: volume = area × effective height. */
export function estimateFlatPortion(i: FlatPortionInput): Estimate {
  const volumeMl = i.areaCm2 * i.heightCm;
  const scaleRel = i.scaleRel ?? 0.08;
  const rel = combineRel([scaleRel, scaleRel, i.heightRel, i.densityRel]);
  return toEstimate(volumeMl * i.densityGPerMl, rel);
}

export interface BowlPortionInput {
  rimDiameterCm: number;
  /** Bowl depth; default 0.4 × rim diameter (a typical soup/cereal bowl). */
  depthCm?: number;
  /** Fill level as a fraction of depth, 0..1. */
  fill: number;
  densityGPerMl: number;
  densityRel: number;
}

/** Volume (ml) of liquid filling a spherical-cap bowl to height x. */
export function sphericalBowlVolumeMl(rimDiameterCm: number, depthCm: number, fillHeightCm: number): number {
  const a = rimDiameterCm / 2;
  const h = depthCm;
  const R = (a * a + h * h) / (2 * h);
  const x = Math.min(Math.max(fillHeightCm, 0), h);
  return (Math.PI * x * x * (3 * R - x)) / 3;
}

export function estimateBowlPortion(i: BowlPortionInput): Estimate {
  const depth = i.depthCm ?? i.rimDiameterCm * 0.4;
  const vol = sphericalBowlVolumeMl(i.rimDiameterCm, depth, depth * i.fill);
  const rel = combineRel([0.08, 0.08, 0.08, 0.25, i.densityRel]); // rim scale ×3 (volume), fill guess
  return toEstimate(vol * i.densityGPerMl, rel);
}

/** Countable foods (egg, apple, slice of bread). */
export function estimatePiecePortion(count: number, pieceGrams: number, pieceRel = 0.2): Estimate {
  return toEstimate(count * pieceGrams, pieceRel);
}

/** Scale an estimate by a personal calibration factor (confirmed / estimated, learned per food). */
export function applyCalibration(e: Estimate, factor: number): Estimate {
  if (!(factor > 0)) return e;
  return toEstimate(e.grams * factor, e.relUncertainty);
}
