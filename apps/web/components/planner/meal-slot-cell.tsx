"use client";

import { useState } from "react";
import { Plus, X, ChefHat } from "lucide-react";
import type { MealPlanSlotWithRecipe, MealType } from "@health-app/types";
import { createClient } from "@/lib/supabase/client";
import { planSlotMacros } from "@health-app/utils";
import { RecipePicker } from "./recipe-picker";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  planned: "bg-muted text-muted-foreground",
  cooked: "bg-blue-100 text-blue-700",
  eaten_as_planned: "bg-green-100 text-green-700",
  modified: "bg-yellow-100 text-yellow-700",
  skipped: "bg-gray-100 text-gray-500 line-through",
  replaced: "bg-purple-100 text-purple-700",
};

interface MealSlotCellProps {
  date: string;
  mealType: MealType;
  slot: MealPlanSlotWithRecipe | undefined;
  userId: string;
  onUpdated: (slot: MealPlanSlotWithRecipe | null) => void;
}

export function MealSlotCell({ date, mealType, slot, userId, onUpdated }: MealSlotCellProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleRemove() {
    if (!slot) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from("meal_plan_slots").delete().eq("id", slot.id);
    onUpdated(null);
    setLoading(false);
  }

  async function handleSelectRecipe(recipeId: string, servings: number) {
    setLoading(true);
    const supabase = createClient();

    // Fetch recipe for macro calculation
    const { data: recipe } = await supabase
      .from("recipes")
      .select("*")
      .eq("id", recipeId)
      .single();

    const macros = recipe ? planSlotMacros(recipe as any, servings) : null;

    const slotData = {
      user_id: userId,
      date,
      meal_type: mealType,
      planned_recipe_id: recipeId,
      planned_servings: servings,
      planned_calories: macros?.calories ?? null,
      planned_protein_g: macros?.protein_g ?? null,
      planned_carbs_g: macros?.carbs_g ?? null,
      planned_fat_g: macros?.fat_g ?? null,
      status: "planned" as const,
    };

    let result;
    if (slot) {
      result = await supabase
        .from("meal_plan_slots")
        .update(slotData)
        .eq("id", slot.id)
        .select("*, recipe:recipes(id, name, image_url, servings, calories_per_serving, protein_g_per_serving, carbs_g_per_serving, fat_g_per_serving)")
        .single();
    } else {
      result = await supabase
        .from("meal_plan_slots")
        .insert(slotData)
        .select("*, recipe:recipes(id, name, image_url, servings, calories_per_serving, protein_g_per_serving, carbs_g_per_serving, fat_g_per_serving)")
        .single();
    }

    if (result.data) {
      onUpdated(result.data as MealPlanSlotWithRecipe);
    }

    setShowPicker(false);
    setLoading(false);
  }

  if (!slot) {
    return (
      <>
        <button
          onClick={() => setShowPicker(true)}
          className="w-full h-full min-h-[100px] flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/30 transition-colors group"
          disabled={loading}
        >
          <Plus className="h-4 w-4 group-hover:scale-110 transition-transform" />
        </button>
        {showPicker && (
          <RecipePicker
            onSelect={handleSelectRecipe}
            onClose={() => setShowPicker(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="p-2 h-full min-h-[100px] relative group">
        {/* Remove button */}
        <button
          onClick={handleRemove}
          className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
          disabled={loading}
        >
          <X className="h-3 w-3" />
        </button>

        {/* Status badge */}
        <div className={cn(
          "inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded mb-1.5",
          STATUS_COLORS[slot.status] ?? STATUS_COLORS["planned"]
        )}>
          {slot.status.replace(/_/g, " ")}
        </div>

        {/* Recipe info */}
        <button
          onClick={() => setShowPicker(true)}
          className="text-left w-full"
        >
          <div className="flex items-start gap-1.5">
            <ChefHat className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
            <div>
              <p className="text-xs font-medium leading-tight line-clamp-2">
                {slot.recipe?.name ?? "Recipe removed"}
              </p>
              {slot.planned_servings !== 1 && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {slot.planned_servings} servings
                </p>
              )}
            </div>
          </div>
        </button>

        {/* Macros */}
        {slot.planned_calories != null && (
          <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5">
            <span className="text-[10px] text-muted-foreground">
              {Math.round(Number(slot.planned_calories))} kcal
            </span>
            {slot.planned_protein_g != null && (
              <span className="text-[10px] text-blue-600">
                P: {Math.round(Number(slot.planned_protein_g))}g
              </span>
            )}
          </div>
        )}
      </div>

      {showPicker && (
        <RecipePicker
          initialRecipeId={slot.planned_recipe_id ?? undefined}
          initialServings={slot.planned_servings}
          onSelect={handleSelectRecipe}
          onClose={() => setShowPicker(false)}
        />
      )}
    </>
  );
}
