/// <reference lib="webworker" />
import { env, RawImage } from '@huggingface/transformers';
import { loadFoods } from '../data/foods';
import { MealVisionEngine, loadTextIndex, type Backend } from './engine';
import { calibratePlate } from './calibrate';
import type { AnalysisResult } from './types';

export type WorkerRequest =
  | { type: 'init'; backend: Backend; shaderF16: boolean; baseUrl: string }
  | { type: 'analyze'; id: number; image: Blob; plateDiameterCm: number; prior: [string, number][] }
  | { type: 'calibrate'; id: number; image: Blob };

export type WorkerResponse =
  | { type: 'progress'; model: string; file?: string; progress?: number; status: string }
  | { type: 'ready'; backend: Backend; loadMs: number }
  | { type: 'error'; id?: number; message: string }
  | { type: 'result'; id: number; result: AnalysisResult }
  | { type: 'calibration'; id: number; plateDiameterCm: number | null; detail: string };

env.allowLocalModels = false; // always fetch from the Hugging Face CDN, cached by the browser afterwards

let engine: MealVisionEngine | null = null;
const post = (m: WorkerResponse) => (self as unknown as DedicatedWorkerGlobalScope).postMessage(m);

async function init(req: Extract<WorkerRequest, { type: 'init' }>) {
  const t0 = performance.now();
  const datasets = `${req.baseUrl}datasets/`;
  const [foods, index] = await Promise.all([
    loadFoods(req.baseUrl),
    loadTextIndex(async (p) => {
      const r = await fetch(datasets + p);
      return p.endsWith('.bin') ? r.arrayBuffer() : r.text();
    }),
  ]);
  const make = (backend: Backend) =>
    new MealVisionEngine({ backend, shaderF16: req.shaderF16, onProgress: (p) => post({ type: 'progress', ...p }) }, index, foods);
  let backend = req.backend;
  try {
    engine = make(backend);
    await engine.load();
  } catch (e) {
    if (backend !== 'webgpu') throw e;
    // WebGPU failed (unsupported op, memory): fall back to WASM.
    post({ type: 'progress', model: 'all', status: `WebGPU failed (${(e as Error).message}); using WASM` });
    backend = 'wasm';
    engine = make(backend);
    await engine.load();
  }
  post({ type: 'ready', backend, loadMs: Math.round(performance.now() - t0) });
}

self.onmessage = async (ev: MessageEvent<WorkerRequest>) => {
  const req = ev.data;
  try {
    if (req.type === 'init') return await init(req);
    if (!engine) throw new Error('models not loaded');
    const image = await RawImage.fromBlob(req.image);
    if (req.type === 'analyze') {
      const result = await engine.analyze(image, { plateDiameterCm: req.plateDiameterCm, prior: new Map(req.prior) });
      post({ type: 'result', id: req.id, result });
    } else if (req.type === 'calibrate') {
      const r = await calibratePlate(engine, image);
      post({ type: 'calibration', id: req.id, ...r });
    }
  } catch (e) {
    post({ type: 'error', id: 'id' in req ? req.id : undefined, message: (e as Error).message ?? String(e) });
  }
};
