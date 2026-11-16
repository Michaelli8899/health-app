#!/usr/bin/env python3
"""Resolve scripts/visual_labels.txt against foods.json → apps/web/public/datasets/visual-labels.json."""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
foods = json.loads((ROOT / "apps/web/public/datasets/foods.json").read_text())["foods"]
out, report, missing = [], [], []
for raw in (ROOT / "scripts/visual_labels.txt").read_text().splitlines():
    line = raw.strip()
    if not line or line.startswith("#"):
        continue
    parts = [p.strip() for p in line.split("|")]
    label, keys = parts[0], [k.strip().lower() for k in parts[1].split(",") if k.strip()]
    excl = [k.strip().lower() for k in parts[2].split(",") if k.strip()] if len(parts) > 2 else []
    cands = [f for f in foods if all(k in f["name"].lower() for k in keys)
             and not any(x in f["name"].lower() for x in excl)]
    if not cands:
        missing.append(label)
        continue
    best = min(cands, key=lambda f: len(f["name"]))
    out.append({"label": label, "foodId": best["id"]})
    report.append(f"{label}\t{best['name']}\t{len(cands)}")
(ROOT / "scripts/.cache").mkdir(exist_ok=True)
(ROOT / "scripts/.cache/visual_labels_resolved.tsv").write_text("\n".join(report))
(ROOT / "apps/web/public/datasets/visual-labels.json").write_text(json.dumps(out, indent=0))
print(f"resolved {len(out)}, missing {len(missing)}: {missing}")
sys.exit(1 if missing else 0)
