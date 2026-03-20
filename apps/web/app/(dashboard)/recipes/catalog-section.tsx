"use client";

import { useState } from "react";
import { Plus, Check, Clock, ChefHat, X, Users } from "lucide-react";
import { RECIPE_CATALOG, type CatalogRecipe } from "@/lib/catalog/recipes";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { parseIngredientLine, joinInstructions } from "@/lib/recipe-helpers";

const TAG_FILTERS = ["all", "high protein", "vegan", "vegetarian", "quick", "meal prep", "low carb", "breakfast"];

// Curated Unsplash photo IDs for each recipe (keyword-matched)
const FOOD_IMAGES: Record<string, string> = {
  "Greek Chicken Bowl": "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80",
  "Overnight Oats": "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&q=80",
  "Salmon & Roasted Veggies": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&q=80",
  "Avocado Toast with Eggs": "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&q=80",
  "Black Bean Tacos": "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&q=80",
  "Quinoa Power Salad": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&q=80",
  "Turkey & Veggie Stir-Fry": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&q=80",
  "Green Smoothie Bowl": "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400&q=80",
  "Baked Lemon Herb Chicken": "https://images.unsplash.com/photo-1598103442097-8b74394b95c3?w=400&q=80",
  "Lentil & Veggie Soup": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&q=80",
  "Shrimp & Zoodle Bowl": "https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&q=80",
  "Sweet Potato & Black Bean Burrito": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&q=80",
  "Tuna Poke Bowl": "https://images.unsplash.com/photo-1546069901-d5bfd2cbfb1f?w=400&q=80",
  "Egg White Frittata": "https://images.unsplash.com/photo-1493770348161-369560ae357d?w=400&q=80",
  "Mango Chia Pudding": "https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400&q=80",
  "Chicken Caesar Wrap": "https://images.unsplash.com/photo-1551782450-a2132b4ba21d?w=400&q=80",
  "Cauliflower Fried Rice": "https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400&q=80",
  "Turkey Meatball Bowl": "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&q=80",
};

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&q=80";

export function RecipeCatalogSection({ existingNames }: { existingNames: string[] }) {
  const [filter, setFilter] = useState("all");
  const [added, setAdded] = useState<Set<string>>(new Set(existingNames.map(n => n.toLowerCase())));
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<CatalogRecipe | null>(null);
  const router = useRouter();

  const filtered = filter === "all"
    ? RECIPE_CATALOG
    : RECIPE_CATALOG.filter(r => r.tags.includes(filter));

  async function handleAdd(recipe: CatalogRecipe) {
    if (added.has(recipe.name.toLowerCase()) || pending.has(recipe.name)) return;

    setPending(p => new Set(p).add(recipe.name));

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Parse ingredient lines into structured rows
    const parsedIngredients = recipe.ingredients
      .filter(Boolean)
      .map((line, i) => parseIngredientLine(line, i));

    // Look up nutrition for each ingredient
    let nutritionMap: Record<number, { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null }> = {};
    try {
      const res = await fetch("/api/recipes/nutrition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredients: parsedIngredients.map(ing => ({
            ingredient_name: ing.ingredient_name,
            quantity: ing.quantity,
            unit: ing.unit,
          })),
        }),
      });
      if (res.ok) {
        const { ingredients: nutritionData } = await res.json();
        nutritionData.forEach((n: any, i: number) => { nutritionMap[i] = n; });
      }
    } catch { /* skip nutrition if API fails */ }

    // Compute per-serving totals from ingredient nutrition
    const enriched = parsedIngredients.map((ing, i) => ({ ...ing, ...nutritionMap[i] }));
    const totals = enriched.reduce(
      (s, ing) => ({ cal: s.cal + (ing.calories ?? 0), pro: s.pro + (ing.protein_g ?? 0), carb: s.carb + (ing.carbs_g ?? 0), fat: s.fat + (ing.fat_g ?? 0) }),
      { cal: 0, pro: 0, carb: 0, fat: 0 }
    );
    const servings = Math.max(recipe.servings, 1);
    const cal = totals.cal > 0 ? Math.round(totals.cal / servings) : recipe.calories_per_serving;
    const pro = totals.pro > 0 ? Math.round(totals.pro / servings * 10) / 10 : recipe.protein_g;
    const carb = totals.carb > 0 ? Math.round(totals.carb / servings * 10) / 10 : recipe.carbs_g;
    const fat = totals.fat > 0 ? Math.round(totals.fat / servings * 10) / 10 : recipe.fat_g;

    const { data: inserted } = await supabase
      .from("recipes")
      .insert({
        user_id: user.id,
        name: recipe.name,
        description: recipe.description,
        instructions: joinInstructions(recipe.instructions),
        prep_time: recipe.prep_time_minutes,
        cook_time: recipe.cook_time_minutes,
        servings: recipe.servings,
        calories_per_serving: cal,
        protein_g_per_serving: pro,
        carbs_g_per_serving: carb,
        fat_g_per_serving: fat,
        image_url: FOOD_IMAGES[recipe.name] ?? FALLBACK_IMAGE,
        categories: recipe.tags,
      })
      .select("id")
      .single();

    if (inserted && enriched.length > 0) {
      const ingredientRows = enriched.map(ing => ({
        recipe_id: inserted.id,
        ingredient_name: ing.ingredient_name,
        quantity: ing.quantity,
        unit: ing.unit,
        sort_order: ing.sort_order,
        grocery_category: ing.grocery_category,
        calories: ing.calories ?? null,
        protein_g: ing.protein_g ?? null,
        carbs_g: ing.carbs_g ?? null,
        fat_g: ing.fat_g ?? null,
      }));
      await supabase.from("recipe_ingredients").insert(ingredientRows);
    }

    setAdded(a => new Set(a).add(recipe.name.toLowerCase()));
    setPending(p => { const n = new Set(p); n.delete(recipe.name); return n; });
    router.refresh();
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Discover Recipes</h2>
        <span className="text-xs text-muted-foreground">{RECIPE_CATALOG.length} recipes</span>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        {TAG_FILTERS.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
              filter === t
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/70"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Recipe cards — horizontal scroll on mobile, grid on desktop */}
      <div className="flex gap-3 overflow-x-auto pb-3 sm:pb-0 sm:grid sm:grid-cols-2 lg:grid-cols-3 sm:gap-4 scrollbar-none">
        {filtered.map(recipe => {
          const isAdded = added.has(recipe.name.toLowerCase());
          const isLoading = pending.has(recipe.name);
          const imageUrl = FOOD_IMAGES[recipe.name] ?? FALLBACK_IMAGE;
          const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

          return (
            <div
              key={recipe.name}
              className="shrink-0 w-60 sm:w-auto bg-card border rounded-2xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
              onClick={() => setPreview(recipe)}
            >
              {/* Food image */}
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={recipe.name}
                  className="w-full h-36 object-cover"
                />
                {/* Macro overlay */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                  <div className="flex gap-3 text-[10px] text-white font-medium">
                    <span>{recipe.calories_per_serving} cal</span>
                    <span>{recipe.protein_g}g pro</span>
                    <span>{recipe.carbs_g}g carbs</span>
                  </div>
                </div>
                {/* Tags */}
                {recipe.tags.slice(0, 1).map(tag => (
                  <span key={tag} className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="p-3">
                <p className="font-semibold text-sm leading-tight mb-1">{recipe.name}</p>
                <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{recipe.description}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />{totalTime}m
                  </span>
                  <span className="flex items-center gap-1">
                    <ChefHat className="h-3 w-3" />{recipe.servings} servings
                  </span>
                </div>

                <button
                  onClick={e => { e.stopPropagation(); handleAdd(recipe); }}
                  disabled={isAdded || isLoading}
                  className={`w-full flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition-all ${
                    isAdded
                      ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                      : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
                  }`}
                >
                  {isAdded ? (
                    <><Check className="h-3.5 w-3.5" /> Added</>
                  ) : isLoading ? (
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <><Plus className="h-3.5 w-3.5" /> Add Recipe</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recipe detail modal */}
      {preview && (
        <CatalogDetailModal
          recipe={preview}
          imageUrl={FOOD_IMAGES[preview.name] ?? FALLBACK_IMAGE}
          isAdded={added.has(preview.name.toLowerCase())}
          isLoading={pending.has(preview.name)}
          onClose={() => setPreview(null)}
          onAdd={() => handleAdd(preview)}
        />
      )}
    </section>
  );
}

function CatalogDetailModal({
  recipe,
  imageUrl,
  isAdded,
  isLoading,
  onClose,
  onAdd,
}: {
  recipe: CatalogRecipe;
  imageUrl: string;
  isAdded: boolean;
  isLoading: boolean;
  onClose: () => void;
  onAdd: () => void;
}) {
  const totalTime = (recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 bg-card w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Hero image */}
        <div className="relative shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={recipe.name} className="w-full h-52 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/40 hover:bg-black/60 text-white rounded-full p-1.5 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
          {/* Macro overlay on image */}
          <div className="absolute bottom-3 inset-x-4 flex gap-3 text-xs text-white font-medium">
            <span className="bg-black/50 px-2 py-0.5 rounded-full">{recipe.calories_per_serving} cal</span>
            <span className="bg-black/50 px-2 py-0.5 rounded-full">{recipe.protein_g}g protein</span>
            <span className="bg-black/50 px-2 py-0.5 rounded-full">{recipe.carbs_g}g carbs</span>
            <span className="bg-black/50 px-2 py-0.5 rounded-full">{recipe.fat_g}g fat</span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div>
            <h2 className="text-xl font-bold">{recipe.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">{recipe.description}</p>
          </div>

          {/* Meta */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {totalTime > 0 && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {totalTime} min
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users className="h-4 w-4" />
              {recipe.servings} serving{recipe.servings !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5">
              <ChefHat className="h-4 w-4" />
              {recipe.ingredients.length} ingredients
            </span>
          </div>

          {/* Tags */}
          <div className="flex gap-1.5 flex-wrap">
            {recipe.tags.map(tag => (
              <span key={tag} className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full capitalize font-medium">
                {tag}
              </span>
            ))}
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Ingredients</h3>
            <ul className="space-y-1">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="font-semibold text-sm mb-2">Instructions</h3>
            <ol className="space-y-2">
              {recipe.instructions.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-muted-foreground">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Sticky add button */}
        <div className="p-4 border-t bg-card shrink-0">
          <button
            onClick={onAdd}
            disabled={isAdded || isLoading}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-all ${
              isAdded
                ? "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                : "bg-primary text-primary-foreground hover:bg-primary/90 active:scale-95"
            }`}
          >
            {isAdded ? (
              <><Check className="h-4 w-4" /> Added to My Recipes</>
            ) : isLoading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <><Plus className="h-4 w-4" /> Add to My Recipes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
