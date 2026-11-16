import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type EvalMealRow } from '../data/db';
import { loadFoods, type FoodDB, type FoodRecord } from '../data/foods';
import { saveProfile, useProfile } from '../data/profile';
import { FoodSearch } from '../components/FoodSearch';
import { detectBackend, downscalePhoto, vision, type BackendInfo } from '../vision/client';
import { computeMetrics } from '../vision/evaluation';
import type { AnalysisResult } from '../vision/types';

type Label = EvalMealRow['labels'][number];

export function LabPage() {
  const profile = useProfile();
  const [foodDb, setFoodDb] = useState<FoodDB>();
  useEffect(() => { void loadFoods().then(setFoodDb); }, []);
  return (
    <section>
      <h1>Vision Lab</h1>
      <p className="muted">Test the on-device photo pipeline and build your evaluation set. Photos never leave this phone.</p>
      <DeviceCard />
      <ModelsCard />
      {profile && <CalibrateCard plateCm={profile.plateDiameterCm} onSave={(cm) => saveProfile({ ...profile, plateDiameterCm: cm })} />}
      {foodDb && <AnalyzeCard plateCm={profile?.plateDiameterCm ?? 27} foodDb={foodDb} />}
      {foodDb && <ResultsCard foodDb={foodDb} />}
    </section>
  );
}

function DeviceCard() {
  const [info, setInfo] = useState<BackendInfo & { quotaMB?: number; usedMB?: number; persisted?: boolean; standalone: boolean }>();
  useEffect(() => {
    void (async () => {
      const b = await detectBackend();
      const est = await navigator.storage?.estimate?.().catch(() => undefined);
      setInfo({
        ...b,
        standalone: window.matchMedia('(display-mode: standalone)').matches,
        quotaMB: est?.quota ? Math.round(est.quota / 2 ** 20) : undefined,
        usedMB: est?.usage !== undefined ? Math.round(est.usage / 2 ** 20) : undefined,
        persisted: await navigator.storage?.persisted?.().catch(() => undefined),
      });
    })();
  }, []);
  if (!info) return <div className="card">Checking device…</div>;
  return (
    <div className="card">
      <h2>Device</h2>
      <ul className="kv">
        <li><span>Backend</span><b>{info.backend === 'webgpu' ? `WebGPU${info.shaderF16 ? ' (f16)' : ''}` : 'WASM (slower)'}</b></li>
        {info.maxBufferMB !== undefined && <li><span>Max GPU buffer</span><b>{info.maxBufferMB} MB</b></li>}
        <li><span>Installed to home screen</span><b>{info.standalone ? 'yes' : 'no'}</b></li>
        {info.quotaMB !== undefined && <li><span>Storage used / quota</span><b>{info.usedMB} / {info.quotaMB} MB</b></li>}
        <li><span>Persistent storage</span><b>{info.persisted ? 'yes' : 'not yet'}</b></li>
      </ul>
    </div>
  );
}

function ModelsCard() {
  const [state, setState] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [files, setFiles] = useState<Record<string, number>>({});
  const [msg, setMsg] = useState('');
  useEffect(() => vision.onProgress((p) => {
    if (p.file && p.progress !== undefined) setFiles((f) => ({ ...f, [`${p.model}/${p.file}`]: p.progress! }));
    if (p.status.startsWith('WebGPU failed')) setMsg(p.status);
  }), []);
  const start = async () => {
    setState('loading');
    const t0 = performance.now();
    try {
      const backend = await vision.init();
      setState('ready');
      setMsg((m) => `${m ? m + ' · ' : ''}Loaded on ${backend} in ${((performance.now() - t0) / 1000).toFixed(1)} s`);
    } catch (e) {
      setState('error');
      setMsg((e as Error).message);
    }
  };
  const big = Object.entries(files).filter(([k]) => k.endsWith('.onnx'));
  return (
    <div className="card">
      <h2>1 · Models</h2>
      {state === 'idle' && <>
        <p className="muted">One-time download of about 220 MB (Wi-Fi recommended). Cached for offline use afterwards.</p>
        <button className="button primary" onClick={start}>Download &amp; load models</button>
      </>}
      {state === 'loading' && <>
        <p>Loading… keep this screen open.</p>
        {big.map(([k, v]) => (
          <div key={k} className="progress-row"><span>{k.split('/').slice(0, 1)} {k.split('/').pop()}</span><progress max={100} value={v} /></div>
        ))}
      </>}
      {(state === 'ready' || state === 'error') && <p className={state === 'error' ? 'warn' : ''}>{msg}</p>}
    </div>
  );
}

function CalibrateCard({ plateCm, onSave }: { plateCm: number; onSave: (cm: number) => void }) {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ plateDiameterCm: number | null; detail: string }>();
  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true); setRes(undefined);
    try { setRes(await vision.calibrate(await downscalePhoto(f))); }
    catch (e) { setRes({ plateDiameterCm: null, detail: (e as Error).message }); }
    finally { setBusy(false); }
  };
  return (
    <div className="card">
      <h2>2 · Plate size</h2>
      <p className="muted">Current: <b>{plateCm} cm</b>. Put a bank card flat on your empty plate and take a photo from directly above.</p>
      <label className="button">{busy ? 'Measuring…' : 'Photograph plate + card'}
        <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} disabled={busy} />
      </label>
      {res && <p className={res.plateDiameterCm ? '' : 'warn'}>{res.detail}</p>}
      {res?.plateDiameterCm && <button className="button primary" onClick={() => onSave(res.plateDiameterCm!)}>Use {res.plateDiameterCm} cm</button>}
    </div>
  );
}

function AnalyzeCard({ plateCm, foodDb }: { plateCm: number; foodDb: FoodDB }) {
  const [photo, setPhoto] = useState<Blob>();
  const [result, setResult] = useState<AnalysisResult>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [labels, setLabels] = useState<Label[]>([]);
  const [missed, setMissed] = useState<{ foodId: string; grams: number }[]>([]);
  const [saved, setSaved] = useState(false);

  const onFile = async (f?: File) => {
    if (!f) return;
    setBusy(true); setError(''); setResult(undefined); setSaved(false); setMissed([]);
    try {
      const small = await downscalePhoto(f);
      setPhoto(small);
      const r = await vision.analyze(small, plateCm);
      setResult(r);
      setLabels(r.items.map(() => null));
    } catch (e) { setError((e as Error).message); }
    finally { setBusy(false); }
  };

  const complete = result && labels.every((l) => l !== null && (l === 'not_food' || l.grams > 0)) && missed.every((m) => m.grams > 0);
  const save = async () => {
    if (!result || !photo) return;
    await db.evalMeals.add({ takenAt: Date.now(), photo, result, labels, missed });
    setSaved(true);
  };

  return (
    <div className="card">
      <h2>3 · Analyse a meal</h2>
      <p className="muted">Weigh each food first (tare between foods), then photograph the plate from where you sit.</p>
      <label className="button primary">{busy ? 'Analysing…' : 'Take meal photo'}
        <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => onFile(e.target.files?.[0])} disabled={busy} />
      </label>
      {error && <p className="warn">{error}</p>}
      {photo && result && <Overlay photo={photo} result={result} />}
      {result && <>
        <p className="muted small">
          {result.backend} · {Object.entries(result.timingsMs).map(([k, v]) => `${k} ${v} ms`).join(' · ')} ·
          plate: {result.plate.kind}{result.plate.kind !== 'none' ? ` (tilt ${(result.plate.minorAxisPx / result.plate.majorAxisPx).toFixed(2)})` : ''}
        </p>
        <h3>What's actually on the plate?</h3>
        {result.items.map((it, i) => (
          <ItemLabeler key={i} index={i} item={it} foodDb={foodDb} label={labels[i] ?? null}
            onChange={(l) => setLabels((ls) => ls.map((x, j) => (j === i ? l : x)))} />
        ))}
        <h3>Missed foods</h3>
        {missed.map((m, i) => (
          <div key={i} className="missed-row">
            <span>{foodDb.byId.get(m.foodId)?.name}</span>
            <input type="number" inputMode="decimal" placeholder="g" value={m.grams || ''} onChange={(e) => setMissed((ms) => ms.map((x, j) => (j === i ? { ...x, grams: Number(e.target.value) } : x)))} />
            <button type="button" className="button" onClick={() => setMissed((ms) => ms.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <FoodSearch placeholder="Add a food the photo missed…" onPick={(f) => setMissed((ms) => [...ms, { foodId: f.id, grams: 0 }])} />
        <button className="button primary" disabled={!complete || saved} onClick={save}>
          {saved ? 'Saved to evaluation set ✓' : complete ? 'Save to evaluation set' : 'Label every item to save'}
        </button>
      </>}
    </div>
  );
}

const COLORS = ['#16a34a', '#2563eb', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04'];

function Overlay({ photo, result }: { photo: Blob; result: AnalysisResult }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    void (async () => {
      const bmp = await createImageBitmap(photo);
      const c = ref.current!;
      c.width = result.width; c.height = result.height;
      const g = c.getContext('2d')!;
      g.drawImage(bmp, 0, 0, result.width, result.height);
      g.lineWidth = Math.max(2, result.width / 250);
      g.font = `${Math.round(result.width / 28)}px -apple-system, sans-serif`;
      if (result.plate.box) {
        const [x1, y1, x2, y2] = result.plate.box;
        g.strokeStyle = 'rgba(255,255,255,0.9)'; g.setLineDash([10, 8]);
        g.beginPath(); g.ellipse((x1 + x2) / 2, (y1 + y2) / 2, result.plate.majorAxisPx / 2, result.plate.minorAxisPx / 2, 0, 0, 2 * Math.PI); g.stroke();
        g.setLineDash([]);
      }
      result.items.forEach((it, i) => {
        const [x1, y1, x2, y2] = it.box;
        g.strokeStyle = g.fillStyle = COLORS[i % COLORS.length]!;
        g.strokeRect(x1, y1, x2 - x1, y2 - y1);
        const text = `${i + 1}`;
        g.fillRect(x1, y1, g.measureText(text).width + 16, result.width / 22);
        g.fillStyle = '#fff'; g.fillText(text, x1 + 8, y1 + result.width / 30);
      });
    })();
  }, [photo, result]);
  return <canvas ref={ref} className="overlay" />;
}

function ItemLabeler({ index, item, foodDb, label, onChange }: {
  index: number; item: AnalysisResult['items'][number]; foodDb: FoodDB; label: Label; onChange: (l: Label) => void;
}) {
  const [other, setOther] = useState<FoodRecord>();
  const chosenId = label && label !== 'not_food' ? label.foodId : undefined;
  const grams = label && label !== 'not_food' ? label.grams : 0;
  const options = useMemo(() => {
    const opts = item.candidates.map((c) => ({ id: c.foodId, text: `${c.label} (${(c.score * 100).toFixed(0)})` }));
    if (other && !opts.some((o) => o.id === other.id)) opts.push({ id: other.id, text: other.name });
    return opts;
  }, [item.candidates, other]);
  return (
    <div className="item-label" style={{ borderLeftColor: COLORS[index % COLORS.length] }}>
      <div className="item-head">
        <b>{index + 1}.</b> {item.candidates[0]?.label}{item.likelyNonFood ? ' (maybe not food)' : ''}
        {item.portion && <span className="muted"> · est. {item.portion.grams} g ({item.portion.low}–{item.portion.high}) · {item.portion.method}</span>}
      </div>
      <div className="item-controls">
        <select value={label === 'not_food' ? 'not_food' : chosenId ?? ''} onChange={(e) => {
          const v = e.target.value;
          onChange(v === 'not_food' ? 'not_food' : v ? { foodId: v, grams } : null);
        }}>
          <option value="">True food…</option>
          {options.map((o) => <option key={o.id} value={o.id}>{o.text}</option>)}
          <option value="not_food">Not food / duplicate box</option>
        </select>
        {label !== 'not_food' && (
          <input type="number" inputMode="decimal" placeholder="scale g" value={grams || ''}
            onChange={(e) => chosenId && onChange({ foodId: chosenId, grams: Number(e.target.value) })} disabled={!chosenId} />
        )}
      </div>
      {label !== 'not_food' && <FoodSearch placeholder="Not listed? Search…" onPick={(f) => { setOther(f); onChange({ foodId: f.id, grams }); }} />}
      {chosenId && <div className="muted small">✓ {foodDb.byId.get(chosenId)?.name}</div>}
    </div>
  );
}

function ResultsCard({ foodDb }: { foodDb: FoodDB }) {
  const rows = useLiveQuery(() => db.evalMeals.toArray(), []);
  const [copied, setCopied] = useState(false);
  if (!rows) return null;
  const metrics = rows.length ? computeMetrics(rows, foodDb) : null;
  const report = () => JSON.stringify({
    app: 'health-app lab', version: 1, generatedAt: new Date().toISOString(), userAgent: navigator.userAgent,
    metrics,
    meals: rows.map((r) => ({
      items: r.result.items.map((it, i) => ({
        top5: it.candidates.map((c) => c.label), est: it.portion?.grams ?? null, areaCm2: it.areaCm2, maskCoverage: it.maskCoverage,
        truth: r.labels[i] === 'not_food' ? 'not_food' : r.labels[i] ? { food: foodDb.byId.get((r.labels[i] as { foodId: string }).foodId)?.name, grams: (r.labels[i] as { grams: number }).grams } : null,
      })),
      missed: r.missed.map((m) => ({ food: foodDb.byId.get(m.foodId)?.name, grams: m.grams })),
      plate: r.result.plate.kind, plateMaskAgreement: r.result.plate.maskAgreement, tilt: r.result.plate.majorAxisPx ? +(r.result.plate.minorAxisPx / r.result.plate.majorAxisPx).toFixed(2) : null,
      timingsMs: r.result.timingsMs,
    })),
  }, null, 1);
  const exportJson = async () => {
    const text = report();
    try { await navigator.clipboard.writeText(text); setCopied(true); } catch { /* clipboard may be blocked */ }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    a.download = `lab-results-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };
  const pct = (x: number | null) => (x === null ? 'n/a' : `${Math.round(x * 100)}%`);
  return (
    <div className="card">
      <h2>4 · Evaluation results</h2>
      <p className="muted">{rows.length} / 30 meals recorded.</p>
      {metrics && <ul className="kv">
        <li><span>Correct food is top match</span><b>{pct(metrics.top1)}</b></li>
        <li><span>Correct food in top 5</span><b>{pct(metrics.top5)}</b></li>
        <li><span>Foods found (recall)</span><b>{pct(metrics.recall)}</b></li>
        <li><span>False / duplicate boxes</span><b>{pct(metrics.falseDetections)}</b></li>
        <li><span>Portion error (median, right food)</span><b>{pct(metrics.portionMedianAPE)}</b></li>
        <li><span>Meal kcal error (median, no review)</span><b>{pct(metrics.kcalMedianAPE)}</b></li>
        <li><span>Time per photo</span><b>{(metrics.meanMsPerPhoto / 1000).toFixed(1)} s</b></li>
      </ul>}
      {rows.length > 0 && <>
        <button className="button primary" onClick={exportJson}>{copied ? 'Copied + downloaded ✓' : 'Export results (numbers only, no photos)'}</button>
        <button className="button danger" onClick={() => confirm('Delete all evaluation meals and photos?') && db.evalMeals.clear()}>Delete evaluation data</button>
      </>}
    </div>
  );
}
