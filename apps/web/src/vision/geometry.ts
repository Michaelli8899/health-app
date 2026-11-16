import type { Box, Detection } from './types';

export const boxArea = ([x1, y1, x2, y2]: Box) => Math.max(0, x2 - x1) * Math.max(0, y2 - y1);

export function intersection(a: Box, b: Box): number {
  return boxArea([Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]);
}

export const iou = (a: Box, b: Box) => {
  const i = intersection(a, b);
  return i / (boxArea(a) + boxArea(b) - i || 1);
};

/** Share of box `inner` that lies inside `outer`. */
export const containment = (inner: Box, outer: Box) => intersection(inner, outer) / (boxArea(inner) || 1);

/** Greedy non-maximum suppression. */
export function nms(dets: Detection[], iouThreshold = 0.5): Detection[] {
  const sorted = [...dets].sort((a, b) => b.score - a.score);
  const keep: Detection[] = [];
  for (const d of sorted) if (keep.every((k) => iou(k.box, d.box) < iouThreshold)) keep.push(d);
  return keep;
}

/**
 * Clean food detections:
 *  - drop boxes that are basically the whole plate/bowl (the detector often labels the whole dish "food")
 *    when there are smaller food boxes inside;
 *  - drop a food box that contains two or more other food boxes (a "group" box).
 */
export function cleanFoodBoxes(foods: Detection[], container: Box | null): Detection[] {
  let out = nms(foods, 0.5);
  if (container && out.length > 1) {
    const cArea = boxArea(container);
    out = out.filter((f) => !(boxArea(f.box) > 0.8 * cArea && iou(f.box, container) > 0.7));
  }
  out = out.filter(
    (f) => out.filter((g) => g !== f && containment(g.box, f.box) > 0.85 && boxArea(g.box) < boxArea(f.box)).length < 2,
  );
  return out;
}

/** Pixel count of a binary mask (row-major, values 0/1 or 0/255), optionally limited to a box. */
export function maskArea(mask: ArrayLike<number>, width: number, box?: Box): number {
  const height = mask.length / width;
  const [x1, y1, x2, y2] = box
    ? [Math.max(0, Math.floor(box[0])), Math.max(0, Math.floor(box[1])), Math.min(width, Math.ceil(box[2])), Math.min(height, Math.ceil(box[3]))]
    : [0, 0, width, height];
  let n = 0;
  for (let y = y1; y < y2; y++) {
    const row = y * width;
    for (let x = x1; x < x2; x++) if (mask[row + x]) n++;
  }
  return n;
}

/**
 * Fit an ellipse to a filled binary mask using image moments.
 * For a filled ellipse with semi-axes a ≥ b, the covariance eigenvalues are a²/4 and b²/4.
 */
export function fitEllipse(mask: ArrayLike<number>, width: number): { cx: number; cy: number; majorAxisPx: number; minorAxisPx: number; angle: number } | null {
  const height = mask.length / width;
  let n = 0, sx = 0, sy = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) if (mask[y * width + x]) { n++; sx += x; sy += y; }
  if (n < 20) return null;
  const cx = sx / n, cy = sy / n;
  let sxx = 0, syy = 0, sxy = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (!mask[y * width + x]) continue;
    const dx = x - cx, dy = y - cy;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy;
  }
  sxx /= n; syy /= n; sxy /= n;
  const tr = sxx + syy, det = sxx * syy - sxy * sxy;
  const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
  const l1 = tr / 2 + disc, l2 = Math.max(0, tr / 2 - disc);
  return { cx, cy, majorAxisPx: 4 * Math.sqrt(l1), minorAxisPx: 4 * Math.sqrt(l2), angle: 0.5 * Math.atan2(2 * sxy, sxx - syy) };
}

/** Expand a box by a fraction of its size, clipped to the image. */
export function padBox([x1, y1, x2, y2]: Box, frac: number, w: number, h: number): Box {
  const px = (x2 - x1) * frac, py = (y2 - y1) * frac;
  return [Math.max(0, x1 - px), Math.max(0, y1 - py), Math.min(w, x2 + px), Math.min(h, y2 + py)];
}
