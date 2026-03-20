/**
 * Parses a free-text ingredient line into structured fields for recipe_ingredients table.
 * e.g. "2 cups all-purpose flour" → { quantity: 2, unit: "cups", ingredient_name: "all-purpose flour" }
 */
export function parseIngredientLine(
  line: string,
  sortOrder: number
): {
  ingredient_name: string;
  quantity: number;
  unit: string;
  sort_order: number;
  grocery_category: "other";
} {
  const clean = line.trim();

  // Handle unicode fractions and written fractions
  const withFracs = clean
    .replace("½", "0.5")
    .replace("¼", "0.25")
    .replace("¾", "0.75")
    .replace("⅓", "0.333")
    .replace("⅔", "0.667")
    .replace("⅛", "0.125");

  // Pattern: optional leading number (int, decimal, or fraction), optional unit, then the name
  const numPattern = /^(\d+(?:[./]\d+)?(?:\s+\d+\/\d+)?)\s*/;
  const unitList = [
    "tablespoons?", "tbsp", "teaspoons?", "tsp",
    "fluid ounces?", "fl\\.? oz",
    "cups?", "c\\b",
    "pounds?", "lbs?",
    "ounces?", "oz\\b",
    "kilograms?", "kg\\b",
    "grams?", "g\\b",
    "millilit(?:ers?|res?)", "ml\\b",
    "lit(?:ers?|res?)", "l\\b",
    "pints?", "quarts?", "gallons?",
    "cans?", "jars?", "packages?", "pkgs?",
    "cloves?", "heads?", "stalks?", "bunches?", "sprigs?",
    "slices?", "pieces?", "strips?", "fillets?",
    "large", "medium", "small",
    "whole", "halves?",
    "pinch(?:es)?", "dash(?:es)?",
    "handfuls?",
  ];
  const unitPattern = new RegExp(`^(${unitList.join("|")})\\b`, "i");

  let remaining = withFracs;
  let quantity = 1;
  let unit = "unit";

  // Extract leading number
  const numMatch = remaining.match(numPattern);
  if (numMatch?.[0]) {
    const raw = (numMatch[1] ?? "").trim();
    if (raw.includes("/")) {
      const parts = raw.split("/");
      const num = parseFloat(parts[0] ?? "1");
      const den = parseFloat(parts[1] ?? "1");
      quantity = den !== 0 ? num / den : 1;
    } else if (raw.includes(" ")) {
      // mixed number like "1 1/2"
      const [whole, frac] = raw.split(" ");
      const [num, den] = (frac ?? "").split("/");
      quantity = parseFloat(whole ?? "1") + (num && den ? parseInt(num) / parseInt(den) : 0);
    } else {
      quantity = parseFloat(raw) || 1;
    }
    remaining = remaining.slice(numMatch[0].length);
  }

  // Extract unit
  const unitMatch = remaining.match(unitPattern);
  if (unitMatch?.[0]) {
    unit = unitMatch[0].toLowerCase().replace(/s$/, ""); // normalize plural
    remaining = remaining.slice(unitMatch[0].length).replace(/^[,\s]+/, "");
  } else {
    unit = "unit";
  }

  const ingredient_name = remaining.trim() || clean;

  return {
    ingredient_name,
    quantity: isNaN(quantity) ? 1 : Math.round(quantity * 1000) / 1000,
    unit,
    sort_order: sortOrder,
    grocery_category: "other" as const,
  };
}

/**
 * Joins instruction steps into a newline-delimited string for the recipes.instructions TEXT column.
 */
export function joinInstructions(steps: string[]): string {
  return steps.map(s => s.trim()).filter(Boolean).join("\n");
}
