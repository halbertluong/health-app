import type {
  RecipeIngredient,
  Recipe,
  Macros,
  MealPlanSlot,
  MealLog,
  DayMacroSummary,
} from "@health-app/types";

/** Sum macros across all ingredients for a recipe at given servings */
export function calcRecipeMacros(
  ingredients: RecipeIngredient[],
  servings: number,
  recipeServings: number
): Macros {
  const ratio = servings / recipeServings;
  return ingredients.reduce(
    (acc, ing) => ({
      calories: acc.calories + (ing.calories ?? 0) * ratio,
      protein_g: acc.protein_g + (ing.protein_g ?? 0) * ratio,
      carbs_g: acc.carbs_g + (ing.carbs_g ?? 0) * ratio,
      fat_g: acc.fat_g + (ing.fat_g ?? 0) * ratio,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

/** Compute planned macros from a recipe at given servings using per-serving fields */
export function planSlotMacros(recipe: Recipe, servings: number): Macros {
  const s = servings / recipe.servings;
  return {
    calories: (recipe.calories_per_serving ?? 0) * s,
    protein_g: (recipe.protein_g_per_serving ?? 0) * s,
    carbs_g: (recipe.carbs_g_per_serving ?? 0) * s,
    fat_g: (recipe.fat_g_per_serving ?? 0) * s,
  };
}

/** Sum macros across an array of planned slots for a single day */
export function sumPlannedMacros(slots: MealPlanSlot[]): Macros {
  return slots.reduce(
    (acc, slot) => ({
      calories: acc.calories + (slot.planned_calories ?? 0),
      protein_g: acc.protein_g + (slot.planned_protein_g ?? 0),
      carbs_g: acc.carbs_g + (slot.planned_carbs_g ?? 0),
      fat_g: acc.fat_g + (slot.planned_fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

/** Sum macros across actual meal logs */
export function sumActualMacros(logs: MealLog[]): Macros {
  return logs.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.total_calories ?? 0),
      protein_g: acc.protein_g + (log.total_protein_g ?? 0),
      carbs_g: acc.carbs_g + (log.total_carbs_g ?? 0),
      fat_g: acc.fat_g + (log.total_fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

/** Build a day-by-day planned vs actual macro summary for a week */
export function buildWeekMacroSummary(
  dates: string[],
  slotsByDate: Record<string, MealPlanSlot[]>,
  logsByDate: Record<string, MealLog[]>
): DayMacroSummary[] {
  return dates.map((date) => ({
    date,
    planned: sumPlannedMacros(slotsByDate[date] ?? []),
    actual: sumActualMacros(logsByDate[date] ?? []),
  }));
}

export function roundMacro(value: number): number {
  return Math.round(value * 10) / 10;
}
