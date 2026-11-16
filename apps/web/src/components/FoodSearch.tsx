import { useEffect, useMemo, useState } from 'react';
import { loadFoods, type FoodRecord } from '../data/foods';

/** Simple offline search over the bundled food database (token prefix match, shorter names first). */
export function searchFoods(foods: readonly FoodRecord[], q: string, limit = 20): FoodRecord[] {
  const tokens = q.toLowerCase().split(/[\s,]+/).filter(Boolean);
  if (!tokens.length) return [];
  const out: { f: FoodRecord; score: number }[] = [];
  for (const f of foods) {
    const name = f.name.toLowerCase();
    const words = name.split(/[\s,()/]+/);
    if (!tokens.every((t) => words.some((w) => w.startsWith(t)))) continue;
    const firstSeg = name.split(',')[0]!;
    out.push({ f, score: name.length - (tokens.some((t) => firstSeg.startsWith(t)) ? 40 : 0) });
  }
  return out.sort((a, b) => a.score - b.score).slice(0, limit).map((x) => x.f);
}

export function FoodSearch({ onPick, placeholder = 'Search foods…' }: { onPick: (f: FoodRecord) => void; placeholder?: string }) {
  const [foods, setFoods] = useState<FoodRecord[]>([]);
  const [q, setQ] = useState('');
  useEffect(() => { void loadFoods().then((db) => setFoods(db.foods)); }, []);
  const results = useMemo(() => searchFoods(foods, q), [foods, q]);
  return (
    <div className="food-search">
      <input type="search" value={q} placeholder={placeholder} onChange={(e) => setQ(e.target.value)} />
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((f) => (
            <li key={f.id}><button type="button" onClick={() => { onPick(f); setQ(''); }}>{f.name}</button></li>
          ))}
        </ul>
      )}
    </div>
  );
}
