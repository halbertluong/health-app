"use client";

import { useState, useEffect } from "react";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Recipe } from "@health-app/types";

interface RecipePickerProps {
  initialRecipeId?: string;
  initialServings?: number;
  onSelect: (recipeId: string, servings: number) => void;
  onClose: () => void;
}

export function RecipePicker({ initialRecipeId, initialServings = 1, onSelect, onClose }: RecipePickerProps) {
  const [search, setSearch] = useState("");
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(initialRecipeId);
  const [servings, setServings] = useState(initialServings);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRecipes() {
      const supabase = createClient();
      const query = supabase
        .from("recipes")
        .select("id, name, calories_per_serving, protein_g_per_serving, servings, image_url")
        .order("name");

      if (search) {
        query.ilike("name", `%${search}%`);
      }

      const { data } = await query.limit(30);
      setRecipes((data as Recipe[]) ?? []);
      setLoading(false);
    }
    fetchRecipes();
  }, [search]);

  function handleConfirm() {
    if (selectedId) {
      onSelect(selectedId, servings);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border rounded-xl shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Pick a Recipe</h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              autoFocus
            />
          </div>
        </div>

        {/* Recipe list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-8">Loading...</div>
          ) : recipes.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-8">
              No recipes found.{" "}
              <a href="/recipes/new" className="text-primary underline">
                Create one
              </a>
            </div>
          ) : (
            recipes.map((recipe) => (
              <button
                key={recipe.id}
                onClick={() => setSelectedId(recipe.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedId === recipe.id
                    ? "bg-primary/10 border border-primary/30"
                    : "hover:bg-muted border border-transparent"
                }`}
              >
                <div className="font-medium text-sm">{recipe.name}</div>
                {recipe.calories_per_serving != null && (
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {Math.round(Number(recipe.calories_per_serving))} kcal / serving
                    {recipe.protein_g_per_serving != null && (
                      <> · {Math.round(Number(recipe.protein_g_per_serving))}g protein</>
                    )}
                  </div>
                )}
              </button>
            ))
          )}
        </div>

        {/* Servings + confirm */}
        {selectedId && (
          <div className="p-4 border-t space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium">Servings:</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setServings((s) => Math.max(0.5, s - 0.5))}
                  className="w-7 h-7 rounded-full border flex items-center justify-center text-sm hover:bg-muted transition-colors"
                >
                  −
                </button>
                <span className="w-10 text-center text-sm font-medium">{servings}</span>
                <button
                  onClick={() => setServings((s) => Math.min(20, s + 0.5))}
                  className="w-7 h-7 rounded-full border flex items-center justify-center text-sm hover:bg-muted transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full bg-primary text-primary-foreground py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Add to Plan
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
