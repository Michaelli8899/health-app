/**
 * Runs the full pipeline on real photos in Node (WASM-equivalent CPU backend).
 * Opt-in because it downloads ~400 MB of models:  RUN_MODEL_TESTS=1 TEST_IMAGES=/path/to/jpgs pnpm --filter web test
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { RawImage } from '@huggingface/transformers';
import { MealVisionEngine, loadTextIndex } from './engine';
import type { FoodDB, FoodRecord } from '../data/foods';

const DS = join(__dirname, '../../public/datasets');
const run = process.env.RUN_MODEL_TESTS === '1';

describe.runIf(run)('MealVisionEngine (integration)', () => {
  it('analyzes photos end to end', async () => {
    const foods = JSON.parse(readFileSync(join(DS, 'foods.json'), 'utf8')).foods as FoodRecord[];
    const db: FoodDB = { foods, byId: new Map(foods.map((f) => [f.id, f])) };
    const index = await loadTextIndex(async (p) =>
      p.endsWith('.bin') ? new Uint8Array(readFileSync(join(DS, p))).buffer : readFileSync(join(DS, p), 'utf8'),
    );
    // Node has no WebGPU; 'wasm' selects the CPU-quantized model variants (onnxruntime-node runs them).
    const engine = new MealVisionEngine({ backend: 'wasm', device: 'cpu' }, index, db);
    const dir = process.env.TEST_IMAGES!;
    for (const f of readdirSync(dir).filter((x) => /\.(jpe?g|png)$/i.test(x)).sort()) {
      const img = await RawImage.read(join(dir, f));
      const r = await engine.analyze(img, { plateDiameterCm: 27 });
      const summary = r.items.map((it) =>
        `${it.candidates.slice(0, 3).map((c) => c.label).join('/')}${it.likelyNonFood ? '(?)' : ''} ${it.portion ? `${it.portion.grams}g[${it.portion.low}-${it.portion.high}] ${it.portion.method}` : ''}`);
      console.log(`${f}: plate=${r.plate.kind} ${Math.round(r.plate.majorAxisPx)}x${Math.round(r.plate.minorAxisPx)} | ${JSON.stringify(r.timingsMs)}\n   ` + summary.join('\n   '));
      expect(r.items.length).toBeGreaterThan(0);
      expect(r.imageEmbedding).toHaveLength(512);
    }
  }, 900_000);
});
