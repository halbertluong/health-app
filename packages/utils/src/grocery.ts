import type {
  MealPlanSlotWithRecipe,
  GroceryItem,
  GroceryCategory,
  PantryItem,
} from "@health-app/types";

interface AggregatedIngredient {
  ingredient_name: string;
  // key = unit, value = total quantity
  quantities: Record<string, number>;
  category: GroceryCategory;
}

/**
 * Aggregate all recipe ingredients from a week's meal plan slots into
 * a flat grocery item list, combining same ingredient+unit entries.
 */
export function aggregateGroceryItems(
  slots: MealPlanSlotWithRecipe[],
  pantryItems: PantryItem[] = []
): Omit<GroceryItem, "id" | "grocery_list_id">[] {
  const pantryMap = new Map(
    pantryItems
      .filter((p) => p.in_stock)
      .map((p) => [p.ingredient_name.toLowerCase().trim(), p])
  );

  // ingredient_name+unit → aggregated quantity
  const map = new Map<string, AggregatedIngredient>();

  for (const slot of slots) {
    const recipe = slot.recipe;
    if (!recipe) continue;

    const servingRatio = slot.planned_servings / recipe.servings;

    // recipe_ingredients should be joined in the query; skip if not present
    const ingredients = (recipe as any).recipe_ingredients ?? [];
    for (const ing of ingredients) {
      const key = `${ing.ingredient_name.toLowerCase().trim()}::${ing.unit}`;
      const existing = map.get(key);
      const qty = ing.quantity * servingRatio;

      if (existing) {
        existing.quantities[ing.unit] =
          (existing.quantities[ing.unit] ?? 0) + qty;
      } else {
        map.set(key, {
          ingredient_name: ing.ingredient_name,
          quantities: { [ing.unit]: qty },
          category: ing.grocery_category ?? "other",
        });
      }
    }
  }

  const items: Omit<GroceryItem, "id" | "grocery_list_id">[] = [];
  let sortOrder = 0;

  for (const agg of map.values()) {
    for (const [unit, qty] of Object.entries(agg.quantities)) {
      const nameKey = agg.ingredient_name.toLowerCase().trim();
      const inPantry = pantryMap.has(nameKey);

      items.push({
        ingredient_name: agg.ingredient_name,
        aggregated_qty: Math.ceil(qty * 100) / 100,
        unit,
        category: agg.category,
        have_on_hand: inPantry,
        checked: inPantry,
        notes: null,
        sort_order: sortOrder++,
      });
    }
  }

  // Sort: unchecked first, then by category, then by name
  return items.sort((a, b) => {
    if (a.have_on_hand !== b.have_on_hand) {
      return a.have_on_hand ? 1 : -1;
    }
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.ingredient_name.localeCompare(b.ingredient_name);
  });
}

/** Group grocery items by category for display */
export function groupByCategory(
  items: GroceryItem[]
): Record<GroceryCategory, GroceryItem[]> {
  const groups: Partial<Record<GroceryCategory, GroceryItem[]>> = {};
  for (const item of items) {
    if (!groups[item.category]) groups[item.category] = [];
    groups[item.category]!.push(item);
  }
  return groups as Record<GroceryCategory, GroceryItem[]>;
}

export const GROCERY_CATEGORY_LABELS: Record<GroceryCategory, string> = {
  produce: "Produce",
  meat_seafood: "Meat & Seafood",
  dairy: "Dairy & Eggs",
  pantry: "Pantry & Dry Goods",
  frozen: "Frozen",
  beverages: "Beverages",
  household: "Household",
  other: "Other",
};
