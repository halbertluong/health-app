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

const RECIPE_SELECT =
  "*, recipe:recipes(id, name, image_url, servings, calories_per_serving, protein_g_per_serving, carbs_g_per_serving, fat_g_per_serving)";

interface MealSlotCellProps {
  date: string;
  mealType: MealType;
  slots: MealPlanSlotWithRecipe[];
  userId: string;
  onUpdated: (slots: MealPlanSlotWithRecipe[]) => void;
}

export function MealSlotCell({ date, mealType, slots, userId, onUpdated }: MealSlotCellProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleRemove(id: string) {
    setLoading(true);
    const supabase = createClient();
    await supabase.from("meal_plan_slots").delete().eq("id", id);
    onUpdated(slots.filter((s) => s.id !== id));
    setLoading(false);
  }

  async function handleSelectRecipe(recipeId: string, servings: number) {
    setLoading(true);
    const supabase = createClient();

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

    if (editingSlotId) {
      // Update existing slot
      const { data } = await supabase
        .from("meal_plan_slots")
        .update(slotData)
        .eq("id", editingSlotId)
        .select(RECIPE_SELECT)
        .single();

      if (data) {
        onUpdated(slots.map((s) => (s.id === editingSlotId ? (data as MealPlanSlotWithRecipe) : s)));
      }
    } else {
      // Insert new slot
      const { data } = await supabase
        .from("meal_plan_slots")
        .insert(slotData)
        .select(RECIPE_SELECT)
        .single();

      if (data) {
        onUpdated([...slots, data as MealPlanSlotWithRecipe]);
      }
    }

    setShowPicker(false);
    setEditingSlotId(null);
    setLoading(false);
  }

  function openAdd() {
    setEditingSlotId(null);
    setShowPicker(true);
  }

  function openEdit(id: string) {
    setEditingSlotId(id);
    setShowPicker(true);
  }

  const editingSlot = editingSlotId ? slots.find((s) => s.id === editingSlotId) : undefined;

  return (
    <>
      <div className="p-2 h-full min-h-[100px] space-y-1">
        {slots.map((slot) => (
          <div key={slot.id} className="group relative">
            {/* Remove button */}
            <button
              onClick={() => handleRemove(slot.id)}
              className="absolute top-0.5 right-0.5 z-10 opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
              disabled={loading}
            >
              <X className="h-3 w-3" />
            </button>

            {/* Recipe chip */}
            <button
              onClick={() => openEdit(slot.id)}
              className={cn(
                "w-full text-left rounded px-1.5 py-1 border border-transparent hover:border-muted-foreground/20 transition-colors",
              )}
              disabled={loading}
            >
              {/* Status badge */}
              <div className={cn(
                "inline-flex items-center text-[10px] font-medium px-1 py-px rounded mb-1",
                STATUS_COLORS[slot.status] ?? STATUS_COLORS["planned"]
              )}>
                {slot.status.replace(/_/g, " ")}
              </div>

              <div className="flex items-start gap-1">
                <ChefHat className="h-3 w-3 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-tight line-clamp-2">
                    {slot.recipe?.name ?? "Recipe removed"}
                  </p>
                  {slot.planned_servings !== 1 && (
                    <p className="text-[10px] text-muted-foreground">
                      {slot.planned_servings} servings
                    </p>
                  )}
                  {slot.planned_calories != null && (
                    <p className="text-[10px] text-muted-foreground">
                      {Math.round(Number(slot.planned_calories))} kcal
                      {slot.planned_protein_g != null && (
                        <span className="text-blue-600"> · P: {Math.round(Number(slot.planned_protein_g))}g</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </button>
          </div>
        ))}

        {/* Add button */}
        <button
          onClick={openAdd}
          disabled={loading}
          className={cn(
            "w-full flex items-center justify-center transition-colors rounded",
            slots.length === 0
              ? "min-h-[80px] text-muted-foreground/40 hover:text-muted-foreground hover:bg-muted/30"
              : "py-1 text-muted-foreground/30 hover:text-muted-foreground hover:bg-muted/20"
          )}
        >
          <Plus className={cn("transition-transform", slots.length === 0 ? "h-4 w-4" : "h-3 w-3")} />
        </button>
      </div>

      {showPicker && (
        <RecipePicker
          initialRecipeId={editingSlot?.planned_recipe_id ?? undefined}
          initialServings={editingSlot?.planned_servings}
          onSelect={handleSelectRecipe}
          onClose={() => { setShowPicker(false); setEditingSlotId(null); }}
        />
      )}
    </>
  );
}
