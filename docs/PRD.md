# Health App — Product Requirements Document

**Status:** Draft v0.2 (photo-based logging replaces barcodes) · **Date:** 2026-11-16 · **Owner:** repo owner (single user)

---

## 1. Summary

A personal, private health companion for iPhone that makes it fast to **log daily food intake by taking a photo** (AI identifies the foods, estimates portion sizes, calories and other nutrition and health factors, and you confirm), **plan and log exercise**, and **see progress toward goals**. It ships first as an installable **Progressive Web App (PWA)**: you open it in Safari and tap *Add to Home Screen*, with no Mac, App Store or fees needed. The business logic is written as a portable TypeScript core so the app can later be wrapped as an **Expo (React Native)** app with Apple Health (HealthKit) sync.

## 2. Goals and non-goals

### Goals
1. Log a meal **from a photo in under 30 seconds** including review, and a food I've eaten before in under 15 seconds.
2. Know at a glance how I'm doing **today**: calories, protein/carbs/fat, water, and exercise against targets.
3. Get a **sensible weekly workout plan** that fits my goal, schedule and equipment, then log sessions set by set.
4. See **trends** (weight, calories, workout volume) over weeks and months.
5. Keep all data **on my device**, usable offline, with a one-tap backup.

### Non-goals (for now)
- Medical advice, diagnosis, or clinical use. The app shows estimates, not prescriptions.
- App Store publishing, multiple users, social features, coaching marketplace.
- Cloud accounts or sync between devices (export/import covers backup).
- Barcode scanning (dropped in favour of photo recognition).
- Clinical-grade accuracy from photos. AI estimates carry a stated range and are always user-confirmed.
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

### 4.2 Food logging — P0 (online search and recipes P1)
| ID | Requirement | Pri |
|----|-------------|-----|
| FD-1 | Day view with meals (Breakfast, Lunch, Dinner, Snacks), plus totals and remaining amounts against targets. Move between days with a swipe or a date picker. | P0 |
| FD-2 | **Search a bundled offline food database** (a curated USDA FoodData Central subset, ~2–3k common generic foods, CC0). | P0 |
| FD-3 | **Recent, Frequent and Favorite foods** appear first on the add screen, with one tap to re-log the same portion. | P0 |
| FD-4 | Portion entry by serving, grams, or household measure (cup, tbsp, piece) when the data provides it. Shows live kcal/macros as you type. | P0 |
| FD-5 | **Custom foods**: name, serving, kcal, protein, carbs and fat; fiber, sugar and sodium are optional. | P0 |
| FD-6 | **Quick add** of calories only (with optional macros) for when I just know the number. | P0 |
| FD-7 | Copy a meal or a whole day to another day. Edit and delete entries. | P0 |
| FD-8 | **Online search** of USDA FoodData Central (branded and generic) when the offline DB has no match. | P1 |
| FD-9 | **Saved meals and recipes**: group foods, set servings per recipe, then log them as one item. | P1 |

### 4.3 Photo-based food recognition — P0
The headline feature. Take a photo of a meal; the app identifies each food, estimates its portion, and fills in calories, macros and health factors for you to confirm.

| ID | Requirement | Pri |
|----|-------------|-----|
| PH-1 | **Capture:** "Snap meal" button on Today and Food screens opens the camera (or photo library). Optional text hint ("half-eaten, cooked in olive oil"). | P0 |
| PH-2 | **Recognition:** identify every distinct food item on the plate (multi-item meals, mixed dishes, drinks, sauces), with preparation method (grilled, fried, raw…). | P0 |
| PH-3 | **Portion estimate:** grams per item as a best estimate **plus a low–high range**, with a one-line reason ("≈ palm-sized chicken breast, ~2 cm thick"). Uses visual references: plate size (user sets their usual plate diameter in Settings), utensils, hands, packaging. | P0 |
| PH-4 | **Nutrition:** kcal, protein, carbs, fat, fiber, sugar, saturated fat, sodium per item and per meal. Values are **grounded in the USDA database** where an item matches (grams × per-100 g values); the model's own estimate is the fallback and is labelled as such. | P0 |
| PH-5 | **Health factors** per meal: estimated processing level (NOVA 1–4), vegetable/fruit servings, added-sugar flag, high-sodium flag, whole-grain flag, likely allergens (gluten, dairy, nuts, egg, soy, shellfish), and "hidden calories" warnings (oil, butter, dressing, sugary drinks). | P0 |
| PH-6 | **Clarifying questions** when it matters (e.g. "Was this fried?", "Regular or diet soda?"). Answers are one tap and update the estimate. | P0 |
| PH-7 | **Review screen before saving:** each item has a grams slider bounded by its range, swap the matched food, remove or add items, change meal. Nothing is logged without confirmation. | P0 |
| PH-8 | Photo thumbnail stored locally with the log entry (full photo is not kept unless the user opts in). | P0 |
| PH-9 | **Offline:** photo is queued and analysed when back online; meanwhile the user can log manually. | P0 |
| PH-10 | **Better portions:** optional second angle (top-down + 45°), and before/after photos to subtract leftovers. | P1 |
| PH-11 | **Personal calibration:** track AI grams vs user-corrected grams and show/correct systematic bias (e.g. "you usually adjust rice up 20%"). | P1 |
| PH-12 | Re-log from photo history ("same as Tuesday's lunch"). | P1 |
| PH-13 | On-device food classifier (Food-101 ViT via Transformers.js) to suggest dish names offline. | P2 |

### 4.4 Water — P0
| ID | Requirement |
|----|-------------|
| WA-1 | One-tap add buttons (e.g. +250 ml, +500 ml, custom), progress ring against the target, undo. |

### 4.5 Exercise planning — P0
| ID | Requirement |
|----|-------------|
| EX-1 | **Exercise library**: browse and search ~870 exercises from *free-exercise-db*, filtered by muscle, equipment, level and category. Each has instructions and images. |
| EX-2 | **Plan generator**: inputs are goal (strength / muscle / fat loss / general fitness), days per week (2–6), session length, available equipment (none / dumbbells / home gym / full gym) and experience. Output is a weekly split: Full-body for 2–3 days, Upper/Lower for 4, Push/Pull/Legs for 5–6. Each day gets exercises, sets, rep ranges and rest times, chosen from the library to match the equipment. |
| EX-3 | Edit the plan: swap an exercise (suggestions target the same muscle with available equipment), reorder, change sets and reps, add or remove exercises. |
| EX-4 | Custom exercises can be added. |
| EX-5 | Save several plans and mark one as active. |

### 4.6 Workout logging — P0
| ID | Requirement |
|----|-------------|
| WL-1 | "Start today's workout" from the active plan, or start an empty session. |
| WL-2 | Per-set logging of weight and reps (or time and distance), prefilled from the previous session. Check off each set. |
| WL-3 | **Rest timer** starts automatically after a set, with a vibration or sound when done if the browser allows. |
| WL-4 | **Progression hint** using double progression: when every set hits the top of the rep range, suggest increasing the weight next time. |
| WL-5 | **Cardio and activity log**: pick an activity, enter a duration, and get estimated calories burned from **MET × kg × hours**, with MET values from the 2024 Adult Compendium of Physical Activities. |
| WL-6 | History: past sessions, plus per-exercise history with best set and estimated 1RM (Epley formula). |
| WL-7 | Setting: whether exercise calories are added back to the daily food budget (off by default). |

### 4.7 Dashboard and progress — P0 (some P1)
| ID | Requirement | Pri |
|----|-------------|-----|
| DB-1 | **Today** screen: calorie ring (eaten / target / remaining), macro bars, water ring, today's planned workout card, "Snap meal" and quick-add buttons. | P0 |
| DB-1b | **Daily health summary** from logged meals: fiber, sugar, saturated fat and sodium against guideline limits; vegetable/fruit servings; share of calories from ultra-processed foods (NOVA 4). | P0 |
| DB-2 | **Weight log** with a trend line (7-day moving average) and the goal line. | P0 |
| DB-3 | Weekly charts: average calories against target, macro adherence, workouts completed, training volume. | P1 |
| DB-4 | Logging streaks. | P1 |
| DB-5 | Body measurements (waist, etc.) and progress photos stored locally. | P2 |

### 4.8 Data, privacy and settings — P0
| ID | Requirement |
|----|-------------|
| DA-1 | All data is stored locally in IndexedDB. No account, no analytics, no tracking. The only server is a tiny proxy that forwards photos for analysis and stores nothing. |
| DA-2 | **Export / import** all data as JSON (and food log as CSV). Show a reminder if no backup has been made in 14 days. |
| DA-3 | Request persistent storage (`navigator.storage.persist()`). Show storage status in Settings. |
| DA-4 | Network calls: meal photos (resized, EXIF/GPS stripped) and optional hint text go through the proxy to the Claude API; USDA search sends only search text. The app explains this on first use of the camera. |
| DA-5 | Disclaimer screen: estimates only, not medical advice; consult a professional for medical conditions or eating disorders. |

### 4.9 Reminders — P2
Meal, water and weigh-in reminders. iOS supports Web Push for home-screen PWAs (iOS 16.4+), but it needs a push server, so this is deferred to Expo (local notifications) unless needed sooner.

## 5. UX principles
- **Thumb-first:** bottom tab bar (Today · Food · Workouts · Progress · Settings), large tap targets, primary actions in reach.
- Feels native on iOS: safe-area insets, light and dark mode, no zoom on input focus, standalone display mode.
- Logging is never more than 2 taps from the Today screen.
- Works fully offline. Online-only features (photo analysis, USDA search) fail gracefully and queue where possible.
- AI results are shown as **estimates with ranges**, editable before saving, never silently logged.

## 6. Technical approach

### 6.1 Architecture

```
health-app/
├─ packages/core/        # Pure TypeScript, no DOM: models, calculations, plan generator,
│                        # progression, MET calories, unit conversion. Unit-tested. Reused by Expo later.
├─ apps/web/             # PWA: Vite + React + TypeScript UI
├─ apps/proxy/           # Cloudflare Worker: holds the Claude API key, forwards meal photos, stores nothing
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
| Photo capture | `<input type="file" accept="image/*" capture="environment">` | n/a | `expo-image-picker` / `expo-camera` | Most reliable camera path in iOS standalone PWAs |
| Image resize / EXIF strip | `browser-image-compression` (or canvas re-encode) | MIT | `expo-image-manipulator` | Cuts upload size and cost; removes GPS metadata |
| Food recognition + portions | **Claude API (vision)** via `@anthropic-ai/sdk` in the proxy | Commercial API | same proxy | See §6.7 |
| Food-name matching | MiniSearch (fuzzy full-text) | MIT | MiniSearch | Maps AI item names to USDA foods offline |
| Proxy hosting | Cloudflare Workers (free tier) | n/a | same | Keeps the API key off the phone; per-device token + rate limit |
| Routing | React Router | MIT | Expo Router | |
| Validation | Zod | MIT | Zod | Shared schemas for import/export and API parsing |
| Tests | Vitest + Playwright | MIT / Apache-2.0 | Jest | Core logic unit tests, plus mobile-viewport e2e |
| Apple Health | n/a | n/a | `@kingstinct/react-native-healthkit` | MIT; Expo config plugin; needs a dev build, not Expo Go |

### 6.3 Data sources

| Data | Source | License / terms | Use |
|------|--------|-----------------|-----|
| Exercises (876, with images & instructions) | [yuhonas/free-exercise-db](https://github.com/yuhonas/free-exercise-db) | Unlicense (public domain) | Bundle `exercises.json`. Images are served from the repo's GitHub Pages/jsDelivr, or self-hosted and lazily cached |
| Generic foods | [USDA FoodData Central](https://fdc.nal.usda.gov/api-guide) (Foundation + SR Legacy) | CC0. Attribution requested | A trimmed subset bundled offline, plus online API search (free api.data.gov key; ~1,000 req/hr) |
| Activity MET values | [2024 Adult Compendium of Physical Activities](https://pacompendium.com) | Published research tables (cited) | A curated list of ~50 common activities with MET values and a citation |

Verified in this session: free-exercise-db currently returns 876 exercises (equipment mix: barbell 170, dumbbell 123, body only 111, cable 81, kettlebells 56, …).

Open Food Facts (packaged products, ODbL) was dropped along with barcode scanning; it can be added later as an online text-search source.

### 6.4 Open-source apps reviewed (for ideas and patterns)

| Project | Stack | License | What we take | Can we copy code? |
|---------|-------|---------|--------------|-------------------|
| [OpenNutriTracker](https://github.com/simonoppowa/OpenNutriTracker) | Flutter (iOS/Android) | GPL-3.0 | Privacy-first, local-only design; OFF + USDA combined search; meal-based diary UX | **No.** GPL would force our app to be GPL. Ideas only |
| [Waistline](https://github.com/davidhealey/waistline) | Cordova + Framework7 | GPL-3.0 | Diary/meal structure, recipes, OFF/USDA integration, weight tracking | **No.** Ideas only |
| [workout.cool](https://github.com/Snouzy/workout-cool) | Next.js | MIT | Exercise-picker and workout-builder UX, muscle/equipment filters | **Yes**, with attribution |
| [Liftosaur](https://github.com/astashov/liftosaur) | PWA (Preact) | AGPL-3.0 | Proof that a PWA gym logger works well on iPhone; progression concepts | **No.** Ideas only |
| [wger](https://github.com/wger-project/wger) | Django + Flutter | AGPL-3.0 (code), CC-BY-SA (data) | Data model for plans, sessions and nutrition; REST API design | **No** (AGPL). Its exercise data is share-alike, so we prefer free-exercise-db |

**Licensing rule for this repo:** only adopt code or data under permissive licenses (MIT, Apache-2.0, BSD, Unlicense, CC0). Copyleft projects (GPL/AGPL/CC-BY-SA) are references for ideas only.

### 6.5 Data model (core, metric units)

```
Profile        { sex, birthDate, heightCm, activityLevel, goal, goalRateKgPerWeek, units, targets{kcal,proteinG,carbsG,fatG,waterMl}, targetsOverridden }
Food           { id, source: 'usda'|'ai'|'custom', sourceId?, name, brand?, per100g{kcal,protein,carbs,fat,fiber?,sugar?,sodiumMg?}, servings[{label, grams}] , favorite }
FoodLogEntry   { id, date(YYYY-MM-DD), meal, foodId | quick{kcal,protein?,carbs?,fat?}, grams, servingLabel?, snapshot{name,kcal,protein,carbs,fat,fiber,sugar,satFat,sodiumMg}, photoAnalysisId?, createdAt }
PhotoAnalysis  { id, takenAt, thumbnail(blob), hint?, status:'queued'|'done'|'failed', model, result(AI JSON), corrections[{item, aiGrams, userGrams}], healthFlags{nova, vegServings, addedSugar, highSodium, wholeGrain, allergens[]} }
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

### 6.7 Photo recognition pipeline

```
iPhone PWA                         Cloudflare Worker (proxy)          Claude API
──────────                         ─────────────────────────          ──────────
1 capture photo (+ hint)
2 resize ≤1568 px, JPEG ~0.8,
  strip EXIF  ──── POST /analyze ──▶ 3 check device token + rate limit
                                     4 messages.create(image + prompt,
                                       structured output schema) ──────▶ 5 identify items,
                                                                          portions, ranges,
                                     ◀────────────── JSON ────────────── nutrients, flags
6 ◀──── JSON (nothing stored) ─────
7 match each item → USDA food (MiniSearch), recompute nutrients = grams × per-100 g
8 review screen (sliders within range, swap, questions) → save log entries
```

**Why a vision LLM, not a classic image-recognition model:** open models trained on Food-101 only output one dish label per photo (about 89% top-1 on 101 classes) and cannot estimate portion size. Academic portion estimation (e.g. Google's Nutrition5k) relies on depth cameras and isn't packaged as a library. A vision LLM handles multi-item plates, mixed dishes, preparation method, portion reasoning from visual cues, and health flags in one call.

**Expected accuracy (set expectations honestly):** a 2025 peer-reviewed study found GPT-4o and Claude 3.5 Sonnet had about **36% mean absolute percentage error** for both portion weight and energy, which the authors note is comparable to traditional self-reported food diaries. Error was larger for big portions, and some foods were misidentified. Current models are likely better, but this is unverified, so the design compensates: ranges instead of single numbers, a reference plate size, a second angle (P1), clarifying questions, USDA grounding, mandatory review, and personal calibration (P1).

**Model call (in the proxy, TypeScript SDK):**
- Model: `claude-opus-5-5` (default), adaptive thinking, `effort: "medium"`; set explicitly because Opus 5.5's default is medium and we may raise it if evaluation shows gains.
- **Structured output** (`output_config.format` with a JSON schema) so the app always gets parseable JSON:
  `items[] { name, usda_query, preparation, grams, grams_low, grams_high, portion_reason, confidence (0–1), kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sat_fat_g, sodium_mg, nova (1–4), allergens[] }`, plus `meal { veg_fruit_servings, added_sugar, high_sodium, whole_grain, hidden_calorie_notes[], questions[{ id, text, options[] }] }`.
- Stable system prompt (portion-estimation guidance, reference sizes, schema rules) is cached with prompt caching; only the image and hint vary.
- Handle `stop_reason: "refusal"` and enable server-side refusal fallbacks (`fallbacks: "default"` with the `server-side-fallback-2026-07-01` beta).
- Answers to clarifying questions are sent as a short follow-up turn on the same conversation, so the image isn't re-analysed from scratch.

**Cost estimate:** a resized photo is roughly 1,600 image tokens. With the cached prompt, plus about 1,000–2,000 output and thinking tokens at $4 / $20 per million tokens, that is about **$0.03–0.05 per photo**, or **~$3–5/month** at 3 photos a day. Cheaper models (Claude Sonnet 5.5, Claude Haiku 5.5) can be swapped in with one setting if their accuracy holds up on the evaluation set below; that's a cost/quality call for the owner.

**Evaluation before shipping:** build a set of ~30 of my own meals photographed next to a kitchen-scale weight. Measure portion and kcal error per model/effort setting, re-run on prompt changes.

**Proxy security:** API key lives only in the Worker's secrets. The app authenticates with a per-device token set during setup; the Worker enforces a daily request cap and image-size limit, and does not log or store images.

### 6.8 iOS PWA constraints and mitigations
| Constraint | Mitigation |
|------------|------------|
| Safari can evict storage for sites not used for a while | Installed home-screen apps are treated better. Also call `storage.persist()` and nag about backups (DA-2) |
| No HealthKit access | Phase 3 Expo app |
| Camera access in standalone mode can need a re-prompt | Use the file-input capture path (always available); fall back to photo library |
| HTTPS required to install and use the camera | Host on GitHub Pages, Cloudflare Pages or Netlify (all free) |
| Push needs a server | Defer reminders (§4.8) |

## 7. Release plan

| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| **0. Foundations** | Monorepo, `core` package with calculations and tests, dataset build scripts, PWA shell installable on iPhone, CI (lint + tests), **photo-analysis spike** (proxy + prompt + 30-meal evaluation set) | App installs to the home screen and opens offline; photo estimates measured against scale weights |
| **1. MVP (P0)** | Profile/targets, **photo food logging with review**, daily health summary, food log (offline DB, recent/favorites, custom, quick add, copy), water, exercise library, plan generator & editor, workout logging with rest timer, activity log, Today dashboard, weight trend, export/import | I can use it daily for a week without falling back to another app |
| **2. Enhancements (P1)** | Multi-angle and before/after photos, personal portion calibration, re-log from photo history, USDA online search, saved meals/recipes, weekly charts, streaks, CSV export | Median kcal error on the evaluation set improves vs Phase 1 |
| **3. Native (Expo)** | Port UI to Expo; `core` reused; SQLite + Drizzle; **HealthKit** (read steps, active energy and workouts; write dietary energy, macros, water and weight); local notifications; import the PWA's JSON backup | Runs on my iPhone through an Xcode dev build or TestFlight |
| **4. Later (P2)** | On-device dish classifier, measurements & progress photos, home-screen widgets, optional cloud sync | n/a |

## 8. Success metrics (personal)
- Food logged on ≥ 6 of 7 days for 4 consecutive weeks.
- Median time to log a repeat food ≤ 15 s; photo log incl. review ≤ 30 s.
- Photo estimates: median kcal error ≤ 25% on my evaluation set after user review.
- ≥ 80% of planned workouts logged.
- Zero data-loss incidents (backups work and restore correctly).

## 9. Risks
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Photo portion estimates are off (≈36% error in published studies) | Wrong calorie totals | Ranges, reference plate size, clarifying questions, USDA grounding, mandatory review, calibration; evaluation set to track error |
| API cost or outage | Feature unavailable / spend | Daily cap in proxy, offline queue, manual logging always available |
| Photos are sent to a third-party API | Privacy | Resize + strip EXIF, nothing stored by proxy, clear first-use notice |
| Gaps in the bundled food DB (e.g. regional or restaurant foods) | Friction | Photo logging (AI fallback values), online USDA search, custom foods, quick add |
| IndexedDB data loss on iOS | High | Persistent storage, backup reminders, JSON export |
| Calorie estimates misread as medical advice | Health risk | Disclaimer, safety floors, no extreme-deficit targets |
| Licensing contamination from copyleft projects | Legal | §6.4 rule: permissive sources only |

## 10. Open questions
1. **Default units:** imperial (lb, ft-in) or metric?
2. **Hosting:** is this GitHub repo public (GitHub Pages is free) or private (then Cloudflare Pages or Netlify, both free)?
3. **Exercise calories:** add them back to the food budget by default or not? (Proposed: off.)
4. Any dietary focus to support early: fiber, sugar, sodium, specific diets (keto, vegetarian), or intermittent-fasting windows?
5. USDA online search can also go through the proxy, so no key is embedded in the app. OK?
6. **Claude API account:** do you have an Anthropic API key (console.anthropic.com) and a Cloudflare account for the proxy? Both are needed for photo logging.
7. Usual plate diameter (for portion reference), and is ~$3–5/month in API costs acceptable?

---

### Appendix: research sources
- free-exercise-db (Unlicense, 876 exercises verified): https://github.com/yuhonas/free-exercise-db
- USDA FoodData Central API guide (CC0, rate limits): https://fdc.nal.usda.gov/api-guide
- LLM nutrition estimation from food images (GPT-4o / Claude 3.5 Sonnet ~36% MAPE): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12513282/
- Multimodal model nutrition benchmark: https://arxiv.org/html/2507.07048v1
- Food-101 ViT checkpoints (single-label classification, ~89% top-1): https://huggingface.co/docs/transformers/tasks/image_classification · https://huggingface.co/SCREAMIE/ViT_Food101
- Nutrition5k (depth-based portion dataset): https://arxiv.org/abs/2103.03375
- Nutri-Score (2023 algorithm update; designed for packaged products, so not used for meals): https://en.wikipedia.org/wiki/Nutri-Score
- 2024 Adult Compendium of Physical Activities: https://pubmed.ncbi.nlm.nih.gov/38242596/ · https://pacompendium.com
- OpenNutriTracker (GPL-3.0): https://github.com/simonoppowa/OpenNutriTracker
- Waistline (GPL-3.0): https://github.com/davidhealey/waistline
- workout.cool (MIT): https://github.com/Snouzy/workout-cool
- Liftosaur (AGPL-3.0): https://github.com/astashov/liftosaur
- wger (AGPL-3.0; data CC-BY-SA): https://wger.readthedocs.io/en/stable/
- react-native-healthkit (MIT), Expo dev-build requirement: https://cdn.jsdelivr.net/npm/@kingstinct/react-native-healthkit@14.0.1/README.md
- Apple Developer Program free vs paid (7-day free provisioning, EAS needs paid): https://expo.dev/blog/apple-developer-program-explained-free-vs-paid
- Drizzle + expo-sqlite: https://www.dbpro.app/blog/expo-sqlite
- RN chart library comparison: https://www.pkgpulse.com/guides/victory-native-vs-react-native-chart-kit-vs-echarts-rn-2026
