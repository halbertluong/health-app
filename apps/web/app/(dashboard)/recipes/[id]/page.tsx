import { notFound } from "next/navigation";
import Link from "next/link";
import { Edit, ChefHat, Clock, Users, Star, Heart, ExternalLink, BookOpen } from "lucide-react";
import { createServerClient } from "@/lib/supabase/server";
import type { RecipeWithIngredients } from "@health-app/types";

interface RecipeDetailPageProps {
  params: Promise<{ id: string }>;
}

const DIFFICULTY_COLORS = {
  easy: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-400",
  hard: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
};

export default async function RecipeDetailPage({ params }: RecipeDetailPageProps) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: recipe } = await supabase
    .from("recipes")
    .select("*, recipe_ingredients(*)")
    .eq("id", id)
    .single();

  if (!recipe) notFound();

  const r = recipe as RecipeWithIngredients;
  const isOwner = r.user_id === user?.id;
  const totalTime = (r.prep_time ?? 0) + (r.cook_time ?? 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hero image */}
      {r.image_url && (
        <div className="w-full aspect-video rounded-2xl overflow-hidden bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {r.is_favorite && (
              <Heart className="h-5 w-5 fill-red-500 text-red-500 shrink-0" />
            )}
            <h1 className="text-2xl font-bold">{r.name}</h1>
          </div>
          {r.description && (
            <p className="text-muted-foreground mt-1">{r.description}</p>
          )}
          {/* Categories */}
          {r.categories && r.categories.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mt-2">
              {r.categories.map(cat => (
                <span key={cat} className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full capitalize">
                  {cat}
                </span>
              ))}
            </div>
          )}
        </div>
        {isOwner && (
          <Link
            href={`/recipes/${id}/edit`}
            className="flex items-center gap-2 border rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors shrink-0"
          >
            <Edit className="h-4 w-4" />
            Edit
          </Link>
        )}
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-4 flex-wrap text-sm text-muted-foreground">
        {totalTime > 0 && (
          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            {totalTime} min
            {r.prep_time && r.cook_time && (
              <span className="text-xs">({r.prep_time} prep + {r.cook_time} cook)</span>
            )}
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4" />
          {r.servings} serving{Number(r.servings) !== 1 ? "s" : ""}
          {r.serving_size && <span className="text-xs">({r.serving_size})</span>}
        </span>
        <span className="flex items-center gap-1.5">
          <ChefHat className="h-4 w-4" />
          {r.recipe_ingredients.length} ingredients
        </span>
        {r.difficulty && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${DIFFICULTY_COLORS[r.difficulty]}`}>
            {r.difficulty}
          </span>
        )}
        {r.rating != null && (
          <span className="flex items-center gap-1 text-amber-500 font-medium">
            {[1,2,3,4,5].map(i => (
              <Star key={i} className={`h-4 w-4 ${i <= r.rating! ? "fill-amber-500" : "fill-muted text-muted"}`} />
            ))}
          </span>
        )}
      </div>

      {/* Source link */}
      {(r.source_url || r.source_name) && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4 shrink-0" />
          {r.source_url ? (
            <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
              {r.source_name ?? r.source_url}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span>{r.source_name}</span>
          )}
        </div>
      )}

      {/* Macros per serving */}
      {r.calories_per_serving != null && (
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Calories", value: r.calories_per_serving, unit: "kcal", color: "bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400" },
            { label: "Protein", value: r.protein_g_per_serving, unit: "g", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
            { label: "Carbs", value: r.carbs_g_per_serving, unit: "g", color: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/30 dark:text-yellow-400" },
            { label: "Fat", value: r.fat_g_per_serving, unit: "g", color: "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
          ].map(({ label, value, unit, color }) => (
            <div key={label} className={`rounded-lg p-3 text-center ${color}`}>
              <div className="text-lg font-bold">{value != null ? Math.round(Number(value)) : "—"}</div>
              <div className="text-xs font-medium">{label}</div>
              <div className="text-xs opacity-70">{unit} / serving</div>
            </div>
          ))}
        </div>
      )}

      {/* Extended nutrition */}
      {(r.fiber_g_per_serving != null || r.sugar_g_per_serving != null || r.sodium_mg_per_serving != null || r.cholesterol_mg_per_serving != null || r.saturated_fat_g_per_serving != null) && (
        <div className="bg-muted/50 rounded-xl p-4">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Extended Nutrition / serving</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            {r.fiber_g_per_serving != null && (
              <div><span className="text-muted-foreground">Fiber</span> <span className="font-medium">{r.fiber_g_per_serving}g</span></div>
            )}
            {r.sugar_g_per_serving != null && (
              <div><span className="text-muted-foreground">Sugar</span> <span className="font-medium">{r.sugar_g_per_serving}g</span></div>
            )}
            {r.saturated_fat_g_per_serving != null && (
              <div><span className="text-muted-foreground">Saturated Fat</span> <span className="font-medium">{r.saturated_fat_g_per_serving}g</span></div>
            )}
            {r.cholesterol_mg_per_serving != null && (
              <div><span className="text-muted-foreground">Cholesterol</span> <span className="font-medium">{r.cholesterol_mg_per_serving}mg</span></div>
            )}
            {r.sodium_mg_per_serving != null && (
              <div><span className="text-muted-foreground">Sodium</span> <span className="font-medium">{r.sodium_mg_per_serving}mg</span></div>
            )}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Ingredients */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Ingredients</h2>
          <ul className="space-y-2">
            {r.recipe_ingredients
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((ing) => (
                <li key={ing.id} className="flex items-baseline gap-2 text-sm">
                  <span className="font-medium w-20 shrink-0 text-right text-muted-foreground">
                    {ing.quantity} {ing.unit}
                  </span>
                  <span>{ing.ingredient_name}</span>
                  {ing.notes && (
                    <span className="text-xs text-muted-foreground italic">({ing.notes})</span>
                  )}
                </li>
              ))}
          </ul>
        </div>

        {/* Instructions */}
        {r.instructions && (
          <div>
            <h2 className="text-lg font-semibold mb-3">Instructions</h2>
            <div className="space-y-3">
              {r.instructions.split("\n").filter(Boolean).map((step, i) => (
                <div key={i} className="flex gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Notes */}
      {r.notes && (
        <div className="bg-muted/50 rounded-xl p-4">
          <h3 className="text-sm font-semibold mb-2">Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{r.notes}</p>
        </div>
      )}
    </div>
  );
}
