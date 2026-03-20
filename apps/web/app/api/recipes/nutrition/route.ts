import { NextRequest, NextResponse } from "next/server";

// Grams per unit for common cooking measurements.
// Count-based units (whole, piece, etc.) fall back to DEFAULT_G.
const UNIT_GRAMS: Record<string, number> = {
  // Weight
  g: 1, gram: 1, grams: 1,
  mg: 0.001, milligram: 0.001, milligrams: 0.001,
  kg: 1000, kilogram: 1000, kilograms: 1000,
  oz: 28.3495, ounce: 28.3495, ounces: 28.3495,
  lb: 453.592, lbs: 453.592, pound: 453.592, pounds: 453.592,
  // Volume (density ≈ 1 g/ml for most liquids/purees)
  ml: 1, milliliter: 1, millilitre: 1, milliliters: 1, millilitres: 1,
  l: 1000, liter: 1000, litre: 1000, liters: 1000, litres: 1000,
  // Common cooking
  cup: 240, cups: 240,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
  "fl oz": 29.5735,
};

const DEFAULT_G = 100; // fall back for "whole", "piece", "clove", etc.

/** Return grams for a given quantity + unit string */
function toGrams(quantity: number, unit: string): number {
  const key = unit.toLowerCase().trim();
  return quantity * (UNIT_GRAMS[key] ?? DEFAULT_G);
}

interface IngredientInput {
  ingredient_name: string;
  quantity: number;
  unit: string;
}

interface NutritionResult {
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
}

const USDA_KEY = process.env.USDA_API_KEY ?? "DEMO_KEY";

async function lookupNutrition(
  name: string,
  quantity: number,
  unit: string
): Promise<NutritionResult> {
  const grams = toGrams(quantity, unit);

  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("query", name);
  url.searchParams.set("api_key", USDA_KEY);
  url.searchParams.set("dataType", "SR Legacy,Foundation");
  url.searchParams.set("pageSize", "1");

  const res = await fetch(url.toString(), { next: { revalidate: 86400 } }); // cache 24h
  if (!res.ok) return { calories: null, protein_g: null, carbs_g: null, fat_g: null };

  const data = await res.json();
  const food = data.foods?.[0];
  if (!food) return { calories: null, protein_g: null, carbs_g: null, fat_g: null };

  const nutrients: { nutrientNumber: string; value: number }[] = food.foodNutrients ?? [];

  // Old USDA nutrient numbers (used in search results): 208=Energy, 203=Protein, 205=Carbs, 204=Fat
  const get = (nums: string[]) => {
    for (const num of nums) {
      const n = nutrients.find((x) => x.nutrientNumber === num);
      if (n?.value != null) return n.value;
    }
    return 0;
  };

  const factor = grams / 100;
  const round1 = (v: number) => Math.round(v * 10) / 10;

  return {
    calories: Math.round(get(["208", "1008"]) * factor),
    protein_g: round1(get(["203", "1003"]) * factor),
    carbs_g: round1(get(["205", "1005"]) * factor),
    fat_g: round1(get(["204", "1004"]) * factor),
  };
}

export async function POST(req: NextRequest) {
  const { ingredients } = (await req.json()) as { ingredients: IngredientInput[] };
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return NextResponse.json({ ingredients: [] });
  }

  // Fan out in parallel — USDA allows concurrent requests
  const results = await Promise.all(
    ingredients.map(async (ing) => {
      const nutrition = await lookupNutrition(
        ing.ingredient_name,
        ing.quantity,
        ing.unit
      ).catch(() => ({ calories: null, protein_g: null, carbs_g: null, fat_g: null }));
      return { ...ing, ...nutrition };
    })
  );

  return NextResponse.json({ ingredients: results });
}
