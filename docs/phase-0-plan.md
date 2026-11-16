# Phase 0 Plan — Foundations + On-Device Vision Spike

Goal: before building the full app, prove that the free on-device photo pipeline (PRD §6.7) is **fast enough and accurate enough on an iPhone 15 Pro**, and lay the foundations everything else builds on.

Exit criteria (from PRD §7):
- The PWA installs from GitHub Pages and opens offline.
- A spike report with real numbers from the phone: top-1 / top-5 food identification, portion error, seconds per photo and memory, plus a decision on which detector to use.

---

## Status (2026-11-16)

| Item | Status |
|------|--------|
| A1–A3 monorepo, PWA shell, CI, Pages workflow | ✅ done. Deploys once the branch is merged to `main` and Pages is set to GitHub Actions |
| A4 Dexie schema v1 | ✅ done (profile, food log, water, weights, photo meals, eval meals); CRUD tests come with Phase 1 screens |
| A5 core calculations | ✅ done; 19 unit tests |
| B1–B4 foods.json | ✅ 7,283 USDA SR Legacy foods; density for 2,505; NOVA, allergens, portion class by rules |
| B5 CLIP text embeddings | ✅ 192 visual foods + 8 non-food classes |
| B6–B7 exercises, attribution page | ⏳ Phase 1 (not needed for the spike) |
| C1, C2, C4–C9 Lab | ✅ worker, Grounding DINO (two passes), SlimSAM, plate scale, CLIP top-5, portions, card calibration, evaluation mode, metrics, export |
| C3 Florence-2 variant | ⏳ deferred: added only if Grounding DINO results on your phone are weak, to keep the download small |
| C10 CI vision check | ⚠️ opt-in only (`RUN_MODEL_TESTS=1`): it downloads ~400 MB of models, too heavy for every CI run |

**Findings so far** (10 openly licensed web photos; your own meals are the real test):
- **Identification:** right food was the top match on 7/10 photos, and in the top 5 on 9/10 (whole-image CLIP). Cropping to detected items fixed the fried egg.
- **Detection:** in one combined prompt, "food" suppresses plate detection, so the detector runs two passes.
- **Plate scale:** SAM plate masks are unreliable (mask/box agreement 0.06–1.02), so scale comes from the plate's detected box.
- **Segmentation:** SAM sometimes returns an empty mask for white food on a white plate. Box-ellipse fallback.
- **Speed:** browser WASM fallback takes ~43 s per photo in a headless Linux container (single-threaded, no WebGPU). The iPhone WebGPU number is what Phase 0 must measure.

## Workstream A — Repo and app foundations

| # | Task | Done when |
|---|------|-----------|
| A1 | pnpm workspace monorepo: `packages/core`, `apps/web`, `scripts/`; TypeScript strict, ESLint, Prettier | `pnpm install && pnpm build` passes |
| A2 | `apps/web`: Vite + React + TS + React Router + `vite-plugin-pwa` (manifest, icons, offline precache), iOS meta tags, safe-area CSS, light and dark themes | Lighthouse PWA checks pass; it installs to the iPhone home screen |
| A3 | GitHub Actions: lint + unit tests on every push; deploy `apps/web` to GitHub Pages from `main` | App live at `https://michaelli8899.github.io/health-app/` |
| A4 | Dexie database with schema v1 (PRD §6.6) and repository interfaces in `core` | Unit tests for CRUD against fake-indexeddb |
| A5 | `core` calculations: BMR/TDEE/targets, unit helpers, health rules, Epley, portion math (area → volume → grams with ranges) | Vitest coverage ≥ 90% for `core` |

> One-time manual step for you: in the GitHub repo, open Settings → Pages and set **Source: GitHub Actions**.

## Workstream B — Datasets (build-time scripts; outputs committed to `apps/web/public/datasets/`)

| # | Task | Done when |
|---|------|-----------|
| B1 | **USDA subset:** download Foundation + SR Legacy (CC0) and select ~2–3k common foods. Output `foods.json` with per-100 g nutrients (kcal, protein, carbs, fat, fiber, sugar, sat fat, sodium), household portions, and USDA food category | Script is reproducible; file is ≤ 2 MB gzipped |
| B2 | **Density:** derive g/ml from USDA cup/tbsp weights. Category fallback table for foods without one | Every food has a density or a category default |
| B3 | **Thickness table:** ~40 food categories with typical height in cm and an uncertainty | Reviewed by hand; table in `core` |
| B4 | **NOVA + allergen tags:** rules over USDA category + name keywords, then a manual review pass | Every food has a NOVA value of 1–4 and an allergen list |
| B5 | **CLIP text embeddings:** encode each food name with prompt templates ("a photo of {food}, a type of food"), averaged, with the same CLIP model used on the phone. Output `food-text-embeddings.bin` (Float16) plus an index | ~3k × 512 × 2 bytes ≈ 3 MB |
| B6 | **Exercises:** `free-exercise-db` → `exercises.json` (images loaded from jsDelivr on demand) | 876 exercises load in the library |
| B7 | Attribution page: USDA FoodData Central, free-exercise-db, model cards | Shown in Settings → About |

## Workstream C — Vision spike ("Lab" page at `/lab`)

A hidden page in the app that runs the pipeline on the phone, compares variants, and records evaluation data. **All photos stay on your phone.** You export a small results JSON with numbers only (no photos) and share it back.

| # | Task | Done when |
|---|------|-----------|
| C1 | Web Worker + Transformers.js setup: WebGPU backend with WASM fallback, lazy model loading with a progress bar, cache in browser storage, memory and timing instrumentation | Shows backend, load times and per-stage ms |
| C2 | **Detector A:** Grounding DINO tiny, prompt `"food. plate. bowl. cup. glass."` → boxes | Boxes drawn on the photo |
| C3 | **Detector B:** Florence-2-base-ft `<OD>` / `<CAPTION_TO_PHRASE_GROUNDING>` | Same output format as A |
| C4 | SlimSAM masks from boxes; plate ellipse fit; cm²-per-pixel from the plate diameter | Mask overlay and area in cm² shown |
| C5 | CLIP image embedding per crop → cosine similarity against B5 → top-5, with a personal prior (empty at first) | Top-5 list per item |
| C6 | Portion estimate per item (A5 math): grams and range | Shown per item |
| C7 | **Card calibration** (PR-6): detect plate + card in one photo → plate diameter | Within ±1 cm of a tape measure |
| C8 | **Evaluation mode:** after analysis, you enter the true food (search) and scale grams for each item. Saved locally with the photo | 30 meals recorded |
| C9 | **Metrics + export:** top-1/top-5 accuracy, portion MAPE (mean absolute % error), kcal MAPE, ms per stage, peak memory if available, per detector variant. Export as numbers-only JSON | JSON pasted back into this chat |
| C10 | Desktop check in CI: run the pipeline on WASM in headless Chromium against ~5 openly licensed food photos (Wikimedia Commons) | CI check verifies the pipeline returns boxes and candidates |

### Spike decisions this produces
1. **Detector:** Grounding DINO vs Florence-2, based on accuracy × speed on the phone.
2. **CLIP size:** stay with ViT-B/32, or try a larger or stronger image encoder if top-5 accuracy is under 80% and speed allows.
3. **Portion approach:** is area × thickness good enough for MVP, or does depth (PRD PH-11) need to move into P0?
4. **Go / no-go:** if the pipeline is too slow (> 8 s) or top-5 accuracy is under 60%, MVP ships photo logging as **"photo + repeat-meal matching + manual pick"** and the detector work moves to P1.

## Your part — building the 30-meal evaluation set

What you need: a kitchen scale (grams) and your usual plate.

For each meal (aim for variety: breakfast, mixed dishes, salads, rice/pasta, meat/fish, fruit, snacks, a drink or two):
1. Put the empty plate on the scale and **tare** it.
2. Add each food **one at a time** and note its weight (tare between foods), e.g. rice 180 g, chicken 140 g, broccoli 90 g.
3. Take the photo **in the Lab page** from your normal eating position, plus a second one from straight above if you can.
4. Enter each food and its weight in the Lab page (it prompts you).
5. Mixed dishes you can't separate (e.g. stew): enter the total weight and the closest single food.

Tips: normal indoor light is fine, so don't stage the photos. Include a few bowls and a few "hard" meals. Photos and weights stay on your phone. Only the summary numbers are exported.

## Order of work
1. A1–A3 (deployable shell on GitHub Pages) → you install it on your iPhone to confirm the basics.
2. B1, B2, B5 + C1–C6 (the Lab can analyse photos) → you try a few meals.
3. C7–C9 + B3, B4 (calibration, evaluation mode, metrics) → you record 30 meals and send back the JSON.
4. A4, A5, B6, B7, C10 in parallel.
5. Spike report and decisions → update the PRD → start Phase 1 (MVP).
