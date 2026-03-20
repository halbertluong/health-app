"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { CreateRecipeSchema, type CreateRecipeInput } from "@health-app/validators";
import type { RecipeWithIngredients } from "@health-app/types";
import { createClient } from "@/lib/supabase/client";

const GROCERY_CATEGORIES = [
  ["produce", "Produce"],
  ["meat_seafood", "Meat & Seafood"],
  ["dairy", "Dairy"],
  ["pantry", "Pantry"],
  ["frozen", "Frozen"],
  ["beverages", "Beverages"],
  ["household", "Household"],
  ["other", "Other"],
] as const;

interface RecipeFormProps {
  recipe?: RecipeWithIngredients;
}

export function RecipeForm({ recipe }: RecipeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [calcingNutrition, setCalcingNutrition] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!recipe;

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<CreateRecipeInput>({
    resolver: zodResolver(CreateRecipeSchema),
    defaultValues: recipe
      ? {
          name: recipe.name,
          description: recipe.description ?? "",
          instructions: recipe.instructions ?? "",
          prep_time: recipe.prep_time ?? undefined,
          cook_time: recipe.cook_time ?? undefined,
          servings: recipe.servings,
          is_public: recipe.is_public,
          ingredients: recipe.recipe_ingredients
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((ing) => ({
              ingredient_name: ing.ingredient_name,
              quantity: ing.quantity,
              unit: ing.unit,
              grocery_category: ing.grocery_category,
              calories: ing.calories ?? undefined,
              protein_g: ing.protein_g ?? undefined,
              carbs_g: ing.carbs_g ?? undefined,
              fat_g: ing.fat_g ?? undefined,
              notes: ing.notes ?? undefined,
            })),
        }
      : {
          name: "",
          servings: 1,
          is_public: false,
          ingredients: [
            { ingredient_name: "", quantity: 1, unit: "g", grocery_category: "other" },
          ],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });
  const watchedServings = watch("servings") ?? 1;
  const watchedIngredients = watch("ingredients");

  async function fetchNutrition(ingredients: CreateRecipeInput["ingredients"]) {
    const res = await fetch("/api/recipes/nutrition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredients: ingredients.map(i => ({
          ingredient_name: i.ingredient_name,
          quantity: i.quantity,
          unit: i.unit,
        })),
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.ingredients as Array<{
      ingredient_name: string;
      calories: number | null;
      protein_g: number | null;
      carbs_g: number | null;
      fat_g: number | null;
    }>;
  }

  async function onSubmit(data: CreateRecipeInput) {
    setLoading(true);
    setCalcingNutrition(true);
    setError(null);

    // Step 1: auto-calculate nutrition per ingredient
    let enrichedIngredients = data.ingredients;
    try {
      const nutritionData = await fetchNutrition(data.ingredients);
      if (nutritionData) {
        enrichedIngredients = data.ingredients.map((ing, i) => ({
          ...ing,
          calories: nutritionData[i]?.calories ?? ing.calories,
          protein_g: nutritionData[i]?.protein_g ?? ing.protein_g,
          carbs_g: nutritionData[i]?.carbs_g ?? ing.carbs_g,
          fat_g: nutritionData[i]?.fat_g ?? ing.fat_g,
        }));
      }
    } catch {
      // continue without nutrition if lookup fails
    }
    setCalcingNutrition(false);

    // Step 2: aggregate macros per serving
    const totals = enrichedIngredients.reduce(
      (sum, ing) => ({
        cal: sum.cal + (ing.calories ?? 0),
        pro: sum.pro + (ing.protein_g ?? 0),
        carb: sum.carb + (ing.carbs_g ?? 0),
        fat: sum.fat + (ing.fat_g ?? 0),
      }),
      { cal: 0, pro: 0, carb: 0, fat: 0 }
    );
    const servings = Math.max(data.servings, 1);

    const recipeData = {
      name: data.name,
      description: data.description ?? null,
      instructions: data.instructions ?? null,
      prep_time: data.prep_time ?? null,
      cook_time: data.cook_time ?? null,
      servings: data.servings,
      is_public: data.is_public ?? false,
      calories_per_serving: totals.cal > 0 ? Math.round(totals.cal / servings) : null,
      protein_g_per_serving: totals.pro > 0 ? Math.round(totals.pro / servings * 10) / 10 : null,
      carbs_g_per_serving: totals.carb > 0 ? Math.round(totals.carb / servings * 10) / 10 : null,
      fat_g_per_serving: totals.fat > 0 ? Math.round(totals.fat / servings * 10) / 10 : null,
    };

    const supabase = createClient();
    let recipeId: string;

    if (isEdit && recipe) {
      const { error: updateErr } = await supabase
        .from("recipes")
        .update(recipeData)
        .eq("id", recipe.id);

      if (updateErr) { setError(updateErr.message); setLoading(false); return; }

      await supabase.from("recipe_ingredients").delete().eq("recipe_id", recipe.id);
      recipeId = recipe.id;
    } else {
      const { data: inserted, error: insertErr } = await supabase
        .from("recipes")
        .insert(recipeData)
        .select()
        .single();

      if (insertErr || !inserted) { setError(insertErr?.message ?? "Failed to create"); setLoading(false); return; }
      recipeId = inserted.id;
    }

    const { error: ingErr } = await supabase.from("recipe_ingredients").insert(
      enrichedIngredients.map((ing, i) => ({
        recipe_id: recipeId,
        ingredient_name: ing.ingredient_name,
        quantity: ing.quantity,
        unit: ing.unit,
        grocery_category: ing.grocery_category,
        calories: ing.calories ?? null,
        protein_g: ing.protein_g ?? null,
        carbs_g: ing.carbs_g ?? null,
        fat_g: ing.fat_g ?? null,
        notes: ing.notes ?? null,
        sort_order: i,
      }))
    );

    if (ingErr) { setError(ingErr.message); setLoading(false); return; }

    router.push(`/recipes/${recipeId}`);
    router.refresh();
  }

  // Live macro preview from any already-stored nutrition
  const liveCalories = watchedIngredients.reduce((s, i) => s + (i.calories ?? 0), 0);
  const liveProtein = watchedIngredients.reduce((s, i) => s + (i.protein_g ?? 0), 0);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Info */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Basic Info</h2>

        <div>
          <label className="block text-sm font-medium mb-1.5">Recipe Name *</label>
          <input
            {...register("name")}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            placeholder="e.g., Grilled Chicken Bowl"
          />
          {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Description</label>
          <textarea
            {...register("description")}
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
            placeholder="Brief description of the dish..."
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Prep time (min)</label>
            <input
              {...register("prep_time", { valueAsNumber: true })}
              type="number" min={0}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Cook time (min)</label>
            <input
              {...register("cook_time", { valueAsNumber: true })}
              type="number" min={0}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Servings *</label>
            <input
              {...register("servings", { valueAsNumber: true })}
              type="number" min={0.5} step={0.5}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1.5">Instructions</label>
          <textarea
            {...register("instructions")}
            rows={6}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-y"
            placeholder="Add one step per line..."
          />
        </div>
      </div>

      {/* Ingredients */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Ingredients</h2>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-primary/5 border border-primary/20 px-2.5 py-1.5 rounded-lg">
            <Sparkles className="h-3 w-3 text-primary" />
            Nutrition auto-calculated on save
          </div>
        </div>

        {/* Column headers — hidden on mobile */}
        <div className="hidden sm:grid sm:grid-cols-[1fr_5rem_7rem_8rem_2rem] gap-2 text-xs font-medium text-muted-foreground px-1">
          <span>Ingredient</span>
          <span>Qty</span>
          <span>Unit</span>
          <span>Category</span>
          <span />
        </div>

        <div className="space-y-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex flex-col sm:grid sm:grid-cols-[1fr_5rem_7rem_8rem_2rem] gap-2">
              {/* Mobile label */}
              <div className="sm:contents">
                <div className="flex gap-2 items-center">
                  <input
                    {...register(`ingredients.${index}.ingredient_name`)}
                    placeholder="Ingredient name"
                    className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  {/* Delete on mobile — shown inline */}
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="sm:hidden p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-2 sm:contents">
                  <input
                    {...register(`ingredients.${index}.quantity`, { valueAsNumber: true })}
                    type="number" min={0} step={0.01} placeholder="1"
                    className="w-20 sm:w-auto border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <input
                    {...register(`ingredients.${index}.unit`)}
                    placeholder="unit"
                    className="flex-1 sm:flex-none border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <select
                    {...register(`ingredients.${index}.grocery_category`)}
                    className="flex-1 sm:flex-none border rounded-lg px-2 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    {GROCERY_CATEGORIES.map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {/* Delete on desktop */}
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    disabled={fields.length === 1}
                    className="hidden sm:flex p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={() => append({ ingredient_name: "", quantity: 1, unit: "g", grocery_category: "other" })}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Ingredient
        </button>

        {/* Live preview if prior nutrition data exists */}
        {liveCalories > 0 && (
          <div className="text-xs text-muted-foreground border-t pt-3 mt-2">
            Previously calculated: ~{Math.round(liveCalories / Math.max(watchedServings, 1))} kcal
            {liveProtein > 0 && ` · ${Math.round(liveProtein / Math.max(watchedServings, 1))}g protein`} per serving
            <span className="ml-1 text-primary">(will recalculate on save)</span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-destructive/10 text-destructive text-sm px-4 py-3">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="border rounded-lg px-4 py-2 text-sm hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="bg-primary text-primary-foreground px-6 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {calcingNutrition ? "Calculating nutrition…" : "Saving…"}
            </>
          ) : isEdit ? "Save Changes" : "Create Recipe"}
        </button>
      </div>
    </form>
  );
}
