#!/usr/bin/env python3
"""Build apps/web/public/datasets/foods.json from USDA FoodData Central SR Legacy (CC0).

Usage:  python3 scripts/build_foods.py
Input is downloaded into scripts/.cache/ (not committed). Output is committed.

Each food gets:
  - per-100 g nutrients (kcal, protein, carbs, fat, fiber, sugar, satFat, sodiumMg)
  - household servings [[label, grams], ...]
  - bulk density (g/ml) derived from cup/tbsp/tsp/fl oz weights, when available
  - food group, NOVA processing class (1-4), allergens, and portion class.
    These come from transparent rules below over the USDA category and the
    description. They are heuristics and are meant to be reviewed and improved.
"""
from __future__ import annotations

import io
import json
import re
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "scripts" / ".cache"
OUT = ROOT / "apps" / "web" / "public" / "datasets" / "foods.json"
SR_URL = "https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_2018-04.zip"
SR_JSON = CACHE / "FoodData_Central_sr_legacy_food_json_2018-04.json"

EXCLUDED_CATEGORIES = {"Baby Foods", "American Indian/Alaska Native Foods"}

# USDA nutrient numbers -> our keys
NUTRIENTS = {
    "208": "kcal", "203": "protein", "205": "carbs", "204": "fat",
    "291": "fiber", "269": "sugar", "606": "satFat", "307": "sodiumMg",
}
ML_PER_UNIT = {"cup": 236.588, "tbsp": 14.787, "tsp": 4.929, "fl oz": 29.574}


def load_sr() -> list[dict]:
    if not SR_JSON.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        print("downloading SR Legacy…", file=sys.stderr)
        data = urllib.request.urlopen(SR_URL).read()
        zipfile.ZipFile(io.BytesIO(data)).extractall(CACHE)
    return json.loads(SR_JSON.read_text())["SRLegacyFoods"]


def has(desc: str, *words: str) -> bool:
    return any(re.search(rf"\b{re.escape(w)}", desc) for w in words)


# ---------------------------------------------------------------- food group + NOVA
def group_and_nova(cat: str, d: str) -> tuple[str, int]:
    """d is the lower-cased description."""
    if cat == "Fruits and Fruit Juices":
        if has(d, "juice", "nectar"):
            return "beverage", 4 if has(d, "drink", "cocktail", "sweetened", "with added sugar") else 1
        if has(d, "canned", "heavy syrup", "light syrup", "candied"):
            return "fruit", 3
        return "fruit", 1
    if cat == "Vegetables and Vegetable Products":
        if has(d, "french fr", "fried", "chips"):
            return "vegetable", 4
        if has(d, "canned", "pickle", "sauerkraut"):
            return "vegetable", 3
        return "vegetable", 1
    if cat == "Legumes and Legume Products":
        if has(d, "peanut butter", "bacon", "imitation", "meatless", "veggie burger"):
            return "protein", 4
        if has(d, "canned", "tofu", "tempeh", "miso", "salted"):
            return "protein", 3
        return "protein", 1
    if cat in {"Beef Products", "Pork Products", "Poultry Products", "Lamb, Veal, and Game Products",
               "Finfish and Shellfish Products"}:
        if has(d, "breaded", "batter", "nuggets", "patties, breaded", "fish sticks", "imitation"):
            return "protein", 4
        if has(d, "cured", "smoked", "canned", "salted", "ham", "bacon", "jerky"):
            return "protein", 3
        return "protein", 1
    if cat == "Sausages and Luncheon Meats":
        return "protein", 4
    if cat == "Dairy and Egg Products":
        if has(d, "egg") and not has(d, "eggnog", "substitute"):
            return "protein", 1
        if has(d, "processed", "spread", "flavored", "fruit", "chocolate", "imitation", "whipped topping",
               "eggnog", "substitute", "frozen yogurt", "pudding"):
            return "dairy", 4
        if has(d, "cheese", "butter", "cream cheese", "sour cream"):
            return "dairy", 3
        return "dairy", 1
    if cat == "Fats and Oils":
        if has(d, "margarine", "salad dressing", "mayonnaise", "shortening", "spread", "dressing"):
            return "fat_oil", 4
        return "fat_oil", 2
    if cat == "Cereal Grains and Pasta":
        whole = has(d, "whole", "brown", "oat", "quinoa", "barley", "bulgur", "buckwheat", "millet", "wild rice",
                    "amaranth", "teff", "spelt")
        return ("whole_grain" if whole else "grain"), 1
    if cat == "Baked Products":
        if has(d, "cake", "cookie", "doughnut", "pastry", "pie", "danish", "croissant", "muffin", "brownie",
               "cracker", "sweet roll", "toaster", "waffle", "pancake", "snack"):
            return "sweet" if not has(d, "cracker") else "grain", 4
        if has(d, "whole-wheat", "whole wheat", "whole-grain", "whole grain", "oat", "rye, whole"):
            return "whole_grain", 3
        return "grain", 3
    if cat == "Breakfast Cereals":
        if has(d, "oats", "oatmeal", "shredded wheat", "wheat, puffed", "rice, puffed", "farina") and not has(
                d, "flavored", "sugar", "honey", "instant, fortified, with"):
            return "whole_grain" if has(d, "oat", "wheat") else "grain", 1
        return "grain", 4
    if cat == "Sweets":
        if has(d, "honey", "maple syrup", "sugars, granulated", "sugars, brown", "molasses"):
            return "sweet", 2
        return "sweet", 4
    if cat == "Snacks":
        if has(d, "popcorn, air-popped", "rice cake"):
            return "grain", 1 if has(d, "air-popped") else 3
        return "other", 4
    if cat == "Beverages":
        if has(d, "water, bottled", "water, tap", "coffee, brewed", "tea, brewed", "tea, herb", "coffee, espresso"):
            return "beverage", 1
        if has(d, "beer", "wine"):
            return "beverage", 3
        return "beverage", 4
    if cat == "Nut and Seed Products":
        if has(d, "honey roasted", "chocolate", "candied", "glazed"):
            return "protein", 4
        if has(d, "salted", "oil roasted", "butter", "with salt"):
            return "protein", 3
        return "protein", 1
    if cat == "Soups, Sauces, and Gravies":
        return "mixed", 4 if has(d, "canned", "condensed", "dry", "mix", "dehydrated", "ready-to-serve") else 3
    if cat in {"Fast Foods", "Meals, Entrees, and Side Dishes"}:
        return "mixed", 4
    if cat == "Restaurant Foods":
        return "mixed", 3
    if cat == "Spices and Herbs":
        return "other", 2
    return "other", 3


# ---------------------------------------------------------------- allergens
ALLERGEN_RULES: dict[str, list[str]] = {
    "gluten": ["wheat", "bread", "pasta", "spaghetti", "macaroni", "noodle", "flour", "barley", "rye", "cracker",
               "cake", "cookie", "pastry", "pizza", "couscous", "bulgur", "seitan", "beer", "bagel", "croissant",
               "muffin", "pancake", "waffle", "biscuit", "tortilla, flour", "breaded", "batter", "pretzel", "doughnut",
               "pie", "spelt", "semolina"],
    "dairy": ["milk", "cheese", "yogurt", "butter", "cream", "whey", "ice cream", "custard", "pudding", "kefir",
              "ghee"],
    "egg": ["egg", "mayonnaise", "meringue", "custard"],
    "peanut": ["peanut"],
    "tree_nuts": ["almond", "walnut", "cashew", "pecan", "pistachio", "hazelnut", "filbert", "macadamia",
                  "brazilnut", "brazil nut", "pine nut", "praline", "marzipan", "nutella"],
    "soy": ["soy*", "tofu", "edamame", "tempeh", "miso"],
    "fish": ["fish", "salmon", "tuna", "cod", "trout", "tilapia", "sardine", "anchov*", "mackerel", "halibut",
             "herring", "pollock", "haddock", "catfish", "bass", "snapper", "swordfish", "flatfish", "pike", "carp",
             "whitefish", "roe", "caviar"],
    "shellfish": ["shrimp", "crab", "lobster", "clam", "mussel", "oyster", "scallop", "squid", "octopus",
                  "crayfish", "prawn", "crustacean", "mollusk"],
    "sesame": ["sesame", "tahini", "hummus"],
}
ALLERGEN_EXCEPTIONS = {
    "dairy": ["peanut butter", "almond butter", "cashew butter", "sesame butter", "apple butter", "cocoa butter",
              "butterbur", "butternut", "butterhead", "buttermilk biscuit", "coconut milk", "coconut cream",
              "soymilk", "almond milk", "rice milk", "oat milk", "cream of tartar", "cream substitute",
              "milkfish", "butter beans", "nondairy", "non-dairy", "imitation"],
    "egg": ["eggplant", "egg substitute"],
    "gluten": ["buckwheat", "rice flour", "corn flour", "potato flour", "soy flour", "gluten-free",
               "chickpea flour", "pie crust, cookie-type"],
}


def word_hit(word: str, d: str) -> bool:
    """Whole-word match allowing plurals; a trailing * means prefix match (e.g. anchov*)."""
    if word.endswith("*"):
        return re.search(rf"\b{re.escape(word[:-1])}", d) is not None
    return re.search(rf"\b{re.escape(word)}(?:s|es)?\b", d) is not None


def allergens(cat: str, d: str) -> list[str]:
    out = []
    for name, words in ALLERGEN_RULES.items():
        if any(word_hit(w, d) for w in words):
            if any(x and x in d for x in ALLERGEN_EXCEPTIONS.get(name, [])) and not _strong_hit(name, d):
                continue
            out.append(name)
    if cat == "Finfish and Shellfish Products" and "fish" not in out and "shellfish" not in out:
        out.append("fish")
    if cat == "Dairy and Egg Products" and not out:
        out.append("dairy")
    return sorted(set(out))


def _strong_hit(name: str, d: str) -> bool:
    """A word that still implies the allergen even when an exception phrase is present."""
    strong = {"dairy": ["cheese", "yogurt", "cow", "whole milk", "skim", "ice cream"],
              "gluten": ["wheat flour", "white bread", "whole-wheat"], "egg": ["whole egg", "egg yolk", "egg white"]}
    return any(word_hit(w, d) for w in strong.get(name, []))


# ---------------------------------------------------------------- portion class (photo geometry)
def portion_class(cat: str, group: str, d: str) -> str:
    """How the food sits on a plate. Drives the thickness table in packages/core."""
    if group == "beverage" or has(d, "soup", "broth", "milk, ", "juice", "smoothie", "shake"):
        return "liquid"
    # Only the leading name segment decides "sauce" ("Spaghetti with meat sauce" is a pasta dish).
    head = d.split(",")[0].strip()
    if re.match(r"(sauce|gravy|salad dressing|dressing|syrups?|dip|salsa|catsup|ketchup|mustard|jams?|jellies|jelly|"
                r"honey|butter|oil|margarine|spreads?|mayonnaise|hummus|peanut butter|nut butter)\b", head):
        return "sauce"
    if has(d, "lettuce", "spinach, raw", "greens", "arugula", "salad", "kale, raw", "cabbage, raw", "sprouts"):
        return "leafy"
    if has(d, "pizza", "pancake", "waffle", "tortilla", "crepe", "omelet", "quesadilla", "flatbread", "pita",
           "naan"):
        return "flat"
    if has(d, "egg, whole, cooked", "egg, whole, raw", "bread", "roll", "bagel", "muffin", "cookie", "doughnut",
           "croissant", "biscuit", "bun", "sandwich", "burger", "hamburger", "hotdog", "hot dog", "taco",
           "burrito") or (group == "fruit" and has(d, "raw") and not has(d, "berries", "grapes", "cherries",
                                                                              "sliced", "pieces", "chopped")):
        return "piece"
    if group == "protein" and cat in {"Beef Products", "Pork Products", "Poultry Products",
                                      "Lamb, Veal, and Game Products", "Finfish and Shellfish Products"} and not has(
            d, "ground", "chopped", "diced", "shredded", "shrimp", "scallop"):
        return "slab"
    if has(d, "rice", "pasta", "spaghetti", "noodle", "macaroni", "couscous", "quinoa", "oatmeal", "porridge",
           "mashed", "beans", "lentils", "chickpea", "risotto", "polenta", "grits", "cereal", "stew", "chili",
           "curry", "casserole", "yogurt", "cottage cheese", "ground"):
        return "pile"
    return "chunks"


# ---------------------------------------------------------------- servings + density
def parse_portions(f: dict) -> tuple[list[list], float | None]:
    servings: list[list] = []
    densities: list[float] = []
    for p in f.get("foodPortions", []):
        g = p.get("gramWeight")
        amount = p.get("amount") or 1
        mod = (p.get("modifier") or p.get("portionDescription") or "").strip()
        if not g or not mod or mod.lower() in {"undetermined", "quantity not specified"}:
            continue
        label = mod if amount == 1 else f"{amount:g} {mod}"
        servings.append([label, round(g, 1)])
        base = mod.split(",")[0].strip().lower()
        if base in ML_PER_UNIT and amount > 0:
            dens = g / (amount * ML_PER_UNIT[base])
            if 0.05 < dens < 2.5:
                densities.append(dens)
    density = round(sorted(densities)[len(densities) // 2], 3) if densities else None
    # dedupe labels, keep order
    seen, uniq = set(), []
    for s in servings:
        if s[0] not in seen:
            seen.add(s[0])
            uniq.append(s)
    return uniq[:8], density


def nutrients(f: dict) -> dict | None:
    out = {v: 0.0 for v in NUTRIENTS.values()}
    kj = None
    found = False
    for n in f["foodNutrients"]:
        num = n.get("nutrient", {}).get("number")
        amt = n.get("amount")
        if amt is None:
            continue
        if num in NUTRIENTS:
            out[NUTRIENTS[num]] = float(amt)
            found = found or num == "208"
        if num == "268":
            kj = float(amt)
    if not found:
        if kj is None:
            return None
        out["kcal"] = kj / 4.184
    return {k: round(v, 2) for k, v in out.items()}


def main() -> None:
    foods = []
    for f in load_sr():
        cat = f["foodCategory"]["description"]
        if cat in EXCLUDED_CATEGORIES:
            continue
        n = nutrients(f)
        if n is None:
            continue
        desc = f["description"]
        d = desc.lower()
        group, nova = group_and_nova(cat, d)
        servings, density = parse_portions(f)
        foods.append({
            "id": f"usda:{f['fdcId']}",
            "name": desc,
            "cat": cat,
            "n": [n["kcal"], n["protein"], n["carbs"], n["fat"], n["fiber"], n["sugar"], n["satFat"], n["sodiumMg"]],
            "sv": servings,
            **({"dens": density} if density else {}),
            "grp": group,
            "nova": nova,
            **({"alg": a} if (a := allergens(cat, d)) else {}),
            "pc": portion_class(cat, group, d),
        })
    foods.sort(key=lambda x: x["name"])
    OUT.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "version": 1,
        "source": "USDA FoodData Central, SR Legacy (April 2018). Public domain (CC0 1.0).",
        "nutrientOrder": ["kcal", "protein", "carbs", "fat", "fiber", "sugar", "satFat", "sodiumMg"],
        "foods": foods,
    }
    OUT.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False))
    print(f"wrote {len(foods)} foods → {OUT.relative_to(ROOT)} ({OUT.stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
