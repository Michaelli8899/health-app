import { Link } from 'react-router-dom';
import { effectiveTargets, useProfile } from '../data/profile';

export function TodayPage() {
  const profile = useProfile();
  if (profile === undefined) return null;
  if (profile === null) {
    return (
      <section>
        <h1>Welcome</h1>
        <div className="card">
          <p>Set up your profile to get daily calorie and macro targets.</p>
          <Link className="button primary" to="/settings">Set up profile</Link>
        </div>
      </section>
    );
  }
  const { targets } = effectiveTargets(profile);
  return (
    <section>
      <h1>Today</h1>
      <div className="card">
        <div className="big-number">{targets.kcal} <small>kcal target</small></div>
        <div className="stat-row">
          <Stat label="Protein" value={`${targets.proteinG} g`} />
          <Stat label="Carbs" value={`${targets.carbsG} g`} />
          <Stat label="Fat" value={`${targets.fatG} g`} />
          <Stat label="Water" value={`${(targets.waterMl / 1000).toFixed(1)} L`} />
        </div>
      </div>
      <div className="card muted">Food logging, photo recognition and workouts arrive in the next builds.</div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
