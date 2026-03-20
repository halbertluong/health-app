import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { RecipeForm } from "@/components/recipes/recipe-form";
import type { RecipeWithIngredients } from "@health-app/types";

interface EditRecipePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = await params;
  const supabase = await createServerClient();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*)")
    .eq("id", id)
    .single();

  if (!recipe) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Edit Recipe</h1>
      <RecipeForm recipe={recipe as RecipeWithIngredients} />
    </div>
  );
}
