# Health App — Product Requirements Document

**Status:** Draft v0.3 (free and fully on-device: open-source AI runs on the phone, no server, no API keys) · **Date:** 2026-11-16 · **Owner:** repo owner (single user)

**Changes from v0.2:** cloud AI and proxy removed in favour of open-source models running in the browser. Metric units only (kg). Hosting on GitHub Pages (public repo). Exercise calories are not estimated or counted for now.

---

## 1. Summary

A personal, private health companion for iPhone that makes it fast to **log daily food intake by taking a photo**, **plan and log exercise**, and **see progress toward goals**. Open-source AI models run **on the phone itself**: they find the foods in the photo, suggest what they are, and estimate portions, calories and health factors for you to confirm. There are **no servers, accounts, API keys or costs**.

It ships as an installable **Progressive Web App (PWA)**, hosted free on **GitHub Pages**: open it in Safari and tap *Add to Home Screen*. The business logic is a portable TypeScript core, so the app can later be wrapped as an **Expo** app with Apple Health sync.

## 2. Goals and non-goals

### Goals
1. Log a meal **from a photo in under 30 seconds** including review. Log a food I've eaten before in under 15 seconds.
2. See at a glance how today is going: calories, protein/carbs/fat, key health factors, water and workouts, against targets.
3. Get a sensible weekly workout plan for my goal, schedule and equipment, and log sessions set by set.
4. See trends in weight, calories and training over weeks and months.
5. **Zero cost and full privacy:** all data, photos and AI processing stay on the device. Works offline once models are downloaded.

### Non-goals (for now)
- Medical advice or clinical accuracy. Estimates come with ranges and are always user-confirmed.
- Paid services: cloud AI APIs, servers, App Store fees.
- Barcode scanning.
- **Calories burned by exercise:** no estimates, and nothing added to the food budget.
- Imperial units.
- Multiple users, social features, cloud sync (export/import covers backup).
- Apple Health sync in the PWA, because iOS doesn't allow it from web apps. Planned for Phase 3 (Expo).

## 3. User and context
- **User:** me, on an iPhone, logging at home, at work and in the gym, sometimes offline.
- **Moments:** after a meal (snap and confirm), at the gym (follow the plan, log sets, rest timer), in the evening (review the day), weekly (weigh in, look at trends).

## 4. Feature requirements

Priority: **P0** = MVP · **P1** = next release · **P2** = later.

### 4.1 Profile and targets — P0
| ID | Requirement |
|----|-------------|
| PR-1 | Onboarding collects age, sex, height (cm), weight (kg), activity level, goal (lose / maintain / gain) and rate (kg/week). |
| PR-2 | BMR from **Mifflin–St Jeor**, then TDEE = BMR × activity factor, adjusted for the goal. Safety floor of ≥1,200 kcal (women) / ≥1,500 kcal (men), with a warning. |
| PR-3 | Default macros: protein 1.6–2.2 g/kg, fat 25–30% of kcal, carbs the remainder. Each one can be overridden. |
| PR-4 | Metric only: kg, cm, g, ml. |
| PR-5 | Water target (default 35 ml/kg, editable). |
| PR-6 | **Usual plate diameter (cm)**, used as the size reference for photo portions. A default of 27 cm is used until it's set, and the app suggests measuring. |

### 4.2 Food logging — P0
| ID | Requirement | Pri |
|----|-------------|-----|
| FD-1 | Day view by meal (Breakfast, Lunch, Dinner, Snacks), with totals and amounts remaining against targets. Swipe or use the date picker to change days. | P0 |
| FD-2 | Search the **bundled offline food database** (curated USDA FoodData Central subset, ~2–3k foods, CC0). | P0 |
| FD-3 | Recent, frequent and favourite foods shown first. One tap re-logs the same portion. | P0 |
| FD-4 | Portion by grams, serving, or household measure (cup, tbsp, piece) where the USDA data provides it. Nutrition updates live as you type. | P0 |
| FD-5 | Custom foods: name, serving, kcal, protein, carbs and fat; fiber, sugar, saturated fat and sodium optional. | P0 |
| FD-6 | Quick add: calories only, macros optional. | P0 |
| FD-7 | Copy a meal or a whole day. Edit and delete entries. | P0 |
| FD-8 | Saved meals and recipes. | P1 |

### 4.3 Photo-based food recognition (on-device) — P0
| ID | Requirement | Pri |
|----|-------------|-----|
| PH-1 | **Capture:** a "Snap meal" button opens the camera or the photo library. | P0 |
| PH-2 | **Find foods:** detect each food region on the plate, plus the plate or bowl itself, with on-device models. | P0 |
| PH-3 | **Identify:** for each region, show the **top 5 matching foods from the food database**, ranked by on-device image–text similarity and boosted by foods I log often. One tap picks the right one; search is available if none match. | P0 |
| PH-4 | **Recognise repeat meals:** compare the photo with my past confirmed meal photos (stored as image embeddings on the device) and offer "Same as Tuesday's lunch?" with the saved items and portions. | P0 |
| PH-5 | **Portion estimate:** grams per item, as a best estimate plus a low–high range, worked out from the food's area relative to the plate (using my plate diameter), a typical thickness for that kind of food, and its density (§6.7). Shows a one-line explanation. | P0 |
| PH-6 | **Nutrition:** kcal, protein, carbs, fat, fiber, sugar, saturated fat and sodium per item and per meal, calculated as grams × USDA per-100 g values. | P0 |
| PH-7 | **Health factors** per meal, computed by transparent rules (§6.6): processing level (NOVA 1–4, from the food's category), fruit and vegetable servings, high sugar, high sodium, high saturated fat, whole grain, and common allergens (gluten, dairy, nuts, egg, soy, fish/shellfish) from food tags. | P0 |
| PH-8 | **Review screen before saving:** each item shows the photo crop, a food picker, and a grams slider bounded by its range. Items can be added or removed and the meal changed. Nothing is logged without confirmation. | P0 |
| PH-9 | Photo thumbnail and image embedding stored locally with the entry. Photos never leave the phone. | P0 |
| PH-10 | **Model download:** a one-time, opt-in download of ~250–300 MB (Wi-Fi recommended) with a progress bar. Models are cached for offline use, and storage used is shown in Settings. Manual logging works without them. | P0 |
| PH-11 | **Depth refinement:** monocular depth estimation to measure food height instead of assuming a typical thickness. | P1 |
| PH-12 | **Personal calibration:** learn from my corrections (detected grams vs confirmed grams, per food) and adjust future estimates. | P1 |
| PH-13 | A second angle, and before/after photos to subtract leftovers. | P1 |
| PH-14 | Short dish caption (e.g. "spaghetti with meatballs") from a small vision-language model, to help name mixed dishes. | P2 |

### 4.4 Water — P0
| WA-1 | One-tap +250 ml / +500 ml / custom, progress ring, undo. |
|---|---|

### 4.5 Exercise planning — P0
| ID | Requirement |
|----|-------------|
| EX-1 | Exercise library: ~870 exercises from *free-exercise-db* with instructions and images, filtered by muscle, equipment, level and category. |
| EX-2 | **Plan generator:** inputs are goal (strength / muscle / fat loss / general fitness), days per week (2–6), session length, equipment (none / dumbbells / home gym / full gym) and experience. Output is a weekly split: full-body for 2–3 days, upper/lower for 4, push/pull/legs for 5–6, with exercises, sets, rep ranges and rest times. |
| EX-3 | Edit the plan: swap exercises (suggestions target the same muscle with available equipment), reorder, change sets and reps, add or remove exercises. |
| EX-4 | Custom exercises. |
| EX-5 | Multiple saved plans, one active. |

### 4.6 Workout logging — P0
| ID | Requirement |
|----|-------------|
| WL-1 | Start today's workout from the active plan, or an empty session. |
| WL-2 | Per-set weight (kg) and reps (or time and distance), prefilled from the last session. |
| WL-3 | Rest timer that starts automatically, with vibration or sound where the browser allows. |
| WL-4 | Progression hint using double progression: when every set hits the top of the rep range, suggest more weight next time. |
| WL-5 | Cardio and activity log: type, duration, distance, notes. **No calorie estimate.** |
| WL-6 | History per session and per exercise: best set and estimated 1RM (Epley). |

### 4.7 Dashboard and progress — P0 (some P1)
| ID | Requirement | Pri |
|----|-------------|-----|
| DB-1 | **Today:** calorie ring (eaten / target / remaining), macro bars, water ring, today's workout card, "Snap meal" and quick-add buttons. | P0 |
| DB-2 | **Daily health summary:** fiber, sugar, saturated fat and sodium against guideline limits; fruit and vegetable servings; share of kcal from NOVA 4 (ultra-processed) foods. | P0 |
| DB-3 | Weight log (kg) with a 7-day moving-average trend line and a goal line. | P0 |
| DB-4 | Weekly charts: average kcal against target, macro adherence, workouts done, training volume. | P1 |
| DB-5 | Logging streaks. | P1 |
| DB-6 | Body measurements and progress photos, stored locally. | P2 |

### 4.8 Data, privacy and settings — P0
| ID | Requirement |
|----|-------------|
| DA-1 | All data, photos and AI inference stay on the device: IndexedDB plus the browser cache. No account, analytics, tracking or backend. |
| DA-2 | Export / import all data as JSON (food log also as CSV). Reminder if there's been no backup for 14 days. |
| DA-3 | Request persistent storage (`navigator.storage.persist()`). Show storage use (data, photos, models). |
| DA-4 | Network use: the app files from GitHub Pages, model files from the Hugging Face CDN, and exercise images. All are downloaded once and cached. No user data is ever sent. |
| DA-5 | Disclaimer: estimates only, not medical advice. |

### 4.9 Reminders — P2
Deferred to the Expo phase (local notifications). Web Push on iOS needs a push server.

## 5. UX principles
- Thumb-first bottom tab bar: Today · Food · Workouts · Progress · Settings.
- Feels native on iOS: safe areas, light and dark mode, no zoom on input focus, standalone display mode.
- Logging is never more than 2 taps from Today.
- AI suggestions are always **choices to confirm**, shown with ranges and confidence, never logged silently.
- AI runs in a Web Worker with a visible progress state, so the UI never freezes.

## 6. Technical approach

### 6.1 Architecture
```
health-app/  (public repo → GitHub Pages)
├─ packages/core/         # Pure TS: models, nutrition math, portion math, health rules, plan generator.
│                         # Unit-tested; reused by Expo later.
├─ apps/web/              # Vite + React + TS PWA
│   ├─ src/data/          # Repository layer over Dexie (IndexedDB)
│   ├─ src/vision/        # Web Worker: Transformers.js pipelines (detect → segment → embed → match → portion)
│   └─ public/datasets/   # foods.json (USDA subset + density, thickness, NOVA, allergen tags),
│                         # food-text-embeddings.bin (precomputed), exercises.json
├─ scripts/               # Build-time dataset + embedding generation (Node/Python), reproducible
└─ .github/workflows/     # CI tests + deploy to GitHub Pages
```

### 6.2 Stack (open source, free)
| Need | Choice | License | Later on Expo | Notes |
|------|--------|---------|---------------|-------|
| UI | React + TypeScript + Vite | MIT | React Native / Expo | |
| PWA / offline | `vite-plugin-pwa` (Workbox) | MIT | n/a | |
| Local DB | Dexie.js (IndexedDB) | Apache-2.0 | expo-sqlite + Drizzle ORM | `useLiveQuery` for reactive UI |
| Charts | Recharts | MIT | react-native-gifted-charts | |
| Routing / validation | React Router · Zod | MIT | Expo Router · Zod | |
| Food search | MiniSearch | MIT | MiniSearch | Fuzzy offline search |
| **On-device ML runtime** | **Transformers.js** (ONNX Runtime Web, WebGPU with WASM fallback) | Apache-2.0 | ONNX Runtime React Native / Core ML | WebGPU is on by default in Safari on iOS 26 |
| Image resize | `browser-image-compression` or canvas | MIT | expo-image-manipulator | |
| Tests | Vitest + Playwright | MIT / Apache-2.0 | Jest | |
| Hosting | GitHub Pages via GitHub Actions | Free for public repos | n/a | HTTPS, needed for camera and install |
| Apple Health (Phase 3) | `@kingstinct/react-native-healthkit` | MIT | ✔ | Needs an Expo dev build |

### 6.3 On-device models (candidates; final picks come from the Phase 0 spike)
Checked on Hugging Face in this session: browser-ready ONNX builds exist, Transformers.js is supported, and licenses are permissive.

| Role | Model | License | Approx. download (quantized) | Why |
|------|-------|---------|------------------------------|-----|
| Find food items and plate (open-vocabulary detection) | `onnx-community/grounding-dino-tiny-ONNX` (prompt: "food. plate. bowl. cup.") | Apache-2.0 | ~100–170 MB | Finds arbitrary objects from a text prompt |
| Alternative detector + caption | `onnx-community/Florence-2-base-ft` (0.23B) | MIT | ~250 MB (q4) | One model for detection, region captions and dish captions. Spike compares it with Grounding DINO |
| Segment each item and the plate (pixel area) | `Xenova/slimsam-77-uniform` | Apache-2.0 | ~10–15 MB | SAM-style masks from box prompts |
| Identify food (image ↔ food-name similarity) | `Xenova/clip-vit-base-patch32` (vision encoder only on device) | MIT | ~50–90 MB | Text embeddings for every food in our DB are **precomputed at build time**, so the phone only runs the image encoder. Also powers repeat-meal matching (PH-4) |
| Depth for portion height (P1) | `onnx-community/depth-anything-v2-small` | Apache-2.0 | ~20–30 MB | Relative depth. Scaled using the plate |
| Dish captions (P2) | `HuggingFaceTB/SmolVLM-256M/500M-Instruct` | Apache-2.0 | ~250–360 MB | Small vision-language model with a WebGPU demo. Too weak to trust for portions |

**Rejected:** Gemma 3n E2B (~3.3 GB, Gemma license) and Qwen2-VL-2B (~2.5 GB). Both are too large for iPhone Safari, which reports a GPU buffer limit of roughly 0.7–1 GB and reloads tabs under memory pressure. Food-101 classifiers (e.g. `nateraw/food`, Apache-2.0, ~89% top-1) only know 101 dishes and give one label per photo; CLIP matching against our own food list is more flexible. YOLO-based food detectors from Ultralytics are AGPL, so they're excluded by the licensing rule. FoodSAM (Apache-2.0) and MFP3D are research Python code that doesn't run in a browser; we take their ideas (segment-then-classify, depth-based volume) only.

Target total model download is **≤ 300 MB**, cached in browser storage. Since iOS 17, home-screen apps get the same disk-based quota as Safari.

### 6.4 Data sources
| Data | Source | License | Use |
|------|--------|---------|-----|
| Foods and nutrients | USDA FoodData Central (Foundation + SR Legacy) | CC0 (attribution requested) | Bundled subset with per-100 g nutrients and household portions |
| **Food density** | Derived from USDA household-measure weights (g per cup ÷ 236.6 ml) | CC0 | Volume → grams for portion estimates. FAO/INFOODS Density DB v2 used as a cross-check reference (license unstated, so values aren't copied) |
| Typical thickness / height per food category | Curated table (~40 categories, e.g. rice 2.5 cm, steak 2 cm, salad 4 cm loose) | Our own (MIT) | Portion fallback until depth (P1) |
| NOVA and allergen tags | Rules over USDA food categories + keywords, generated at build time and hand-reviewed | Our own (MIT) | Health factors |
| Exercises | yuhonas/free-exercise-db (876 exercises verified) | Unlicense | Library + plan generator |

### 6.5 Open-source apps reviewed (ideas only unless permissive)
| Project | License | Take | Copy code? |
|---------|---------|------|------------|
| OpenNutriTracker | GPL-3.0 | Local-only design, meal diary UX | No |
| Waistline | GPL-3.0 | Diary, recipes, weight tracking | No |
| workout.cool | MIT | Exercise picker and workout builder UX | Yes, with attribution |
| Liftosaur | AGPL-3.0 | Proof that a PWA gym logger works on iPhone; progression ideas | No |
| wger | AGPL-3.0 / CC-BY-SA data | Plan and session data model | No |

**Licensing rule:** only MIT / Apache-2.0 / BSD / Unlicense / CC0 code, data and model weights are bundled or used. Copyleft (GPL, AGPL, CC-BY-SA) and restrictive model licenses are references only.

### 6.6 Data model and key algorithms
```
Profile        { sex, birthDate, heightCm, activityLevel, goal, goalRateKgPerWeek, plateDiameterCm, targets{kcal,proteinG,carbsG,fatG,waterMl}, targetsOverridden }
Food           { id, source:'usda'|'custom', sourceId?, name, category, per100g{kcal,protein,carbs,fat,fiber,sugar,satFat,sodiumMg}, servings[{label,grams}], densityGPerMl?, thicknessCm?, nova(1–4), allergens[], favorite }
FoodLogEntry   { id, date, meal, foodId | quick{…}, grams, snapshot{name,kcal,protein,carbs,fat,fiber,sugar,satFat,sodiumMg}, photoMealId?, createdAt }
PhotoMeal      { id, takenAt, thumbnail(blob), embedding(Float32Array), items[{ box, maskAreaPx, candidates[{foodId,score}], chosenFoodId, estGrams, gramsLow, gramsHigh, confirmedGrams }], plate{ box, diameterPx } }
WaterEntry     { id, date, ml }   WeightEntry { id, date, kg }
Exercise       { id, source:'fedb'|'custom', name, primaryMuscles[], equipment, level, category, instructions[], images[] }
WorkoutPlan    { id, name, active, goal, days[{ name, exercises[{exerciseId, sets, repMin, repMax, restSec}] }] }
WorkoutSession { id, planId?, date, startedAt, endedAt, exercises[{exerciseId, sets[{weightKg?, reps?, durationSec?, distanceM?, done}]}] }
ActivityLog    { id, date, type, minutes, distanceM?, notes }
```
- BMR `10·kg + 6.25·cm − 5·age + (5 | −161)`. TDEE uses factors 1.2–1.9. Goal adjustment ±(kg/week × 7,700) / 7 per day, clamped to the floor.
- **Health rules** (per meal and per day): high sodium > 600 mg/meal; daily limits of sodium 2,300 mg, added/free sugar < 10% kcal, saturated fat < 10% kcal; fiber target 14 g per 1,000 kcal; fruit and veg servings = grams of fruit/veg ÷ 80 g. Thresholds are in one config file.
- e1RM (Epley) `w × (1 + reps/30)`. The plan generator is template-based with movement-pattern slots filled from the library, filtered by equipment and level.

### 6.7 Photo recognition pipeline (all on-device)
```
Photo ─▶ resize (≤1024 px) ─▶ Web Worker (Transformers.js, WebGPU→WASM)
  1 DETECT    Grounding DINO / Florence-2 → boxes for food items + plate/bowl
  2 SEGMENT   SlimSAM (box prompts) → masks → pixel area per item; plate mask → ellipse fit
  3 SCALE     plate major axis (px) ↔ user plate diameter (cm) → cm² per pixel (ellipse corrects tilt)
  4 IDENTIFY  CLIP image embedding of each crop · precomputed food-name text embeddings
              → cosine top-5, re-ranked with a personal prior (frequency of my confirmed foods)
  5 REPEAT?   whole-photo embedding vs my past PhotoMeals → "Same as …?" when similarity > threshold
  6 PORTION   volume = area_cm² × thickness(category) [P1: × depth-derived height]
              grams  = volume × density(food); range = ±(uncertainty from scale, thickness, density)
              bowls/cups: volume from rim diameter × fill estimate; "pieces" foods (egg, apple) use USDA piece weight
  7 NUTRIENTS grams × per-100 g USDA values; health rules → flags
  8 REVIEW    user confirms or corrects food and grams → saved; corrections feed calibration (P1)
```
**Honest expectations:** small on-device models are less capable than large cloud models. Identification aims to have the correct food **in the top 5 for most common foods**, and repeat-meal matching should handle the meals I eat most often. Portions from a single photo are rough. Published results for even large cloud AI models show about 36% average calorie error. The design therefore relies on one-tap correction, ranges, the plate reference, my own history, and calibration.

**Performance targets:** analysis ≤ 8 s on an iPhone with iOS 26 (WebGPU), ≤ 25 s on the WASM fallback. Models load lazily and are kept warm in the worker while the app is open.

### 6.8 iOS PWA constraints and mitigations
| Constraint | Mitigation |
|------------|------------|
| WebGPU needs iOS 26+; older iOS falls back to WASM (slower) | Detect the backend; on WASM, skip optional stages like depth |
| Per-tab memory limits and reloads on large models | Keep the total under 300 MB, run one model at a time in the worker, use quantized (q4/q8) weights |
| Storage eviction risk | `storage.persist()`, backup reminders. Models can always be re-downloaded |
| Camera in standalone mode | Use the `<input type="file" accept="image/*" capture="environment">` path (most reliable) |
| HTTPS required | GitHub Pages |

## 7. Release plan
| Phase | Scope | Exit criteria |
|-------|-------|---------------|
| **0. Foundations + vision spike** | Monorepo, `core` with tests, dataset scripts (USDA subset, densities, NOVA and allergen tags, precomputed CLIP text embeddings), PWA shell on GitHub Pages, CI. **Spike:** run detector + SlimSAM + CLIP on my iPhone with a 30-meal evaluation set (photos plus kitchen-scale weights); compare Grounding DINO with Florence-2; measure speed and memory. | Installs from GitHub Pages and works offline. Spike report: top-1 / top-5 identification, portion error, seconds per photo on my phone |
| **1. MVP (P0)** | Profile/targets, photo logging with review, repeat-meal matching, food log, health summary, water, exercise library, plan generator & editor, workout logging, weight trend, export/import | One week of daily use without another app |
| **2. P1** | Depth-based portions, personal calibration, multi-angle and leftovers photos, saved meals and recipes, weekly charts, streaks, CSV | Portion error on the evaluation set improves over Phase 1 |
| **3. Native (Expo)** | Port UI; reuse `core` and models (ONNX Runtime RN / Core ML); SQLite; HealthKit (steps, workouts, weight, nutrition); local notifications; import the PWA backup | Runs on my iPhone through an Xcode dev build (free Apple ID) |
| **4. P2** | Dish captions (SmolVLM), measurements and progress photos, widgets | n/a |

## 8. Success metrics (personal)
- Food logged on ≥ 6 of 7 days for 4 weeks.
- Photo log including review ≤ 30 s (median); repeat food ≤ 15 s.
- The right food is in the photo suggestions' top 5 ≥ 80% of the time on my evaluation set (top-1 ≥ 50%); repeat meals are recognised ≥ 80% of the time.
- Median kcal error ≤ 30% before review; ≤ 15% after review.
- Zero data-loss incidents.

## 9. Risks
| Risk | Impact | Mitigation |
|------|--------|-----------|
| On-device identification is weak for mixed or regional dishes | More manual picking | Top-5 choices, personal prior, repeat-meal matching, search fallback; Florence-2 captions (P2) |
| Single-photo portions are inaccurate | Wrong totals | Plate reference, ranges, review sliders, depth (P1), calibration (P1), evaluation set |
| Models too slow or too big for iPhone Safari | Feature unusable | Phase 0 spike on the real phone before committing; quantized small models; WASM fallback; manual logging always works |
| Model download (~300 MB) | First-run friction | Opt-in, Wi-Fi prompt, progress bar, cached for good |
| IndexedDB data loss | High | Persistent storage, backup reminders, JSON export |
| Estimates misread as medical advice | Health | Disclaimer, safety floors |
| License contamination | Legal | Permissive-only rule (§6.5) |

## 10. Decisions and open questions
**Decided:** PWA first, Expo later · metric (kg) only · public repo, hosted on GitHub Pages · no paid APIs or servers; on-device open-source AI · no barcode scanning · no exercise calorie estimates.

**Open:**
1. Which iPhone model and iOS version? WebGPU (fast path) needs iOS 26. Older phones use the slower WASM path.
2. Usual plate diameter in cm (measure your most-used dinner plate).
3. Any dietary focus to prioritise (e.g. vegetarian, low sodium, high protein, fasting windows)?
4. OK to collect ~30 meal photos with kitchen-scale weights for the Phase 0 evaluation set? It's the only way to know how accurate the free approach really is.

---

### Appendix: research sources
- Transformers.js models (verified licenses, sizes and Transformers.js tags on Hugging Face): Florence-2-base-ft (MIT), depth-anything-v2-small (Apache-2.0), grounding-dino-tiny-ONNX (Apache-2.0), slimsam-77-uniform (Apache-2.0), clip-vit-base-patch32 (MIT), SmolVLM-256M/500M-Instruct (Apache-2.0), gemma-3n-E2B-it-ONNX (Gemma license, ~3.3 GB), Qwen2-VL-2B-Instruct (~2.5 GB)
- Florence-2 in the browser with WebGPU: https://huggingface.co/posts/Xenova/581079116072653 · MIT license: https://blog.roboflow.com/florence-2/
- SmolVLM WebGPU demos: https://huggingface.co/blog/smolervlm
- WebGPU in Safari on iOS 26: https://web.dev/blog/webgpu-supported-major-browsers · https://appdevelopermagazine.com/webgpu-in-ios-26/
- iOS Safari GPU buffer and memory limits: https://bugs.webkit.org/show_bug.cgi?id=311598 · https://arxiv.org/html/2605.20706
- WebKit storage policy (home-screen apps share Safari's quota since iOS 17): https://webkit.org/?p=14403 · https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- Food portion estimation research: MFP3D https://arxiv.org/pdf/2411.10492 · plate-reference scaling https://arxiv.org/html/2602.13041 · survey https://arxiv.org/html/2602.05078
- FoodSAM (Apache-2.0): https://github.com/jamesjg/FoodSAM · Nutrition5k: https://arxiv.org/abs/2103.03375
- Large cloud AI nutrition accuracy (~36% error): https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12513282/
- CLIP (zero-shot food classification incl. Food-101): https://arxiv.org/pdf/2103.00020
- FAO/INFOODS Density Database v2: https://www.fao.org/infoods/infoods/tables-and-databases/faoinfoods-databases
- USDA FoodData Central (CC0): https://fdc.nal.usda.gov/api-guide
- free-exercise-db (Unlicense): https://github.com/yuhonas/free-exercise-db
- OpenNutriTracker https://github.com/simonoppowa/OpenNutriTracker · Waistline https://github.com/davidhealey/waistline · workout.cool https://github.com/Snouzy/workout-cool · Liftosaur https://github.com/astashov/liftosaur · wger https://wger.readthedocs.io/en/stable/
- Expo / HealthKit: https://cdn.jsdelivr.net/npm/@kingstinct/react-native-healthkit@14.0.1/README.md · https://expo.dev/blog/apple-developer-program-explained-free-vs-paid · Drizzle + expo-sqlite https://www.dbpro.app/blog/expo-sqlite
