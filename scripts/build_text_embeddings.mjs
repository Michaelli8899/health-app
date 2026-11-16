// Precompute CLIP text embeddings for the visual food vocabulary.
// The phone then only runs the CLIP *image* encoder and compares against these.
// Usage: pnpm --filter scripts embeddings   (downloads the model from Hugging Face on first run)
import { AutoTokenizer, CLIPTextModelWithProjection } from '@huggingface/transformers';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'apps/web/public/datasets');
export const MODEL_ID = process.env.CLIP_MODEL ?? 'Xenova/clip-vit-base-patch32';

// Prompt ensembling (as in the CLIP paper) improves zero-shot accuracy.
const TEMPLATES = [
  'a photo of {}, a type of food.',
  'a photo of {} on a plate.',
  'a close-up photo of {}.',
  'a photo of a serving of {}.',
];
// Non-food "reject" classes: crops that best match these are not offered as foods.
const NON_FOOD = ['an empty plate', 'a table', 'a napkin', 'a fork and knife', 'a hand', 'a phone', 'a cup', 'a bowl'];

const labels = JSON.parse(readFileSync(join(OUT_DIR, 'visual-labels.json'), 'utf8'));
const entries = [
  ...labels.map((l) => ({ label: l.label, foodId: l.foodId, prompts: TEMPLATES.map((t) => t.replace('{}', l.label)) })),
  ...NON_FOOD.map((n) => ({ label: n, foodId: null, prompts: [`a photo of ${n}.`] })),
];

const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID);
const model = await CLIPTextModelWithProjection.from_pretrained(MODEL_ID, { dtype: 'fp32' });

const normalize = (v) => {
  const n = Math.hypot(...v);
  return v.map((x) => x / n);
};

let dim = 0;
const vectors = [];
for (const e of entries) {
  const inputs = tokenizer(e.prompts, { padding: true, truncation: true });
  const { text_embeds } = await model(inputs);
  dim = text_embeds.dims[1];
  const data = text_embeds.data;
  const mean = new Array(dim).fill(0);
  for (let p = 0; p < e.prompts.length; p++) {
    const v = normalize(Array.from(data.slice(p * dim, (p + 1) * dim)));
    for (let i = 0; i < dim; i++) mean[i] += v[i] / e.prompts.length;
  }
  vectors.push(normalize(mean));
}

const flat = new Float32Array(vectors.length * dim);
vectors.forEach((v, i) => flat.set(v, i * dim));
writeFileSync(join(OUT_DIR, 'food-text-embeddings.bin'), Buffer.from(flat.buffer));
writeFileSync(
  join(OUT_DIR, 'food-text-embeddings.json'),
  JSON.stringify({ model: MODEL_ID, dim, count: entries.length, templates: TEMPLATES,
    entries: entries.map(({ label, foodId }) => ({ label, foodId })) }),
);
console.log(`wrote ${entries.length} × ${dim} embeddings for ${MODEL_ID}`);
