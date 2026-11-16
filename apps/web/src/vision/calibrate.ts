import type { RawImage } from '@huggingface/transformers';
import type { MealVisionEngine } from './engine';
import { fitEllipse } from './geometry';

/** ISO/IEC 7810 ID-1 (bank card) long side. */
export const CARD_LONG_CM = 8.56;

/**
 * Long side of a filled rectangle from its mask moments: for a rectangle with sides L ≥ S
 * the covariance eigenvalues are L²/12 and S²/12. fitEllipse reports 4·√λ, so L = √12·√λ = (√12/4)·major.
 */
export function rectLongSidePx(ellipseMajorAxisPx: number): number {
  return (Math.sqrt(12) / 4) * ellipseMajorAxisPx;
}

/** Photo of an empty plate with a bank card on it → plate diameter in cm. */
export async function calibratePlate(engine: MealVisionEngine, image: RawImage): Promise<{ plateDiameterCm: number | null; detail: string }> {
  const max = 1024;
  const s = Math.min(1, max / Math.max(image.width, image.height));
  const img = s < 1 ? await image.resize(Math.round(image.width * s), Math.round(image.height * s)) : image;
  const plates = await engine.detect(img, 'plate.', 0.3);
  const cards = await engine.detect(img, 'credit card. bank card. card.', 0.2);
  const plate = plates.sort((a, b) => b.score - a.score)[0];
  // The card lies on the plate: prefer a card box well inside the plate and much smaller than it.
  const card = cards
    .filter((c) => !plate || (c.box[2] - c.box[0]) * (c.box[3] - c.box[1]) < 0.5 * (plate.box[2] - plate.box[0]) * (plate.box[3] - plate.box[1]))
    .sort((a, b) => b.score - a.score)[0];
  if (!plate) return { plateDiameterCm: null, detail: 'No plate found. Use an empty plate, shot from above.' };
  if (!card) return { plateDiameterCm: null, detail: 'No card found. Place a bank card flat on the plate.' };
  const [plateMask, cardMask] = await engine.segment(img, [plate.box, card.box]);
  const pe = fitEllipse(plateMask!, img.width);
  const ce = fitEllipse(cardMask!, img.width);
  if (!pe || !ce) return { plateDiameterCm: null, detail: 'Could not outline the plate or card. Try again in better light.' };
  const tilt = pe.minorAxisPx / pe.majorAxisPx;
  const cardLongPx = rectLongSidePx(ce.majorAxisPx);
  const diameter = (pe.majorAxisPx / cardLongPx) * CARD_LONG_CM;
  if (diameter < 12 || diameter > 45) return { plateDiameterCm: null, detail: `Got ${diameter.toFixed(1)} cm, which looks wrong. Try again from directly above.` };
  const warn = tilt < 0.85 ? ' Photo was tilted; for best accuracy shoot from directly above.' : '';
  return { plateDiameterCm: Math.round(diameter * 2) / 2, detail: `Plate ≈ ${diameter.toFixed(1)} cm.${warn}` };
}
