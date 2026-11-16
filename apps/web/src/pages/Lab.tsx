import { useEffect, useState } from 'react';

interface EnvInfo {
  webgpu: boolean;
  adapter?: string;
  maxBufferMB?: number;
  storageQuotaMB?: number;
  storageUsedMB?: number;
  persisted?: boolean;
  standalone: boolean;
}

async function probe(): Promise<EnvInfo> {
  const info: EnvInfo = {
    webgpu: 'gpu' in navigator,
    standalone: window.matchMedia('(display-mode: standalone)').matches,
  };
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<{ limits: { maxBufferSize: number }; info?: { vendor?: string; architecture?: string } } | null> } }).gpu;
    const adapter = await gpu?.requestAdapter();
    if (adapter) {
      info.maxBufferMB = Math.round(adapter.limits.maxBufferSize / 2 ** 20);
      info.adapter = [adapter.info?.vendor, adapter.info?.architecture].filter(Boolean).join(' ') || 'available';
    } else {
      info.webgpu = false;
    }
  } catch { info.webgpu = false; }
  try {
    const est = await navigator.storage?.estimate();
    if (est) {
      info.storageQuotaMB = Math.round((est.quota ?? 0) / 2 ** 20);
      info.storageUsedMB = Math.round((est.usage ?? 0) / 2 ** 20);
    }
    info.persisted = await navigator.storage?.persisted?.();
  } catch { /* ignore */ }
  return info;
}

export function LabPage() {
  const [env, setEnv] = useState<EnvInfo>();
  useEffect(() => { void probe().then(setEnv); }, []);
  return (
    <section>
      <h1>Vision Lab</h1>
      <div className="card">
        <h2>Device check</h2>
        {!env ? <p>Checking…</p> : (
          <ul className="kv">
            <li><span>WebGPU</span><b>{env.webgpu ? `yes (${env.adapter})` : 'no (WASM fallback)'}</b></li>
            {env.maxBufferMB !== undefined && <li><span>Max GPU buffer</span><b>{env.maxBufferMB} MB</b></li>}
            <li><span>Installed to home screen</span><b>{env.standalone ? 'yes' : 'no'}</b></li>
            {env.storageQuotaMB !== undefined && <li><span>Storage used / quota</span><b>{env.storageUsedMB} / {env.storageQuotaMB} MB</b></li>}
            <li><span>Persistent storage</span><b>{env.persisted ? 'yes' : 'not yet'}</b></li>
          </ul>
        )}
      </div>
      <div className="card muted">Photo analysis and evaluation mode are coming in the next build.</div>
    </section>
  );
}
