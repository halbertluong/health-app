import Link from "next/link";
import { Clock, ChefHat, Star, Heart } from "lucide-react";
import type { Recipe } from "@health-app/types";

interface RecipeCardProps {
  recipe: Recipe;
  dimmed?: boolean;
}

export function RecipeCard({ recipe, dimmed }: RecipeCardProps) {
  const totalTime = (recipe.prep_time ?? 0) + (recipe.cook_time ?? 0);

  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className={`group bg-card border rounded-xl overflow-hidden hover:shadow-md hover:border-primary/30 transition-all ${dimmed ? "opacity-40" : ""}`}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden">
        {recipe.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.image_url}
            alt={recipe.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ChefHat className="h-10 w-10 text-muted-foreground/40" />
        )}
        {recipe.is_favorite && (
          <div className="absolute top-2 right-2">
            <Heart className="h-4 w-4 fill-red-500 text-red-500 drop-shadow" />
          </div>
        )}
        {recipe.difficulty && (
          <div className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full capitalize">
            {recipe.difficulty}
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 group-hover:text-primary transition-colors">
          {recipe.name}
        </h3>

        {recipe.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {recipe.description}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {totalTime > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" />
              {totalTime} min
            </span>
          )}
          {recipe.calories_per_serving != null && (
            <span className="text-xs text-muted-foreground">
              {Math.round(Number(recipe.calories_per_serving))} kcal
            </span>
          )}
          {recipe.protein_g_per_serving != null && (
            <span className="text-xs text-blue-600">
              {Math.round(Number(recipe.protein_g_per_serving))}g protein
            </span>
          )}
          {recipe.rating != null && (
            <span className="flex items-center gap-0.5 text-xs text-amber-500">
              <Star className="h-3 w-3 fill-amber-500" />
              {recipe.rating}
            </span>
          )}
        </div>

        {/* Category tags */}
        {recipe.categories && recipe.categories.length > 0 && (
          <div className="mt-2 flex gap-1 flex-wrap">
            {recipe.categories.slice(0, 3).map(cat => (
              <span key={cat} className="text-[10px] bg-muted text-muted-foreground px-2 py-0.5 rounded-full capitalize">
                {cat}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
