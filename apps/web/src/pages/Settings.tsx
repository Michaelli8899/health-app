import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ActivityLevel, Goal, Sex } from '@health/core';
import { DEFAULT_PROFILE, effectiveTargets, saveProfile, useProfile } from '../data/profile';
import type { ProfileRow } from '../data/db';

const ACTIVITY: [ActivityLevel, string][] = [
  ['sedentary', 'Sedentary (desk job, little exercise)'],
  ['light', 'Light (1–3 workouts/week)'],
  ['moderate', 'Moderate (3–5 workouts/week)'],
  ['active', 'Active (6–7 workouts/week)'],
  ['very_active', 'Very active (physical job + training)'],
];

export function SettingsPage() {
  const stored = useProfile();
  const [p, setP] = useState<ProfileRow>(DEFAULT_PROFILE);
  const [saved, setSaved] = useState(false);
  useEffect(() => { if (stored) setP(stored); }, [stored]);
  if (stored === undefined) return null;

  const set = <K extends keyof ProfileRow>(k: K, v: ProfileRow[K]) => { setP({ ...p, [k]: v }); setSaved(false); };
  const num = (v: string) => (v === '' ? 0 : Number(v));
  const { targets, warnings, tdee } = effectiveTargets(p);

  return (
    <section>
      <h1>Settings</h1>
      <form
        className="card form"
        onSubmit={async (e) => { e.preventDefault(); await saveProfile(p); setSaved(true); }}
      >
        <h2>Profile</h2>
        <label>Sex
          <select value={p.sex} onChange={(e) => set('sex', e.target.value as Sex)}>
            <option value="male">Male</option><option value="female">Female</option>
          </select>
        </label>
        <label>Date of birth
          <input type="date" value={p.birthDate} onChange={(e) => set('birthDate', e.target.value)} required />
        </label>
        <div className="grid2">
          <label>Height (cm)
            <input type="number" inputMode="decimal" min={100} max={250} value={p.heightCm} onChange={(e) => set('heightCm', num(e.target.value))} required />
          </label>
          <label>Weight (kg)
            <input type="number" inputMode="decimal" step="0.1" min={30} max={300} value={p.weightKg} onChange={(e) => set('weightKg', num(e.target.value))} required />
          </label>
        </div>
        <label>Activity
          <select value={p.activityLevel} onChange={(e) => set('activityLevel', e.target.value as ActivityLevel)}>
            {ACTIVITY.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <div className="grid2">
          <label>Goal
            <select value={p.goal} onChange={(e) => set('goal', e.target.value as Goal)}>
              <option value="lose">Lose weight</option><option value="maintain">Maintain</option><option value="gain">Gain weight</option>
            </select>
          </label>
          {p.goal !== 'maintain' && (
            <label>Rate (kg/week)
              <input type="number" inputMode="decimal" step="0.05" min={0.1} max={1} value={p.goalRateKgPerWeek} onChange={(e) => set('goalRateKgPerWeek', num(e.target.value))} />
            </label>
          )}
        </div>
        <label>Usual plate diameter (cm)
          <input type="number" inputMode="decimal" step="0.5" min={15} max={40} value={p.plateDiameterCm} onChange={(e) => set('plateDiameterCm', num(e.target.value))} />
          <small>Used as the size reference for photo portions. Card calibration comes with the Lab.</small>
        </label>

        <div className="targets">
          <strong>{targets.kcal} kcal/day</strong> · maintenance ≈ {tdee} kcal<br />
          Protein {targets.proteinG} g · Carbs {targets.carbsG} g · Fat {targets.fatG} g · Water {targets.waterMl} ml
          {warnings.map((w) => <div key={w} className="warn">{w}</div>)}
        </div>
        <button className="button primary" type="submit">{saved ? 'Saved ✓' : 'Save'}</button>
      </form>

      <div className="card">
        <h2>Tools</h2>
        <Link to="/lab">Vision Lab (Phase 0 test) →</Link>
      </div>
      <p className="disclaimer">Estimates only, not medical advice. Food data: USDA FoodData Central. Exercises: free-exercise-db.</p>
    </section>
  );
}
