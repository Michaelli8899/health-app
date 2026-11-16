import { NavLink, Route, Routes } from 'react-router-dom';
import { TodayPage } from './pages/Today';
import { FoodPage } from './pages/Food';
import { WorkoutsPage } from './pages/Workouts';
import { ProgressPage } from './pages/Progress';
import { SettingsPage } from './pages/Settings';
import { LabPage } from './pages/Lab';

const TABS = [
  { to: '/', label: 'Today', icon: '◉' },
  { to: '/food', label: 'Food', icon: '◐' },
  { to: '/workouts', label: 'Workouts', icon: '▲' },
  { to: '/progress', label: 'Progress', icon: '↗' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
];

export function App() {
  return (
    <div className="app">
      <main className="content">
        <Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/food" element={<FoodPage />} />
          <Route path="/workouts" element={<WorkoutsPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/lab" element={<LabPage />} />
        </Routes>
      </main>
      <nav className="tabbar" aria-label="Main">
        {TABS.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === '/'} className="tab">
            <span className="tab-icon" aria-hidden>{t.icon}</span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
