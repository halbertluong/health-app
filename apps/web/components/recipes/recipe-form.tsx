"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2, Sparkles, Loader2, Star, Heart, X } from "lucide-react";
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
  const [categoryInput, setCategoryInput] = useState("");
  const isEdit = !!recipe;

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<CreateRecipeInput>({
    resolver: zodResolver(CreateRecipeSchema),
    defaultValues: recipe
      ? {
          name: recipe.name,
          description: recipe.description ?? "",
          instructions: recipe.instructions ?? "",
          prep_time: recipe.prep_time ?? undefined,
          cook_time: recipe.cook_time ?? undefined,
          servings: recipe.servings,
          serving_size: recipe.serving_size ?? "",
          is_public: recipe.is_public,
          source_url: recipe.source_url ?? "",
          source_name: recipe.source_name ?? "",
          notes: recipe.notes ?? "",
          rating: recipe.rating ?? undefined,
          difficulty: recipe.difficulty ?? undefined,
          is_favorite: recipe.is_favorite ?? false,
          categories: recipe.categories ?? [],
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
          is_favorite: false,
          categories: [],
          ingredients: [
            { ingredient_name: "", quantity: 1, unit: "g", grocery_category: "other" },
          ],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "ingredients" });
  const watchedServings = watch("servings") ?? 1;
  const watchedIngredients = watch("ingredients");
  const watchedCategories = watch("categories") ?? [];

  function addCategory(cat: string) {
    const trimmed = cat.trim().toLowerCase();
    if (trimmed && !watchedCategories.includes(trimmed)) {
      setValue("categories", [...watchedCategories, trimmed]);
    }
    setCategoryInput("");
  }

  function removeCategory(cat: string) {
    setValue("categories", watchedCategories.filter(c => c !== cat));
  }

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

    // Auto-calculate nutrition per ingredient
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

    // Aggregate macros per serving
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
      description: data.description || null,
      instructions: data.instructions || null,
      prep_time: data.prep_time ?? null,
      cook_time: data.cook_time ?? null,
      servings: data.servings,
      serving_size: data.serving_size || null,
      is_public: data.is_public ?? false,
      source_url: data.source_url || null,
      source_name: data.source_name || null,
      notes: data.notes || null,
      rating: data.rating ?? null,
      difficulty: data.difficulty ?? null,
      is_favorite: data.is_favorite ?? false,
      categories: data.categories ?? [],
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

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Prep (min)</label>
            <input
              {...register("prep_time", { valueAsNumber: true })}
              type="number" min={0}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Cook (min)</label>
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
          <div>
            <label className="block text-sm font-medium mb-1.5">Serving size</label>
            <input
              {...register("serving_size")}
              placeholder="e.g., 1 bowl"
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

      {/* Details */}
      <div className="bg-card border rounded-xl p-6 space-y-4">
        <h2 className="font-semibold">Details</h2>

        {/* Favorite + Difficulty + Rating */}
        <div className="flex flex-wrap items-center gap-4">
          <Controller
            control={control}
            name="is_favorite"
            render={({ field }) => (
              <button
                type="button"
                onClick={() => field.onChange(!field.value)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  field.value
                    ? "bg-red-50 border-red-200 text-red-600 dark:bg-red-950/30 dark:border-red-800 dark:text-red-400"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                <Heart className={`h-4 w-4 ${field.value ? "fill-red-500 text-red-500" : ""}`} />
                Favorite
              </button>
            )}
          />

          <Controller
            control={control}
            name="difficulty"
            render={({ field }) => (
              <div className="flex gap-1">
                {(["easy", "medium", "hard"] as const).map(d => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => field.onChange(field.value === d ? null : d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize border transition-colors ${
                      field.value === d
                        ? d === "easy"
                          ? "bg-green-100 text-green-700 border-green-300 dark:bg-green-950/40 dark:text-green-400 dark:border-green-700"
                          : d === "medium"
                          ? "bg-yellow-100 text-yellow-700 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-700"
                          : "bg-red-100 text-red-700 border-red-300 dark:bg-red-950/40 dark:text-red-400 dark:border-red-700"
                        : "border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          />

          <Controller
            control={control}
            name="rating"
            render={({ field }) => (
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => field.onChange(field.value === star ? null : star)}
                    className="p-0.5"
                  >
                    <Star className={`h-5 w-5 transition-colors ${
                      (field.value ?? 0) >= star
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30 hover:text-amber-300"
                    }`} />
                  </button>
                ))}
              </div>
            )}
          />
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Categories</label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {watchedCategories.map(cat => (
              <span key={cat} className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full font-medium capitalize">
                {cat}
                <button type="button" onClick={() => removeCategory(cat)} className="hover:text-primary/60 ml-0.5">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <input
            value={categoryInput}
            onChange={e => setCategoryInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === ",") {
                e.preventDefault();
                addCategory(categoryInput);
              }
            }}
            onBlur={() => { if (categoryInput.trim()) addCategory(categoryInput); }}
            placeholder="Type a category and press Enter (e.g., high protein, quick, vegan)"
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
          />
        </div>

        {/* Source */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Source URL</label>
            <input
              {...register("source_url")}
              type="url"
              placeholder="https://..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5">Source Name</label>
            <input
              {...register("source_name")}
              placeholder="e.g., NYT Cooking, Mum's recipe"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium mb-1.5">Notes</label>
          <textarea
            {...register("notes")}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background resize-none"
            placeholder="Tips, substitutions, variations..."
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

        <div className="hidden sm:grid sm:grid-cols-[1fr_5rem_7rem_8rem_2rem] gap-2 text-xs font-medium text-muted-foreground px-1">
          <span>Ingredient</span>
          <span>Qty</span>
          <span>Unit</span>
          <span>Category</span>
          <span />
        </div>

        <div className="space-y-3">
          {fields.map((field, index) => {
            const ing = watchedIngredients[index];
            const hasAnyMacro = ing && (
              ing.calories != null || ing.protein_g != null ||
              ing.carbs_g != null || ing.fat_g != null
            );
            return (
              <div key={field.id} className="space-y-1">
                <div className="flex flex-col sm:grid sm:grid-cols-[1fr_5rem_7rem_8rem_2rem] gap-2">
                  <div className="sm:contents">
                    <div className="flex gap-2 items-center">
                      <input
                        {...register(`ingredients.${index}.ingredient_name`)}
                        placeholder="Ingredient name"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                      />
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
                {/* Per-ingredient nutrition (shown when stored from a previous save) */}
                {hasAnyMacro && (
                  <div className="flex gap-3 pl-1 text-[11px] text-muted-foreground">
                    {ing.calories != null && <span>{Math.round(Number(ing.calories))} kcal</span>}
                    {ing.protein_g != null && <span>{Number(ing.protein_g).toFixed(1)}g protein</span>}
                    {ing.carbs_g != null && <span>{Number(ing.carbs_g).toFixed(1)}g carbs</span>}
                    {ing.fat_g != null && <span>{Number(ing.fat_g).toFixed(1)}g fat</span>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => append({ ingredient_name: "", quantity: 1, unit: "g", grocery_category: "other" })}
          className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Add Ingredient
        </button>

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
