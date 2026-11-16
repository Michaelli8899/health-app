# Health App — Product Requirements Document

**Status:** Draft v0.1 · **Date:** 2026-11-16 · **Owner:** repo owner (single user)

---

## 1. Summary

A personal, private health companion for iPhone that makes it fast to **log daily food intake**, **plan and log exercise**, and **see progress toward goals**. It ships first as an installable **Progressive Web App (PWA)**: you open it in Safari and tap *Add to Home Screen*, with no Mac, App Store or fees needed. The business logic is written as a portable TypeScript core so the app can later be wrapped as an **Expo (React Native)** app with Apple Health (HealthKit) sync.

## 2. Goals and non-goals

### Goals
1. Log a meal in **under 15 seconds** for a food I've eaten before, and under 45 seconds for a new one.
2. Know at a glance how I'm doing **today**: calories, protein/carbs/fat, water, and exercise against targets.
3. Get a **sensible weekly workout plan** that fits my goal, schedule and equipment, then log sessions set by set.
4. See **trends** (weight, calories, workout volume) over weeks and months.
5. Keep all data **on my device**, usable offline, with a one-tap backup.

### Non-goals (for now)
- Medical advice, diagnosis, or clinical use. The app shows estimates, not prescriptions.
- App Store publishing, multiple users, social features, coaching marketplace.
- Cloud accounts or sync between devices (export/import covers backup).
- Apple Health sync in the PWA, because iOS doesn't let web apps use HealthKit. That comes in Phase 3 (Expo).

## 3. User and context

- **User:** me, on an iPhone, logging at home, at work and in the gym (sometimes with a weak signal).
- **Typical moments:** after a meal (quick log), at the gym (follow today's plan, log sets, rest timer), in the evening (review the day), weekly (weigh in, review trends).

## 4. Feature requirements

Priority: **P0** = MVP must-have · **P1** = next release · **P2** = later.

### 4.1 Profile and targets — P0
| ID | Requirement |
|----|-------------|
| PR-1 | Onboarding collects age, sex, height, current weight, activity level, goal (lose / maintain / gain) and rate (e.g. −0.5 kg/week). |
| PR-2 | Compute BMR with **Mifflin–St Jeor**, then TDEE = BMR × activity factor, then a calorie target adjusted for the goal (with a safety floor, e.g. ≥1,200 kcal for women and ≥1,500 for men, plus a warning). |
| PR-3 | Default macro split (protein 1.6–2.2 g/kg body weight, fat 25–30% of kcal, carbs the remainder). Every target can be overridden manually. |
| PR-4 | Units: metric or imperial (kg/lb, cm/ft-in, ml/fl oz), switchable at any time. Data is stored in metric. |
| PR-5 | Water target (default 35 ml/kg, editable). |

### 4.2 Food logging — P0 (barcode and online search P1)
| ID | Requirement | Pri |
|----|-------------|-----|
| FD-1 | Day view with meals (Breakfast, Lunch, Dinner, Snacks), plus totals and remaining amounts against targets. Move between days with a swipe or a date picker. | P0 |
| FD-2 | **Search a bundled offline food database** (a curated USDA FoodData Central subset, ~2–3k common generic foods, CC0). | P0 |
| FD-3 | **Recent, Frequent and Favorite foods** appear first on the add screen, with one tap to re-log the same portion. | P0 |
| FD-4 | Portion entry by serving, grams, or household measure (cup, tbsp, piece) when the data provides it. Shows live kcal/macros as you type. | P0 |
| FD-5 | **Custom foods**: name, serving, kcal, protein, carbs and fat; fiber, sugar and sodium are optional. | P0 |
| FD-6 | **Quick add** of calories only (with optional macros) for when I just know the number. | P0 |
| FD-7 | Copy a meal or a whole day to another day. Edit and delete entries. | P0 |
| FD-8 | **Barcode scan** with the phone camera, then look the product up in **Open Food Facts** and cache it locally. If it's not found, open a prefilled custom-food form. | P1 |
| FD-9 | **Online search** of USDA FoodData Central (branded and generic) when the offline DB has no match. | P1 |
| FD-10 | **Saved meals and recipes**: group foods, set servings per recipe, then log them as one item. | P1 |
| FD-11 | Photo-based logging with AI estimation (needs a small backend for the API key). | P2 |

### 4.3 Water — P0
| ID | Requirement |
|----|-------------|
| WA-1 | One-tap add buttons (e.g. +250 ml, +500 ml, custom), progress ring against the target, undo. |

### 4.4 Exercise planning — P0
| ID | Requirement |
|----|-------------|
| EX-1 | **Exercise library**: browse and search ~870 exercises from *free-exercise-db*, filtered by muscle, equipment, level and category. Each has instructions and images. |
| EX-2 | **Plan generator**: inputs are goal (strength / muscle / fat loss / general fitness), days per week (2–6), session length, available equipment (none / dumbbells / home gym / full gym) and experience. Output is a weekly split: Full-body for 2–3 days, Upper/Lower for 4, Push/Pull/Legs for 5–6. Each day gets exercises, sets, rep ranges and rest times, chosen from the library to match the equipment. |
| EX-3 | Edit the plan: swap an exercise (suggestions target the same muscle with available equipment), reorder, change sets and reps, add or remove exercises. |
| EX-4 | Custom exercises can be added. |
| EX-5 | Save several plans and mark one as active. |

### 4.5 Workout logging — P0
| ID | Requirement |
|----|-------------|
| WL-1 | "Start today's workout" from the active plan, or start an empty session. |
| WL-2 | Per-set logging of weight and reps (or time and distance), prefilled from the previous session. Check off each set. |
| WL-3 | **Rest timer** starts automatically after a set, with a vibration or sound when done if the browser allows. |
| WL-4 | **Progression hint** using double progression: when every set hits the top of the rep range, suggest increasing the weight next time. |
| WL-5 | **Cardio and activity log**: pick an activity, enter a duration, and get estimated calories burned from **MET × kg × hours**, with MET values from the 2024 Adult Compendium of Physical Activities. |
| WL-6 | History: past sessions, plus per-exercise history with best set and estimated 1RM (Epley formula). |
| WL-7 | Setting: whether exercise calories are added back to the daily food budget (off by default). |

### 4.6 Dashboard and progress — P0 (some P1)
| ID | Requirement | Pri |
|----|-------------|-----|
| DB-1 | **Today** screen: calorie ring (eaten / target / remaining), macro bars, water ring, today's planned workout card, quick-add buttons. | P0 |
| DB-2 | **Weight log** with a trend line (7-day moving average) and the goal line. | P0 |
| DB-3 | Weekly charts: average calories against target, macro adherence, workouts completed, training volume. | P1 |
| DB-4 | Logging streaks. | P1 |
| DB-5 | Body measurements (waist, etc.) and progress photos stored locally. | P2 |

### 4.7 Data, privacy and settings — P0
| ID | Requirement |
|----|-------------|
| DA-1 | All data is stored locally in IndexedDB. No account, no analytics, no tracking. |
| DA-2 | **Export / import** all data as JSON (and food log as CSV). Show a reminder if no backup has been made in 14 days. |
| DA-3 | Request persistent storage (`navigator.storage.persist()`). Show storage status in Settings. |
| DA-4 | Network calls only go to Open Food Facts (barcode) and USDA (search), and contain only the barcode or search text. |
| DA-5 | Disclaimer screen: estimates only, not medical advice; consult a professional for medical conditions or eating disorders. |

### 4.8 Reminders — P2
Meal, water and weigh-in reminders. iOS supports Web Push for home-screen PWAs (iOS 16.4+), but it needs a push server, so this is deferred to Expo (local notifications) unless needed sooner.

## 5. UX principles
- **Thumb-first:** bottom tab bar (Today · Food · Workouts · Progress · Settings), large tap targets, primary actions in reach.
- Feels native on iOS: safe-area insets, light and dark mode, no zoom on input focus, standalone display mode.
- Logging is never more than 2 taps from the Today screen.
- Works fully offline. Online-only features (barcode lookup, USDA search) fail gracefully.

## 6. Technical approach

### 6.1 Architecture

```
health-app/
├─ packages/core/        # Pure TypeScript, no DOM: models, calculations, plan generator,
│                        # progression, MET calories, unit conversion. Unit-tested. Reused by Expo later.
├─ apps/web/             # PWA: Vite + React + TypeScript UI
│   ├─ data/             # Repository layer over Dexie (IndexedDB)
│   └─ public/datasets/  # Bundled foods + exercises JSON
└─ scripts/              # Build-time dataset trimming (USDA → foods.json, free-exercise-db → exercises.json)
```

The **repository interface** (e.g. `FoodLogRepo.add/listByDate`) is defined in `core`. The web app implements it with Dexie, and Expo will later implement it with expo-sqlite + Drizzle. UI components are rewritten for React Native, but state, logic and data shape carry over.

### 6.2 Stack choices (open source adopted, not written from scratch)

| Need | Choice (PWA) | License | Later on Expo | Why |
|------|--------------|---------|---------------|-----|
| UI framework | React + TypeScript + Vite | MIT | React Native / Expo | Same mental model and hooks when porting |
| PWA / offline | `vite-plugin-pwa` (Workbox) | MIT | n/a | Manifest + service worker + precache with little config |
| Local DB | **Dexie.js** (IndexedDB) | Apache-2.0 | `expo-sqlite` + **Drizzle ORM** | Mature; `useLiveQuery` gives reactive UI |
| Charts | Recharts | MIT | react-native-gifted-charts | Simple API, enough for rings, bars and lines |
| Barcode scanning | `barcode-detector` polyfill (ZXing-wasm), or `@zxing/browser` | MIT / Apache-2.0 | `expo-camera` (built-in scanning) | iOS Safari has no native `BarcodeDetector`. To be confirmed with a spike on a real iPhone |
| Routing | React Router | MIT | Expo Router | |
| Validation | Zod | MIT | Zod | Shared schemas for import/export and API parsing |
| Tests | Vitest + Playwright | MIT / Apache-2.0 | Jest | Core logic unit tests, plus mobile-viewport e2e |
| Apple Health | n/a | n/a | `@kingstinct/react-native-healthkit` | MIT; Expo config plugin; needs a dev build, not Expo Go |

### 6.3 Data sources

| Data | Source | License / terms | Use |
|------|--------|-----------------|-----|
| Exercises (876, with images & instructions) | [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) | Unlicense (public domain) | Bundle `exercises.json`. Images are served from the repo's GitHub Pages/jsDelivr, or self-hosted and lazily cached |
| Generic foods | [USDA FoodData Central](https://fdc.nal.usda.gov/api-guide) (Foundation + SR Legacy) | CC0. Attribution requested | A trimmed subset bundled offline, plus online API search (free api.data.gov key; ~1,000 req/hr) |
| Packaged foods / barcodes | [Open Food Facts API v2](https://world.openfoodfacts.org/data) | ODbL (data); attribution + share-alike on the database | Lookup by barcode, cached on device. Send a descriptive User-Agent. Show "Data from Open Food Facts" |
| Activity MET values | [2024 Adult Compendium of Physical Activities](https://pacompendium.com) | Published research tables (cited) | A curated list of ~50 common activities with MET values and a citation |

Verified in this session: free-exercise-db currently returns 876 exercises (equipment mix: barbell 170, dumbbell 123, body only 111, cable 81, kettlebells 56, …), and the OFF v2 endpoint returns per-100 g kcal and macros without an API key.

### 6.4 Open-source apps reviewed (for ideas and patterns)

| Project | Stack | License | What we take | Can we copy code? |
|---------|-------|---------|--------------|-------------------|
| [OpenNutriTracker](https://github.com/simonoppowa/OpenNutriTracker) | Flutter (iOS/Android) | GPL-3.0 | Privacy-first, local-only design; OFF + USDA combined search; meal-based diary UX | **No.** GPL would force our app to be GPL. Ideas only |
| [Waistline](https://github.com/davidhealey/waistline) | Cordova + Framework7 | GPL-3.0 | Diary/meal structure, recipes, OFF/USDA integration, weight tracking | **No.** Ideas only |
| [workout.cool](https://github.com/Snouzy/workout-cool) | Next.js | MIT | Exercise-picker and workout-builder UX, muscle/equipment filters | **Yes**, with attribution |
| [Liftosaur](https://github.com/astashov/liftosaur) | PWA (Preact) | AGPL-3.0 | Proof that a PWA gym logger works well on iPhone; progression concepts | **No.** Ideas only |
| [wger](https://github.com/wger-project/wger) | Django + Flutter | AGPL-3.0 (code), CC-BY-SA (data) | Data model for plans, sessions and nutrition; REST API design | **No** (AGPL). Its exercise data is share-alike, so we prefer free-exercise-db |

**Licensing rule for this repo:** only adopt code or data under permissive licenses (MIT, Apache-2.0, BSD, Unlicense, CC0). Copyleft projects (GPL/AGPL/CC-BY-SA) are references for ideas only. ODbL data from Open Food Facts is fetched at runtime and cached per user (not redistributed as a merged database), with attribution shown.

### 6.5 Data model (core, metric units)

```
Profile        { sex, birthDate, heightCm, activityLevel, goal, goalRateKgPerWeek, units, targets{kcal,proteinG,carbsG,fatG,waterMl}, targetsOverridden }
Food           { id, source: 'usda'|'off'|'custom', sourceId?, barcode?, name, brand?, per100g{kcal,protein,carbs,fat,fiber?,sugar?,sodiumMg?}, servings[{label, grams}] , favorite }
FoodLogEntry   { id, date(YYYY-MM-DD), meal, foodId | quick{kcal,protein?,carbs?,fat?}, grams, servingLabel?, snapshot{name,kcal,protein,carbs,fat}, createdAt }
SavedMeal      { id, name, items[{foodId, grams}], servings }                     (P1)
WaterEntry     { id, date, ml, createdAt }
WeightEntry    { id, date, kg }
Exercise       { id, source:'fedb'|'custom', name, primaryMuscles[], secondaryMuscles[], equipment, level, category, mechanic, instructions[], images[] }
WorkoutPlan    { id, name, active, goal, days[{ name, exercises[{exerciseId, sets, repMin, repMax, restSec}] }] }
WorkoutSession { id, planId?, planDayIndex?, date, startedAt, endedAt, notes, exercises[{exerciseId, sets[{weightKg?, reps?, durationSec?, distanceM?, done}]}] }
ActivityLog    { id, date, activityCode, met, minutes, kcal }
```

`FoodLogEntry.snapshot` keeps nutrition values frozen at log time, so editing a food later doesn't rewrite history.

### 6.6 Key algorithms (in `core`, unit-tested)
- **BMR (Mifflin–St Jeor):** `10·kg + 6.25·cm − 5·age + s`, where s = +5 for male and −161 for female.
- **TDEE:** BMR × {1.2, 1.375, 1.55, 1.725, 1.9}. **Goal adjustment:** ±(rate kg/week × 7,700 kcal / 7) per day, clamped to the safety floor.
- **Activity calories:** `MET × kg × hours` (gross). Optionally subtract resting (1 MET) to avoid double-counting.
- **e1RM (Epley):** `w × (1 + reps/30)`.
- **Plan generator:** template by days per week, then movement-pattern slots (squat, hinge, horizontal push/pull, vertical push/pull, lunge, core, accessories), each filled from the library filtered by equipment and level. Prefer compound lifts first. Set and rep schemes depend on goal (strength 3–6 reps, hypertrophy 6–12, fat loss/general 10–15 + conditioning). The generator is deterministic for a given seed, so the plan can be regenerated or swapped.

### 6.7 iOS PWA constraints and mitigations
| Constraint | Mitigation |
|------------|------------|
| Safari can evict storage for sites not used for a while | Installed home-screen apps are treated better. Also call `storage.persist()` and nag about backups (DA-2) |
| No HealthKit access | Phase 3 Expo app |
| Camera access in standalone mode can need a re-prompt | Handle permission errors and offer manual barcode entry |
| HTTPS required to install and use the camera | Host on GitHub Pages, Cloudflare Pages or Netlify (all free) |
| Push needs a server | Defer reminders (§4.8) |

## 7. Release plan

| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| **0. Foundations** | Monorepo, `core` package with calculations and tests, dataset build scripts, PWA shell installable on iPhone, CI (lint + tests) | App installs to the home screen and opens offline |
| **1. MVP (P0)** | Profile/targets, food log (offline DB, recent/favorites, custom, quick add, copy), water, exercise library, plan generator & editor, workout logging with rest timer, activity log, Today dashboard, weight trend, export/import | I can use it daily for a week without falling back to another app |
| **2. Enhancements (P1)** | Barcode scan + OFF, USDA online search, saved meals/recipes, weekly charts, streaks, CSV export | Logging a packaged food by barcode takes under 10 s |
| **3. Native (Expo)** | Port UI to Expo; `core` reused; SQLite + Drizzle; **HealthKit** (read steps, active energy and workouts; write dietary energy, macros, water and weight); local notifications; import the PWA's JSON backup | Runs on my iPhone through an Xcode dev build or TestFlight |
| **4. Later (P2)** | AI photo logging, measurements & progress photos, home-screen widgets, optional cloud sync | n/a |

## 8. Success metrics (personal)
- Food logged on ≥ 6 of 7 days for 4 consecutive weeks.
- Median time to log a repeat food ≤ 15 s.
- ≥ 80% of planned workouts logged.
- Zero data-loss incidents (backups work and restore correctly).

## 9. Risks
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Barcode scanning in iOS Safari is unreliable | Slower logging | Spike early in Phase 2. Keep manual barcode entry and search as fallbacks |
| Gaps in the bundled food DB (e.g. regional or restaurant foods) | Friction | Online USDA/OFF search, custom foods, quick add |
| IndexedDB data loss on iOS | High | Persistent storage, backup reminders, JSON export |
| Calorie estimates misread as medical advice | Health risk | Disclaimer, safety floors, no extreme-deficit targets |
| Licensing contamination from copyleft projects | Legal | §6.4 rule: permissive sources only |

## 10. Open questions
1. **Default units:** imperial (lb, ft-in) or metric?
2. **Hosting:** is this GitHub repo public (GitHub Pages is free) or private (then Cloudflare Pages or Netlify, both free)?
3. **Exercise calories:** add them back to the food budget by default or not? (Proposed: off.)
4. Any dietary focus to support early: fiber, sugar, sodium, specific diets (keto, vegetarian), or intermittent-fasting windows?
5. Is a USDA API key OK to embed in a personal, client-side app? It's free and rate-limited per key. Alternatively, ship only the offline subset in the MVP.

---

### Appendix: research sources
- free-exercise-db (Unlicense, 876 exercises verified): https://github.com/yuhonas/free-exercise-db
- USDA FoodData Central API guide (CC0, rate limits): https://fdc.nal.usda.gov/api-guide
- Open Food Facts data and license (ODbL): https://world.openfoodfacts.org/data · API conditions: https://forum.openfoodfacts.org/t/conditions-to-use-the-open-food-facts-api/443
- 2024 Adult Compendium of Physical Activities: https://pubmed.ncbi.nlm.nih.gov/38242596/ · https://pacompendium.com
- OpenNutriTracker (GPL-3.0): https://github.com/simonoppowa/OpenNutriTracker
- Waistline (GPL-3.0): https://github.com/davidhealey/waistline
- workout.cool (MIT): https://github.com/Snouzy/workout-cool
- Liftosaur (AGPL-3.0): https://github.com/astashov/liftosaur
- wger (AGPL-3.0; data CC-BY-SA): https://wger.readthedocs.io/en/stable/
- react-native-healthkit (MIT), Expo dev-build requirement: https://cdn.jsdelivr.net/npm/@kingstinct/react-native-healthkit@14.0.1/README.md
- Apple Developer Program free vs paid (7-day free provisioning, EAS needs paid): https://expo.dev/blog/apple-developer-program-explained-free-vs-paid
- Expo barcode scanning via expo-camera; Drizzle + expo-sqlite: https://docs.expo.dev/versions/v51.0.0/sdk/bar-code-scanner · https://www.dbpro.app/blog/expo-sqlite
- RN chart library comparison: https://www.pkgpulse.com/guides/victory-native-vs-react-native-chart-kit-vs-echarts-rn-2026
