import { describe, expect, it } from 'vitest';
import {
  applyCalibration, areaOnPlateCm2, estimateBowlPortion, estimateFlatPortion,
  estimatePiecePortion, sphericalBowlVolumeMl,
} from '../src';

describe('portion geometry', () => {
  it('top-down plate: whole plate area equals πr²', () => {
    const majorPx = 500;
    const platePx = Math.PI * 250 * 250;
    expect(areaOnPlateCm2(platePx, { majorAxisPx: majorPx, minorAxisPx: majorPx }, 27)).toBeCloseTo(Math.PI * 13.5 ** 2, 5);
  });
  it('tilted plate corrects foreshortening', () => {
    // At 60° from vertical the minor axis halves; the plate's own pixel area halves too.
    const platePx = Math.PI * 250 * 125;
    expect(areaOnPlateCm2(platePx, { majorAxisPx: 500, minorAxisPx: 250 }, 27)).toBeCloseTo(Math.PI * 13.5 ** 2, 5);
  });
  it('flat portion: 100 cm² × 2 cm rice at 0.8 g/ml ≈ 160 g with a range', () => {
    const e = estimateFlatPortion({ areaCm2: 100, heightCm: 2, heightRel: 0.3, densityGPerMl: 0.8, densityRel: 0.15 });
    expect(e.grams).toBeCloseTo(160);
    expect(e.low).toBeLessThan(160);
    expect(e.high).toBeGreaterThan(160);
    expect(e.relUncertainty).toBeCloseTo(Math.sqrt(0.08 ** 2 * 2 + 0.3 ** 2 + 0.15 ** 2));
  });
  it('full spherical bowl equals spherical cap volume', () => {
    // hemisphere: rim 20 cm, depth 10 cm → (2/3)πr³
    expect(sphericalBowlVolumeMl(20, 10, 10)).toBeCloseTo((2 / 3) * Math.PI * 1000, 5);
    expect(sphericalBowlVolumeMl(20, 10, 5)).toBeLessThan(sphericalBowlVolumeMl(20, 10, 10) / 2);
  });
  it('bowl and piece estimates', () => {
    const soup = estimateBowlPortion({ rimDiameterCm: 16, fill: 0.7, densityGPerMl: 1, densityRel: 0.05 });
    expect(soup.grams).toBeGreaterThan(200);
    expect(soup.grams).toBeLessThan(500);
    expect(estimatePiecePortion(2, 50).grams).toBe(100);
  });
  it('calibration scales grams, keeps uncertainty, ignores bad factors', () => {
    const e = estimatePiecePortion(1, 100);
    expect(applyCalibration(e, 1.2).grams).toBeCloseTo(120);
    expect(applyCalibration(e, 0)).toBe(e);
  });
});

import { estimateByClass } from '../src';
describe('portion classes', () => {
  it('a typical serving of rice (≈ 100 cm² pile) lands near a cup', () => {
    const e = estimateByClass(100, 'pile', 0.668);
    expect(e.grams).toBeGreaterThan(90);
    expect(e.grams).toBeLessThan(160);
  });
  it('steak ignores bulk density', () => {
    expect(estimateByClass(80, 'slab', 0.59).grams).toBeCloseTo(80 * 1.6 * 1.05);
  });
});
