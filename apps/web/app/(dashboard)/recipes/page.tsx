import Link from "next/link";
import { Plus, BookOpen } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import type { Recipe } from "@health-app/types";
import { RecipeCatalogSection } from "./catalog-section";
import { RecipeKeeperImport } from "./recipe-keeper-import";
import { AiImportButton } from "./ai-import-button";
import { ManageableRecipeGrid } from "./manage-recipes";

export default async function RecipesPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: recipes } = await supabase
    .from("recipes")
    .select("*")
    .eq("user_id", user!.id)
    .order("name");

  const existingNames = (recipes ?? []).map((r: any) => r.name as string);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recipes</h1>
          <p className="text-sm text-muted-foreground mt-1">Your library & discover new ones</p>
        </div>
        <div className="flex items-center gap-2">
          <AiImportButton />
          <RecipeKeeperImport />
          <Link
            href="/recipes/new"
            className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Recipe</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      {/* My library */}
      {recipes && recipes.length > 0 && (
        <section>
          <ManageableRecipeGrid recipes={recipes as Recipe[]} />
        </section>
      )}

      {/* Empty state */}
      {(!recipes || recipes.length === 0) && (
        <div className="bg-card border border-dashed rounded-xl p-12 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="font-medium text-sm">No recipes yet</p>
          <p className="text-xs text-muted-foreground mt-1">Add from the catalog below or create your own</p>
        </div>
      )}

      {/* Discover catalog */}
      <RecipeCatalogSection existingNames={existingNames} />
    </div>
  );
}
