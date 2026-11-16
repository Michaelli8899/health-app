import type { AnalysisResult } from './types';
import type { WorkerRequest, WorkerResponse } from './worker';
import type { Backend } from './engine';

export interface BackendInfo { backend: Backend; shaderF16: boolean; maxBufferMB?: number }

export async function detectBackend(): Promise<BackendInfo> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ features: Set<string>; limits: { maxBufferSize: number } } | null> } }).gpu;
    const adapter = await gpu?.requestAdapter();
    if (adapter) {
      return { backend: 'webgpu', shaderF16: adapter.features.has('shader-f16'), maxBufferMB: Math.round(adapter.limits.maxBufferSize / 2 ** 20) };
    }
  } catch { /* fall through */ }
  return { backend: 'wasm', shaderF16: false };
}

type Progress = Extract<WorkerResponse, { type: 'progress' }>;

/** Single shared vision worker; models stay loaded while the app is open. */
class VisionClient {
  private worker: Worker | null = null;
  private nextId = 1;
  private pending = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void }>();
  private ready: Promise<Backend> | null = null;
  private progressListeners = new Set<(p: Progress) => void>();

  onProgress(fn: (p: Progress) => void): () => void {
    this.progressListeners.add(fn);
    return () => this.progressListeners.delete(fn);
  }

  init(): Promise<Backend> {
    this.ready ??= (async () => {
      const info = await detectBackend();
      this.worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
      return new Promise<Backend>((resolve, reject) => {
        this.worker!.onmessage = (ev: MessageEvent<WorkerResponse>) => {
          const m = ev.data;
          if (m.type === 'progress') this.progressListeners.forEach((f) => f(m));
          else if (m.type === 'ready') resolve(m.backend);
          else if (m.type === 'error' && m.id === undefined) { this.ready = null; reject(new Error(m.message)); }
          else if ('id' in m && m.id !== undefined) {
            const p = this.pending.get(m.id);
            if (!p) return;
            this.pending.delete(m.id);
            if (m.type === 'error') p.reject(new Error(m.message));
            else p.resolve(m as never);
          }
        };
        this.post({ type: 'init', backend: info.backend, shaderF16: info.shaderF16, baseUrl: new URL(import.meta.env.BASE_URL, location.href).href });
      });
    })();
    return this.ready;
  }

  private post(m: WorkerRequest) { this.worker!.postMessage(m); }

  private call<T>(make: (id: number) => WorkerRequest): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: never) => void, reject });
      this.post(make(id));
    });
  }

  async analyze(image: Blob, plateDiameterCm: number, prior: [string, number][] = []): Promise<AnalysisResult> {
    await this.init();
    const r = await this.call<Extract<WorkerResponse, { type: 'result' }>>((id) => ({ type: 'analyze', id, image, plateDiameterCm, prior }));
    return r.result;
  }

  async calibrate(image: Blob): Promise<{ plateDiameterCm: number | null; detail: string }> {
    await this.init();
    return this.call((id) => ({ type: 'calibrate', id, image }));
  }
}

export const vision = new VisionClient();

/** Downscale a camera photo to ≤ maxSide px JPEG (smaller to store, consistent to analyse). */
export async function downscalePhoto(file: Blob, maxSide = 1024, quality = 0.85): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const s = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * s), h = Math.round(bmp.height * s);
  const canvas = new OffscreenCanvas(w, h);
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return canvas.convertToBlob({ type: 'image/jpeg', quality });
}
