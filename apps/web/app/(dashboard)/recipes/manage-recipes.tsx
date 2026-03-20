"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, CheckSquare, Square, X, SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Recipe } from "@health-app/types";
import { RecipeCard } from "@/components/recipes/recipe-card";

interface Props {
  recipes: Recipe[];
}

export function ManageableRecipeGrid({ recipes }: Props) {
  const [managing, setManaging]       = useState(false);
  const [selected, setSelected]       = useState<Set<string>>(new Set());
  const [deleting, setDeleting]       = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const router = useRouter();

  function toggleManage() {
    setManaging(m => !m);
    setSelected(new Set());
    setConfirmOpen(false);
  }

  function toggleOne(id: string) {
    setSelected(s => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleAll() {
    if (selected.size === recipes.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(recipes.map(r => r.id)));
    }
  }

  async function handleDelete() {
    if (selected.size === 0) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("recipes").delete().in("id", [...selected]);
    setDeleting(false);
    setConfirmOpen(false);
    setSelected(new Set());
    setManaging(false);
    router.refresh();
  }

  const allSelected = selected.size === recipes.length && recipes.length > 0;

  return (
    <>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          My Recipes
          {managing && selected.size > 0 && (
            <span className="ml-2 text-primary normal-case">{selected.size} selected</span>
          )}
        </h2>
        <button
          onClick={toggleManage}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
            managing
              ? "bg-muted text-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          {managing ? <X className="h-3.5 w-3.5" /> : <SlidersHorizontal className="h-3.5 w-3.5" />}
          {managing ? "Done" : "Manage"}
        </button>
      </div>

      {/* Select-all bar (only in manage mode) */}
      {managing && (
        <div className="flex items-center justify-between mb-3 px-1">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            {allSelected
              ? <CheckSquare className="h-4 w-4 text-primary" />
              : <Square className="h-4 w-4" />}
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          {selected.size > 0 && (
            <button
              onClick={() => setConfirmOpen(true)}
              className="flex items-center gap-1.5 text-xs font-medium text-destructive bg-destructive/10 border border-destructive/20 px-3 py-1.5 rounded-lg hover:bg-destructive/20 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selected.size}
            </button>
          )}
        </div>
      )}

      {/* Recipe grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {recipes.map(recipe => (
          <div key={recipe.id} className="relative">
            {managing && (
              <button
                onClick={() => toggleOne(recipe.id)}
                className="absolute top-2 left-2 z-10"
                aria-label={selected.has(recipe.id) ? "Deselect" : "Select"}
              >
                {selected.has(recipe.id)
                  ? <CheckSquare className="h-5 w-5 text-primary drop-shadow" />
                  : <Square className="h-5 w-5 text-white drop-shadow" />}
              </button>
            )}
            <div
              className={managing ? "cursor-pointer" : ""}
              onClick={managing ? () => toggleOne(recipe.id) : undefined}
            >
              <RecipeCard
                recipe={recipe}
                dimmed={managing && !selected.has(recipe.id)}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Confirm delete modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative z-10 bg-card rounded-2xl shadow-xl p-6 w-full max-w-sm space-y-4">
            <div className="flex items-center gap-3 text-destructive">
              <Trash2 className="h-5 w-5 shrink-0" />
              <h3 className="font-semibold text-base">Delete {selected.size} recipe{selected.size !== 1 ? "s" : ""}?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              This will permanently remove {selected.size === 1 ? "this recipe" : `these ${selected.size} recipes`} from your library. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold hover:bg-destructive/90 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
