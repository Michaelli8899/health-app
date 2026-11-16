# Notes for Claude sessions

## Branches and deployment
- `main` deploys to GitHub Pages (https://michaelli8899.github.io/health-app/) via `.github/workflows/deploy.yml`.
- The owner has asked that **`main` be updated automatically**: after committing and pushing tested work to the
  session's working branch, also fast-forward `main` to it (`git push origin HEAD:main`). Only push to `main` when
  typecheck, unit tests and the web build pass locally. Never force-push `main`.

## Project layout
- `docs/PRD.md` (requirements), `docs/phase-0-plan.md` (current phase and status)
- `packages/core`: pure TypeScript calculations with Vitest tests
- `apps/web`: Vite + React PWA; on-device vision in `src/vision/` (Transformers.js)
- `scripts/`: dataset builders (`build_foods.py`, `resolve_visual_labels.py`, `build_text_embeddings.mjs`)

## Checks
- `pnpm typecheck && pnpm test && pnpm build`
- Vision integration test (downloads ~400 MB of models):
  `RUN_MODEL_TESTS=1 TEST_IMAGES=/path/to/jpgs pnpm --filter web exec vitest run src/vision/engine.integration.test.ts`

## Constraints from the owner
- Free and open source only: no paid APIs, no API keys, no servers. Metric units (kg). No exercise calorie estimates yet.
- Permissively licensed code, data and models only (MIT, Apache-2.0, BSD, Unlicense, CC0).
- Photos and personal data stay on the device; never commit evaluation photos.
