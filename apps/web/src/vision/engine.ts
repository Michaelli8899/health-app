/**
 * On-device meal photo analysis (PRD §6.7). Runs in a Web Worker in the app and in Node for tests.
 *
 *   detect (Grounding DINO) → segment (SlimSAM, box + centre-point prompts) → plate scale (ellipse fit)
 *   → identify (CLIP image embedding vs precomputed food text embeddings) → portion (core geometry)
 */
import {
  AutoProcessor,
  CLIPVisionModelWithProjection,
  RawImage,
  SamModel,
  pipeline,
  type ZeroShotObjectDetectionPipeline,
} from '@huggingface/transformers';
import { areaOnPlateCm2 } from '@health/core';
import type { FoodDB } from '../data/foods';
import { boxArea, cleanFoodBoxes, containment, fitEllipse, maskArea, padBox } from './geometry';
import { l2normalize, rankFoods, type TextIndex } from './matcher';
import { estimatePortion } from './portion';
import type { AnalysisResult, Box, Detection, ItemResult, PlateResult } from './types';

/** The subset of the SAM processor API we use (Transformers.js types it as a generic Processor). */
interface SamProcessorLike {
  (image: RawImage, opts: { input_boxes?: number[][][]; input_points?: number[][][][] }): Promise<Record<string, unknown> & {
    original_sizes: unknown; reshaped_input_sizes: unknown;
  }>;
  post_process_masks(masks: unknown, originalSizes: unknown, reshapedSizes: unknown): Promise<{ dims: number[]; data: unknown }[]>;
}

export const MODELS = {
  detector: 'onnx-community/grounding-dino-tiny-ONNX',
  segmenter: 'Xenova/slimsam-77-uniform',
  clip: 'Xenova/clip-vit-base-patch32',
} as const;

export type Backend = 'webgpu' | 'wasm';
type Dtype = 'fp32' | 'fp16' | 'q8' | 'int8' | 'q4' | 'q4f16';

export interface EngineOptions {
  backend: Backend;
  /** WebGPU adapter supports 16-bit floats in shaders (smaller, faster models). */
  shaderF16?: boolean;
  /** Override the runtime device name (Node uses 'cpu' where browsers use 'wasm'). */
  device?: 'webgpu' | 'wasm' | 'cpu';
  onProgress?: (p: { model: string; file?: string; progress?: number; status: string }) => void;
}

function dtypes(o: EngineOptions): Record<keyof typeof MODELS, Dtype> {
  if (o.backend === 'webgpu') {
    return o.shaderF16
      ? { detector: 'q4f16', segmenter: 'fp16', clip: 'q4f16' }
      : { detector: 'q4', segmenter: 'fp32', clip: 'q4' };
  }
  return { detector: 'int8', segmenter: 'q8', clip: 'q8' };
}

const MAX_SIDE = 1024;
// Two passes: in a combined prompt the detector's 'food' phrase crowds out the containers.
const FOOD_PROMPT = 'food.';
const CONTAINER_PROMPT = 'plate. bowl. cup. glass.';

export class MealVisionEngine {
  private detector?: ZeroShotObjectDetectionPipeline;
  private sam?: { model: SamModel; processor: SamProcessorLike };
  private clip?: { model: CLIPVisionModelWithProjection; processor: Awaited<ReturnType<typeof AutoProcessor.from_pretrained>> };

  constructor(
    private readonly opts: EngineOptions,
    private readonly textIndex: TextIndex,
    private readonly foods: FoodDB,
  ) {}

  private progress(model: string) {
    return (p: { status: string; file?: string; progress?: number }) =>
      this.opts.onProgress?.({ model, status: p.status, file: p.file, progress: p.progress });
  }

  /** Download (first time) and initialise all models. */
  async load(): Promise<void> {
    const dt = dtypes(this.opts);
    const device = this.opts.device ?? this.opts.backend;
    this.detector ??= (await pipeline('zero-shot-object-detection', MODELS.detector, {
      device, dtype: dt.detector, progress_callback: this.progress('detector'),
    })) as ZeroShotObjectDetectionPipeline;
    this.sam ??= {
      model: (await SamModel.from_pretrained(MODELS.segmenter, { device, dtype: dt.segmenter, progress_callback: this.progress('segmenter') })) as SamModel,
      processor: (await AutoProcessor.from_pretrained(MODELS.segmenter)) as unknown as SamProcessorLike,
    };
    this.clip ??= {
      model: await CLIPVisionModelWithProjection.from_pretrained(MODELS.clip, { device, dtype: dt.clip, progress_callback: this.progress('clip') }),
      processor: await AutoProcessor.from_pretrained(MODELS.clip),
    };
  }

  /** Raw detections for a prompt (used by calibration). Boxes in image pixels. */
  async detect(image: RawImage, prompt: string, threshold: number): Promise<Detection[]> {
    await this.load();
    const raw = (await this.detector!(image, [prompt], { threshold })) as { box: { xmin: number; ymin: number; xmax: number; ymax: number }; label: string; score: number }[];
    return raw.map((d) => ({ box: [d.box.xmin, d.box.ymin, d.box.xmax, d.box.ymax] as Box, label: d.label, score: d.score }));
  }

  async analyze(
    input: RawImage,
    opts: { plateDiameterCm: number; prior?: ReadonlyMap<string, number>; detThreshold?: number },
  ): Promise<AnalysisResult> {
    await this.load();
    const t: Record<string, number> = {};
    const time = async <T>(k: string, f: () => Promise<T>): Promise<T> => {
      const s = performance.now();
      const r = await f();
      t[k] = Math.round(performance.now() - s);
      return r;
    };

    const image = await time('resize', async () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(input.width, input.height));
      return scale < 1 ? await input.resize(Math.round(input.width * scale), Math.round(input.height * scale)) : input;
    });
    const { width: W, height: H } = image;

    // 1 DETECT -------------------------------------------------------------------------------
    type RawDet = { box: { xmin: number; ymin: number; xmax: number; ymax: number }; label: string; score: number };
    const toDets = (raw: unknown, fallback: string | null): Detection[] =>
      (raw as RawDet[]).flatMap((d) => {
        const label = normLabel(d.label) ?? fallback;
        return label ? [{ box: [d.box.xmin, d.box.ymin, d.box.xmax, d.box.ymax] as Box, label, score: d.score }] : [];
      });
    const dets: Detection[] = [
      ...toDets(await time('detectFood', () => this.detector!(image, [FOOD_PROMPT], { threshold: opts.detThreshold ?? 0.25 })), 'food'),
      ...toDets(await time('detectContainers', () => this.detector!(image, [CONTAINER_PROMPT], { threshold: 0.3 })), null),
    ];
    const containers = dets.filter((d) => d.label === 'plate' || d.label === 'bowl').sort((a, b) => b.score - a.score);
    const cups = dets.filter((d) => d.label === 'cup' || d.label === 'glass');
    const container = containers[0] ?? null;
    let foods = cleanFoodBoxes(dets.filter((d) => d.label === 'food'), container?.box ?? null);
    if (foods.length === 0 && container) foods = [{ ...container, label: 'food' }]; // e.g. a bowl of soup
    if (foods.length === 0) foods = [{ box: [0, 0, W, H], label: 'food', score: 0 }]; // close-up of one food

    // 2 SEGMENT (all boxes in one decoder call; image encoded once) ----------------------------
    const segBoxes: Box[] = [...foods.map((f) => f.box), ...(container ? [container.box] : [])];
    const masks = await time('segment', () => this.segment(image, segBoxes));

    // 3 SCALE ------------------------------------------------------------------------------------
    const plate: PlateResult = { kind: 'none', box: null, majorAxisPx: 0, minorAxisPx: 0, diameterCm: opts.plateDiameterCm, maskAgreement: null };
    if (container) {
      // Plate scale from the detector's box: for a round plate seen at an angle, box width ≈ diameter and
      // box height ≈ foreshortened diameter. This proved more stable than fitting the SAM plate mask,
      // which sometimes covers only the rim or part of the plate. The mask ellipse is kept as a check.
      const [x1, y1, x2, y2] = container.box;
      const bw = x2 - x1, bh = y2 - y1;
      plate.kind = container.label as 'plate' | 'bowl';
      plate.box = container.box;
      plate.majorAxisPx = Math.max(bw, bh);
      plate.minorAxisPx = Math.min(bw, bh);
      const e = fitEllipse(masks[masks.length - 1]!, W);
      plate.maskAgreement = e ? Math.round((e.majorAxisPx / plate.majorAxisPx) * 100) / 100 : null;
    }
    const cmPerPx = plate.kind !== 'none' ? opts.plateDiameterCm / plate.majorAxisPx : null;

    // 4 IDENTIFY (batch CLIP over item crops + whole image) ---------------------------------------
    const crops = await Promise.all(foods.map((f) => image.crop(padBox(f.box, 0.08, W, H).map(Math.round) as Box)));
    const embeds = await time('identify', () => this.embed([...crops, image]));
    const imageEmbedding = embeds.pop()!;

    // 5 PORTION ----------------------------------------------------------------------------------
    const items: ItemResult[] = await time('portion', async () =>
      foods.map((f, i) => {
        // SAM sometimes returns a near-empty mask (e.g. white rice on a white plate). Fall back to the
        // inscribed-ellipse area of the box (π/4 of the box) when the mask covers under 15 % of it.
        const boxPx = boxArea(f.box);
        const segPx = maskArea(masks[i]!, W, f.box);
        const areaPx = segPx < 0.15 * boxPx ? (Math.PI / 4) * boxPx : segPx;
        const areaCm2 = plate.kind === 'plate' ? areaOnPlateCm2(areaPx, plate, opts.plateDiameterCm) : null;
        const { candidates, bestIsNonFood } = rankFoods(embeds[i]!, this.textIndex, { prior: opts.prior });
        const inCup = cups.find((c) => containment(f.box, c.box) > 0.6);
        const inBowl = plate.kind === 'bowl' && container && containment(f.box, container.box) > 0.6 ? container : null;
        const cont = inCup ?? inBowl;
        const top = candidates[0] ? this.foods.byId.get(candidates[0].foodId) : undefined;
        // A cup/glass can be measured when a plate in the same photo gives the scale.
        // A bowl on its own has no reference, so the portion code falls back to a typical rim size.
        const widthCm = inCup && cmPerPx ? (inCup.box[2] - inCup.box[0]) * cmPerPx : null;
        const portionCtx = {
          areaCm2,
          container: cont ? { kind: cont.label as 'bowl' | 'cup' | 'glass', widthCm } : undefined,
        };
        const portion = top ? estimatePortion(top, portionCtx) : null;
        return { box: f.box, detScore: f.score, maskAreaPx: Math.round(areaPx), maskCoverage: Math.round((segPx / boxPx) * 100) / 100, areaCm2: areaCm2 && Math.round(areaCm2), candidates, likelyNonFood: bestIsNonFood, portion, portionCtx };
      }),
    );

    return { width: W, height: H, backend: this.opts.backend, plate, items, imageEmbedding, timingsMs: t };
  }

  /** One binary mask (W×H, row-major) per box. */
  async segment(image: RawImage, boxes: Box[]): Promise<Uint8Array[]> {
    const { model, processor } = this.sam!;
    const centres = boxes.map(([x1, y1, x2, y2]) => [[(x1 + x2) / 2, (y1 + y2) / 2]]);
    const inputs = await processor(image, { input_boxes: [boxes], input_points: [centres] });
    const outputs = (await model(inputs)) as { pred_masks: unknown; iou_scores: { data: Float32Array } };
    const masks = await processor.post_process_masks(outputs.pred_masks, inputs.original_sizes, inputs.reshaped_input_sizes);
    // masks[0]: [nBoxes, 3, H, W] (bool); iou_scores: [1, nBoxes, 3]
    const m = masks[0]!;
    const [n, k, h, w] = m.dims as number[];
    const iou = outputs.iou_scores.data as Float32Array;
    const data = m.data as Uint8Array;
    const out: Uint8Array[] = [];
    for (let b = 0; b < n!; b++) {
      let best = 0;
      for (let j = 1; j < k!; j++) if (iou[b * k! + j]! > iou[b * k! + best]!) best = j;
      const offset = (b * k! + best) * h! * w!;
      out.push(data.slice(offset, offset + h! * w!));
    }
    return out;
  }

  private async embed(images: RawImage[]): Promise<number[][]> {
    const { model, processor } = this.clip!;
    const inputs = await processor(images);
    const { image_embeds } = await model(inputs);
    const dim = image_embeds.dims[1] as number;
    const d = image_embeds.data as Float32Array;
    return images.map((_, i) => l2normalize(d.subarray(i * dim, (i + 1) * dim)));
  }
}

/** Grounding DINO returns the matched phrase (sometimes garbled); map it back to our label set. */
function normLabel(l: string): string | null {
  const s = l.toLowerCase();
  for (const k of ['plate', 'bowl', 'cup', 'glass', 'food']) if (s.includes(k)) return k;
  return null;
}

export async function loadTextIndex(fetchFn: (path: string) => Promise<ArrayBuffer | string>): Promise<TextIndex> {
  const meta = JSON.parse((await fetchFn('food-text-embeddings.json')) as string) as {
    dim: number; entries: { label: string; foodId: string | null }[];
  };
  const buf = (await fetchFn('food-text-embeddings.bin')) as ArrayBuffer;
  return { dim: meta.dim, labels: meta.entries, vectors: new Float32Array(buf) };
}
