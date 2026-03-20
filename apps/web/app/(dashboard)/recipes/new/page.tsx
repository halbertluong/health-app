import { RecipeForm } from "@/components/recipes/recipe-form";

export default function NewRecipePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">New Recipe</h1>
      <RecipeForm />
    </div>
  );
}
